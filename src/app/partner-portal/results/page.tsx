import type { Metadata } from "next";
import { BatchTable } from "@/components/results/BatchTable";
import { NewBatchForm } from "@/components/results/NewBatchForm";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { getCourses, getPartner, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Results" };

export default async function PartnerResultsPage() {
  const me = await getPortalIdentity("partner");
  const header = <DashboardHeader title="Results" description="Enter your students' results for a batch and submit them to NYTI. Once approved, each student receives a verifiable certificate with a mark sheet." />;
  if (isDemoMode()) return <>{header}<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">Results entry is available on the live system.</p></>;
  const { listBatches } = await import("@/lib/services/results");
  const [batches, courses, partner] = await Promise.all([listBatches({ id: me.id, role: "partner", partnerId: me.partnerId }), getCourses(), me.partnerId ? getPartner(me.partnerId) : undefined]);
  const offered = courses.filter((c) => c.subjects?.length && (partner?.courseIds ?? []).includes(c.id));
  return (
    <>
      {header}
      <div className="space-y-6">
        <DashboardCard title="New results batch">
          {offered.length ? (
            <NewBatchForm courses={offered.map((c) => ({ id: c.id, title: c.title, subjects: c.subjects!.length }))} />
          ) : (
            <p className="text-sm text-muted">None of your courses has a mark sheet set up yet. Ask NYTI to add the subjects for the courses you teach.</p>
          )}
        </DashboardCard>
        <DashboardCard title="Your batches">
          <BatchTable rows={batches} base="/partner-portal/results" />
        </DashboardCard>
      </div>
    </>
  );
}
