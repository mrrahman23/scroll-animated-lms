"use server";

import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth/session";
import { field, type FormResult } from "@/lib/forms/validate";
import { enroll, type PayMethod } from "@/lib/services/learning";
import type { LearningMode } from "@/types";

const METHODS: PayMethod[] = ["bKash", "Nagad", "Bank Transfer"];

export async function enrollAction(_prev: FormResult, form: FormData): Promise<FormResult & { status?: string }> {
  let me;
  try {
    me = await actor("student");
  } catch {
    return { ok: false, message: "Please sign in with a student account to enrol." };
  }
  const slug = field(form, "course", 200);
  const mode = field(form, "mode", 16) as LearningMode;
  const method = field(form, "method", 32) as PayMethod;
  const transactionRef = field(form, "trx", 64);
  const paid = form.get("paid") === "1";
  if (paid) {
    if (!METHODS.includes(method)) return { ok: false, message: "Choose how you paid.", fieldErrors: { method: "Required." } };
    if (transactionRef.length < 4) return { ok: false, message: "Enter the transaction ID from your payment.", fieldErrors: { trx: "Required." } };
  }
  try {
    const r = await enroll(me.id, { courseSlug: slug, mode, method: paid ? method : undefined, transactionRef: paid ? transactionRef : undefined });
    revalidatePath("/dashboard", "layout");
    if (r.alreadyEnrolled) return { ok: true, status: r.status, message: "You're already enrolled in this course." };
    return { ok: true, status: r.status, message: r.status === "pending" ? "Enrolment received — we'll confirm your payment shortly." : "You're enrolled! Start learning from your dashboard." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not enrol." };
  }
}
