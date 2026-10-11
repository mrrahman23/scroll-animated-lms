import type { Metadata } from "next";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { ProgressBar } from "@/components/ui/interactive";
import { getCourses, getCurrentUser, getEnrollments } from "@/lib/api";

export const metadata: Metadata = { title: "Learning Progress" };


export default async function ProgressPage() {
  const user = await getCurrentUser();
  const [enrollments, courses] = await Promise.all([getEnrollments(user.id), getCourses()]);
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const week = user.weeklyHours;
  const total = week.reduce((sum, d) => sum + d.hours, 0);
  const max = Math.max(1, ...week.map((d) => d.hours));
  return (
    <>
      <DashboardHeader title="Learning Progress" description="Track completion across your programmes." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <DashboardCard title="Course completion">
          <ul className="space-y-6">
            {enrollments.map((e) => (
              <li key={e.id}>
                <p className="mb-2 text-sm font-semibold text-navy-900">{byId[e.courseId].title}</p>
                <ProgressBar value={e.progress} label={`${e.completedLessons}/${e.totalLessons} lessons`} tone={e.progress === 100 ? "verify" : "brand"} />
              </li>
            ))}
          </ul>
        </DashboardCard>
        <DashboardCard title="Hours this week">
          <p className="-mt-3 mb-4 text-sm text-muted">{total.toFixed(1)} hours total</p>
          <ul className="flex h-44 items-end justify-between gap-2" aria-label="Learning hours per day this week">
            {week.map(({ day: d, hours: h }) => (
              <li key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${d}: ${h} h`}>
                <span className="text-xs tabular-nums text-muted">{h ? h : ""}</span>
                <span className="w-full max-w-6 rounded-t-[4px] bg-[#2a78d6]" style={{ height: `${(h / max) * 75}%`, minHeight: h ? 4 : 0 }} />
                <span className="text-xs text-muted">{d}</span>
                <span className="sr-only">{h} hours</span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </>
  );
}
