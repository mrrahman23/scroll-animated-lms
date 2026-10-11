"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { actor, isDemoMode } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import { field, type FormResult } from "@/lib/forms/validate";
import { setLessonComplete, submitAssessment } from "@/lib/services/learning";

/** Mark a lesson complete / not complete. May complete the course and issue a certificate. */
export async function toggleLesson(courseSlug: string, lessonId: string, done: boolean) {
  const me = await actor("student");
  const result = await setLessonComplete(me.id, courseSlug, lessonId, done);
  revalidatePath(`/dashboard/courses/${courseSlug}`);
  return result;
}

export async function submitAssessmentAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const me = await actor("student");
  const assessmentId = field(form, "assessmentId", 64);
  const content = field(form, "content", 10000);
  const link = field(form, "link", 500);
  if (!content && !link) return { ok: false, message: "Add your answer or a link to your work." };
  if (link && !/^https?:\/\//i.test(link)) return { ok: false, message: "Links must start with http:// or https://", fieldErrors: { link: "Invalid link." } };
  try {
    await submitAssessment(me.id, assessmentId, { content, link });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not submit." };
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Submitted. Your instructor will grade it soon." };
}

export async function markAllNotificationsRead() {
  const me = await actor();
  await db().update(t.notifications).set({ read: true }).where(and(eq(t.notifications.userId, me.id), eq(t.notifications.read, false)));
  revalidatePath("/dashboard", "layout");
}

/** Ask NYTI to add an existing certificate (found by reg + roll) to the signed-in account. */
export async function claimCertificateAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  if (isDemoMode()) return { ok: false, message: "Available on the live system." };
  let me;
  try {
    me = await actor("student");
  } catch {
    return { ok: false, message: "Please sign in again." };
  }
  const { createClaim, ResultsError } = await import("@/lib/services/results");
  try {
    const id = await createClaim(me.id, String(form.get("reg") ?? ""), String(form.get("roll") ?? ""));
    revalidatePath("/dashboard/certificates");
    return { ok: true, message: `Request sent for ${id}. NYTI will check it and add it to your account.` };
  } catch (err) {
    return { ok: false, message: err instanceof ResultsError ? err.message : "Something went wrong. Please try again." };
  }
}
