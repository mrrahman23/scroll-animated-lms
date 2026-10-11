import { Award, BadgeCheck, BookOpen, FileClock, Users } from "lucide-react";
import Link from "next/link";
import { DashboardCard, DashboardHeader, StatsCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/primitives";
import { getCourses, getPartner, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { formatDate, formatNumber } from "@/lib/format";
import { PartnerDemoDashboard } from "./DemoDashboard";

export default async function PartnerPortalDashboard() {
  const me = await getPortalIdentity("partner");
  if (isDemoMode()) return <PartnerDemoDashboard />;
  const partner = me.partnerId ? await getPartner(me.partnerId) : undefined;
  if (!partner)
    return <EmptyState icon={<BadgeCheck className="size-5" />} title="Account not linked to an organisation" description="An NYTI administrator needs to link your account to your training partner in Admin → Users." />;

  const [{ listCertificationRequests }, { partnerCertificates }, courses] = await Promise.all([import("@/lib/services/certificates"), import("@/lib/services/portals"), getCourses()]);
  const [requests, certs] = await Promise.all([listCertificationRequests({ partnerId: partner.id }), partnerCertificates(partner.id)]);
  const titleOf = (id: string) => courses.find((c) => c.id === id)?.title ?? id;

  return (
    <>
      <DashboardHeader
        title={partner.name}
        description={<span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-verify-600" aria-hidden /> Authorized Training Partner · <span className="font-mono">{partner.authorizationNumber}</span></span>}
        action={<ButtonLink href="/partner-portal/requests" size="sm">Submit certification request</ButtonLink>}
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard label="Authorized courses" value={partner.courseIds.length} icon={BookOpen} />
        <StatsCard label="Students trained" value={formatNumber(partner.studentsTrained)} icon={Users} tone="navy" />
        <StatsCard label="Pending requests" value={requests.filter((r) => r.status === "pending").length} icon={FileClock} tone="seal" />
        <StatsCard label="Certificates issued" value={formatNumber(certs.length)} icon={Award} tone="verify" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DashboardCard title="Certification requests" action={<Link href="/partner-portal/requests" className="text-sm font-semibold text-brand-700">All</Link>}>
          <ul className="divide-y divide-line">
            {requests.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy-900">{titleOf(r.courseId)}</p><p className="text-xs text-muted"><span className="font-mono">{r.batch}</span> · {r.learners.length} learners</p></div>
                <Badge tone={r.status === "approved" ? "verify" : r.status === "rejected" ? "danger" : "warning"} className="capitalize">{r.status}</Badge>
              </li>
            ))}
            {requests.length === 0 && <li className="py-3 text-sm text-muted">No requests yet.</li>}
          </ul>
        </DashboardCard>
        <DashboardCard title="Recently issued certificates" action={<Link href="/partner-portal/certificates" className="text-sm font-semibold text-brand-700">All</Link>}>
          <ul className="divide-y divide-line">
            {certs.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy-900">{c.holderName}</p><p className="truncate text-xs text-muted">{c.courseTitle} · {formatDate(c.issueDate, "short")}</p></div>
                <span className="font-mono text-xs text-muted">{c.id}</span>
              </li>
            ))}
            {certs.length === 0 && <li className="py-3 text-sm text-muted">None yet.</li>}
          </ul>
        </DashboardCard>
      </div>
    </>
  );
}
