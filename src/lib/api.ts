/**
 * Data access layer — every page reads through these functions.
 *
 * Hybrid storage:
 *  - Editorial content (site, pages, courses, categories, instructors, partners, news, stats)
 *    always comes from the JSON files in /data.
 *  - Records (users, certificates, enrolments, assessments, payments, notifications) come from
 *    MySQL when DATABASE_URL is set, otherwise from the JSON files.
 */
import { readData } from "@/lib/content";
import { hasDatabase } from "@/lib/db/client";
import type {
  ActivityItem,
  Assessment,
  Category,
  Certificate,
  Course,
  Enrollment,
  Instructor,
  NewsItem,
  Notification,
  Partner,
  Payment,
  Testimonial,
} from "@/types";
import type { AdminContent, PageContentMap, PortalsContent, SiteContent, StatsContent, StudentProfile, UsersContent } from "@/types/content";
import type { User, UserRole } from "@/types";

const categoriesData = () => readData<Category[]>("categories");
const coursesData = () => readData<Course[]>("courses");
const instructorsData = () => readData<Instructor[]>("instructors");
const partnersData = () => readData<Partner[]>("partners");
const certificatesData = () => readData<Certificate[]>("certificates");
const enrollmentsData = () => readData<Enrollment[]>("enrollments");
const assessmentsData = () => readData<Assessment[]>("assessments");
const paymentsData = () => readData<Payment[]>("payments");
const notificationsData = () => readData<Notification[]>("notifications");
const newsData = () => readData<NewsItem[]>("news");
const usersData = () => readData<UsersContent>("users");

/** MySQL queries, loaded only when a database is configured. */
const sql = () => import("@/lib/db/queries");

// Site & pages ------------------------------------------------------------
export async function getSite() {
  return readData<SiteContent>("site");
}
export async function getPage<K extends keyof PageContentMap>(name: K) {
  return readData<PageContentMap[K]>(`pages/${name}`);
}

// Catalog ---------------------------------------------------------------
export async function getCategories() {
  return categoriesData();
}
export async function getCategory(id: string) {
  return (await categoriesData()).find((c) => c.id === id || c.slug === id);
}
export async function getCourses() {
  return coursesData();
}
/** Courses shown in the public catalogue (excludes courses marked hidden). */
export async function getPublicCourses() {
  return (await coursesData()).filter((c) => !c.hidden);
}
export async function getFeaturedCourses(limit = 6) {
  return (await coursesData()).filter((c) => c.featured && !c.hidden).slice(0, limit);
}
export async function getGrading() {
  return readData<import("@/types").GradingScale>("grading");
}
export async function getCourse(slug: string) {
  return (await coursesData()).find((c) => c.slug === slug);
}
export async function getCoursesByIds(ids: string[]) {
  return (await coursesData()).filter((c) => ids.includes(c.id));
}
export async function getInstructors() {
  return instructorsData();
}
export async function getInstructor(id: string) {
  return (await instructorsData()).find((i) => i.id === id);
}

// Partners --------------------------------------------------------------
export async function getPartners(opts: { includePending?: boolean } = {}) {
  const all = await partnersData();
  return opts.includePending ? all : all.filter((p) => p.status === "active");
}
export async function getPartner(slugOrId: string) {
  return (await partnersData()).find((p) => p.slug === slugOrId || p.id === slugOrId);
}
export async function getPartnersForCourse(course: Course): Promise<Partner[]> {
  return (await partnersData()).filter((p) => course.partnerIds.includes(p.id) && p.status === "active");
}

// Certificates ------------------------------------------------------------
export async function getCertificatesForUser(userId: string) {
  if (hasDatabase()) return (await sql()).getCertificatesForUser(userId);
  return (await certificatesData()).filter((c) => c.holderUserId === userId);
}
export async function getCertificate(id: string) {
  if (hasDatabase()) return (await sql()).getCertificate(id);
  return (await certificatesData()).find((c) => c.id.toUpperCase() === id.toUpperCase());
}
export async function getAllCertificates() {
  if (hasDatabase()) return (await sql()).getAllCertificates();
  return certificatesData();
}

// Users & portals -----------------------------------------------------------
export async function getUsers(): Promise<UsersContent> {
  if (hasDatabase()) return (await sql()).getUsers();
  return usersData();
}
/**
 * The signed-in student for /dashboard pages (redirects to /login when signed out).
 * Demo mode (no database): the student in data/users.json.
 */
export async function getCurrentUser(): Promise<StudentProfile> {
  if (hasDatabase()) {
    const { requireRole } = await import("@/lib/auth/session");
    const me = (await requireRole("student"))!;
    const { learningTime } = await import("@/lib/services/learning");
    const time = await learningTime(me.id);
    return { ...me, learningHours: time.hours, weeklyHours: time.week };
  }
  return (await usersData()).student;
}

/** Signed-in identity for a portal layout/page (guarded). Demo mode: the demo identity for that role. */
export async function getPortalIdentity<R extends UserRole>(role: R): Promise<User & { instructorId?: string; partnerId?: string }> {
  if (hasDatabase()) {
    const { requireRole } = await import("@/lib/auth/session");
    return (await requireRole(role))!;
  }
  return (await usersData())[role];
}

/** Who is viewing a public page: a signed-in user, the demo student (no database), or null. Never redirects. */
export async function getViewer(): Promise<(User & { instructorId?: string; partnerId?: string }) | null> {
  if (hasDatabase()) {
    const { getSession } = await import("@/lib/auth/session");
    return getSession();
  }
  return (await usersData()).student;
}
export async function getPortalData() {
  return readData<PortalsContent>("portals");
}

