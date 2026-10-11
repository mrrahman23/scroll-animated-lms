import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getCourse, getCurrentUser, getEnrollments } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { db, hasDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";

/** GET /api/me/enrollment?course=<slug> — the signed-in learner's enrolment state for a course page. */
export async function GET(request: NextRequest) {
  // Demo mode (no database on this server): answer for the demo student.
  if (!hasDatabase()) {
    const [course, student] = await Promise.all([getCourse(request.nextUrl.searchParams.get("course") ?? ""), getCurrentUser()]);
    const enrolled = course ? (await getEnrollments(student.id)).find((e) => e.courseId === course.id) : undefined;
    return NextResponse.json({ signedIn: true, role: "student", status: enrolled?.status ?? null, demo: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const me = await getSession();
  if (!me) return NextResponse.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const course = await getCourse(request.nextUrl.searchParams.get("course") ?? "");
  let status: string | null = null;
  if (course && me.role === "student") {
    const [e] = await db().select({ status: t.enrollments.status }).from(t.enrollments).where(and(eq(t.enrollments.userId, me.id), eq(t.enrollments.courseId, course.id))).limit(1);
    status = e?.status ?? null;
  }
  return NextResponse.json({ signedIn: true, role: me.role, status }, { headers: { "Cache-Control": "no-store" } });
}
