"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actor } from "@/lib/auth/session";
import { ContentError, saveUpload } from "@/lib/content-admin/store";
import type { FormResult } from "@/lib/forms/validate";
import * as results from "@/lib/services/results";

/** Shared by Admin → Results and Partner portal → Results. */
async function viewer(): Promise<results.Viewer> {
  const u = await actor("admin", "partner");
  return { id: u.id, role: u.role, partnerId: u.partnerId };
}
const home = (v: results.Viewer) => (v.role === "admin" ? "/admin/results" : "/partner-portal/results");
const message = (err: unknown) => (err instanceof results.ResultsError || err instanceof ContentError ? err.message : (console.error("[results]", err), "Something went wrong. Please try again."));
const refresh = (v: results.Viewer) => {
  revalidatePath(home(v), "layout");
  revalidatePath("/admin/results", "layout");
};

export async function createBatchAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const v = await viewer();
  let id: number;
  try {
    id = await results.createBatch({ courseId: String(form.get("course") ?? ""), name: String(form.get("name") ?? ""), courseDuration: String(form.get("duration") ?? ""), partnerId: String(form.get("partner") ?? "") || null }, v);
  } catch (err) {
    return { ok: false, message: message(err) };
  }
  refresh(v);
  redirect(`${home(v)}/${id}`);
}

export type SaveBatchResult = { ok: boolean; message: string; problems?: string[] };

export async function saveBatchAction(id: number, input: { name: string; courseDuration?: string; partnerId?: string | null; students: results.BatchStudentInput[] }): Promise<SaveBatchResult> {
  const v = await viewer();
  try {
    const r = await results.saveBatch(id, input, v);
    if (!r.ok) return { ok: false, message: "Not saved — please fix these:", problems: r.problems };
    refresh(v);
    return { ok: true, message: r.updatedCertificates ? `Saved. ${r.updatedCertificates} issued mark sheet(s) updated.` : "Saved." };
  } catch (err) {
    return { ok: false, message: message(err) };
  }
}

export async function submitBatchAction(id: number): Promise<FormResult> {
  const v = await viewer();
  try {
    await results.submitBatch(id, v);
    refresh(v);
    return { ok: true, message: "Submitted. NYTI will review and publish the results." };
  } catch (err) {
    return { ok: false, message: message(err) };
  }
}

export async function publishBatchAction(id: number): Promise<SaveBatchResult> {
  const v = await viewer();
  try {
    const r = await results.publishBatch(id, v);
    refresh(v);
    revalidatePath("/admin/certificates");
    return {
      ok: true,
      message: `${r.issued} certificate(s) issued.${r.skipped.length ? ` ${r.skipped.length} not issued:` : ""}`,
      problems: r.skipped.map((s) => `${s.name} — ${s.reason}`),
    };
  } catch (err) {
    return { ok: false, message: message(err) };
  }
}

export async function rejectBatchAction(id: number, note: string): Promise<FormResult> {
  const v = await viewer();
  try {
    await results.rejectBatch(id, note, v);
    refresh(v);
    return { ok: true, message: "Sent back to the partner with your note." };
  } catch (err) {
    return { ok: false, message: message(err) };
  }
}

export async function deleteBatchAction(id: number): Promise<FormResult> {
  const v = await viewer();
  try {
    await results.deleteBatch(id, v);
  } catch (err) {
    return { ok: false, message: message(err) };
  }
  refresh(v);
  redirect(home(v));
}

export async function uploadStudentPhotoAction(form: FormData): Promise<{ ok: boolean; message: string; url?: string }> {
  await viewer();
  try {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose a photo." };
    return { ok: true, message: "Photo uploaded.", url: await saveUpload(file, "results") };
  } catch (err) {
    return { ok: false, message: message(err) };
  }
}

export async function reviewClaimAction(id: number, decision: "approved" | "rejected", note: string): Promise<FormResult> {
  const v = await viewer();
  try {
    await results.reviewClaim(id, decision, note, v);
    revalidatePath("/admin/results");
    return { ok: true, message: decision === "approved" ? "Approved — the certificate is now in the student's account." : "Request declined." };
  } catch (err) {
    return { ok: false, message: message(err) };
  }
}
