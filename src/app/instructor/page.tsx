import { BookOpen, ClipboardCheck, Star, Users } from "lucide-react";
import Link from "next/link";
import { DashboardCard, DashboardHeader, StatsCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/primitives";
import { getInstructors, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { InstructorDemoDashboard } from "./DemoDashboard";

export default async function InstructorDashboard() {
  const me = await getPortalIdentity("instructor");
  if (isDemoMode()) return <InstructorDemoDashboard />;
  const { instructorView } = await import("@/lib/services/portals");
  const [{ courses, learners, queue }, instructors] = await Promise.all([instructorView(me.instructorId), getInstructors()]);
  const profile = instructors.find((i) => i.id === me.instructorId);
  const toGrade = queue.filter((q) => q.sub.status === "submitted");
  const active = learners.filter((l) => l.enr.status === "active");

  return (
    <>
      <DashboardHeader title={`Welcome back, ${me.firstName}`} description={profile ? profile.title : "Link your account to an instructor profile (ask an administrator)."} />
      {!me.instructorId && (
        <div className="mb-6"><EmptyState icon={<BookOpen className="size-5" />} title="No instructor profile linked" description="An administrator can link your account to your instructor profile in Admin → Users." /></div>
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard label="My courses" value={courses.length} icon={BookOpen} />
        <StatsCard label="Active learners" value={active.length} icon={Users} tone="navy" />
        <StatsCard label="Awaiting grading" value={toGrade.length} icon={ClipboardCheck} tone="seal" />
        <StatsCard label="Instructor rating" value={profile ? profile.rating.toFixed(1) : "—"} icon={Star} tone="verify" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <DashboardCard title="My courses" action={<Link href="/instructor/courses" className="text-sm font-semibold text-brand-700">View all</Link>}>
          <ul className="divide-y divide-line">
            {courses.map((c) => {
              const n = learners.filter((l) => l.enr.courseId === c.id);
              const avg = n.length ? Math.round(n.reduce((s, l) => s + l.enr.progress, 0) / n.length) : 0;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="truncate font-semibold text-navy-900">{c.title}</p><p className="text-xs text-muted">{n.length} learners · average progress {avg}%</p></div>
                </li>
              );
            })}
            {courses.length === 0 && <li className="py-3 text-sm text-muted">No courses assigned yet.</li>}
          </ul>
        </DashboardCard>
        <DashboardCard title="Grading queue" action={<Link href="/instructor/grading" className="text-sm font-semibold text-brand-700">Open</Link>}>
          <ul className="space-y-3">
            {toGrade.slice(0, 5).map((q) => (
              <li key={q.sub.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy-900">{q.assessment.title}</p><p className="truncate text-xs text-muted">{q.learner.name}</p></div>
                <Badge tone="warning">To grade</Badge>
              </li>
            ))}
            {toGrade.length === 0 && <li className="text-sm text-muted">Nothing waiting. 🎉</li>}
          </ul>
        </DashboardCard>
      </div>
    </>
  );
}
