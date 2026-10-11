import type { Course, LearningMode } from "@/types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const numberFmt = new Intl.NumberFormat("en-US");
export const formatNumber = (n: number) => numberFmt.format(n);

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatPrice(amount: number) {
  return amount === 0 ? "Free" : `৳${numberFmt.format(amount)}`;
}

export function formatDate(iso: string, style: "long" | "short" = "long") {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-GB", style === "long" ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
}

export function formatDuration(course: Pick<Course, "durationWeeks">) {
  const w = course.durationWeeks;
  if (w % 4 === 0 && w >= 8) return `${w / 4} Months`;
  return `${w} Weeks`;
}

export const modeLabel: Record<LearningMode, string> = {
  online: "Online",
  offline: "Offline",
  hybrid: "Hybrid",
};

export function modesLabel(modes: LearningMode[]) {
  return modes.map((m) => modeLabel[m]).join(" + ");
}

export function relativeTime(iso: string, now = new Date()) {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  const days = Math.round(diff / 86400);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(iso, "short");
}
