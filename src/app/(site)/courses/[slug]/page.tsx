import { Award, BadgeCheck, CircleCheck, CirclePlay, ClipboardList, FileText, MapPin, Star, Users, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Lesson } from "@/types";
import { CourseCard, CourseGrid, ModeBadges } from "@/components/course/CourseCard";
import { CourseThumbnail } from "@/components/course/CourseThumbnail";
import { EnrollCard } from "@/components/course/EnrollCard";
import { Badge } from "@/components/ui/Badge";
import { Accordion } from "@/components/ui/interactive";
import { Avatar } from "@/components/ui/primitives";
import { getCategories, getCourse, getCourses, getPublicCourses, getInstructor, getPartnersForCourse, getSite } from "@/lib/api";
import { formatNumber } from "@/lib/format";

export async function generateStaticParams() {
  return (await getCourses()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const course = await getCourse((await params).slug);
  return course ? { title: course.title, description: course.shortDescription } : {};
}

const lessonIcon: Record<Lesson["type"], typeof CirclePlay> = {
  video: CirclePlay,
  reading: FileText,
  quiz: ClipboardList,
  assignment: ClipboardList,
  practical: Wrench,
};

export default async function CourseDetailPage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();

  const [categories, instructor, partners, site, all] = await Promise.all([
    getCategories(),
    getInstructor(course.instructorId),
    getPartnersForCourse(course),
    getSite(),
    getPublicCourses(),
  ]);
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const category = catById[course.categoryId];
  // This page is pre-built and shared by every visitor, so it holds no per-person data:
  // the visitor's own enrolment loads in the browser (EnrollCard → /api/me/enrollment).
  const totalLessons = course.curriculum.reduce((s, m) => s + m.lessons.length, 0);
  const totalMinutes = course.curriculum.reduce((s, m) => s + m.lessons.reduce((x, l) => x + l.durationMinutes, 0), 0);
  const related = all.filter((c) => c.id !== course.id && c.categoryId === course.categoryId).concat(all.filter((c) => c.id !== course.id && c.categoryId !== course.categoryId)).slice(0, 3);

  const modules = course.curriculum.map((m) => ({
    id: m.id,
    title: m.title,
    meta: `${m.lessons.length} lessons · ${m.lessons.reduce((s, l) => s + l.durationMinutes, 0)} min`,
    content: (
      <ul className="divide-y divide-line">
        {m.lessons.map((l) => {
          const Icon = lessonIcon[l.type];
          return (
            <li key={l.id} className="flex items-center gap-3 py-3 text-sm">
              <Icon className="size-4 shrink-0 text-navy-400" aria-hidden />
              <span className="flex-1 text-slate-700">{l.title}</span>
              {l.isPreview && <Badge tone="brand">Preview</Badge>}
              <span className="w-14 text-right tabular-nums text-muted">{l.durationMinutes} min</span>
            </li>
          );
        })}
      </ul>
    ),
  }));

  return (
    <>
      {/* Hero */}
      <section className="island relative overflow-hidden bg-navy-900 text-white">
        <div className="guilloche absolute inset-0" aria-hidden />
        <div className="container-page relative grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_380px]">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-navy-300">
              <ol className="flex flex-wrap items-center gap-2">
                <li><Link href="/courses" className="hover:text-white">Courses</Link></li>
                <li aria-hidden>/</li>
                <li><Link href={`/courses?category=${category?.id}`} className="hover:text-white">{category?.name}</Link></li>
              </ol>
            </nav>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">{course.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-navy-100">{course.shortDescription}</p>
            <div className="mt-6"><ModeBadges modes={course.modes} /></div>
            <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
              {[
                ["Rating", <span key="r" className="inline-flex items-center gap-1"><Star className="size-4 fill-seal-400 text-seal-400" aria-hidden />{course.rating} <span className="text-sm font-normal text-navy-300">({formatNumber(course.reviewCount)})</span></span>],
                ["Students", `${formatNumber(course.students)} learners`],
                ["Duration", `${course.durationWeeks} Weeks`],
                ["Certification", "NYTI Certified"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex flex-col-reverse">
                  <dt className="mt-1 text-xs uppercase tracking-wider text-navy-300">{k}</dt>
                  <dd className="text-lg font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-14 lg:order-1">
          <section aria-labelledby="learn-title" className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 id="learn-title" className="display text-2xl">What You&apos;ll Learn</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-3 text-slate-700">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-verify-600" aria-hidden />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="about-title">
            <h2 id="about-title" className="display text-2xl">About this programme</h2>
            <p className="mt-4 leading-relaxed text-slate-700">{course.description}</p>
            <h3 className="mt-8 font-semibold text-navy-900">Requirements</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700 marker:text-navy-300">
              {course.requirements.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </section>

          <section aria-labelledby="curriculum-title">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <h2 id="curriculum-title" className="display text-2xl">Course Curriculum</h2>
              <p className="text-sm text-muted">{course.curriculum.length ? `${course.curriculum.length} modules · ${totalLessons} lessons · ${Math.round(totalMinutes / 60)}h content` : course.subjects?.length ? `${course.subjects.length} subjects` : ""}</p>
            </div>
            {modules.length ? (
              <Accordion items={modules} defaultOpen={[modules[0].id]} />
            ) : course.subjects?.length ? (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {course.subjects.map((s) => (
                  <li key={s.id} className="flex gap-3 px-4 py-3 text-sm">
                    <span className="w-14 shrink-0 font-mono text-xs text-muted">{s.code}</span>
                    <span className="flex-1 text-slate-700">{s.name}</span>
                    {s.semester > 0 && <span className="text-xs text-muted">Semester {s.semester}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">The detailed curriculum is available from the training centre.</p>
            )}
          </section>

          {instructor && (
            <section aria-labelledby="instructor-title">
              <h2 id="instructor-title" className="display text-2xl">Your instructor</h2>
              <div className="mt-5 flex flex-col gap-5 rounded-2xl border border-line p-6 sm:flex-row">
                <Avatar name={instructor.name} size="lg" />
                <div>
                  <p className="text-lg font-semibold text-navy-900">{instructor.name}</p>
                  <p className="text-sm text-brand-700">{instructor.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{instructor.bio}</p>
                  <p className="mt-3 flex gap-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-1"><Star className="size-4 fill-seal-400 text-seal-400" aria-hidden /> {instructor.rating} rating</span>
                    <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden /> {formatNumber(instructor.students)} students</span>
                  </p>
                </div>
              </div>
            </section>
          )}

          {partners.length > 0 && (
            <section aria-labelledby="where-title">
              <h2 id="where-title" className="display text-2xl">Where to train in person</h2>
              <p className="mt-2 text-muted">Offline batches are delivered by these authorized NYTI partners.</p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {partners.map((p) => (
                  <li key={p.id}>
                    <Link href={`/partners/${p.slug}`} className="flex items-center gap-3 rounded-xl border border-line p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                      <MapPin className="size-5 text-seal-500" aria-hidden />
                      <span className="flex-1">
                        <span className="block font-semibold text-navy-900">{p.name}</span>
                        <span className="block text-sm text-muted">{p.city}</span>
                      </span>
                      <BadgeCheck className="size-5 text-verify-600" aria-label="Authorized partner" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="cert-title" className="flex flex-col gap-5 rounded-2xl bg-seal-100/60 p-6 ring-1 ring-seal-400/30 sm:flex-row sm:items-center sm:p-8">
            <Award className="size-12 shrink-0 text-seal-500" strokeWidth={1.4} aria-hidden />
            <div>
              <h2 id="cert-title" className="text-lg font-semibold text-navy-900">Earn an NYTI-certified certificate</h2>
              <p className="mt-1 text-sm text-slate-700">Complete all modules and pass the final assessment to receive a certificate with a unique ID and QR code that employers can verify online.</p>
            </div>
          </section>
        </div>

        <aside className="lg:order-2" aria-label="Enrolment">
          <div className="space-y-4 lg:sticky lg:top-28 lg:-mt-64">
            <div className="overflow-hidden rounded-2xl shadow-(--shadow-lift)">
              <CourseThumbnail course={course} className="aspect-[16/10]" large sizes="(min-width: 1024px) 380px, 100vw" priority />
            </div>
            {course.hidden ? (
              <div className="rounded-2xl border border-line bg-white p-6 text-sm text-slate-700 shadow-(--shadow-card)">
                <p className="font-semibold text-navy-900">Offered at training centres</p>
                <p className="mt-2">Results for this programme are published by NYTI. Students can verify their result with their registration and roll number.</p>
                <Link href="/verify-certificate?by=reg" className="mt-4 inline-flex font-semibold text-brand-700 hover:underline">Verify a result →</Link>
              </div>
            ) : (
              <EnrollCard course={course} payments={site.payments} />
            )}
          </div>
        </aside>
      </div>

      <section className="border-t border-line bg-surface py-16" aria-labelledby="related-title">
        <div className="container-page">
          <h2 id="related-title" className="display mb-8 text-2xl">You may also like</h2>
          <CourseGrid>
            {related.map((c) => <CourseCard key={c.id} course={c} category={catById[c.categoryId]} />)}
          </CourseGrid>
        </div>
      </section>
    </>
  );
}
