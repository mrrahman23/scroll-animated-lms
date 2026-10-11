import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getCourse, getCourses } from "@/lib/api";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { Course, LearningMode, Payment } from "@/types";
import { issueCertificate } from "./certificates";
import { notify } from "./notify";

/** A submission passes at 50% of the assessment's max score. */
export const PASS_RATIO = 0.5;

const today = () => new Date().toISOString().slice(0, 10);
const allLessons = (course: Course) => course.curriculum.flatMap((m) => m.lessons);

async function courseById(courseId: string) {
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (!course) throw new Error("Unknown course");
  return course;
}

/* ---------------- Enrolment & payment ---------------- */
export type PayMethod = Exclude<Payment["method"], "Card">;

/**
 * Free course → active enrolment immediately.
 * Paid course → pending enrolment + pending payment with the learner's transaction ID;
 * an admin confirms the payment, which activates the enrolment.
 */
export async function enroll(userId: string, input: { courseSlug: string; mode: LearningMode; method?: PayMethod; transactionRef?: string }) {
  const course = await getCourse(input.courseSlug);
  if (!course) throw new Error("Unknown course");
  // Results-only programmes (e.g. diplomas) and courses without lessons can't be taken online
  if (course.hidden || !allLessons(course).length) throw new Error("This programme is offered at training centres — enrolment isn't available online.");
  if (!course.modes.includes(input.mode)) throw new Error("This learning mode isn't offered for this course");

  const [existing] = await db().select().from(t.enrollments).where(and(eq(t.enrollments.userId, userId), eq(t.enrollments.courseId, course.id))).limit(1);
  if (existing) return { status: existing.status, alreadyEnrolled: true };

  const lessons = allLessons(course);
  const enrollmentId = `e-${randomUUID()}`;
  const paid = course.price > 0;
  if (paid && (!input.method || !input.transactionRef)) throw new Error("Payment method and transaction ID are required");
  if (paid) {
    // A transaction ID can only pay for one enrolment (unless that payment was rejected).
    const ref = input.transactionRef!.trim().toUpperCase();
    const [reused] = await db()
      .select({ id: t.payments.id })
      .from(t.payments)
      .where(and(eq(t.payments.method, input.method!), sql`UPPER(${t.payments.transactionRef}) = ${ref}`, inArray(t.payments.status, ["pending", "paid"])))
      .limit(1);
    if (reused) throw new Error("This transaction ID has already been used. Please check it, or contact support.");
  }

  await db().transaction(async (tx) => {
    await tx.insert(t.enrollments).values({
      id: enrollmentId,
      userId,
      courseId: course.id,
      mode: input.mode,
      enrolledAt: today(),
      progress: 0,
      completedLessons: 0,
      totalLessons: lessons.length,
      lastAccessedAt: today(),
      status: paid ? "pending" : "active",
      nextLessonTitle: lessons[0]?.title ?? null,
    });
    if (paid) {
      await tx.insert(t.payments).values({
        id: `pay-${randomUUID()}`,
        userId,
        courseId: course.id,
        amount: course.price,
        currency: "BDT",
        method: input.method!,
        status: "pending",
        date: today(),
        invoiceNo: `INV-${new Date().toISOString().slice(2, 7).replace("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`,
        enrollmentId,
        transactionRef: input.transactionRef!.trim().toUpperCase().slice(0, 64),
      });
    }
  });

  await notify(userId, paid
    ? { title: "Enrolment received", body: `We're confirming your payment for ${course.title}. You'll be notified when your enrolment is active.`, type: "payment", href: "/dashboard/payments" }
    : { title: "You're enrolled", body: `${course.title} is ready in My Courses.`, type: "course", href: `/dashboard/courses/${course.slug}` });
  return { status: paid ? "pending" : "active", alreadyEnrolled: false };
}

/** Admin confirms or rejects a pending payment. */
export async function reviewPayment(paymentId: string, approve: boolean, adminId: string, note?: string) {
  const [pay] = await db().select().from(t.payments).where(eq(t.payments.id, paymentId)).limit(1);
  if (!pay || pay.status !== "pending") throw new Error("Payment not found or already reviewed");
  const course = await courseById(pay.courseId);
  await db().transaction(async (tx) => {
    await tx.update(t.payments).set({ status: approve ? "paid" : "failed", verifiedBy: adminId, verifiedAt: new Date(), note: note?.slice(0, 255) ?? null }).where(eq(t.payments.id, paymentId));
    if (pay.enrollmentId) {
      if (approve) await tx.update(t.enrollments).set({ status: "active" }).where(eq(t.enrollments.id, pay.enrollmentId));
      else await tx.delete(t.enrollments).where(and(eq(t.enrollments.id, pay.enrollmentId), eq(t.enrollments.status, "pending")));
    }
  });
  await notify(pay.userId, approve
    ? { title: "Payment confirmed", body: `Your enrolment in ${course.title} is now active.`, type: "payment", href: `/dashboard/courses/${course.slug}`, email: true }
    : { title: "Payment not confirmed", body: `We couldn't confirm the payment for ${course.title}${note ? `: ${note}` : ""}. Please contact support or enrol again.`, type: "payment", href: "/dashboard/payments", email: true });
}

