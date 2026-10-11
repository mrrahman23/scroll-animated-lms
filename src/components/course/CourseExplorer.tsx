"use client";

import { ArrowRight, SearchX, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Category, Course, LearningMode } from "@/types";
import { buttonClasses } from "@/components/ui/Button";
import { SearchInput, Select } from "@/components/ui/forms";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/primitives";
import { filterCourses, paginate, type CourseFilter } from "@/lib/filters";
import { cn } from "@/lib/format";
import { CourseCard, CourseGrid } from "./CourseCard";

const PER_PAGE = 9;

export function CourseExplorer({
  courses,
  categories,
  initial = {},
  lockMode,
  compact,
}: {
  courses: Course[];
  categories: Category[];
  initial?: CourseFilter;
  /** Fixes the learning mode (used by /online-courses and /offline-training). */
  lockMode?: LearningMode;
  /** Homepage variant: search + category chips, first 6 results, no URL sync. */
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<CourseFilter>({ mode: lockMode ?? "all", sort: "popular", ...initial });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(() => filterCourses(courses, filter), [courses, filter]);
  const paged = compact ? { items: results.slice(0, 6), page: 1, totalPages: 1 } : paginate(results, page, PER_PAGE);
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  // Keep URL shareable on the full catalog
  useEffect(() => {
    if (compact) return;
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.categoryId && filter.categoryId !== "all") params.set("category", filter.categoryId);
    if (!lockMode && filter.mode && filter.mode !== "all") params.set("mode", filter.mode);
    if (filter.level && filter.level !== "all") params.set("level", filter.level);
    if (filter.price && filter.price !== "all") params.set("price", filter.price);
    if (filter.sort && filter.sort !== "popular") params.set("sort", filter.sort);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filter, compact, lockMode, pathname, router]);

  const update = (patch: Partial<CourseFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const chips = [{ id: "all", name: "All Programs" }, ...categories];

  return (
    <div>
      <div className={cn("flex flex-col gap-3", !compact && "md:flex-row")}>
        <SearchInput
          label="Search courses"
          placeholder="Search courses, e.g. graphic design, accounting…"
          value={filter.q ?? ""}
          onChange={(e) => update({ q: e.target.value })}
          className="flex-1"
        />
        {!compact && (
          <>
            <button
              className={cn(buttonClasses({ variant: "secondary" }), "md:hidden")}
              aria-expanded={showFilters}
              aria-controls="course-filters"
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal className="size-4" aria-hidden /> Filters
            </button>
            <div id="course-filters" className={cn("grid grid-cols-2 gap-3 md:flex", !showFilters && "hidden md:flex")}>
              {!lockMode && (
                <Select aria-label="Learning mode" value={filter.mode} onChange={(e) => update({ mode: e.target.value as CourseFilter["mode"] })}>
                  <option value="all">All modes</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </Select>
              )}
              <Select aria-label="Level" value={filter.level ?? "all"} onChange={(e) => update({ level: e.target.value })}>
                <option value="all">All levels</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>All Levels</option>
              </Select>
              <Select aria-label="Price" value={filter.price ?? "all"} onChange={(e) => update({ price: e.target.value as CourseFilter["price"] })}>
                <option value="all">Any price</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </Select>
              <Select aria-label="Sort by" value={filter.sort} onChange={(e) => update({ sort: e.target.value as CourseFilter["sort"] })}>
                <option value="popular">Most popular</option>
                <option value="rating">Highest rated</option>
                <option value="newest">Next intake</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </Select>
            </div>
          </>
        )}
      </div>

      <div role="group" aria-label="Filter by category" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((c) => {
          const active = (filter.categoryId ?? "all") === c.id;
          return (
            <button
              key={c.id}
              aria-pressed={active}
              onClick={() => update({ categoryId: c.id })}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                active ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-slate-700 hover:border-navy-300",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {results.length === 0 ? "No courses match your filters." : `Showing ${paged.items.length} of ${results.length} programmes`}
      </p>

      <div className="mt-4">
        {results.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title="No matching courses"
            description="Try a different keyword or category. New programmes are added every month."
            action={
              <button className={buttonClasses({ variant: "secondary" })} onClick={() => update({ q: "", categoryId: "all", level: "all", price: "all" })}>
                Clear filters
              </button>
            }
          />
        ) : (
          <CourseGrid>
            {paged.items.map((c) => (
              <CourseCard key={c.id} course={c} category={catById[c.categoryId]} />
            ))}
          </CourseGrid>
        )}
      </div>

      {compact ? (
        results.length > 6 && (
          <div className="mt-10 text-center">
            <Link href="/courses" className={buttonClasses({ variant: "secondary" })}>
              See all {results.length} matching programmes <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )
      ) : (
        <Pagination page={paged.page} totalPages={paged.totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      )}
    </div>
  );
}
