import { NextResponse } from "next/server";
import { ROLE_HOME, getSession } from "@/lib/auth/session";

/** GET /api/me — who is signed in (used by the public navbar, which stays static). */
export async function GET() {
  const user = await getSession();
  return NextResponse.json(user ? { signedIn: true, name: user.name, role: user.role, home: ROLE_HOME[user.role] } : { signedIn: false }, { headers: { "Cache-Control": "no-store" } });
}