/* ---------------- Lessons ---------------- */
export async function completedLessonIds(userId: string, courseId: string) {
  const rows = await db().select({ id: t.lessonProgress.lessonId }).from(t.lessonProgress).where(and(eq(t.lessonProgress.userId, userId), eq(t.lessonProgress.courseId, courseId)));
  return new Set(rows.map((r) => r.id));
}

export async function setLessonComplete(userId: string, courseSlug: string, lessonId: string, done: boolean) {
  const course = await getCourse(courseSlug);
  if (!course) throw new Error("Unknown course");
  const [enr] = await db().select().from(t.enrollments).where(and(eq(t.enrollments.userId, userId), eq(t.enrollments.courseId, course.id))).limit(1);
  if (!enr || (enr.status !== "active" && enr.status !== "completed")) throw new Error("You're not enrolled in this course");
  const lessons = allLessons(course);
  if (!lessons.some((l) => l.id === lessonId)) throw new Error("Unknown lesson");

  if (done) await db().insert(t.lessonProgress).ignore().values({ userId, lessonId, courseId: course.id });
  else await db().delete(t.lessonProgress).where(and(eq(t.lessonProgress.userId, userId), eq(t.lessonProgress.lessonId, lessonId)));

  const completed = await completedLessonIds(userId, course.id);
  const next = lessons.find((l) => !completed.has(l.id));
  await db()
    .update(t.enrollments)
    .set({
      completedLessons: completed.size,
      totalLessons: lessons.length,
      progress: Math.round((completed.size / Math.max(1, lessons.length)) * 100),
      nextLessonTitle: next?.title ?? null,
      lastAccessedAt: today(),
    })
    .where(eq(t.enrollments.id, enr.id));
  return checkCompletion(userId, course.id);
}

/* ---------------- Assessments ---------------- */
export async function assessmentsWithResults(userId: string, courseIds: string[]) {
  if (!courseIds.length) return [];
  const [defs, subs] = await Promise.all([
    db().select().from(t.assessments).where(inArray(t.assessments.courseId, courseIds)),
    db().select().from(t.submissions).where(and(eq(t.submissions.userId, userId), inArray(t.submissions.courseId, courseIds))),
  ]);
  return defs.map((a) => {
    const s = subs.find((x) => x.assessmentId === a.id);
    const overdue = !s && a.dueDate < today();
    return {
      ...a,
      submission: s ?? null,
      status: (s ? s.status : overdue ? "overdue" : "upcoming") as "submitted" | "graded" | "overdue" | "upcoming",
      score: s?.score ?? undefined,
    };
  });
}

export async function submitAssessment(userId: string, assessmentId: string, input: { content?: string; link?: string }) {
  const [a] = await db().select().from(t.assessments).where(eq(t.assessments.id, assessmentId)).limit(1);
  if (!a) throw new Error("Unknown assessment");
  const [enr] = await db().select().from(t.enrollments).where(and(eq(t.enrollments.userId, userId), eq(t.enrollments.courseId, a.courseId), inArray(t.enrollments.status, ["active", "completed"]))).limit(1);
  if (!enr) throw new Error("You're not enrolled in this course");
  const [existing] = await db().select().from(t.submissions).where(and(eq(t.submissions.assessmentId, assessmentId), eq(t.submissions.userId, userId))).limit(1);
  if (existing?.status === "graded") throw new Error("This assessment has already been graded");
  const values = { content: input.content?.slice(0, 10000) || null, link: input.link?.slice(0, 500) || null };
  if (existing) await db().update(t.submissions).set({ ...values, submittedAt: new Date() }).where(eq(t.submissions.id, existing.id));
  else await db().insert(t.submissions).values({ assessmentId, userId, courseId: a.courseId, ...values });
}

