import { AssessmentRow } from "@/components/dashboard/student";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { getAssessments, getCourses, getCurrentUser, getEnrollments } from "@/lib/api";
import type { Assessment } from "@/types";

export async function AssessmentList({ title, description, types }: { title: string; description: string; types: Assessment["type"][] }) {
  const user = await getCurrentUser();
  const [enrollments, courses] = await Promise.all([getEnrollments(user.id), getCourses()]);
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const items = (await getAssessments(enrollments.map((e) => e.courseId), user.id)).filter((a) => types.includes(a.type));
  const upcoming = items.filter((a) => a.status === "upcoming" || a.status === "overdue");
  const done = items.filter((a) => a.status === "graded" || a.status === "submitted");
  return (
    <>
      <DashboardHeader title={title} description={description} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title={`Upcoming (${upcoming.length})`}>
          {upcoming.length ? <ul className="-my-3 divide-y divide-line">{upcoming.map((a) => <AssessmentRow key={a.id} a={a} course={byId[a.courseId]} />)}</ul> : <p className="text-sm text-muted">Nothing due. Well done!</p>}
        </DashboardCard>
        <DashboardCard title={`Completed (${done.length})`}>
          {done.length ? <ul className="-my-3 divide-y divide-line">{done.map((a) => <AssessmentRow key={a.id} a={a} course={byId[a.courseId]} />)}</ul> : <p className="text-sm text-muted">No completed items yet.</p>}
        </DashboardCard>
      </div>
    </>
  );
}
