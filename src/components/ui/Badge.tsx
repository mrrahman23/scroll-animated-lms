import type { ReactNode } from "react";
import { cn } from "@/lib/format";

type Tone = "neutral" | "brand" | "navy" | "verify" | "warning" | "danger" | "seal" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  navy: "bg-navy-900 text-white",
  verify: "bg-verify-50 text-verify-700 ring-1 ring-inset ring-verify-100",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  seal: "bg-seal-100 text-seal-700",
  outline: "bg-white text-navy-800 ring-1 ring-inset ring-navy-200",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
