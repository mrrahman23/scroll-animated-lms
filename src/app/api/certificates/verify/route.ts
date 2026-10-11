import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase } from "@/lib/db/client";
import { clientMeta } from "@/lib/request-meta";
import { verifyCertificate } from "@/lib/verification";

const PER_MINUTE = 30;

/**
 * GET /api/certificates/verify?id=NYTI-2026-000123
 * GET /api/certificates/verify?reg=20123&roll=21230   (certificates from the previous system)
 * Public endpoint. Returns only public-safe certificate fields (plus the mark sheet, if any).
 * With a database: every lookup is logged and limited per visitor (stops ID scanning).
 */
export async function GET(request: NextRequest) {
  try {
    return await handle(request);
  } catch (err) {
    console.error("[verify] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Certificate verification is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Retry-After": "30" } });
  }
}

async function handle(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("id") ?? "";
  const reg = params.get("reg") ?? "";
  const roll = params.get("roll") ?? "";
  if (!id.trim() && !(reg.trim() && roll.trim())) {
    return NextResponse.json({ error: "A certificate ID, or a registration and roll number, is required." }, { status: 400 });
  }

  let meta: ReturnType<typeof clientMeta> | null = null;
  if (hasDatabase()) {
    const q = await import("@/lib/db/queries");
    meta = clientMeta(request.headers);
    if ((await q.recentCount("verification", meta.ipHash, 60)) >= PER_MINUTE) {
      return NextResponse.json({ error: "Too many verification requests. Please wait a minute and try again." }, { status: 429, headers: { "Retry-After": "60" } });
    }
  }

  const result = await verifyCertificate(id.trim() ? id : { reg, roll });

  if (meta) {
    const q = await import("@/lib/db/queries");
    await q
      .logVerification({ query: result.query.slice(0, 64), found: result.found, certificateId: result.certificate?.id, status: result.certificate?.status, ...meta })
      .catch((err) => console.error("[verify] log failed:", err));
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
