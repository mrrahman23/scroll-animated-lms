import type { Metadata } from "next";
import { ProfileDetailsForm } from "@/components/dashboard/AccountForms";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { getCurrentUser } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile" };

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <>
      <DashboardHeader title="Profile" />
      <DashboardCard title="Personal information" className="max-w-3xl">
        <ProfileDetailsForm user={user} demo={isDemoMode()} />
      </DashboardCard>
    </>
  );
}
