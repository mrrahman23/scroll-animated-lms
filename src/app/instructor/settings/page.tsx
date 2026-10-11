import type { Metadata } from "next";
import { SettingsPage } from "@/components/dashboard/SettingsPage";
import { getPortalIdentity } from "@/lib/api";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  return <SettingsPage user={await getPortalIdentity("instructor")} showProfile />;
}
