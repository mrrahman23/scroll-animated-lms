import type { Metadata } from "next";
import { InboxView } from "@/components/admin/InboxView";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getCategories, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Inbox" };

export default async function Page() {
  await getPortalIdentity("admin");
  if (isDemoMode()) return <DemoNotice title="Inbox" />;
  const { listContactMessages, listPartnerApplications } = await import("@/lib/services/admin");
  const [messages, applications, categories] = await Promise.all([listContactMessages(), listPartnerApplications(), getCategories()]);
  return (
    <>
      <DashboardHeader title="Inbox" description="Messages from the contact form and partner applications." />
      <InboxView
        messages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        applications={applications.map((a) => ({ ...a, category: categories.find((c) => c.id === a.categoryId)?.name ?? "—", createdAt: a.createdAt.toISOString() }))}
      />
    </>
  );
}
