import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { readData } from "@/lib/content";
import type { Assessment, Certificate, Enrollment, Notification, Payment } from "@/types";
import type { UsersContent } from "@/types/content";
import { db, getPool } from "./client";
import * as t from "./schema";

const LOCK = "nyti_setup";
const IMPORT_FLAG = "json_import";

/**
 * Runs once per server start (see src/instrumentation.ts):
 *  1. applies pending migrations from /drizzle
 *  2. on a brand-new database, imports the records from /data/*.json (one time only)
 * A MySQL named lock makes this safe when the host starts several app processes at once.
 */
export async function setupDatabase() {
  const conn = await getPool().getConnection();
  try {
    const [rows] = await conn.query("SELECT GET_LOCK(?, 60) AS got", [LOCK]);
    if (!(rows as { got: number }[])[0]?.got) throw new Error("Timed out waiting for the database setup lock");
    try {
      await migrate(db(), { migrationsFolder: path.join(process.cwd(), "drizzle") });
      const imported = await importJsonOnce();
      const admin = await bootstrapAdmin();
      console.log(`[db] ready${imported ? " — imported records from /data" : ""}${admin ? ` — ${admin}` : ""}`);
    } finally {
      await conn.query("SELECT RELEASE_LOCK(?)", [LOCK]);
    }
  } finally {
    conn.release();
  }
}

/** Copies transactional records from the JSON files into MySQL the first time only. */
async function importJsonOnce() {
  const done = await db().select().from(t.appMeta).where(eq(t.appMeta.key, IMPORT_FLAG));
  if (done.length || process.env.DB_SKIP_IMPORT === "1") return false;

  const [users, certificates, enrollments, assessments, payments, notifications] = await Promise.all([
    readData<UsersContent>("users"),
    readData<Certificate[]>("certificates"),
    readData<Enrollment[]>("enrollments"),
    readData<Assessment[]>("assessments"),
    readData<Payment[]>("payments"),
    readData<Notification[]>("notifications"),
  ]);

  await db().transaction(async (tx) => {
    const people = [users.student, users.instructor, users.partner, users.admin];
    if (people.length)
      await tx.insert(t.users).values(
        people.map((u) => ({
          id: u.id,
          name: u.name,
          firstName: u.firstName,
          email: u.email,
          phone: u.phone ?? null,
          role: u.role,
          location: u.location ?? null,
          joinedAt: u.joinedAt,
          partnerId: "partnerId" in u ? (u.partnerId as string) : null,
          instructorId: "instructorId" in u ? (u.instructorId as string) : null,
          learningHours: "learningHours" in u ? (u.learningHours as number) : 0,
          weeklyHours: "weeklyHours" in u ? (u.weeklyHours as { day: string; hours: number }[]) : null,
        })),
      );
    if (certificates.length) {
      await tx.insert(t.certificates).values(
        certificates.map((c) => ({
          ...c,
          holderUserId: c.holderUserId ?? null,
          issuedByPartnerId: c.issuedByPartnerId ?? null,
          expiryDate: c.expiryDate ?? null,
          statusReason: c.statusReason ?? null,
          grade: c.grade ?? null,
        })),
      );
      await tx.insert(t.certificateEvents).values(
        certificates.map((c) => ({ certificateId: c.id, action: "imported" as const, reason: `Imported from data/certificates.json (status: ${c.status})`, actor: "system" })),
      );
    }
    if (enrollments.length)
      await tx.insert(t.enrollments).values(enrollments.map((e) => ({ ...e, nextLessonTitle: e.nextLessonTitle ?? null, certificateId: e.certificateId ?? null })));
    if (assessments.length) {
      // definitions …
      await tx.insert(t.assessments).values(assessments.map((a) => ({ id: a.id, courseId: a.courseId, title: a.title, type: a.type, dueDate: a.dueDate, maxScore: a.maxScore })));
      // … and each enrolled learner's existing result
      const results = assessments.flatMap((a) =>
        a.status === "submitted" || a.status === "graded"
          ? enrollments
              .filter((e) => e.courseId === a.courseId)
              .map((e) => ({ assessmentId: a.id, userId: e.userId, courseId: a.courseId, status: a.status === "graded" ? ("graded" as const) : ("submitted" as const), score: a.score ?? null, gradedAt: a.status === "graded" ? new Date() : null }))
          : [],
      );
      if (results.length) await tx.insert(t.submissions).values(results);
    }
    if (payments.length) await tx.insert(t.payments).values(payments);
    if (notifications.length)
      await tx.insert(t.notifications).values(
        notifications.map(({ createdAt, href, ...n }) => ({ ...n, createdAtIso: createdAt, href: href ?? null })),
      );
    await tx.insert(t.appMeta).values({ key: IMPORT_FLAG, value: new Date().toISOString() });
  });
  return true;
}

/**
 * First admin account. When ADMIN_EMAIL and ADMIN_PASSWORD are set and no admin can sign in yet,
 * that email becomes an admin with that password (creating the user if needed).
 * Once any admin has a password this does nothing, so the variables can then be removed.
 */
async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  const admins = await db().select().from(t.users).where(eq(t.users.role, "admin"));
  if (admins.some((a) => a.passwordHash)) return null;
  const { hashPassword } = await import("@/lib/auth/password");
  const passwordHash = await hashPassword(password);
  const [existing] = await db().select().from(t.users).where(eq(t.users.email, email)).limit(1);
  if (existing) {
    await db().update(t.users).set({ role: "admin", passwordHash, active: true }).where(eq(t.users.id, existing.id));
  } else {
    await db().insert(t.users).values({ id: `u-admin-${Date.now()}`, name: "NYTI Administrator", firstName: "Admin", email, role: "admin", joinedAt: new Date().toISOString().slice(0, 10), passwordHash });
  }
  return `admin account ready for ${email}`;
}

/** Lightweight status for /api/health. */
export async function databaseStatus() {
  const [rows] = await getPool().query("SELECT 1 AS ok");
  const ok = (rows as { ok: number }[])[0]?.ok === 1;
  const meta = await db().select().from(t.appMeta).where(eq(t.appMeta.key, IMPORT_FLAG));
  const [{ n }] = await db().select({ n: sql<number>`count(*)` }).from(t.certificates);
  return { ok, importedAt: meta[0]?.value ?? null, certificates: Number(n) };
}
