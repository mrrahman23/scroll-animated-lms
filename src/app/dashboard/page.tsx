import { Award, BookOpen, CircleCheck, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AssessmentRow, ContinueLearningCard } from "@/components/dashboard/student";
import { DashboardCard, StatsCard } from "@/components/dashboard/widgets";
import { ButtonLink } from "@/components/ui/Button";
import { getAssessments, getCertificatesForUser, getCourses, getCurrentUser, getEnrollments, getLearningStats, getNotifications } from "@/lib/api";
import { relativeTime } from "@/lib/format";

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  const [enrollments, certs, courses, notifications, stats] = await Promise.all([getEnrollments(user.id), getCertificatesForUser(user.id), getCourses(), getNotifications(user.id), getLearningStats(user.id)]);
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const assessments = await getAssessments(enrollments.map((e) => e.courseId), user.id);
  const active = enrollments.filter((e) => e.status === "active");

  return (
    <div className="space-y-8">
      <div className="island relative overflow-hidden rounded-3xl bg-navy-900 p-6 text-white sm:p-8">
        <div className="guilloche absolute inset-0" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-navy-200">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Welcome back, {user.firstName}!</h1>
            <p className="mt-2 text-navy-100">You have {assessments.filter((a) => a.status === "upcoming").length} assessments coming up this fortnight. Keep going.</p>
          </div>
          {active[0] ? (
            <ButtonLink href={`/dashboard/courses/${byId[active[0].courseId]?.slug}`} variant="inverse">Resume learning</ButtonLink>
          ) : (
            <ButtonLink href="/courses" variant="inverse">Find a course</ButtonLink>
          )}
        </div>
      </div>

      <section aria-label="My statistics" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard label="Courses Enrolled" value={stats.enrolled} icon={BookOpen} />
        <StatsCard label="Courses Completed" value={stats.completed} icon={CircleCheck} tone="verify" />
        <StatsCard label="Certificates Earned" value={stats.certificates} icon={Award} tone="seal" />
        <StatsCard label="Learning Hours" value={stats.learningHours} icon={Clock} tone="navy" />
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="continue-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="continue-title" className="text-lg font-semibold text-navy-900">Continue Learning</h2>
            <Link href="/dashboard/courses" className="text-sm font-semibold text-brand-700">All courses</Link>
          </div>
          <div className="space-y-4">
            {active.map((e) => <ContinueLearningCard key={e.id} enrollment={e} course={byId[e.courseId]} />)}
          </div>
        </section>

        <div className="space-y-6">
          <DashboardCard title="Upcoming assessments" action={<Link href="/dashboard/assessments" className="text-sm font-semibold text-brand-700">View all</Link>}>
            <ul className="-my-3 divide-y divide-line">
              {assessments.slice(0, 4).map((a) => <AssessmentRow key={a.id} a={a} course={byId[a.courseId]} />)}
            </ul>
          </DashboardCard>
          <DashboardCard title="My certificates" action={<Link href="/dashboard/certificates" className="text-sm font-semibold text-brand-700">View all</Link>}>
            <ul className="space-y-3">
              {certs.map((c) => (
                <li key={c.id}>
                  <Link href={`/dashboard/certificates/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-seal-400/50 hover:bg-seal-100/30">
                    <Award className="size-8 shrink-0 text-seal-500" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy-900">{c.courseTitle}</span>
                      <span className="block font-mono text-xs text-muted">{c.id}</span>
                    </span>
                    <ShieldCheck className="size-5 text-verify-600" aria-label="Valid" />
                  </Link>
                </li>
              ))}
            </ul>
          </DashboardCard>
          <DashboardCard title="Recent notifications">
            <ul className="space-y-4">
              {notifications.slice(0, 3).map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-navy-200" : "bg-brand-500"}`} aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{n.title}{!n.read && <span className="sr-only"> (unread)</span>}</p>
                    <p className="text-xs text-muted">{n.body} · {relativeTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
