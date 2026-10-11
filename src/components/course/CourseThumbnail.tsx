import type { Course } from "@/types";
import { DataImage } from "@/components/ui/DataImage";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/format";

const hues: Record<Course["thumbnail"]["hue"], string> = {
  navy: "from-navy-800 to-navy-950",
  blue: "from-brand-600 to-brand-900",
  teal: "from-verify-600 to-navy-900",
  indigo: "from-[#3b3fb8] to-navy-900",
  slate: "from-slate-600 to-slate-900",
  sky: "from-[#2b7fcf] to-navy-800",
};

/**
 * Course cover. Uses `course.image` when set in data/courses.json;
 * otherwise draws generated artwork from `course.thumbnail`.
 */
export function CourseThumbnail({
  course,
  className,
  large,
  sizes = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw",
  priority,
}: {
  course: Course;
  className?: string;
  large?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  if (course.image) {
    return (
      <div className={cn("island relative isolate overflow-hidden bg-navy-900", className)}>
        <DataImage
          src={course.image}
          alt={course.imageAlt ?? ""}
          sizes={sizes}
          priority={priority}
          className="transition-transform duration-700 group-hover:scale-105"
        />
        {/* Keeps overlaid badges legible on any photo */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/35 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" aria-hidden />
      </div>
    );
  }

  return (
    <div className={cn("island relative isolate overflow-hidden bg-gradient-to-br", hues[course.thumbnail.hue], className)} aria-hidden>
      <div className="guilloche absolute inset-0 opacity-80" />
      <svg className="absolute -right-10 -top-10 size-56 text-white/10 transition-transform duration-700 group-hover:scale-110" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="98" stroke="currentColor" />
        <circle cx="100" cy="100" r="70" stroke="currentColor" />
        <circle cx="100" cy="100" r="42" stroke="currentColor" />
      </svg>
      <div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-black/25 to-transparent" />
      <div
        className={cn(
          "absolute flex items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25",
          large ? "bottom-8 left-8 size-20" : "bottom-5 left-5 size-14",
        )}
      >
        <Icon name={course.thumbnail.icon} className={large ? "size-10" : "size-7"} strokeWidth={1.6} />
      </div>
    </div>
  );
}
