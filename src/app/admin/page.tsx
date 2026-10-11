import { Award, Ban, BookOpen, Building2, CircleCheck, CircleDollarSign, Hourglass, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { BarList, ColumnChart, DataTableView, Legend, LineChart, ShareBar } from "@/components/admin/charts";
import { SERIES } from "@/lib/chart-tokens";
import { DashboardCard, DashboardHeader, StatsCard } from "@/components/dashboard/widgets";
import { ButtonLink } from "@/components/ui/Button";
import { getAdminOverview, getPortalIdentity } from "@/lib/api";
import { formatNumber, relativeTime } from "@/lib/format";
import type { ActivityItem } from "@/types";

const activityIcon: Record<ActivityItem["type"], { icon: typeof Users; cls: string }> = {
  registration: { icon: UserPlus, cls: "bg-brand-50 text-brand-700" },
  enrollment: { icon: BookOpen, cls: "bg-navy-50 text-navy-700" },
  certificate: { icon: Award, cls: "bg-seal-100 text-seal-700" },
  partner: { icon: Building2, cls: "bg-navy-50 text-navy-700" },
  verification: { icon: ShieldCheck, cls: "bg-verify-50 text-verify-700" },
  revocation: { icon: Ban, cls: "bg-red-50 text-red-700" },
};

export default async function AdminOverview() {
  await getPortalIdentity("admin");
  const o = await getAdminOverview();
  const months = o.monthly.map((m) => m.month);
  const online = o.monthly.map((m) => m.online);
  const offline = o.monthly.map((m) => m.offline);
  const totals = { online: online.reduce((a, b) => a + b, 0), offline: offline.reduce((a, b) => a + b, 0) };
  const cb = o.certificationBreakdown;
  const cbTotal = cb.valid + cb.expired + cb.revoked;

  return (
    <>
      <DashboardHeader
        title="Overview"
        description={o.periodLabel}
        action={<ButtonLink href="/admin/certificates" size="sm"><Award className="size-4" aria-hidden /> Issue certificates</ButtonLink>}
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <StatsCard label="Total Students" value={formatNumber(o.stats.totalStudents)} icon={Users} delta={o.deltas.totalStudents} />
        <StatsCard label="Active Courses" value={o.stats.activeCourses} icon={BookOpen} tone="navy" delta={o.deltas.activeCourses} />
        <StatsCard label="Authorized Partners" value={o.stats.authorizedPartners} icon={Building2} tone="navy" delta={o.deltas.authorizedPartners} />
        <StatsCard label="Certificates Issued" value={formatNumber(o.stats.certificatesIssued)} icon={Award} tone="seal" delta={o.deltas.certificatesIssued} />
        <StatsCard label="Certificates Verified" value={formatNumber(o.stats.certificatesVerified)} icon={ShieldCheck} tone="verify" delta={o.deltas.certificatesVerified} />
        <StatsCard label="Revenue (BDT)" value={`৳${o.stats.revenueBdtMillions.toFixed(1)}M`} icon={CircleDollarSign} delta={o.deltas.revenue} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <DashboardCard title="Student enrollment" action={<Legend items={[{ label: "Online", color: SERIES[0] }, { label: "Offline", color: SERIES[1] }]} />}>
          <LineChart ariaLabel="Monthly enrollments, online vs offline" labels={months} series={[{ name: "Online", color: SERIES[0], values: online }, { name: "Offline", color: SERIES[1], values: offline }]} />
          <DataTableView caption="Monthly enrollments" headers={["Month", "Online", "Offline"]} rows={o.monthly.map((m) => [m.month, m.online, m.offline])} />
        </DashboardCard>
        <DashboardCard title="Monthly revenue">
          <p className="-mt-3 mb-3 text-xs text-muted">BDT, millions</p>
          <ColumnChart ariaLabel="Monthly revenue in BDT millions" labels={months} values={o.monthly.map((m) => m.revenue)} decimals={1} />
          <DataTableView caption="Monthly revenue" headers={["Month", "Revenue (BDT M)"]} rows={o.monthly.map((m) => [m.month, m.revenue])} />
        </DashboardCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <DashboardCard title="Online vs offline enrollment">
          <ShareBar parts={[{ label: "Online", value: totals.online, color: SERIES[0] }, { label: "Offline", value: totals.offline, color: SERIES[1], darkText: true }]} />
          <h3 className="mb-3 mt-8 text-sm font-semibold text-navy-900">Certificates issued per month</h3>
          <ColumnChart ariaLabel="Certificates issued per month" labels={months} values={o.monthly.map((m) => m.certificates)} height={160} />
        </DashboardCard>
        <DashboardCard title="Course performance" action={<span className="text-xs text-muted">Enrolled learners</span>}>
          <BarList items={o.coursePerformance} />
        </DashboardCard>
        <DashboardCard title="Partner performance" action={<span className="text-xs text-muted">Certificates issued</span>}>
          <BarList items={o.partnerPerformance} />
        </DashboardCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <DashboardCard title="Certification status">
          <p className="-mt-3 mb-5 text-xs text-muted">{formatNumber(cbTotal)} certificates in registry</p>
          <ul className="space-y-4">
            {[
              { label: "Valid", value: cb.valid, icon: CircleCheck, bar: "bg-verify-600", text: "text-verify-700" },
              { label: "Expired", value: cb.expired, icon: Hourglass, bar: "bg-amber-500", text: "text-amber-700" },
              { label: "Revoked", value: cb.revoked, icon: Ban, bar: "bg-red-600", text: "text-red-700" },
            ].map((s) => (
              <li key={s.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 font-medium ${s.text}`}><s.icon className="size-4" aria-hidden />{s.label}</span>
                  <span className="tabular-nums text-ink"><strong>{formatNumber(s.value)}</strong> <span className="text-muted">· {((s.value / cbTotal) * 100).toFixed(1)}%</span></span>
                </div>
                <div className="h-2 rounded-full bg-navy-50"><div className={`h-full rounded-full ${s.bar}`} style={{ width: `${Math.max(1, (s.value / cbTotal) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
          {o.pendingPartners.length > 0 && (
            <Link href="/admin/partners" className="mt-6 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
              <Building2 className="size-4 text-amber-700" aria-hidden />
              <span className="flex-1 text-amber-900"><strong>{o.pendingPartners.length}</strong> partner application awaiting approval</span>
              <span className="font-semibold text-amber-900">Review →</span>
            </Link>
          )}
        </DashboardCard>
        <DashboardCard title="Recent activity">
          <ul className="space-y-4">
            {o.activity.map((a) => {
              const cfg = activityIcon[a.type];
              return (
                <li key={a.id} className="flex items-start gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${cfg.cls}`}><cfg.icon className="size-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-900">{a.message}</p>
                    <p className="text-xs text-muted">{a.actor}</p>
                  </div>
                  <time dateTime={a.at} className="shrink-0 text-xs text-muted">{relativeTime(a.at)}</time>
                </li>
              );
            })}
          </ul>
        </DashboardCard>
      </div>
    </>
  );
}