/** Instructor (own courses) or admin grades a submission. */
export async function gradeSubmission(grader: { id: string; role: string; instructorId?: string }, submissionId: number, score: number, feedback: string) {
  const [sub] = await db().select().from(t.submissions).where(eq(t.submissions.id, submissionId)).limit(1);
  if (!sub) throw new Error("Submission not found");
  const course = await courseById(sub.courseId);
  if (grader.role !== "admin" && course.instructorId !== grader.instructorId) throw new Error("You can only grade your own courses");
  const [a] = await db().select().from(t.assessments).where(eq(t.assessments.id, sub.assessmentId)).limit(1);
  const clamped = Math.max(0, Math.min(a?.maxScore ?? 100, Math.round(score)));
  await db().update(t.submissions).set({ status: "graded", score: clamped, feedback: feedback.slice(0, 5000) || null, gradedBy: grader.id, gradedAt: new Date() }).where(eq(t.submissions.id, submissionId));
  await notify(sub.userId, { title: "Assessment graded", body: `${a?.title ?? "Your assessment"}: ${clamped}/${a?.maxScore ?? 100}.`, type: "assessment", href: "/dashboard/assessments" });
  return checkCompletion(sub.userId, sub.courseId);
}

export async function gradingQueue(courseIds: string[]) {
  if (!courseIds.length) return [];
  return db()
    .select({ sub: t.submissions, assessment: t.assessments, learner: { id: t.users.id, name: t.users.name, email: t.users.email } })
    .from(t.submissions)
    .innerJoin(t.assessments, eq(t.assessments.id, t.submissions.assessmentId))
    .innerJoin(t.users, eq(t.users.id, t.submissions.userId))
    .where(inArray(t.submissions.courseId, courseIds))
    .orderBy(sql`${t.submissions.status} = 'graded'`, desc(t.submissions.submittedAt));
}

/* ---------------- Completion → certificate ---------------- */
/**
 * When every lesson is complete and every assessment is graded at ≥ 50%, the enrolment is
 * completed. Online enrolments then receive an NYTI certificate automatically; offline learners
 * are certified through their training partner's certification request.
 */
export async function checkCompletion(userId: string, courseId: string) {
  const course = await courseById(courseId);
  const [enr] = await db().select().from(t.enrollments).where(and(eq(t.enrollments.userId, userId), eq(t.enrollments.courseId, courseId))).limit(1);
  if (!enr || enr.status === "completed" || enr.status === "pending") return { completed: enr?.status === "completed", certificateId: enr?.certificateId ?? undefined };

  const lessons = allLessons(course);
  const done = await completedLessonIds(userId, courseId);
  if (lessons.some((l) => !done.has(l.id))) return { completed: false };

  const results = await assessmentsWithResults(userId, [courseId]);
  const passed = results.every((r) => r.submission?.status === "graded" && (r.submission.score ?? 0) >= r.maxScore * PASS_RATIO);
  if (!passed) return { completed: false };

  const [user] = await db().select().from(t.users).where(eq(t.users.id, userId)).limit(1);
  let certificateId: string | undefined;
  if (enr.mode === "online" && course.certificate && user) {
    const avg = results.length ? results.reduce((s, r) => s + (r.submission!.score ?? 0) / r.maxScore, 0) / results.length : 1;
    const grade = avg >= 0.9 ? "A+" : avg >= 0.8 ? "A" : avg >= 0.7 ? "B" : avg >= 0.6 ? "C" : "D";
    certificateId = await issueCertificate({ holderName: user.name, holderUserId: user.id, courseId, mode: "online", grade, actor: "system", reason: "Course completed and assessments passed" });
  }
  await db().update(t.enrollments).set({ status: "completed", progress: 100, certificateId: certificateId ?? null }).where(eq(t.enrollments.id, enr.id));
  if (!certificateId) await notify(userId, { title: "Course completed", body: `Well done on completing ${course.title}! Your certificate will be issued by your training partner.`, type: "course", href: "/dashboard/courses" });
  return { completed: true, certificateId };
}

/** Real learning hours (sum of completed lesson durations) and the last 7 days by weekday. */
export async function learningTime(userId: string) {
  const [courses, rows] = await Promise.all([
    getCourses(),
    db().select().from(t.lessonProgress).where(eq(t.lessonProgress.userId, userId)),
  ]);
  const minutesOf = new Map(courses.flatMap((c) => allLessons(c).map((l) => [l.id, l.durationMinutes] as const)));
  const totalMinutes = rows.reduce((s, r) => s + (minutesOf.get(r.lessonId) ?? 0), 0);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    const key = d.toISOString().slice(0, 10);
    const mins = rows.filter((r) => r.completedAt.toISOString().slice(0, 10) === key).reduce((s, r) => s + (minutesOf.get(r.lessonId) ?? 0), 0);
    return { day: days[d.getDay()], hours: Math.round((mins / 60) * 10) / 10 };
  });
  return { hours: Math.round(totalMinutes / 60), week };
}
