import "server-only";
import { and, count, eq, gt, sql } from "drizzle-orm";
import type { Certificate, Enrollment, Notification, Payment, User } from "@/types";
import type { StudentProfile, UsersContent } from "@/types/content";
import { db } from "./client";
import * as t from "./schema";

/** Drop nulls (and any `skip` columns) so rows match the domain types' optional fields. */
function clean<T extends Record<string, unknown>>(row: T, skip: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (v !== null && v !== undefined && !skip.includes(k)) out[k] = v;
  return out;
}

/* ---------------- Certificates ---------------- */
type CertRow = typeof t.certificates.$inferSelect;
const toCertificate = (row: CertRow) => clean(row, ["createdAt", "updatedAt"]) as unknown as Certificate;

export async function getCertificate(id: string) {
  const rows = await db().select().from(t.certificates).where(eq(t.certificates.id, id.toUpperCase())).limit(1);
  return rows[0] ? toCertificate(rows[0]) : undefined;
}
export async function getCertificatesForUser(userId: string) {
  return (await db().select().from(t.certificates).where(eq(t.certificates.holderUserId, userId)).orderBy(t.certificates.issueDate)).map(toCertificate);
}
export async function getAllCertificates() {
  return (await db().select().from(t.certificates).orderBy(sql`${t.certificates.issueDate} DESC`)).map(toCertificate);
}

/* ---------------- Users ---------------- */
type UserRow = typeof t.users.$inferSelect;
function toUser(row: UserRow) {
  // never expose the password hash outside the data layer
  return clean(row, ["passwordHash", "createdAt"]) as unknown as User & Partial<StudentProfile> & { instructorId?: string; partnerId?: string };
}
/** Demo identities per role (phase 2 replaces this with the signed-in user). */
export async function getUsers(): Promise<UsersContent> {
  const rows = (await db().select().from(t.users).orderBy(t.users.createdAt)).map(toUser);
  const first = (role: User["role"]) => {
    const u = rows.find((r) => r.role === role);
    if (!u) throw new Error(`No ${role} user in the database`);
    return u;
  };
  const student = first("student");
  return {
    student: { ...student, learningHours: student.learningHours ?? 0, weeklyHours: student.weeklyHours ?? [] } as StudentProfile,
    instructor: first("instructor") as UsersContent["instructor"],
    partner: first("partner") as UsersContent["partner"],
    admin: first("admin"),
  };
}

/* ---------------- Learning ---------------- */
export async function getEnrollments(userId: string) {
  return (await db().select().from(t.enrollments).where(eq(t.enrollments.userId, userId))).map((r) => clean(r) as unknown as Enrollment);
}
export async function getPayments(userId: string) {
  return (await db().select().from(t.payments).where(eq(t.payments.userId, userId))).map((r) => clean(r) as unknown as Payment);
}
export async function getNotifications(userId: string) {
  const rows = await db().select().from(t.notifications).where(eq(t.notifications.userId, userId)).orderBy(sql`${t.notifications.createdAtIso} DESC`);
  return rows.map(({ createdAtIso, ...r }) => ({ ...clean(r), createdAt: createdAtIso }) as unknown as Notification);
}
export async function countCertificatesForUser(userId: string) {
  const [{ n }] = await db().select({ n: count() }).from(t.certificates).where(eq(t.certificates.holderUserId, userId));
  return n;
}

/* ---------------- Verification log & rate limiting ---------------- */
export async function logVerification(entry: { query: string; found: boolean; certificateId?: string; status?: string; ipHash: string; userAgent?: string }) {
  await db()
    .insert(t.verificationLogs)
    .values({ ...entry, certificateId: entry.certificateId ?? null, status: entry.status ?? null, userAgent: entry.userAgent?.slice(0, 255) ?? null });
}

/** How many rows from this IP hash were created in the last `seconds`. */
export async function recentCount(table: "verification" | "contact" | "partner", ipHash: string, seconds: number) {
  const tbl = table === "verification" ? t.verificationLogs : table === "contact" ? t.contactMessages : t.partnerApplications;
  const [{ n }] = await db()
    .select({ n: count() })
    .from(tbl)
    .where(and(eq(tbl.ipHash, ipHash), gt(tbl.createdAt, sql`(NOW() - INTERVAL ${seconds} SECOND)`)));
  return n;
}

/* ---------------- Inbound forms ---------------- */
export async function saveContactMessage(m: { name: string; email: string; phone?: string; subject: string; message: string; ipHash: string }) {
  await db().insert(t.contactMessages).values({ ...m, phone: m.phone || null });
}
export async function savePartnerApplication(a: {
  orgName: string;
  orgType: string;
  contactName: string;
  email: string;
  phone: string;
  district: string;
  categoryId?: string;
  mode?: string;
  about?: string;
  ipHash: string;
}) {
  await db().insert(t.partnerApplications).values({ ...a, categoryId: a.categoryId || null, mode: a.mode || null, about: a.about || null });
}

// Mark sheets (offline / imported results) -----------------------------------------------

export async function findCertificateByRegRoll(regNo: string, rollNo: string) {
  const [row] = await db()
    .select({ id: t.certificateDetails.certificateId })
    .from(t.certificateDetails)
    .where(and(eq(t.certificateDetails.regNo, regNo), eq(t.certificateDetails.rollNo, rollNo)))
    .limit(1);
  return row?.id ?? null;
}

export async function getCertificateDetails(certificateId: string) {
  const [d] = await db().select().from(t.certificateDetails).where(eq(t.certificateDetails.certificateId, certificateId)).limit(1);
  if (!d) return null;
  const subjects = await db()
    .select({ semester: t.certificateSubjects.semester, code: t.certificateSubjects.code, name: t.certificateSubjects.name, grade: t.certificateSubjects.grade, gradePoint: t.certificateSubjects.gradePoint, marks: t.certificateSubjects.marks })
    .from(t.certificateSubjects)
    .where(eq(t.certificateSubjects.certificateId, certificateId))
    .orderBy(t.certificateSubjects.sort);
  return { ...d, subjects };
}
