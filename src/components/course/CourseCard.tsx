import { ArrowRight, Award, Clock, Signal, Users } from "lucide-react";
import Link from "next/link";
import type { Category, Course, Instructor } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/primitives";
import { cn, formatCompact, formatDuration, formatPrice, modeLabel } from "@/lib/format";
import { CourseThumbnail } from "./CourseThumbnail";

export function ModeBadges({ modes }: { modes: Course["modes"] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {modes.map((m) => (
        <Badge key={m} tone="outline" icon={<span className={cn("size-1.5 rounded-full", m === "online" ? "bg-brand-500" : "bg-seal-500")} />}>
          {modeLabel[m]}
        </Badge>
      ))}
    </div>
  );
}

export function CourseCard({
  course,
  category,
  instructor,
  variant = "catalog",
}: {
  course: Course;
  category?: Category;
  instructor?: Instructor;
  variant?: "catalog" | "featured";
}) {
  const href = `/courses/${course.slug}`;
  return (
    <article className="fx-card group relative flex h-full flex-col overflow-hidden rounded-(--radius-card) border border-line bg-white shadow-(--shadow-card) transition-all duration-300 hover:-translate-y-1 hover:shadow-(--shadow-lift)">
      <div className="relative">
        <CourseThumbnail course={course} className="aspect-[16/9]" />
        <div className="absolute left-4 top-4">
          <ModeBadges modes={course.modes} />
        </div>
        {course.certificate && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-seal-100 px-2.5 py-0.5 text-xs font-semibold text-seal-700 shadow-sm">
            <Award className="size-3.5" aria-hidden /> NYTI Certified
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700">
          <span>{category?.name}</span>
          <Rating value={course.rating} className="normal-case tracking-normal" />
        </div>
        <h3 className="text-lg font-semibold leading-snug text-navy-900">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        {variant === "featured" && instructor ? (
          <p className="mt-1 text-sm text-muted">with {instructor.name}</p>
        ) : (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{course.shortDescription}</p>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-navy-400" aria-hidden />
            <dt className="sr-only">Duration</dt>
            <dd>{formatDuration(course)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Signal className="size-3.5 text-navy-400" aria-hidden />
            <dt className="sr-only">Level</dt>
            <dd>{course.level}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-navy-400" aria-hidden />
            <dt className="sr-only">Students</dt>
            <dd>{formatCompact(course.students)}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between pt-5">
          <p className="text-lg font-bold text-navy-900">
            <span className="sr-only">Price: </span>
            {formatPrice(course.price)}
          </p>
          <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", variant === "featured" ? "rounded-lg bg-brand-600 px-3.5 py-2 text-white transition-colors group-hover:brightness-110" : "text-brand-700")}>
            {variant === "featured" ? "Enroll" : "View Course"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}

export function CourseGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}
