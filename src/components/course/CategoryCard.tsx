import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/types";
import { Icon } from "@/components/ui/Icon";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/courses?category=${category.id}`}
      className="fx-card group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-(--shadow-card)"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
        <Icon name={category.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-navy-900">{category.name}</span>
        <span className="block text-sm text-muted">{category.courseCount} courses</span>
      </span>
      <ArrowUpRight className="size-4 text-navy-300 transition-all group-hover:text-brand-600" aria-hidden />
    </Link>
  );
}
