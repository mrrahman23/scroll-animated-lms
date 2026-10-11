import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCourses, getPartners } from "@/lib/api";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { Certificate, LearningMode } from "@/types";
import { notify } from "./notify";

export type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/**
 * Next sequential ID for the year (NYTI-YYYY-NNNNNN), taken inside the caller's transaction.
 * A counter row in app_meta is locked with SELECT … FOR UPDATE, so concurrent issues never collide.
 */
export async function nextCertificateId(tx: Tx, year: number) {
  const key = `cert_seq_${year}`;
  await tx.execute(sql`INSERT IGNORE INTO app_meta (\`key\`, \`value\`) VALUES (${key}, '0')`);
  const [rows] = (await tx.execute(sql`SELECT \`value\` FROM app_meta WHERE \`key\` = ${key} FOR UPDATE`)) as unknown as [{ value: string }[]];
  let n = Number(rows[0]?.value ?? 0);
  if (n === 0) {
    // First issue of the year: continue after any imported certificates for that year.
    const [maxRows] = (await tx.execute(sql`SELECT MAX(CAST(SUBSTRING(id, 11) AS UNSIGNED)) AS m FROM certificates WHERE id LIKE ${`NYTI-${year}-%`}`)) as unknown as [{ m: number | null }[]];
    n = Number(maxRows[0]?.m ?? 0);
  }
  n += 1;
  await tx.update(t.appMeta).set({ value: String(n) }).where(eq(t.appMeta.key, key));
  return `NYTI-${year}-${String(n).padStart(6, "0")}`;
}

export interface IssueInput {
  holderName: string;
  holderUserId?: string;
  courseId: string;
  issuedByPartnerId?: string;
  mode: LearningMode;
  grade?: string;
  hours?: number;
  actor: string; // user id or "system"
  reason?: string;
}

/** Issues one certificate (+ audit event + holder notification). Returns the new certificate id. */
export async function issueCertificate(input: IssueInput, tx?: Tx): Promise<string> {
  const [courses, partners] = await Promise.all([getCourses(), getPartners({ includePending: true })]);
  const course = courses.find((c) => c.id === input.courseId);
  if (!course) throw new Error("Unknown course");
  const partner = input.issuedByPartnerId ? partners.find((p) => p.id === input.issuedByPartnerId) : undefined;
  if (input.issuedByPartnerId && !partner) throw new Error("Unknown partner");

  const run = async (trx: Tx) => {
    const id = await nextCertificateId(trx, new Date().getFullYear());
    await trx.insert(t.certificates).values({
      id,
      holderName: input.holderName,
      holderUserId: input.holderUserId ?? null,
      courseId: course.id,
      courseTitle: course.title,
      issuedByPartnerId: partner?.id ?? null,
      issuedByName: partner?.name ?? "National Youth Training Institute",
      issueDate: new Date().toISOString().slice(0, 10),
      status: "valid",
      grade: input.grade ?? null,
      mode: input.mode,
      hours: input.hours ?? course.durationWeeks * course.hoursPerWeek,
    });
    await trx.insert(t.certificateEvents).values({ certificateId: id, action: "issued", reason: input.reason ?? null, actor: input.actor });
    return id;
  };
  const id = tx ? await run(tx) : await db().transaction(run);
  // Inside a caller's transaction, the caller notifies after commit.
  if (!tx && input.holderUserId) await notifyIssued(input.holderUserId, id, course.title);
  return id;
}

function notifyIssued(userId: string, id: string, courseTitle: string) {
  return notify(userId, {
    title: "Your certificate is ready",
    body: `Certificate ${id} for ${courseTitle} has been issued and can be verified online.`,
    type: "certificate",
    href: `/dashboard/certificates/${id}`,
    email: true,
  });
}

async function setStatus(id: string, status: Certificate["status"], action: "revoked" | "restored", reason: string, actor: string) {
  const [cert] = await db().select().from(t.certificates).where(eq(t.certificates.id, id)).limit(1);
  if (!cert) throw new Error("Certificate not found");
  await db().transaction(async (tx) => {
    await tx.update(t.certificates).set({ status, statusReason: status === "valid" ? null : reason }).where(eq(t.certificates.id, id));
    await tx.insert(t.certificateEvents).values({ certificateId: id, action, reason, actor });
  });
  if (cert.holderUserId) {
    await notify(cert.holderUserId, {
      title: action === "revoked" ? "A certificate was revoked" : "A certificate was restored",
      body: `${id} (${cert.courseTitle}): ${reason}`,
      type: "certificate",
      href: "/dashboard/certificates",
      email: true,
    });
  }
}

export const revokeCertificate = (id: string, reason: string, actor: string) => setStatus(id, "revoked", "revoked", reason, actor);
export const restoreCertificate = (id: string, reason: string, actor: string) => setStatus(id, "valid", "restored", reason, actor);

export async function certificateHistory(id: string) {
  return db().select().from(t.certificateEvents).where(eq(t.certificateEvents.certificateId, id)).orderBy(desc(t.certificateEvents.createdAt), desc(t.certificateEvents.id));
}

/* ---------------- Partner certification requests ---------------- */
export async function createCertificationRequest(input: { partnerId: string; courseId: string; batch: string; learners: { name: string; email?: string }[]; submittedBy: string }) {
  await db().insert(t.certificationRequests).values(input);
}

export async function listCertificationRequests(filter: { partnerId?: string; status?: "pending" | "approved" | "rejected" } = {}) {
  const where = [filter.partnerId ? eq(t.certificationRequests.partnerId, filter.partnerId) : undefined, filter.status ? eq(t.certificationRequests.status, filter.status) : undefined].filter(Boolean);
  return db()
    .select()
    .from(t.certificationRequests)
    .where(where.length ? and(...(where as NonNullable<(typeof where)[number]>[])) : undefined)
    .orderBy(desc(t.certificationRequests.createdAt));
}

/** Approve → one certificate per learner, issued in the partner's name. All-or-nothing. */
export async function approveCertificationRequest(requestId: number, actor: string) {
  const [req] = await db().select().from(t.certificationRequests).where(eq(t.certificationRequests.id, requestId)).limit(1);
  if (!req || req.status !== "pending") throw new Error("Request not found or already reviewed");
  const issued: { id: string; userId?: string }[] = [];
  await db().transaction(async (tx) => {
    for (const learner of req.learners) {
      const [user] = learner.email ? await tx.select({ id: t.users.id }).from(t.users).where(eq(t.users.email, learner.email.toLowerCase())).limit(1) : [];
      const id = await issueCertificate(
        { holderName: learner.name, holderUserId: user?.id, courseId: req.courseId, issuedByPartnerId: req.partnerId, mode: "offline", actor, reason: `Certification request #${req.id} (${req.batch})` },
        tx,
      );
      issued.push({ id, userId: user?.id });
    }
    await tx.update(t.certificationRequests).set({ status: "approved", reviewedBy: actor, reviewedAt: new Date() }).where(eq(t.certificationRequests.id, requestId));
  });
  const course = (await getCourses()).find((c) => c.id === req.courseId);
  for (const c of issued) if (c.userId) await notifyIssued(c.userId, c.id, course?.title ?? req.courseId);
  return issued.map((c) => c.id);
}

export async function rejectCertificationRequest(requestId: number, note: string, actor: string) {
  await db()
    .update(t.certificationRequests)
    .set({ status: "rejected", note, reviewedBy: actor, reviewedAt: new Date() })
    .where(and(eq(t.certificationRequests.id, requestId), eq(t.certificationRequests.status, "pending")));
}
