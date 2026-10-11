"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleLesson } from "@/app/dashboard/actions";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/format";

/** Checkbox-style button that marks a lesson complete (optimistic UI). */
export function LessonToggle({ courseSlug, lessonId, title, done }: { courseSlug: string; lessonId: string; title: string; done: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(done);
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${optimistic ? "Mark as not complete" : "Mark as complete"}: ${title}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          try {
            const r = await toggleLesson(courseSlug, lessonId, !optimistic);
            if (r.certificateId) toast({ tone: "success", title: "Course complete — certificate issued!", description: r.certificateId });
            else if (r.completed) toast({ tone: "success", title: "Course complete!", description: "Well done." });
            router.refresh();
          } catch (err) {
            toast({ tone: "error", title: "Couldn't update", description: err instanceof Error ? err.message : undefined });
          }
        })
      }
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
        optimistic ? "border-verify-600 bg-verify-600 text-white" : "border-navy-300 bg-white hover:border-verify-600",
      )}
    >
      {optimistic && <Check className="size-4" strokeWidth={3} aria-hidden />}
    </button>
  );
}
