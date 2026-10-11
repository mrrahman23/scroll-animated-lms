import type { Metadata } from "next";
import { CertificationRequestForm } from "@/components/dashboard/CertificationRequestForm";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { getCoursesByIds, getPartner, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Certification requests" };

export default async function Page() {
  const me = await getPortalIdentity("partner");
  if (isDemoMode()) return <DemoNotice title="Certification requests" />;
  const partner = me.partnerId ? await getPartner(me.partnerId) : undefined;
  if (!partner) return <DemoNotice title="Certification requests" />;
  const { listCertificationRequests } = await import("@/lib/services/certificates");
  const [courses, requests] = await Promise.all([getCoursesByIds(partner.courseIds), listCertificationRequests({ partnerId: partner.id })]);
  return (
    <>
      <DashboardHeader title="Certification requests" description="Submit learners who completed an offline batch and passed the practical assessment. NYTI reviews each request before certificates are issued in your name." />
      <div className="space-y-6">
        <DashboardCard title="New request"><CertificationRequestForm courses={courses.map((c) => ({ id: c.id, title: c.title }))} /></DashboardCard>
        <DashboardCard title="Your requests">
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{courses.find((c) => c.id === r.courseId)?.title ?? r.courseId}</p>
                  <p className="text-xs text-muted"><span className="font-mono">{r.batch}</span> · {r.learners.length} learners · {r.createdAt.toLocaleDateString("en-GB")}{r.note && ` · ${r.note}`}</p>
                </div>
                <Badge tone={r.status === "approved" ? "verify" : r.status === "rejected" ? "danger" : "warning"} className="capitalize">{r.status}</Badge>
              </li>
            ))}
            {requests.length === 0 && <li className="py-3 text-sm text-muted">No requests yet.</li>}
          </ul>
        </DashboardCard>
      </div>
    </>
  );
}
