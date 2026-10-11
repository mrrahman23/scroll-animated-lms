import type { Course, LearningMode, Partner } from "@/types";

export interface CourseFilter {
  q?: string;
  categoryId?: string;
  mode?: LearningMode | "all";
  level?: string;
  price?: "all" | "free" | "paid";
  sort?: "popular" | "rating" | "price-asc" | "price-desc" | "newest";
}

export function filterCourses(list: Course[], f: CourseFilter): Course[] {
  const q = f.q?.trim().toLowerCase();
  const out = list.filter((c) => {
    if (q && !`${c.title} ${c.shortDescription}`.toLowerCase().includes(q)) return false;
    if (f.categoryId && f.categoryId !== "all" && c.categoryId !== f.categoryId) return false;
    if (f.mode && f.mode !== "all" && !c.modes.includes(f.mode)) return false;
    if (f.level && f.level !== "all" && c.level !== f.level) return false;
    if (f.price === "free" && c.price > 0) return false;
    if (f.price === "paid" && c.price === 0) return false;
    return true;
  });
  switch (f.sort) {
    case "rating":
      return out.sort((a, b) => b.rating - a.rating);
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "newest":
      return out.sort((a, b) => (b.nextIntake ?? "").localeCompare(a.nextIntake ?? "") * -1);
    default:
      return out.sort((a, b) => b.students - a.students);
  }
}

export interface PartnerFilter {
  q?: string;
  city?: string;
  categoryId?: string;
  mode?: LearningMode | "all";
}

export function filterPartners(list: Partner[], f: PartnerFilter): Partner[] {
  const q = f.q?.trim().toLowerCase();
  return list.filter((p) => {
    if (q && !`${p.name} ${p.city} ${p.authorizationNumber}`.toLowerCase().includes(q)) return false;
    if (f.city && f.city !== "all" && p.city !== f.city) return false;
    if (f.categoryId && f.categoryId !== "all" && !p.categoryIds.includes(f.categoryId)) return false;
    if (f.mode && f.mode !== "all" && !p.modes.includes(f.mode)) return false;
    return true;
  });
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((current - 1) * perPage, current * perPage), page: current, totalPages };
}
