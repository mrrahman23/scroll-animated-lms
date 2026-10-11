import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db/client";

/** GET /api/health — deployment check. Reports whether the database is reachable; no secrets. */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ status: "ok", database: "not configured", records: "json" });
  try {
    const { databaseStatus } = await import("@/lib/db/setup");
    const s = await databaseStatus();
    return NextResponse.json({ status: "ok", database: s.ok ? "connected" : "error", records: "mysql", importedAt: s.importedAt, certificates: s.certificates });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
