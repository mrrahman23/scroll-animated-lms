import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function DashboardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** StatsCard: label · value · optional delta (signed, vs named period). */
export function StatsCard({ label, value, icon: Icon, delta, tone = "brand" }: { label: string; value: ReactNode; icon: LucideIcon; delta?: { value: string; positive: boolean; period: string }; tone?: "brand" | "verify" | "seal" | "navy" }) {
  const tones = { brand: "bg-brand-50 text-brand-700", verify: "bg-verify-50 text-verify-700", seal: "bg-seal-100 text-seal-700", navy: "bg-navy-50 text-navy-700" };
  return (
    <div className="fx-card rounded-2xl border border-line bg-white p-5 shadow-(--shadow-card)">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tones[tone])}><Icon className="size-[18px]" aria-hidden /></span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-navy-900">{value}</p>
      {delta && (
        <p className="mt-1 text-xs text-muted">
          <span className={cn("font-semibold", delta.positive ? "text-verify-700" : "text-red-700")}>{delta.value}</span> vs {delta.period}
        </p>
      )}
    </div>
  );
}

export function DashboardCard({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("fx-card rounded-2xl border border-line bg-white p-5 shadow-(--shadow-card) sm:p-6", className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-navy-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
