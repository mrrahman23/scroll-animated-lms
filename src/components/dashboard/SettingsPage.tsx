import { PasswordForm, ProfileDetailsForm } from "@/components/dashboard/AccountForms";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { isDemoMode } from "@/lib/auth/session";

/** Account settings shared by every portal. */
export function SettingsPage({ user, showProfile = false }: { user: { name: string; email: string; phone?: string; location?: string }; showProfile?: boolean }) {
  const demo = isDemoMode();
  return (
    <>
      <DashboardHeader title="Settings" description="Your account and sign-in." />
      <div className="max-w-3xl space-y-6">
        {showProfile && (
          <DashboardCard title="Profile">
            <ProfileDetailsForm user={user} demo={demo} />
          </DashboardCard>
        )}
        <DashboardCard title="Change password">
          <PasswordForm demo={demo} />
        </DashboardCard>
      </div>
    </>
  );
}
