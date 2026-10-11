"use server";

import { revalidatePath } from "next/cache";
import { getPartner } from "@/lib/api";
import { actor } from "@/lib/auth/session";
import { field, isEmail, type FormResult } from "@/lib/forms/validate";
import { createCertificationRequest } from "@/lib/services/certificates";

/** Parse "Name, email" per line. */
function parseLearners(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, email] = line.split(/[,\t;]/).map((x) => x.trim());
      return { name: name.slice(0, 191), email: email && isEmail(email) ? email.toLowerCase() : undefined };
    })
    .filter((l) => l.name.length > 1);
}

export async function submitRequestAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const me = await actor("partner");
  if (!me.partnerId) return { ok: false, message: "Your account isn't linked to a partner organisation yet. Please contact NYTI." };
  const partner = await getPartner(me.partnerId);
  if (!partner || partner.status !== "active") return { ok: false, message: "Your organisation is not currently authorized to request certificates." };
  const courseId = field(form, "course", 64);
  const batch = field(form, "batch", 64);
  const learners = parseLearners(String(form.get("learners") ?? ""));
  const fieldErrors: Record<string, string> = {};
  if (!partner.courseIds.includes(courseId)) fieldErrors.course = "Choose one of your authorized courses.";
  if (!batch) fieldErrors.batch = "Enter a batch reference.";
  if (!learners.length) fieldErrors.learners = "Add at least one learner (one per line).";
  if (learners.length > 500) fieldErrors.learners = "Up to 500 learners per request.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  await createCertificationRequest({ partnerId: partner.id, courseId, batch, learners, submittedBy: me.id });
  revalidatePath("/partner-portal", "layout");
  return { ok: true, message: `Request submitted for ${learners.length} learner${learners.length === 1 ? "" : "s"}. NYTI will review it.` };
}
