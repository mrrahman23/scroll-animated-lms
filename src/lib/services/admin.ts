import "server-only";
import { randomUUID } from "node:crypto";
import { count, desc, eq, sql, sum } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { getCourses, getPartners } from "@/lib/api";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { ActivityItem, UserRole } from "@/types";
import type { AdminContent } from "@/types/content";

/* ---------------- Dashboard statistics (from real records) ---------------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Last 12 calendar months, oldest first, as "YYYY-MM" keys. */
function last12() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    return { key: d.toISOString().slice(0, 7), label: MONTHS[d.getUTCMonth()] };
  });
}

function pctDelta(current: number, previous: number) {
  if (!previous) return current ? { value: "new", positive: true } : undefined;
  const d = ((current - previous) / previous) * 100;
  return { value: `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`, positive: d >= 0 };
}

export async function adminOverview() {
  const months = last12();
  const from = months[0].key;
  const ym = (col: unknown) => sql<string>`LEFT(${col}, 7)`;

  const [[students], [certs], [verifs], [revenue], enrollByMonth, revenueByMonth, certByMonth, breakdown, verifyByMonth, courses, partners] = await Promise.all([
    db().select({ n: count() }).from(t.users).where(eq(t.users.role, "student")),
    db().select({ n: count() }).from(t.certificates),
    db().select({ n: count() }).from(t.verificationLogs),
    db().select({ s: sum(t.payments.amount) }).from(t.payments).where(eq(t.payments.status, "paid")),
    db().select({ m: ym(t.enrollments.enrolledAt), mode: t.enrollments.mode, n: count() }).from(t.enrollments).where(sql`${t.enrollments.enrolledAt} >= ${from + "-01"}`).groupBy(ym(t.enrollments.enrolledAt), t.enrollments.mode),
    db().select({ m: ym(t.payments.date), s: sum(t.payments.amount) }).from(t.payments).where(sql`${t.payments.status} = 'paid' AND ${t.payments.date} >= ${from + "-01"}`).groupBy(ym(t.payments.date)),
    db().select({ m: ym(t.certificates.issueDate), n: count() }).from(t.certificates).where(sql`${t.certificates.issueDate} >= ${from + "-01"}`).groupBy(ym(t.certificates.issueDate)),
    db().select({ status: t.certificates.status, n: count() }).from(t.certificates).groupBy(t.certificates.status),
    db().select({ m: sql<string>`DATE_FORMAT(${t.verificationLogs.createdAt}, '%Y-%m')`, n: count() }).from(t.verificationLogs).groupBy(sql`DATE_FORMAT(${t.verificationLogs.createdAt}, '%Y-%m')`),
    getCourses(),
    getPartners({ includePending: true }),
  ]);

  const monthly = months.map(({ key, label }) => ({
    month: label,
    online: Number(enrollByMonth.find((r) => r.m === key && r.mode === "online")?.n ?? 0),
    offline: Number(enrollByMonth.filter((r) => r.m === key && r.mode !== "online").reduce((s, r) => s + Number(r.n), 0)),
    revenue: Number(revenueByMonth.find((r) => r.m === key)?.s ?? 0) / 1e6,
    certificates: Number(certByMonth.find((r) => r.m === key)?.n ?? 0),
  }));
  const [prev, cur] = [monthly[10], monthly[11]];
  const verifPrev = Number(verifyByMonth.find((r) => r.m === months[10].key)?.n ?? 0);
  const verifCur = Number(verifyByMonth.find((r) => r.m === months[11].key)?.n ?? 0);

  const coursePerf = await db().select({ courseId: t.enrollments.courseId, n: count() }).from(t.enrollments).groupBy(t.enrollments.courseId);
  const partnerPerf = await db().select({ partnerId: t.certificates.issuedByPartnerId, n: count() }).from(t.certificates).where(sql`${t.certificates.issuedByPartnerId} IS NOT NULL`).groupBy(t.certificates.issuedByPartnerId);

  return {
    periodLabel: `Last 12 months · ${months[0].label} ${months[0].key.slice(0, 4)} – ${months[11].label} ${months[11].key.slice(0, 4)}`,
    stats: {
      totalStudents: Number(students.n),
      activeCourses: courses.length,
      authorizedPartners: partners.filter((p) => p.status === "active").length,
      certificatesIssued: Number(certs.n),
      certificatesVerified: Number(verifs.n),
      revenueBdtMillions: Number(revenue.s ?? 0) / 1e6,
    },
    deltas: <AdminContent["deltas"]>{
      certificatesIssued: pctDelta(cur.certificates, prev.certificates) && { ...pctDelta(cur.certificates, prev.certificates)!, period: "last month" },
      certificatesVerified: pctDelta(verifCur, verifPrev) && { ...pctDelta(verifCur, verifPrev)!, period: "last month" },
      revenue: pctDelta(cur.revenue, prev.revenue) && { ...pctDelta(cur.revenue, prev.revenue)!, period: "last month" },
    },
    monthly,
    activity: await recentActivity(),
    coursePerformance: coursePerf
      .map((r) => ({ label: courses.find((c) => c.id === r.courseId)?.title ?? r.courseId, value: Number(r.n) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    partnerPerformance: partnerPerf
      .map((r) => ({ label: partners.find((p) => p.id === r.partnerId)?.name ?? String(r.partnerId), value: Number(r.n) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    certificationBreakdown: {
      valid: Number(breakdown.find((b) => b.status === "valid")?.n ?? 0),
      expired: Number(breakdown.find((b) => b.status === "expired")?.n ?? 0),
      revoked: Number(breakdown.find((b) => b.status === "revoked")?.n ?? 0),
    },
    pendingPartners: partners.filter((p) => p.status === "pending"),
  };
}

/** Merged feed of the latest events across the platform. */
export async function recentActivity(limit = 8): Promise<ActivityItem[]> {
  const [regs, enrs, certEvents, verifs, apps] = await Promise.all([
    db().select({ id: t.users.id, name: t.users.name, at: t.users.createdAt }).from(t.users).orderBy(desc(t.users.createdAt)).limit(limit),
    db().select({ id: t.enrollments.id, userId: t.enrollments.userId, courseId: t.enrollments.courseId, at: t.enrollments.enrolledAt }).from(t.enrollments).orderBy(desc(t.enrollments.enrolledAt)).limit(limit),
    db().select().from(t.certificateEvents).orderBy(desc(t.certificateEvents.createdAt)).limit(limit),
    db().select().from(t.verificationLogs).where(eq(t.verificationLogs.found, true)).orderBy(desc(t.verificationLogs.createdAt)).limit(limit),
    db().select().from(t.partnerApplications).orderBy(desc(t.partnerApplications.createdAt)).limit(limit),
  ]);
  const courses = await getCourses();
  const items: ActivityItem[] = [
    ...regs.map((r) => ({ id: `reg-${r.id}`, type: "registration" as const, message: "New account", actor: r.name, at: r.at.toISOString() })),
    ...enrs.map((e) => ({ id: `enr-${e.id}`, type: "enrollment" as const, message: `Enrolled in ${courses.find((c) => c.id === e.courseId)?.title ?? e.courseId}`, actor: e.userId, at: `${e.at}T00:00:00Z` })),
    ...certEvents.filter((e) => e.action !== "imported").map((e) => ({ id: `ce-${e.id}`, type: (e.action === "revoked" ? "revocation" : "certificate") as ActivityItem["type"], message: `Certificate ${e.certificateId} ${e.action}`, actor: e.actor === "system" ? "System" : e.actor, at: e.createdAt.toISOString() })),
    ...verifs.map((v) => ({ id: `ver-${v.id}`, type: "verification" as const, message: `Certificate ${v.certificateId} verified`, actor: "Public verification", at: v.createdAt.toISOString() })),
    ...apps.map((a) => ({ id: `app-${a.id}`, type: "partner" as const, message: "Partner application submitted", actor: a.orgName, at: a.createdAt.toISOString() })),
  ];
  // Show names instead of user ids where we can
  const ids = [...new Set(items.map((i) => i.actor).filter((a) => a.startsWith("u-")))];
  if (ids.length) {
    const names = await db().select({ id: t.users.id, name: t.users.name }).from(t.users).where(sql`${t.users.id} IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
    for (const item of items) item.actor = names.find((n) => n.id === item.actor)?.name ?? item.actor;
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/* ---------------- Users ---------------- */
export async function listUsers() {
  return db()
    .select({ id: t.users.id, name: t.users.name, email: t.users.email, role: t.users.role, active: t.users.active, joinedAt: t.users.joinedAt, hasPassword: sql<number>`${t.users.passwordHash} IS NOT NULL`, partnerId: t.users.partnerId, instructorId: t.users.instructorId })
    .from(t.users)
    .orderBy(desc(t.users.createdAt));
}

export async function createUser(input: { name: string; email: string; role: UserRole; password: string; partnerId?: string; instructorId?: string }) {
  const email = input.email.toLowerCase();
  const [exists] = await db().select({ id: t.users.id }).from(t.users).where(eq(t.users.email, email)).limit(1);
  if (exists) throw new Error("A user with this email already exists");
  await db().insert(t.users).values({
    id: `u-${randomUUID()}`,
    name: input.name,
    firstName: input.name.split(" ")[0],
    email,
    role: input.role,
    joinedAt: new Date().toISOString().slice(0, 10),
    partnerId: input.role === "partner" ? input.partnerId || null : null,
    instructorId: input.role === "instructor" ? input.instructorId || null : null,
    passwordHash: await hashPassword(input.password),
  });
}

export async function updateUser(id: string, patch: { role?: UserRole; active?: boolean; partnerId?: string | null; instructorId?: string | null; password?: string }) {
  const values: Partial<typeof t.users.$inferInsert> = {};
  if (patch.role) values.role = patch.role;
  if (patch.active !== undefined) values.active = patch.active;
  if (patch.partnerId !== undefined) values.partnerId = patch.partnerId;
  if (patch.instructorId !== undefined) values.instructorId = patch.instructorId;
  if (patch.password) values.passwordHash = await hashPassword(patch.password);
  await db().update(t.users).set(values).where(eq(t.users.id, id));
  // Deactivating or resetting a password signs the user out everywhere
  if (patch.active === false || patch.password) await db().delete(t.sessions).where(eq(t.sessions.userId, id));
}

/* ---------------- Inbox ---------------- */
export const listContactMessages = () => db().select().from(t.contactMessages).orderBy(desc(t.contactMessages.createdAt)).limit(200);
export const setMessageStatus = (id: number, status: "new" | "read" | "archived") => db().update(t.contactMessages).set({ status }).where(eq(t.contactMessages.id, id));
export const listPartnerApplications = () => db().select().from(t.partnerApplications).orderBy(desc(t.partnerApplications.createdAt)).limit(200);
export const setApplicationStatus = (id: number, status: "pending" | "approved" | "rejected") => db().update(t.partnerApplications).set({ status }).where(eq(t.partnerApplications.id, id));

/* ---------------- Payments & verification log ---------------- */
export async function listPayments() {
  return db()
    .select({ pay: t.payments, learner: { name: t.users.name, email: t.users.email } })
    .from(t.payments)
    .leftJoin(t.users, eq(t.users.id, t.payments.userId))
    .orderBy(sql`${t.payments.status} = 'pending' DESC`, desc(t.payments.date))
    .limit(300);
}

export const listVerificationLogs = () => db().select().from(t.verificationLogs).orderBy(desc(t.verificationLogs.createdAt)).limit(300);

export async function inboxCounts() {
  const [[m], [a], [p], [r]] = await Promise.all([
    db().select({ n: count() }).from(t.contactMessages).where(eq(t.contactMessages.status, "new")),
    db().select({ n: count() }).from(t.partnerApplications).where(eq(t.partnerApplications.status, "pending")),
    db().select({ n: count() }).from(t.payments).where(eq(t.payments.status, "pending")),
    db().select({ n: count() }).from(t.certificationRequests).where(eq(t.certificationRequests.status, "pending")),
  ]);
  return { messages: Number(m.n), applications: Number(a.n), payments: Number(p.n), requests: Number(r.n) };
}
