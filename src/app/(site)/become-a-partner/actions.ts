"use server";

import { headers } from "next/headers";
import { hasDatabase } from "@/lib/db/client";
import { field, isBot, isEmail, type FormResult } from "@/lib/forms/validate";
import { clientMeta } from "@/lib/request-meta";

export async function submitPartnerApplication(prev: FormResult, form: FormData): Promise<FormResult> {
  try {
    return await submitPartnerApplicationInner(prev, form);
  } catch (err) {
    console.error("[forms] submitPartnerApplication failed:", err instanceof Error ? err.message : err);
    return { ok: false, message: "We couldn't send this right now. Please try again shortly, or email us." };
  }
}

async function submitPartnerApplicationInner(_prev: FormResult, form: FormData): Promise<FormResult> {
  const success = { ok: true, message: "Our partnerships team will contact you within 10 working days." };
  if (isBot(form)) return success;

  const data = {
    orgName: field(form, "org", 191),
    orgType: field(form, "type", 64),
    contactName: field(form, "contact", 191),
    email: field(form, "email", 191),
    phone: field(form, "phone", 40),
    district: field(form, "district", 100),
    categoryId: field(form, "category", 64),
    mode: field(form, "mode", 16),
    about: field(form, "about", 5000),
  };
  const fieldErrors: Record<string, string> = {};
  for (const [k, label] of [["orgName", "organization name"], ["orgType", "organization type"], ["contactName", "contact person"], ["phone", "phone number"], ["district", "district"]] as const)
    if (!data[k]) fieldErrors[k] = `Please enter the ${label}.`;
  if (!isEmail(data.email)) fieldErrors.email = "Please enter a valid email address.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please check the highlighted fields.", fieldErrors };

  if (!hasDatabase()) return { ok: false, message: "Applications can't be saved on this server yet. Please email us instead." };

  const q = await import("@/lib/db/queries");
  const meta = clientMeta(await headers());
  if ((await q.recentCount("partner", meta.ipHash, 600)) >= 5) {
    return { ok: false, message: "Several applications were sent recently from your connection. Please try again later." };
  }
  await q.savePartnerApplication({ ...data, ipHash: meta.ipHash });
  const { adminInbox, sendMail } = await import("@/lib/mail");
  await sendMail(adminInbox(), `[NYTI] Partner application: ${data.orgName}`, `${data.orgName} (${data.orgType}, ${data.district})\nContact: ${data.contactName} <${data.email}> · ${data.phone}\n\n${data.about}`);
  return success;
}
