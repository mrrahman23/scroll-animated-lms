import { CategoryCard } from "@/components/course/CategoryCard";
import { CourseExplorer } from "@/components/course/CourseExplorer";
import { Hero } from "@/components/home/Hero";
import {
  CategoryMarquee,
  CertificationSteps,
  FeaturedCourses,
  FinalCTA,
  NewsSection,
  OnlineOffline,
  PartnersSection,
  StatsBand,
  Testimonials,
  VerifySection,
  WhyNYTI,
  WorldWindow,
} from "@/components/home/sections";
import { SectionHeader } from "@/components/ui/primitives";
import {
  getCategories,
  getPublicCourses,
  getFeaturedCourses,
  getInstructors,
  getNews,
  getPage,
  getPartners,
  getPlatformStats,
  getSite,
  getTestimonials,
} from "@/lib/api";

export default async function HomePage() {
  const [page, site, stats, categories, courses, instructors, partners, testimonials] = await Promise.all([
    getPage("home"),
    getSite(),
    getPlatformStats(),
    getCategories(),
    getPublicCourses(),
    getInstructors(),
    getPartners(),
    getTestimonials(),
  ]);
  const [featured, news] = await Promise.all([getFeaturedCourses(page.featured.count), getNews(page.news.count)]);

  return (
    <>
      <Hero content={page.hero} />
      <StatsBand stats={stats} />
      <CategoryMarquee categories={categories} />

      {/* Course search + category discovery */}
      <section className="py-20 sm:py-24" aria-labelledby="explore-title">
        <div className="container-page">
          <SectionHeader id="explore-title" eyebrow={page.explore.eyebrow} title={page.explore.title} description={page.explore.description} />
          <div data-reveal>
            <CourseExplorer courses={courses} categories={categories} compact />
          </div>

          <div id="categories" className="mt-20 scroll-mt-28">
            <h3 className="mb-6 text-xl font-semibold text-navy-900">{page.explore.categoriesTitle}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((c, i) => (
                <div key={c.id} data-reveal style={{ transitionDelay: `${(i % 4) * 50}ms` }}>
                  <CategoryCard category={c} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FeaturedCourses content={page.featured} courses={featured} categories={categories} instructors={instructors} />
      <OnlineOffline content={page.modes} />
      <CertificationSteps content={page.certification} siteName={site.name} />
      <VerifySection content={page.verify} />
      <PartnersSection content={page.partners} partners={partners} />
      <WhyNYTI content={page.why} />
      <Testimonials content={page.testimonials} items={testimonials} />
      <NewsSection content={page.news} items={news} />
      <WorldWindow content={page.worldWindow} />
      <FinalCTA content={page.finalCta} />
    </>
  );
}
