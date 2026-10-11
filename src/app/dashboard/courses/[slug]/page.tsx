import { ArrowLeft, Award, CircleCheck, CirclePlay, ClipboardList, FileText, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CourseThumbnail } from "@/components/course/CourseThumbnail";
import { LessonToggle } from "@/components/dashboard/LessonToggle";
import { SubmitAssessment } from "@/components/dashboard/SubmitAssessment";
import { DashboardCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/interactive";
import { getAssessments, getCourse, getCurrentUser, getEnrollments } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import type { Lesson } from "@/types";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/[slug]">): Promise<Metadata> {
  const course = await getCourse((await params).slug);
  return { title: course ? course.title : "Course" };
}

const icons: Record<Lesson["type"], typeof CirclePlay> = { video: CirclePlay, reading: FileText, quiz: ClipboardList, assignment: ClipboardList, practical: Wrench };

export default async function LearnPage({ params }: PageProps<"/dashboard/courses/[slug]">) {
  const { slug } = await params;
  const [me, course] = await Promise.all([getCurrentUser(), getCourse(slug)]);
  if (!course) notFound();
  const enrollment = (await getEnrollments(me.id)).find((e) => e.courseId === course.id);
  if (!enrollment) redirect(`/courses/${slug}`);

  const demo = isDemoMode();
  const done = demo ? new Set<string>() : await (await import("@/lib/services/learning")).completedLessonIds(me.id, course.id);
  const assessments = await getAssessments([course.id], me.id);
  const pending = enrollment.status === "pending";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> My courses
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="display text-2xl sm:text-3xl">{course.title}</h1>
            <p className="mt-1 text-muted">{course.shortDescription}</p>
          </div>

          {pending ? (
            <div role="status" className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200">
              <strong className="font-semibold">Waiting for payment confirmation.</strong> Lessons unlock as soon as an administrator confirms your payment. See{" "}
              <Link href="/dashboard/payments" className="font-semibold underline">Payments</Link>.
            </div>
          ) : (
            course.curriculum.map((m) => (
              <DashboardCard key={m.id} title={m.title} action={<span className="text-xs text-muted">{m.lessons.filter((l) => done.has(l.id)).length}/{m.lessons.length} done</span>}>
                <ul className="-my-2 divide-y divide-line">
                  {m.lessons.map((l) => {
                    const Icon = icons[l.type];
                    return (
                      <li key={l.id} className="flex items-center gap-3 py-3">
                        {demo ? <CircleCheck className="size-5 text-navy-200" aria-hidden /> : <LessonToggle courseSlug={course.slug} lessonId={l.id} title={l.title} done={done.has(l.id)} />}
                        <Icon className="size-4 shrink-0 text-navy-400" aria-hidden />
                        <span className={`flex-1 text-sm ${done.has(l.id) ? "text-muted line-through" : "text-slate-700"}`}>{l.title}</span>
                        <span className="text-xs tabular-nums text-muted">{l.durationMinutes} min</span>
                      </li>
                    );
                  })}
                </ul>
              </DashboardCard>
            ))
          )}

          {!pending && assessments.length > 0 && (
            <DashboardCard title="Assessments">
              <ul className="-my-2 divide-y divide-line">
                {assessments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy-900">{a.title}</p>
                      <p className="text-xs text-muted">{a.type} · due {formatDate(a.dueDate, "short")} · pass mark {Math.ceil(a.maxScore * 0.5)}/{a.maxScore}</p>
                    </div>
                    {a.status === "graded" ? (
                      <Badge tone={(a.score ?? 0) >= a.maxScore * 0.5 ? "verify" : "danger"}>{a.score}/{a.maxScore}</Badge>
                    ) : a.status === "submitted" ? (
                      <Badge tone="brand">Submitted</Badge>
                    ) : (
                      <Badge tone={a.status === "overdue" ? "danger" : "neutral"} className="capitalize">{a.status}</Badge>
                    )}
                    {!demo && a.status !== "graded" && <SubmitAssessment assessmentId={a.id} resubmit={a.status === "submitted"} />}
                  </li>
                ))}
              </ul>
            </DashboardCard>
          )}
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl"><CourseThumbnail course={course} className="aspect-[16/10]" sizes="320px" /></div>
          <DashboardCard title="Your progress">
            <ProgressBar value={enrollment.progress} label={`${enrollment.completedLessons} of ${enrollment.totalLessons} lessons`} tone={enrollment.status === "completed" ? "verify" : "brand"} />
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Complete every lesson and pass each assessment (50% or more) to finish the course.
              {enrollment.mode === "online" ? " Online learners receive their NYTI certificate automatically." : " Offline learners are certified through their training partner."}
            </p>
            {enrollment.certificateId && (
              <ButtonLink href={`/dashboard/certificates/${enrollment.certificateId}`} variant="verify" className="mt-4 w-full">
                <Award className="size-4" aria-hidden /> View certificate
              </ButtonLink>
            )}
          </DashboardCard>
        </aside>
      </div>
    </div>
  );
}
