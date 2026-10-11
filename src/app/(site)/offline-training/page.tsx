import { ArrowRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CourseExplorer } from "@/components/course/CourseExplorer";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/primitives";
import { getCategories, getPublicCourses, getPage, getPartners } from "@/lib/api";

export const metadata: Metadata = {
  title: "Offline Training",
  description: "Hands-on classroom and workshop training at NYTI authorized partner centers across Bangladesh.",
};

export default async function OfflineTrainingPage() {
  const [courses, categories, partners, page] = await Promise.all([getPublicCourses(), getCategories(), getPartners(), getPage("offline-training")]);
  const offlinePartners = partners.filter((p) => p.modes.includes("offline"));
  const cities = [...new Set(offlinePartners.map((p) => p.city))];

  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium text-muted">Training centers in:</span>
          {cities.map((c) => (
            <Link key={c} href={`/partners?city=${c}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-sm font-medium text-navy-800 hover:border-navy-300">
              <MapPin className="size-3.5 text-seal-500" aria-hidden /> {c}
            </Link>
          ))}
        </div>
      </PageHero>
      <section className="container-page py-12 sm:py-16">
        <CourseExplorer courses={courses} categories={categories} lockMode="offline" />
      </section>
      <section className="border-t border-line bg-surface py-14">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="display text-2xl">Find a training center near you</h2>
            <p className="mt-2 text-muted">{offlinePartners.length} authorized partners currently deliver classroom training.</p>
          </div>
          <ButtonLink href="/partners">
            Browse partner directory <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
