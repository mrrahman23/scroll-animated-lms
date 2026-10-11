"use server";

import { headers } from "next/headers";
import { hasDatabase } from "@/lib/db/client";
import { field, isBot, isEmail, type FormResult } from "@/lib/forms/validate";
import { clientMeta } from "@/lib/request-meta";

export async function sendContactMessage(prev: FormResult, form: FormData): Promise<FormResult> {
  try {
    return await sendContactMessageInner(prev, form);
  } catch (err) {
    console.error("[forms] sendContactMessage failed:", err instanceof Error ? err.message : err);
    return { ok: false, message: "We couldn't send this right now. Please try again shortly, or email us." };
  }
}

async function sendContactMessageInner(_prev: FormResult, form: FormData): Promise<FormResult> {
  if (isBot(form)) return { ok: true, message: "Thank you — we reply within 2 working days." };

  const data = {
    name: field(form, "name", 191),
    email: field(form, "email", 191),
    phone: field(form, "phone", 40),
    subject: field(form, "subject", 191),
    message: field(form, "message", 5000),
  };
  const fieldErrors: Record<string, string> = {};
  if (!data.name) fieldErrors.name = "Please enter your name.";
  if (!isEmail(data.email)) fieldErrors.email = "Please enter a valid email address.";
  if (!data.subject) fieldErrors.subject = "Please choose a subject.";
  if (data.message.length < 10) fieldErrors.message = "Please write at least a short message.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please check the highlighted fields.", fieldErrors };

  if (!hasDatabase()) return { ok: false, message: "Messages can't be saved on this server yet. Please email us instead." };

  const q = await import("@/lib/db/queries");
  const meta = clientMeta(await headers());
  if ((await q.recentCount("contact", meta.ipHash, 600)) >= 5) {
    return { ok: false, message: "You've sent several messages recently. Please try again later." };
  }
  await q.saveContactMessage({ ...data, ipHash: meta.ipHash });
  const { adminInbox, sendMail } = await import("@/lib/mail");
  await sendMail(adminInbox(), `[NYTI contact] ${data.subject}`, `${data.name} <${data.email}>${data.phone ? ` · ${data.phone}` : ""}\n\n${data.message}`);
  return { ok: true, message: "Thank you — we reply within 2 working days." };
}
