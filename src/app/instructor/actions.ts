"use server";

import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth/session";
import type { FormResult } from "@/lib/forms/validate";
import { gradeSubmission } from "@/lib/services/learning";

export async function gradeAction(submissionId: number, score: number, feedback: string): Promise<FormResult> {
  const me = await actor("instructor", "admin");
  if (!Number.isFinite(score)) return { ok: false, message: "Enter a score." };
  try {
    const r = await gradeSubmission(me, submissionId, score, feedback);
    revalidatePath("/instructor", "layout");
    return { ok: true, message: r.certificateId ? `Graded — the learner completed the course and received ${r.certificateId}.` : r.completed ? "Graded — the learner completed the course." : "Graded." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not grade." };
  }
}
