import type { Metadata } from "next";
import { UsersManager } from "@/components/admin/UsersManager";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { getInstructors, getPartners, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const me = await getPortalIdentity("admin");
  if (isDemoMode()) return <DemoNotice title="Users" />;
  const { listUsers } = await import("@/lib/services/admin");
  const [users, partners, instructors] = await Promise.all([listUsers(), getPartners({ includePending: true }), getInstructors()]);
  return (
    <>
      <DashboardHeader title="Users" description="Accounts, roles and access." />
      <UsersManager
        meId={me.id}
        users={users.map((u) => ({ ...u, hasPassword: Boolean(Number(u.hasPassword)) }))}
        partners={partners.map((p) => ({ id: p.id, name: p.name }))}
        instructors={instructors.map((i) => ({ id: i.id, name: i.name }))}
      />
    </>
  );
}
