import type { Metadata } from "next";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Students" };

export default async function Page() {
  const me = await getPortalIdentity("instructor");
  if (isDemoMode()) return <DemoNotice title="Students" />;
  const { instructorView } = await import("@/lib/services/portals");
  const { courses, learners } = await instructorView(me.instructorId);
  return (
    <>
      <DashboardHeader title="Students" description="Learners enrolled in your courses." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Students</caption>
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th scope="col" className="px-4 py-3">Learner</th><th scope="col" className="px-4 py-3">Course</th><th scope="col" className="px-4 py-3">Mode</th><th scope="col" className="px-4 py-3">Progress</th><th scope="col" className="px-4 py-3">Last active</th><th scope="col" className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {learners.map(({ enr, learner }) => (
              <tr key={enr.id}>
                <td className="px-4 py-3"><span className="block font-medium text-navy-900">{learner.name}</span><span className="block text-xs text-muted">{learner.email}</span></td>
                <td className="px-4 py-3">{courses.find((c) => c.id === enr.courseId)?.title}</td>
                <td className="px-4 py-3 capitalize">{enr.mode}</td>
                <td className="px-4 py-3 tabular-nums">{enr.progress}% <span className="text-xs text-muted">({enr.completedLessons}/{enr.totalLessons})</span></td>
                <td className="px-4 py-3 text-muted">{formatDate(enr.lastAccessedAt, "short")}</td>
                <td className="px-4 py-3"><Badge tone={enr.status === "completed" ? "verify" : enr.status === "pending" ? "warning" : "brand"} className="capitalize">{enr.status}</Badge></td>
              </tr>
            ))}
            {learners.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No learners yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
