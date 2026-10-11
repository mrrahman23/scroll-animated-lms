import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/AppShell";
import { getPortalBadges, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

// Personal pages: always rendered per request (they read the sign-in cookie).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Instructor", template: "%s · NYTI Instructor" }, robots: { index: false } };

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  // Guarded: signed-out visitors go to /login, other roles to their own portal.
  const me = await getPortalIdentity("instructor");
  const badges = await getPortalBadges("instructor", me);
  return (
    <AppShell role="instructor" userName={me.name} badges={badges} demo={isDemoMode()}>
      {children}
    </AppShell>
  );
}
