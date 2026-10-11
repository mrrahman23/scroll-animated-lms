import { ArrowRight, Award, CalendarClock, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { Assessment, Course, Enrollment } from "@/types";
import { CourseThumbnail } from "@/components/course/CourseThumbnail";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/interactive";
import { formatDate, modeLabel } from "@/lib/format";

export function ContinueLearningCard({ enrollment, course }: { enrollment: Enrollment; course: Course }) {
  const done = enrollment.status === "completed";
  const pending = enrollment.status === "pending";
  return (
    <article className="fx-card group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift) sm:flex-row">
      <CourseThumbnail course={course} className="aspect-[16/9] sm:aspect-auto sm:w-44 sm:shrink-0" sizes="(min-width: 640px) 176px, 100vw" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={done ? "verify" : pending ? "warning" : "brand"}>{done ? "Completed" : pending ? "Awaiting payment" : "In progress"}</Badge>
          <Badge tone="neutral">{modeLabel[enrollment.mode]}</Badge>
        </div>
        <h3 className="mt-3 font-semibold text-navy-900">{course.title}</h3>
        {!done && enrollment.nextLessonTitle && <p className="mt-1 text-sm text-muted">Next: {enrollment.nextLessonTitle}</p>}
        <div className="mt-4">
          <ProgressBar value={enrollment.progress} label={`${enrollment.completedLessons} of ${enrollment.totalLessons} lessons`} tone={done ? "verify" : "brand"} />
        </div>
        <div className="mt-4">
          {done && enrollment.certificateId ? (
            <Link href={`/dashboard/certificates/${enrollment.certificateId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-verify-700 hover:text-verify-800">
              <Award className="size-4" aria-hidden /> View certificate
            </Link>
          ) : (
            <Link href={`/dashboard/courses/${course.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
              Continue Learning <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

const assessmentTone = { upcoming: "brand", submitted: "neutral", graded: "verify", overdue: "danger" } as const;

export function AssessmentRow({ a, course }: { a: Assessment; course?: Course }) {
  return (
    <li className="flex items-center gap-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
        {a.status === "graded" ? <CircleCheck className="size-5 text-verify-600" aria-hidden /> : <CalendarClock className="size-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy-900">
          {course ? (
            <Link href={`/dashboard/courses/${course.slug}`} className="hover:text-brand-700">
              {a.title}
            </Link>
          ) : (
            a.title
          )}
        </p>
        <p className="truncate text-xs text-muted">{course?.title} · {a.status === "graded" ? "Graded" : `Due ${formatDate(a.dueDate, "short")}`}</p>
      </div>
      {a.score !== undefined ? (
        <span className="text-sm font-bold tabular-nums text-navy-900">{a.score}/{a.maxScore}</span>
      ) : (
        <Badge tone={assessmentTone[a.status]} className="capitalize">{a.status}</Badge>
      )}
    </li>
  );
}
