"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, hasDatabase } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import { field, isBot, isEmail, type FormResult } from "@/lib/forms/validate";
import { clientMeta } from "@/lib/request-meta";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { ROLE_HOME, actor, createSession, destroySession } from "./session";

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 20;

/** Only allow redirects to paths on this site. */
const safeNext = (next: string) => (next.startsWith("/") && !next.startsWith("//") ? next : "");

async function recentFailures(email: string, ipHash: string) {
  const since = sql`(NOW() - INTERVAL ${WINDOW_SECONDS} SECOND)`;
  const [[byEmail], [byIp]] = await Promise.all([
    db().select({ n: count() }).from(t.authAttempts).where(and(eq(t.authAttempts.email, email), eq(t.authAttempts.success, false), gt(t.authAttempts.createdAt, since))),
    db().select({ n: count() }).from(t.authAttempts).where(and(eq(t.authAttempts.ipHash, ipHash), eq(t.authAttempts.success, false), gt(t.authAttempts.createdAt, since))),
  ]);
  return { byEmail: byEmail.n, byIp: byIp.n };
}

const UNAVAILABLE: FormResult = { ok: false, message: "Sign-in is temporarily unavailable. Please try again in a few minutes." };

export async function login(prev: FormResult, form: FormData): Promise<FormResult> {
  let target: string;
  try {
    const r = await loginInner(prev, form);
    if (typeof r === "string") target = r;
    else return r;
  } catch (err) {
    console.error("[auth] login failed:", err instanceof Error ? err.message : err);
    return UNAVAILABLE;
  }
  redirect(target);
}

async function loginInner(_prev: FormResult, form: FormData): Promise<FormResult | string> {
  if (!hasDatabase()) return { ok: false, message: "Sign-in needs the database to be configured." };
  const email = field(form, "email", 191).toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(field(form, "next", 300));
  if (!isEmail(email) || !password) return { ok: false, message: "Enter your email and password." };

  const meta = clientMeta(await headers());
  const fails = await recentFailures(email, meta.ipHash);
  if (fails.byEmail >= MAX_FAILS_PER_EMAIL || fails.byIp >= MAX_FAILS_PER_IP) {
    return { ok: false, message: "Too many failed attempts. Please wait 15 minutes and try again." };
  }

  const [user] = await db().select().from(t.users).where(eq(t.users.email, email)).limit(1);
  const valid = !!user && user.active && (await verifyPassword(password, user.passwordHash));
  await db().insert(t.authAttempts).values({ email, ipHash: meta.ipHash, success: valid });
  // Same message for unknown email and wrong password, so accounts can't be discovered.
  if (!valid) return { ok: false, message: "Incorrect email or password." };

  await createSession(user.id);
  return next || ROLE_HOME[user.role];
}

export async function register(prev: FormResult, form: FormData): Promise<FormResult> {
  let target: string;
  try {
    const r = await registerInner(prev, form);
    if (typeof r === "string") target = r;
    else return r;
  } catch (err) {
    console.error("[auth] register failed:", err instanceof Error ? err.message : err);
    return { ok: false, message: "Registration is temporarily unavailable. Please try again in a few minutes." };
  }
  redirect(target);
}

async function registerInner(_prev: FormResult, form: FormData): Promise<FormResult | string> {
  if (!hasDatabase()) return { ok: false, message: "Registration needs the database to be configured." };
  if (isBot(form)) return { ok: false, message: "Please try again." };
  const first = field(form, "first", 100);
  const last = field(form, "last", 100);
  const email = field(form, "email", 191).toLowerCase();
  const phone = field(form, "phone", 40);
  const password = String(form.get("password") ?? "");
  const next = safeNext(field(form, "next", 300));

  const fieldErrors: Record<string, string> = {};
  if (!first) fieldErrors.first = "Please enter your first name.";
  if (!last) fieldErrors.last = "Please enter your last name.";
  if (!isEmail(email)) fieldErrors.email = "Please enter a valid email address.";
  const pw = passwordProblem(password);
  if (pw) fieldErrors.password = pw;
  if (!form.get("terms")) fieldErrors.terms = "Please accept the terms to continue.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please check the highlighted fields.", fieldErrors };

  const [{ n }] = await db().select({ n: count() }).from(t.users).where(gt(t.users.createdAt, sql`(NOW() - INTERVAL 1 HOUR)`));
  if (n > 200) return { ok: false, message: "Registrations are temporarily paused. Please try again later." };
  const [existing] = await db().select({ id: t.users.id }).from(t.users).where(eq(t.users.email, email)).limit(1);
  if (existing) return { ok: false, message: "An account with this email already exists. Try signing in.", fieldErrors: { email: "Already registered." } };

  const id = `u-${randomUUID()}`;
  await db().insert(t.users).values({
    id,
    name: `${first} ${last}`,
    firstName: first,
    email,
    phone: phone || null,
    role: "student",
    joinedAt: new Date().toISOString().slice(0, 10),
    passwordHash: await hashPassword(password),
  });
  await db().insert(t.notifications).values({
    id: `n-${randomUUID()}`,
    userId: id,
    title: "Welcome to NYTI",
    body: "Browse the course catalogue and enrol to start learning.",
    type: "system",
    createdAtIso: new Date().toISOString(),
    href: "/courses",
  });
  // Results NYTI already published for this email join the new account
  const { linkCertificatesByEmail } = await import("@/lib/services/results");
  const linked = await linkCertificatesByEmail(id, email).catch(() => 0);
  if (linked) {
    await db().insert(t.notifications).values({
      id: `n-${randomUUID()}`,
      userId: id,
      title: linked === 1 ? "Your certificate is here" : `${linked} certificates are here`,
      body: "Certificates issued to your email have been added to your account, with their mark sheets.",
      type: "certificate",
      createdAtIso: new Date().toISOString(),
      href: "/dashboard/certificates",
    });
  }
  await createSession(id);
  return next || "/dashboard";
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_prev: FormResult, form: FormData): Promise<FormResult> {
  const me = await actor();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const [row] = await db().select({ hash: t.users.passwordHash }).from(t.users).where(eq(t.users.id, me.id));
  if (!(await verifyPassword(current, row?.hash))) return { ok: false, message: "Your current password is incorrect.", fieldErrors: { current: "Incorrect password." } };
  const pw = passwordProblem(next);
  if (pw) return { ok: false, message: pw, fieldErrors: { password: pw } };
  if (next !== confirm) return { ok: false, message: "The new passwords don't match.", fieldErrors: { confirm: "Doesn't match." } };
  await db().update(t.users).set({ passwordHash: await hashPassword(next) }).where(eq(t.users.id, me.id));
  return { ok: true, message: "Password updated." };
}

export async function updateProfile(_prev: FormResult, form: FormData): Promise<FormResult> {
  const me = await actor();
  const name = field(form, "name", 191);
  const phone = field(form, "phone", 40);
  const location = field(form, "location", 191);
  if (!name) return { ok: false, message: "Please enter your name.", fieldErrors: { name: "Required." } };
  await db()
    .update(t.users)
    .set({ name, firstName: name.split(" ")[0], phone: phone || null, location: location || null })
    .where(eq(t.users.id, me.id));
  return { ok: true, message: "Profile saved." };
}