// Student -----------------------------------------------------------------
export async function getEnrollments(userId: string) {
  if (hasDatabase()) return (await sql()).getEnrollments(userId);
  return (await enrollmentsData()).filter((e) => e.userId === userId);
}
export async function getLearningStats(userId: string) {
  const [mine, certificates] = await Promise.all([getEnrollments(userId), getCertificatesForUser(userId)]);
  let learningHours = 0;
  if (hasDatabase()) learningHours = (await (await import("@/lib/services/learning")).learningTime(userId)).hours;
  else {
    const users = await usersData();
    learningHours = users.student.id === userId ? users.student.learningHours : 0;
  }
  return {
    enrolled: mine.length,
    completed: mine.filter((e) => e.status === "completed").length,
    certificates: certificates.length,
    learningHours,
  };
}
/** Assessments for these courses, with this learner's status and score. */
export async function getAssessments(courseIds: string[], userId?: string): Promise<Assessment[]> {
  if (hasDatabase()) {
    if (!userId) return [];
    const rows = await (await import("@/lib/services/learning")).assessmentsWithResults(userId, courseIds);
    return rows.map((r) => ({ id: r.id, courseId: r.courseId, title: r.title, type: r.type, dueDate: r.dueDate, maxScore: r.maxScore, status: r.status, score: r.score }));
  }
  return (await assessmentsData()).filter((a) => courseIds.includes(a.courseId));
}
export async function getPayments(userId: string) {
  if (hasDatabase()) return (await sql()).getPayments(userId);
  return (await paymentsData()).filter((p) => p.userId === userId);
}
export async function getNotifications(userId: string) {
  if (hasDatabase()) return (await sql()).getNotifications(userId);
  return (await notificationsData()).filter((n) => n.userId === userId);
}

// Content -----------------------------------------------------------------
export async function getPlatformStats() {
  return (await readData<StatsContent>("stats")).platform;
}
export async function getTestimonials() {
  return readData<Testimonial[]>("testimonials");
}
export async function getNews(limit?: number) {
  const sorted = [...(await newsData())].sort((a, b) => b.date.localeCompare(a.date));
  return limit ? sorted.slice(0, limit) : sorted;
}
export async function getNewsItem(slug: string) {
  return (await newsData()).find((n) => n.slug === slug);
}

// Admin -------------------------------------------------------------------
export async function getAdminOverview() {
  if (hasDatabase()) return (await import("@/lib/services/admin")).adminOverview();
  return getAdminOverviewFromJson();
}

/** Sample dashboard figures from data/admin.json (demo mode). */
async function getAdminOverviewFromJson() {
  const [admin, courses, partners] = await Promise.all([readData<AdminContent>("admin"), coursesData(), partnersData()]);
  return {
    periodLabel: admin.periodLabel,
    stats: {
      ...admin.totals,
      revenueBdtMillions: admin.monthly.reduce((s, m) => s + m.revenue, 0),
    },
    deltas: admin.deltas,
    monthly: admin.monthly,
    activity: admin.activity as ActivityItem[],
    coursePerformance: [...courses]
      .sort((a, b) => b.students - a.students)
      .slice(0, 6)
      .map((c) => ({ label: c.title, value: c.students })),
    partnerPerformance: partners
      .filter((p) => p.status === "active")
      .sort((a, b) => b.certificatesIssued - a.certificatesIssued)
      .slice(0, 6)
      .map((p) => ({ label: p.name, value: p.certificatesIssued })),
    certificationBreakdown: admin.certificationBreakdown,
    pendingPartners: partners.filter((p) => p.status === "pending"),
  };
}

/** Sidebar badge counts for one portal and identity, derived from the data. */
export async function getPortalBadges(role: UserRole, identity: { id: string; instructorId?: string; partnerId?: string }): Promise<Record<string, string | undefined>> {
  const fmt = (n: number) => (n > 0 ? String(n) : undefined);
  if (role === "student") {
    const notifications = await getNotifications(identity.id);
    return { "/dashboard/notifications": fmt(notifications.filter((n) => !n.read).length) };
  }
  if (hasDatabase()) {
    if (role === "admin") {
      const c = await (await import("@/lib/services/admin")).inboxCounts();
      return { "/admin/inbox": fmt(c.messages + c.applications), "/admin/payments": fmt(c.payments), "/admin/requests": fmt(c.requests) };
    }
    if (role === "instructor") {
      const courses = (await coursesData()).filter((c) => c.instructorId === identity.instructorId).map((c) => c.id);
      const queue = await (await import("@/lib/services/learning")).gradingQueue(courses);
      return { "/instructor/grading": fmt(queue.filter((q) => q.sub.status === "submitted").length) };
    }
    if (role === "partner" && identity.partnerId) {
      const reqs = await (await import("@/lib/services/certificates")).listCertificationRequests({ partnerId: identity.partnerId, status: "pending" });
      return { "/partner-portal/requests": fmt(reqs.length) };
    }
    return {};
  }
  const [partners, portals] = await Promise.all([partnersData(), getPortalData()]);
  if (role === "admin") return { "/admin/partners": fmt(partners.filter((p) => p.status === "pending").length) };
  if (role === "instructor") return { "/instructor/grading": fmt(portals.instructor.awaitingGrading) };
  return { "/partner-portal/requests": fmt(portals.partner.certificationRequests.filter((r) => r.status === "Under review").length) };
}
