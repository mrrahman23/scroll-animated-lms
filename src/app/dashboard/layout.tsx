import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/AppShell";
import { getPortalBadges, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

// Personal pages: always rendered per request (they read the sign-in cookie).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Student Dashboard", template: "%s · NYTI Dashboard" }, robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Guarded: signed-out visitors go to /login, other roles to their own portal.
  const me = await getPortalIdentity("student");
  const badges = await getPortalBadges("student", me);
  return (
    <AppShell role="student" userName={me.name} badges={badges} demo={isDemoMode()}>
      {children}
    </AppShell>
  );
}
