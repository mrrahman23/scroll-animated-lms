import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, hasDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import { clientMeta } from "@/lib/request-meta";
import type { UserRole } from "@/types";

export const SESSION_COOKIE = "nyti_session";
const MAX_AGE_DAYS = 30;

export interface SessionUser {
  id: string;
  name: string;
  firstName: string;
  email: string;
  role: UserRole;
  phone?: string;
  location?: string;
  partnerId?: string;
  instructorId?: string;
  joinedAt: string;
}

export const ROLE_HOME: Record<UserRole, string> = { student: "/dashboard", instructor: "/instructor", partner: "/partner-portal", admin: "/admin" };

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Without a database the portals run in demo mode (no sign-in). */
export const isDemoMode = () => !hasDatabase();

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const meta = clientMeta(await headers());
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 864e5);
  await db().insert(t.sessions).values({ id: tokenHash(token), userId, expiresAt, ipHash: meta.ipHash, userAgent: meta.userAgent?.slice(0, 255) ?? null });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "1" : process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && hasDatabase()) await db().delete(t.sessions).where(eq(t.sessions.id, tokenHash(token)));
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request (cached per request), or null. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  if (!hasDatabase()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db()
    .select({ user: t.users })
    .from(t.sessions)
    .innerJoin(t.users, eq(t.users.id, t.sessions.userId))
    .where(and(eq(t.sessions.id, tokenHash(token)), gt(t.sessions.expiresAt, new Date()), eq(t.users.active, true)))
    .limit(1);
  const u = rows[0]?.user;
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    firstName: u.firstName,
    email: u.email,
    role: u.role,
    phone: u.phone ?? undefined,
    location: u.location ?? undefined,
    partnerId: u.partnerId ?? undefined,
    instructorId: u.instructorId ?? undefined,
    joinedAt: u.joinedAt,
  };
});

/**
 * Guards a portal page or action. Redirects to /login when signed out, and to the user's own
 * portal when their role doesn't match. In demo mode (no database) it returns null and the
 * caller falls back to the demo identities.
 */
export async function requireRole(role: UserRole, nextPath?: string): Promise<SessionUser | null> {
  if (isDemoMode()) return null;
  const user = await getSession();
  if (!user) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}

/** For server actions: the signed-in user with one of `roles`, or throws. */
export async function actor(...roles: UserRole[]) {
  const user = await getSession();
  if (!user || (roles.length && !roles.includes(user.role))) throw new Error("Not allowed");
  return user;
}

export async function purgeExpiredSessions() {
  await db().delete(t.sessions).where(lt(t.sessions.expiresAt, new Date()));
}
