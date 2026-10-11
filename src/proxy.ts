import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast first check for the portals: no session cookie → send to /login.
 * The real check (valid session, correct role) happens in each portal layout and action.
 * Only active when a database is configured; otherwise the portals run in demo mode.
 */
export function proxy(request: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.next();
  if (request.cookies.has("nyti_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  url.pathname = "/login";
  // Use the address the visitor used: behind cPanel's proxy nextUrl can be the internal 0.0.0.0:port
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    url.host = host;
    if (!host.includes(":")) url.port = "";
    const proto = request.headers.get("x-forwarded-proto");
    if (proto) url.protocol = `${proto.split(",")[0].trim()}:`;
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/instructor/:path*", "/partner-portal/:path*"],
};
