import type { NextRequest } from "next/server";
import { redirectTo } from "@/lib/redirect";

/**
 * Old verify.nytibd.com result page. It was a form POST with `exam_reg` and `exam_roll`;
 * both POST and GET are sent on to the new verification page, which shows the same result.
 */
function target(reg: unknown, roll: unknown) {
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().replace(/[^\w-]/g, "").slice(0, 32) : "");
  const r = clean(reg);
  const n = clean(roll);
  const qs = r || n ? new URLSearchParams({ reg: r, roll: n }).toString() : "by=reg";
  // 303: the browser follows with a GET, even after a form POST
  return redirectTo(`/verify-certificate?${qs}`, 303);
}

export async function POST(request: NextRequest) {
  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {}
  return target(form?.get("exam_reg"), form?.get("exam_roll"));
}

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  return target(q.get("exam_reg") ?? q.get("reg"), q.get("exam_roll") ?? q.get("roll"));
}
