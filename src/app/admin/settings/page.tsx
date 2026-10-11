import type { Metadata } from "next";
import { PasswordForm } from "@/components/dashboard/AccountForms";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/site-settings";
import { AppearanceForm } from "./AppearanceForm";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await getPortalIdentity("admin");
  const settings = await getSiteSettings();
  return (
    <>
      <DashboardHeader title="Settings" description="Platform-wide configuration and your account." />
      <div className="max-w-5xl space-y-6">
        <DashboardCard title="Appearance">
          <AppearanceForm defaultTheme={settings.defaultTheme} allowThemeSwitcher={settings.allowThemeSwitcher} />
        </DashboardCard>
        {!isDemoMode() && (
          <DashboardCard title="Change your password">
            <PasswordForm />
          </DashboardCard>
        )}
      </div>
    </>
  );
}
