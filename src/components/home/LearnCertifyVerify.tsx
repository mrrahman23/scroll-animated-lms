import { Award, BookOpen, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";

const steps = [
  { label: "Learn", icon: BookOpen, dot: "bg-brand-500", ring: "ring-brand-500/30" },
  { label: "Certify", icon: Award, dot: "bg-seal-500", ring: "ring-seal-500/30" },
  { label: "Verify", icon: ShieldCheck, dot: "bg-verify-500", ring: "ring-verify-500/30" },
];

/** NYTI's core identity motif: the three connected ecosystems. */
export function LearnCertifyVerify({ inverse, size = "md" }: { inverse?: boolean; size?: "md" | "lg" }) {
  return (
    <ol className="flex items-center" aria-label="Learn, then certify, then verify">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center">
          <span className="flex items-center gap-2 sm:gap-2.5">
            <span
              className={cn(
                "flex items-center justify-center rounded-full text-white ring-4",
                s.dot,
                s.ring,
                size === "lg" ? "size-10" : "size-8",
              )}
            >
              <s.icon className={size === "lg" ? "size-5" : "size-4"} aria-hidden />
            </span>
            <span className={cn("font-semibold uppercase", size === "lg" ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs", "tracking-[0.1em] sm:tracking-[0.14em]", inverse ? "text-white" : "text-navy-900")}>
              {s.label}
            </span>
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden className={cn("lcv-line mx-2 h-px w-4 sm:mx-4 sm:w-12", inverse ? "bg-white/25" : "bg-navy-200")}>
              <span className={cn("block h-px w-1/2", inverse ? "bg-white/60" : "bg-navy-400")} />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
