import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function Card({ className, children, as: As = "div" }: { className?: string; children: ReactNode; as?: "div" | "article" | "section" | "li" }) {
  return <As className={cn("fx-card rounded-(--radius-card) border border-line bg-white shadow-(--shadow-card)", className)}>{children}</As>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  inverse,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  inverse?: boolean;
  id?: string;
}) {
  return (
    <div
      data-reveal
      className={cn(
        "mb-10 flex flex-col gap-6 md:mb-12",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className={cn("eyebrow mb-3", inverse && "text-brand-300")}>{eyebrow}</p>}
        <h2 id={id} className={cn("display text-3xl leading-tight sm:text-4xl", inverse && "text-white")}>
          {title}
        </h2>
        {description && <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", inverse ? "text-navy-200" : "text-muted")}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-seal-400 text-seal-400" aria-hidden />
      <span className="font-semibold text-ink">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-muted">({count.toLocaleString("en-US")})</span>}
      <span className="sr-only">out of 5 stars</span>
    </span>
  );
}

const avatarTones = ["bg-brand-100 text-brand-800", "bg-verify-100 text-verify-800", "bg-navy-100 text-navy-800", "bg-seal-100 text-seal-700"];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const initials = name
    .replace(/^(Md\.|Engr\.)\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const tone = avatarTones[name.length % avatarTones.length];
  const sz = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-16 text-lg" }[size];
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", tone, sz, className)}>
      {initials}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-surface px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-navy-500 shadow-sm">{icon}</div>
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHero({ eyebrow, title, description, children }: { eyebrow?: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="grid-dots absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
      <div className="container-page relative py-14 sm:py-20">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="display max-w-3xl text-4xl leading-[1.1] sm:text-5xl">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
