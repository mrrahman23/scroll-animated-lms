"use server";

import { revalidatePath } from "next/cache";
import { passwordProblem } from "@/lib/auth/password";
import { actor } from "@/lib/auth/session";
import { field, isEmail, type FormResult } from "@/lib/forms/validate";
import * as adminSvc from "@/lib/services/admin";
import * as certSvc from "@/lib/services/certificates";
import { reviewPayment } from "@/lib/services/learning";
import type { LearningMode, UserRole } from "@/types";

const ROLES: UserRole[] = ["student", "instructor", "partner", "admin"];
const fail = (err: unknown): FormResult => ({ ok: false, message: err instanceof Error ? err.message : "Something went wrong." });

/* ---------------- Users ---------------- */
export async function createUserAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  await actor("admin");
  const name = field(form, "name", 191);
  const email = field(form, "email", 191);
  const role = field(form, "role", 16) as UserRole;
  const password = String(form.get("password") ?? "");
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Required.";
  if (!isEmail(email)) fieldErrors.email = "Enter a valid email.";
  if (!ROLES.includes(role)) fieldErrors.role = "Choose a role.";
  const pw = passwordProblem(password);
  if (pw) fieldErrors.password = pw;
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  try {
    await adminSvc.createUser({ name, email, role, password, partnerId: field(form, "partnerId", 64), instructorId: field(form, "instructorId", 64) });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/users");
  return { ok: true, message: `Account created for ${email}. Share the temporary password with them securely.` };
}

export async function updateUserAction(userId: string, patch: { role?: UserRole; active?: boolean; partnerId?: string | null; instructorId?: string | null; password?: string }): Promise<FormResult> {
  const me = await actor("admin");
  if (userId === me.id && (patch.active === false || (patch.role && patch.role !== "admin"))) return { ok: false, message: "You can't remove your own admin access." };
  if (patch.role && !ROLES.includes(patch.role)) return { ok: false, message: "Unknown role." };
  if (patch.password) {
    const pw = passwordProblem(patch.password);
    if (pw) return { ok: false, message: pw };
  }
  try {
    await adminSvc.updateUser(userId, patch);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/users");
  return { ok: true, message: patch.password ? "Password reset. The user has been signed out everywhere." : "User updated." };
}

/* ---------------- Certificates ---------------- */
export async function issueCertificateAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const me = await actor("admin");
  const holderName = field(form, "name", 191);
  const courseId = field(form, "course", 64);
  const partnerId = field(form, "issuer", 64);
  const holderEmail = field(form, "email", 191).toLowerCase();
  if (!holderName || !courseId) return { ok: false, message: "Enter the learner's name and choose a course." };
  try {
    let holderUserId: string | undefined;
    if (holderEmail) holderUserId = (await adminSvc.listUsers()).find((u) => u.email === holderEmail)?.id;
    const id = await certSvc.issueCertificate({
      holderName,
      holderUserId,
      courseId,
      issuedByPartnerId: partnerId || undefined,
      mode: (partnerId ? "offline" : "online") as LearningMode,
      actor: me.id,
      reason: "Issued manually by an administrator",
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Certificate ${id} issued${holderUserId ? " and linked to the learner's account" : ""}.` };
  } catch (err) {
    return fail(err);
  }
}

export async function setCertificateStatusAction(id: string, action: "revoke" | "restore", reason: string): Promise<FormResult> {
  const me = await actor("admin");
  if (reason.trim().length < 5) return { ok: false, message: "Please give a reason (it is shown on public verification for revocations)." };
  try {
    if (action === "revoke") await certSvc.revokeCertificate(id, reason.trim().slice(0, 1000), me.id);
    else await certSvc.restoreCertificate(id, reason.trim().slice(0, 1000), me.id);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Certificate ${id} ${action === "revoke" ? "revoked" : "restored"}.` };
}

export async function certificateHistoryAction(id: string) {
  await actor("admin");
  return (await certSvc.certificateHistory(id)).map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }));
}

/* ---------------- Certification requests ---------------- */
export async function reviewRequestAction(requestId: number, approve: boolean, note = ""): Promise<FormResult> {
  const me = await actor("admin");
  try {
    if (approve) {
      const ids = await certSvc.approveCertificationRequest(requestId, me.id);
      revalidatePath("/admin", "layout");
      return { ok: true, message: `Approved — ${ids.length} certificate${ids.length === 1 ? "" : "s"} issued.` };
    }
    await certSvc.rejectCertificationRequest(requestId, note.slice(0, 1000), me.id);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Request rejected." };
}

/* ---------------- Payments ---------------- */
export async function reviewPaymentAction(paymentId: string, approve: boolean, note = ""): Promise<FormResult> {
  const me = await actor("admin");
  try {
    await reviewPayment(paymentId, approve, me.id, note);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: approve ? "Payment confirmed — enrolment is active." : "Payment rejected — the learner has been notified." };
}

/* ---------------- Inbox ---------------- */
export async function setMessageStatusAction(id: number, status: "new" | "read" | "archived") {
  await actor("admin");
  await adminSvc.setMessageStatus(id, status);
  revalidatePath("/admin", "layout");
}

export async function setApplicationStatusAction(id: number, status: "pending" | "approved" | "rejected") {
  await actor("admin");
  await adminSvc.setApplicationStatus(id, status);
  revalidatePath("/admin", "layout");
}
