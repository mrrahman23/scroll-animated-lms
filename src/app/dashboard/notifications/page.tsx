import { Award, Bell, BookOpen, ClipboardCheck, CreditCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { Button } from "@/components/ui/Button";
import { isDemoMode } from "@/lib/auth/session";
import { markAllNotificationsRead } from "../actions";
import { getCurrentUser, getNotifications } from "@/lib/api";
import { cn, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };
const icons = { course: BookOpen, assessment: ClipboardCheck, certificate: Award, payment: CreditCard, system: Bell };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const items = await getNotifications(user.id);
  return (
    <>
      <DashboardHeader
        title="Notifications"
        description={`${items.filter((n) => !n.read).length} unread`}
        action={
          !isDemoMode() && items.some((n) => !n.read) ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="secondary" size="sm">Mark all as read</Button>
            </form>
          ) : undefined
        }
      />
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {items.map((n) => {
          const Icon = icons[n.type];
          return (
            <li key={n.id}>
              <Link href={n.href ?? "#"} className={cn("flex gap-4 p-5 transition-colors hover:bg-surface", !n.read && "bg-brand-50/40")}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Icon className="size-5" aria-hidden /></span>
                <div className="flex-1">
                  <p className="font-semibold text-navy-900">{n.title}{!n.read && <span className="ml-2 inline-block size-2 rounded-full bg-brand-500 align-middle" aria-label="unread" />}</p>
                  <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{relativeTime(n.createdAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
