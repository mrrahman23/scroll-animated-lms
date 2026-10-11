import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { getCourses } from "@/lib/api";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import { gradingQueue } from "./learning";

/** Instructor's courses, their learners and grading queue (instructor = courses.json instructorId). */
export async function instructorView(instructorId: string | undefined) {
  const courses = (await getCourses()).filter((c) => instructorId && c.instructorId === instructorId);
  const ids = courses.map((c) => c.id);
  if (!ids.length) return { courses, learners: [], queue: [] };
  const [learners, queue] = await Promise.all([
    db()
      .select({ enr: t.enrollments, learner: { id: t.users.id, name: t.users.name, email: t.users.email } })
      .from(t.enrollments)
      .innerJoin(t.users, eq(t.users.id, t.enrollments.userId))
      .where(inArray(t.enrollments.courseId, ids))
      .orderBy(desc(t.enrollments.lastAccessedAt)),
    gradingQueue(ids),
  ]);
  return { courses, learners, queue };
}

/** Certificates issued in a partner's name. */
export async function partnerCertificates(partnerId: string) {
  return db().select().from(t.certificates).where(eq(t.certificates.issuedByPartnerId, partnerId)).orderBy(desc(t.certificates.issueDate));
}
