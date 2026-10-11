/**
 * Redirect with a relative Location (e.g. "/login?next=…").
 * The browser resolves it against the address it actually used. Building an absolute URL from
 * the request can produce the server's internal address (e.g. http://0.0.0.0:3000) behind
 * cPanel's proxy.
 */
export function redirectTo(location: string, status: 301 | 302 | 303 | 307 | 308 = 307) {
  return new Response(null, { status, headers: { Location: location } });
}
