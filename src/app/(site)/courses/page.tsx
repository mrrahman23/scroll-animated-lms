import type { Metadata } from "next";
import { CategoryCard } from "@/components/course/CategoryCard";
import { CourseExplorer } from "@/components/course/CourseExplorer";
import { PageHero } from "@/components/ui/primitives";
import { getCategories, getPublicCourses, getPage } from "@/lib/api";
import type { CourseFilter } from "@/lib/filters";

export const metadata: Metadata = {
  title: "All Courses",
  description: "Browse NYTI online and offline training programmes across IT, business, design, healthcare, technical trades and more.",
};

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const sp = await searchParams;
  const [courses, categories, page] = await Promise.all([getPublicCourses(), getCategories(), getPage("courses")]);
  const initial: CourseFilter = {
    q: str(sp.q),
    categoryId: str(sp.category) ?? "all",
    mode: (str(sp.mode) as CourseFilter["mode"]) ?? "all",
    level: str(sp.level) ?? "all",
    price: (str(sp.price) as CourseFilter["price"]) ?? "all",
    sort: (str(sp.sort) as CourseFilter["sort"]) ?? "popular",
  };

  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description} />
      <section className="container-page py-12 sm:py-16">
        <CourseExplorer courses={courses} categories={categories} initial={initial} />
      </section>
      <section id="categories" className="scroll-mt-28 border-t border-line bg-surface py-16">
        <div className="container-page">
          <h2 className="display mb-8 text-2xl sm:text-3xl">Course categories</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
