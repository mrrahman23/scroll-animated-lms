import "server-only";
import { iconNames } from "@/components/ui/Icon";
import { getCategories, getCourses, getInstructors, getPartners } from "@/lib/api";
import type { Option, OptionSource } from "./registry";

/** Choices for the reference fields (category, instructor, partners, courses, icons). */
export async function editorOptions(): Promise<Record<OptionSource, Option[]>> {
  const [categories, instructors, partners, courses] = await Promise.all([getCategories(), getInstructors(), getPartners({ includePending: true }), getCourses()]);
  return {
    categories: categories.map((c) => ({ value: c.id, label: c.name })),
    instructors: instructors.map((i) => ({ value: i.id, label: i.name })),
    partners: partners.map((p) => ({ value: p.id, label: `${p.name}${p.status === "active" ? "" : ` (${p.status})`}` })),
    courses: courses.map((c) => ({ value: c.id, label: c.title })),
    icons: iconNames.map((n) => ({ value: n, label: n })),
  };
}
