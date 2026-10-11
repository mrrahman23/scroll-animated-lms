import type { Metadata } from "next";
import { BatchTable } from "@/components/results/BatchTable";
import { ClaimsReview } from "@/components/results/ClaimsReview";
import { NewBatchForm } from "@/components/results/NewBatchForm";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { getCourses, getPartners, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Results" };

export default async function AdminResultsPage() {
  const me = await getPortalIdentity("admin");
  const header = <DashboardHeader title="Results & mark sheets" description="Enter results for a batch of students, then publish to issue their certificates with mark sheets. Partner batches arrive here for approval." />;
  if (isDemoMode()) return <>{header}<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">Connect the database to enter results.</p></>;
  const { listBatches, listClaims } = await import("@/lib/services/results");
  const [batches, claims, courses, partners] = await Promise.all([listBatches({ id: me.id, role: "admin" }), listClaims({ status: "pending" }), getCourses(), getPartners({ includePending: true })]);
  const waiting = batches.filter((b) => b.status === "submitted");
  return (
    <>
      {header}
      <div className="space-y-6">
        {waiting.length > 0 && (
          <DashboardCard title={`Waiting for your approval (${waiting.length})`}>
            <BatchTable rows={waiting} base="/admin/results" showIssuer />
          </DashboardCard>
        )}
        <DashboardCard title="New results batch">
          <NewBatchForm courses={courses.filter((c) => c.subjects?.length).map((c) => ({ id: c.id, title: c.title, subjects: c.subjects!.length }))} partners={partners.map((p) => ({ id: p.id, name: p.name }))} />
        </DashboardCard>
        <DashboardCard title={`Certificate requests from students (${claims.length})`}>
          <ClaimsReview
            claims={claims.map((c) => ({ id: c.claim.id, createdAt: c.claim.createdAt.toISOString(), userName: c.user.name, userEmail: c.user.email, certId: c.cert.id, holderName: c.cert.holderName, courseTitle: c.cert.courseTitle }))}
          />
        </DashboardCard>
        <DashboardCard title="All batches">
          <BatchTable rows={batches} base="/admin/results" showIssuer />
        </DashboardCard>
      </div>
    </>
  );
}
