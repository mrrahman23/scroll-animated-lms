import { BookOpen, ClipboardCheck, Plus, Star, Users } from "lucide-react";
import { DashboardCard, DashboardHeader, StatsCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/ui/interactive";
import { getCourses, getPortalData, getUsers } from "@/lib/api";
import { formatNumber } from "@/lib/format";

export async function InstructorDemoDashboard() {
  const [users, portals, allCourses] = await Promise.all([getUsers(), getPortalData(), getCourses()]);
  const me = users.instructor;
  const data = portals.instructor;
  const courses = allCourses.filter((c) => c.instructorId === me.instructorId);
  const titleOf = Object.fromEntries(allCourses.map((c) => [c.id, c.title]));

  return (
    <>
      <DashboardHeader title={`Welcome back, ${me.firstName}`} description="Manage your courses, lessons and assessments." action={<Button size="sm"><Plus className="size-4" aria-hidden /> New course</Button>} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard label="Active courses" value={courses.length} icon={BookOpen} />
        <StatsCard label="Enrolled students" value={formatNumber(courses.reduce((s, c) => s + c.students, 0))} icon={Users} tone="navy" />
        <StatsCard label="Awaiting grading" value={data.awaitingGrading} icon={ClipboardCheck} tone="seal" />
        <StatsCard label="Average rating" value={data.averageRating.toFixed(1)} icon={Star} tone="verify" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <DashboardCard title="My courses">
          {courses.length ? (
            <ul className="divide-y divide-line">
              {courses.map((c) => (
                <li key={c.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_180px] sm:items-center">
                  <div>
                    <p className="font-semibold text-navy-900">{c.title}</p>
                    <p className="text-xs text-muted">{formatNumber(c.students)} students · {c.curriculum.length} modules</p>
                  </div>
                  <ProgressBar value={data.courseCompletion[c.id] ?? 0} label="Avg. completion" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<BookOpen className="size-5" />} title="No courses yet" description="Courses assigned to you will appear here." />
          )}
        </DashboardCard>
        <DashboardCard title="Grading queue">
          <ul className="space-y-3">
            {data.gradingQueue.map((q) => (
              <li key={q.student + q.task} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy-900">{q.task}</p><p className="truncate text-xs text-muted">{q.student} · {titleOf[q.courseId]}</p></div>
                <Badge tone="warning">To grade</Badge>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </>
  );
}
