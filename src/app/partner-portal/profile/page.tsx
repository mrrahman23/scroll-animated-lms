import type { Metadata } from "next";
import Link from "next/link";
import { PartnerLogo, PartnerStatusBadge } from "@/components/partner/PartnerCard";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { EmptyState } from "@/components/ui/primitives";
import { getPartner, getPortalIdentity, getUsers } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { modesLabel } from "@/lib/format";
import { Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Organization profile" };

export default async function Page() {
  const me = await getPortalIdentity("partner");
  const partnerId = isDemoMode() ? (await getUsers()).partner.partnerId : me.partnerId;
  const p = partnerId ? await getPartner(partnerId) : undefined;
  if (!p) return <EmptyState icon={<Building2 className="size-5" />} title="Account not linked to an organisation" description="An NYTI administrator can link your account in Admin → Users." />;
  const rows: [string, string][] = [
    ["Authorization no.", p.authorizationNumber],
    ["Type", p.type],
    ["Address", p.address],
    ["Phone", p.phone],
    ["Email", p.email],
    ["Website", p.website ?? "—"],
    ["Training", modesLabel(p.modes)],
    ["Partner since", String(p.since)],
  ];
  return (
    <>
      <DashboardHeader title="Organization profile" description={<>This is your public listing. To update it, <Link href="/contact" className="font-semibold text-brand-700">contact NYTI</Link>.</>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <DashboardCard title={p.name} action={<PartnerStatusBadge status={p.status} />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}><dt className="text-xs uppercase tracking-wide text-muted">{k}</dt><dd className="mt-0.5 font-medium text-navy-900">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-slate-700">{p.description}</p>
        </DashboardCard>
        <DashboardCard title="Facilities">
          <div className="mb-4"><PartnerLogo partner={p} size="lg" /></div>
          <ul className="space-y-2 text-sm text-slate-700">{p.facilities.map((f) => <li key={f}>• {f}</li>)}</ul>
        </DashboardCard>
      </div>
    </>
  );
}
