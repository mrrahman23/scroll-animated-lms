import { Award, BadgeCheck, BookOpen, FileClock, Send, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { DashboardCard, DashboardHeader, StatsCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getAllCertificates, getCourses, getPartner, getPortalData, getUsers } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

export async function PartnerDemoDashboard() {
  const [users, portals, courses, certs] = await Promise.all([getUsers(), getPortalData(), getCourses(), getAllCertificates()]);
  const partner = await getPartner(users.partner.partnerId);
  if (!partner) notFound();
  const titleOf = Object.fromEntries(courses.map((c) => [c.id, c.title]));
  const issued = certs.filter((c) => c.issuedByPartnerId === partner.id);
  const requests = portals.partner.certificationRequests;
  const pending = requests.filter((r) => r.status === "Under review").length;

  return (
    <>
      <DashboardHeader
        title={partner.name}
        description={<span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-verify-600" aria-hidden /> Authorized Training Partner · <span className="font-mono">{partner.authorizationNumber}</span></span>}
        action={<Button size="sm"><Send className="size-4" aria-hidden /> Submit certification request</Button>}
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard label="Authorized courses" value={partner.courseIds.length} icon={BookOpen} />
        <StatsCard label="Students trained" value={formatNumber(partner.studentsTrained)} icon={Users} tone="navy" />
        <StatsCard label="Pending requests" value={pending} icon={FileClock} tone="seal" />
        <StatsCard label="Certificates issued" value={formatNumber(partner.certificatesIssued)} icon={Award} tone="verify" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DashboardCard title="Certification requests">
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.batch} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy-900">{titleOf[r.courseId]}</p><p className="text-xs text-muted"><span className="font-mono">{r.batch}</span> · {r.learners} learners</p></div>
                <Badge tone={r.status === "Draft" ? "neutral" : r.status === "Approved" ? "verify" : r.status === "Rejected" ? "danger" : "warning"}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        </DashboardCard>
        <DashboardCard title="Recently issued certificates">
          <ul className="divide-y divide-line">
            {issued.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy-900">{c.holderName}</p><p className="truncate text-xs text-muted">{c.courseTitle} · {formatDate(c.issueDate, "short")}</p></div>
                <span className="font-mono text-xs text-muted">{c.id}</span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </>
  );
}
