import type { Metadata } from "next";
import { RequestsReview } from "@/components/admin/RequestsReview";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getCourses, getPartners, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Certification requests" };

export default async function Page() {
  await getPortalIdentity("admin");
  if (isDemoMode()) return <DemoNotice title="Certification requests" />;
  const { listCertificationRequests } = await import("@/lib/services/certificates");
  const [reqs, courses, partners] = await Promise.all([listCertificationRequests(), getCourses(), getPartners({ includePending: true })]);
  return (
    <>
      <DashboardHeader title="Certification requests" description="Offline batches submitted by training partners. Approving issues one certificate per learner in the partner's name." />
      <RequestsReview
        rows={reqs.map((r) => ({
          id: r.id,
          partner: partners.find((p) => p.id === r.partnerId)?.name ?? r.partnerId,
          course: courses.find((c) => c.id === r.courseId)?.title ?? r.courseId,
          batch: r.batch,
          learners: r.learners,
          status: r.status,
          note: r.note,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
