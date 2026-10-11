import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import { sendMail } from "@/lib/mail";
import type { Notification } from "@/types";

type Kind = Notification["type"];

/** In-app notification, plus an email copy when SMTP is configured. */
export async function notify(userId: string, n: { title: string; body: string; type: Kind; href?: string; email?: boolean }) {
  await db().insert(t.notifications).values({
    id: `n-${randomUUID()}`,
    userId,
    title: n.title,
    body: n.body,
    type: n.type,
    createdAtIso: new Date().toISOString(),
    href: n.href ?? null,
  });
  if (n.email) {
    const [u] = await db().select({ email: t.users.email }).from(t.users).where(eq(t.users.id, userId)).limit(1);
    if (u) await sendMail(u.email, n.title, `${n.body}\n\n${process.env.SITE_URL ?? ""}${n.href ?? ""}`);
  }
}
