import type { Metadata } from "next";
import { CourseExplorer } from "@/components/course/CourseExplorer";
import { PageHero } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { getCategories, getPublicCourses, getPage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Online Courses",
  description: "Flexible NYTI online courses with video lessons, online assessments, instructor support and a verifiable digital certificate.",
};


export default async function OnlineCoursesPage() {
  const [courses, categories, page] = await Promise.all([getPublicCourses(), getCategories(), getPage("online-courses")]);
  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {page.features.map((f) => (
            <li key={f.title} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
              <Icon name={f.icon} className="size-5 shrink-0 text-brand-600" />
              <span>
                <span className="block text-sm font-semibold text-navy-900">{f.title}</span>
                <span className="block text-xs text-muted">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </PageHero>
      <section className="container-page py-12 sm:py-16">
        <CourseExplorer courses={courses} categories={categories} lockMode="online" />
      </section>
    </>
  );
}
