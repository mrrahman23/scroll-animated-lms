import "server-only";
import { createHash } from "node:crypto";

/**
 * Visitor fingerprint for rate limiting and logs: a salted SHA-256 of the client IP.
 * The raw IP is never stored. Set NYTI_SECRET to a long random string in production.
 */
export function clientMeta(headers: Headers) {
  const ip = headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
  const salt = process.env.NYTI_SECRET || process.env.DATABASE_URL || "nyti";
  return {
    ipHash: createHash("sha256").update(`${salt}:${ip}`).digest("hex"),
    userAgent: headers.get("user-agent") ?? undefined,
  };
}
