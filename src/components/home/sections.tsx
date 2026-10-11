import { ArrowRight, BadgeCheck, Check, Handshake, Quote, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Category, Course, Instructor, NewsItem, Partner, PlatformStat, Testimonial } from "@/types";
import type { HomePage, IconItem, ModeCard } from "@/types/content";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Counter } from "@/components/ui/interactive";
import { Avatar, SectionHeader } from "@/components/ui/primitives";
import { CourseCard, CourseGrid } from "@/components/course/CourseCard";
import { PartnerCard } from "@/components/partner/PartnerCard";
import { PartnerLogoCarousel } from "@/components/partner/PartnerLogoCarousel";
import { VerificationForm } from "@/components/certificate/VerificationForm";
import { MedalScene } from "@/components/three/ThemedScenes";
import { cn, formatDate } from "@/lib/format";

/* 5. Trust statistics ----------------------------------------------------- */
export function StatsBand({ stats }: { stats: PlatformStat[] }) {
  return (
    <section aria-label="NYTI at a glance" className="relative z-10 -mt-px border-y border-line bg-white">
      <dl className="container-page grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {stats.map((s, i) => (
          <div key={s.key} className={cn("flex flex-col-reverse px-2 py-8 text-center sm:py-10", i % 2 === 0 && "border-r border-line lg:border-r-0", i < 2 && "border-b border-line lg:border-b-0")}>
            <dt className="mt-2 text-sm font-medium text-muted">{s.label}</dt>
            <dd className="font-display text-4xl font-semibold text-navy-900 sm:text-5xl">
              <Counter value={s.value} suffix={s.suffix} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* 8. Featured courses --------------------------------------------------- */
export function FeaturedCourses({
  content,
  courses,
  categories,
  instructors,
}: {
  content: HomePage["featured"];
  courses: Course[];
  categories: Category[];
  instructors: Instructor[];
}) {
  const cat = Object.fromEntries(categories.map((c) => [c.id, c]));
  const ins = Object.fromEntries(instructors.map((i) => [i.id, i]));
  return (
    <section className="bg-surface py-20 sm:py-24" aria-labelledby="featured-title">
      <div className="container-page">
        <SectionHeader
          id="featured-title"
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          action={
            <ButtonLink href="/courses" variant="secondary">
              View All Courses <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <CourseGrid>
          {courses.map((c, i) => (
            <div key={c.id} data-reveal style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
              <CourseCard course={c} category={cat[c.categoryId]} instructor={ins[c.instructorId]} variant="featured" />
            </div>
          ))}
        </CourseGrid>
      </div>
    </section>
  );
}

/* 7. Online vs Offline -------------------------------------------------- */
export function OnlineOffline({ content }: { content: HomePage["modes"] }) {
  const modes: (ModeCard & { key: string; dark: boolean })[] = [
    { ...content.online, key: "online", dark: false },
    { ...content.offline, key: "offline", dark: true },
  ];
  return (
    <section className="py-20 sm:py-24" aria-labelledby="modes-title">
      <div className="container-page">
        <SectionHeader id="modes-title" align="center" eyebrow={content.eyebrow} title={content.title} description={content.description} />
        <div className="grid gap-6 lg:grid-cols-2">
          {modes.map((m) => (
            <div
              key={m.key}
              data-reveal
              className={cn(
                "relative overflow-hidden rounded-3xl p-8 sm:p-10",
                m.dark ? "island bg-navy-900 text-white" : "fx-card border border-line bg-gradient-to-br from-brand-50 to-white",
              )}
            >
              {m.dark && <div className="guilloche absolute inset-0" aria-hidden />}
              <div className="relative">
                <span className={cn("flex size-14 items-center justify-center rounded-2xl", m.dark ? "bg-white/10 text-seal-400 ring-1 ring-white/15" : "bg-white text-brand-600 shadow-sm ring-1 ring-brand-100")}>
                  <Icon name={m.icon} className="size-7" strokeWidth={1.6} />
                </span>
                <p className={cn("eyebrow mt-6", m.dark && "text-seal-400")}>{m.eyebrow}</p>
                <h3 className={cn("mt-2 font-display text-3xl font-semibold", m.dark ? "text-white" : "text-navy-900")}>{m.title}</h3>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {m.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm">
                      <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", m.dark ? "bg-seal-500/20 text-seal-400" : "bg-brand-100 text-brand-700")}>
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                      <span className={m.dark ? "text-navy-100" : "text-slate-700"}>{p}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink href={m.cta.href} variant={m.dark ? "inverse" : "primary"} className="mt-8">
                  {m.cta.label} <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 9. How certification works -------------------------------------------- */
export function CertificationSteps({ content, siteName, showCta = true }: { content: HomePage["certification"]; siteName: string; showCta?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-surface py-20 sm:py-24" aria-labelledby="cert-steps-title">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeader id="cert-steps-title" eyebrow={content.eyebrow} title={content.title} description={content.description} />
          <ol className="relative space-y-2">
            <span className="absolute bottom-8 left-6 top-8 w-px bg-gradient-to-b from-brand-300 via-seal-400 to-verify-500" aria-hidden />
            {content.steps.map((s, i) => (
              <li key={s.title} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="relative flex gap-5 rounded-2xl p-3 transition-colors hover:bg-white">
                <span className={cn("relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full text-white ring-4 ring-surface", i === content.steps.length - 1 ? "bg-seal-500" : "bg-navy-900")}>
                  <Icon name={s.icon} className="size-5" />
                </span>
                <div className="pt-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Step {i + 1}</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-navy-900">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {showCta && (
            <ButtonLink href={content.cta.href} variant="secondary" className="ml-3 mt-8">
              {content.cta.label} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          )}
        </div>
        <CertificateIllustration siteName={siteName} />
      </div>
    </section>
  );
}

function CertificateIllustration({ siteName }: { siteName: string }) {
  return (
    <div data-reveal className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="island absolute -inset-6 -rotate-3 rounded-3xl bg-navy-900">
        <div className="guilloche absolute inset-0 rounded-3xl" />
      </div>
      <div className="paper relative rotate-1 rounded-xl bg-[#fffdf8] p-2 shadow-2xl ring-1 ring-seal-400/40">
        <div className="guilloche-ink rounded-lg border-2 border-navy-800 p-1">
          <div className="flex flex-col items-center rounded border border-seal-400/60 px-6 py-10 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-navy-700">{siteName}</p>
            <p className="mt-4 font-display text-2xl font-semibold text-navy-900">Certificate of Completion</p>
            <div className="mt-6 h-2 w-40 rounded bg-navy-100" />
            <p className="mt-4 font-display text-2xl italic text-navy-900">Your Name Here</p>
            <div className="mt-3 h-px w-48 bg-seal-400/60" />
            <div className="mt-4 h-2 w-52 rounded bg-navy-100" />
            <div className="mt-2 h-2 w-36 rounded bg-navy-100" />
            <div className="mt-8 flex w-full items-end justify-between">
              <div className="h-px w-20 bg-navy-200" />
              <span className="flex size-16 items-center justify-center rounded-full bg-seal-500 text-[8px] font-bold uppercase tracking-wider text-white ring-4 ring-seal-100">
                Certified
              </span>
              <div className="grid size-12 grid-cols-4 gap-0.5 p-0.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className={cn("rounded-[1px]", [0, 1, 3, 4, 6, 9, 10, 12, 13, 15].includes(i) ? "bg-navy-900" : "bg-transparent")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-2 flex items-center gap-2 rounded-full bg-verify-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
        <ShieldCheck className="size-4" /> Verifiable online
      </div>
    </div>
  );
}

/* 10. Certificate verification (navy band) ---------------------------- */
export function VerifySection({ content }: { content: HomePage["verify"] }) {
  return (
    <section id="verify" className="island relative overflow-hidden bg-navy-900 py-20 text-white sm:py-24" aria-labelledby="verify-title">
      <div className="guilloche absolute inset-0" aria-hidden />
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-verify-500/10 blur-3xl" aria-hidden />
      <div className="container-page relative grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div data-reveal>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-verify-500/15 text-verify-500 ring-1 ring-verify-500/30 fancy:hidden">
            <ShieldCheck className="size-7" aria-hidden />
          </span>
          <MedalScene className="relative -my-6 -ml-8 hidden h-52 w-52 fancy:block" />
          <h2 id="verify-title" className="mt-6 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-200">{content.description}</p>
          <ul className="mt-8 space-y-3 text-sm text-navy-100">
            {content.points.map((t) => (
              <li key={t} className="flex items-center gap-3">
                <BadgeCheck className="size-5 shrink-0 text-verify-500" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <Link href={content.link.href} className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline-offset-4 hover:underline">
            {content.link.label} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div data-reveal>
          <VerificationForm variant="inverse" />
        </div>
      </div>
    </section>
  );
}

/* 11. Authorized partners --------------------------------------------- */
export function PartnersSection({ content, partners }: { content: HomePage["partners"]; partners: Partner[] }) {
  return (
    <section className="py-20 sm:py-24" aria-labelledby="partners-title">
      <div className="container-page">
        <SectionHeader
          id="partners-title"
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          action={
            <ButtonLink href="/partners" variant="secondary">
              View All Partners <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        {content.logoCarousel?.show && (
          <div data-reveal className="mb-12">
            {content.logoCarousel.title && <p className="mb-4 text-center text-sm font-medium text-muted">{content.logoCarousel.title}</p>}
            <PartnerLogoCarousel partners={partners} seconds={content.logoCarousel.seconds} />
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {partners.slice(0, content.count).map((p, i) => (
            <div key={p.id} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
              <PartnerCard partner={p} />
            </div>
          ))}
        </div>
        <div data-reveal className="mt-10 flex flex-col items-start gap-6 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-navy-700 shadow-sm ring-1 ring-line">
            <Handshake className="size-7" strokeWidth={1.6} aria-hidden />
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-navy-900">{content.cta.title}</h3>
            <p className="mt-1 text-sm text-muted">{content.cta.body}</p>
          </div>
          <ButtonLink href={content.cta.href}>{content.cta.label}</ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* 18. Why NYTI ---------------------------------------------------------- */
export function WhyNYTI({ content }: { content: HomePage["why"] }) {
  return (
    <section className="bg-surface py-20 sm:py-24" aria-labelledby="why-title">
      <div className="container-page">
        <SectionHeader id="why-title" align="center" eyebrow={content.eyebrow} title={content.title} />
        <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {content.reasons.map((r, i) => (
            <div key={r.title} data-reveal style={{ transitionDelay: `${(i % 3) * 80}ms` }} className="group bg-white p-8 transition-colors hover:bg-brand-50/40">
              <span className="flex size-12 items-center justify-center rounded-xl bg-navy-900 text-white transition-transform duration-300 group-hover:-translate-y-1">
                <Icon name={r.icon} className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-navy-900">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Compact reason list (used on the About page). */
export function ReasonList({ items }: { items: IconItem[] }) {
  return (
    <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <li key={r.title} className="flex items-start gap-3 text-sm">
          <Icon name={r.icon} className="mt-0.5 size-4 shrink-0 text-verify-600" />
          <span>
            <strong className="font-semibold text-navy-900">{r.title}.</strong> <span className="text-muted">{r.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* 19. Testimonials ------------------------------------------------------ */
export function Testimonials({ content, items }: { content: HomePage["testimonials"]; items: Testimonial[] }) {
  return (
    <section className="py-20 sm:py-24" aria-labelledby="testimonials-title">
      <div className="container-page">
        <SectionHeader id="testimonials-title" eyebrow={content.eyebrow} title={content.title} />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <figure key={t.id} data-reveal style={{ transitionDelay: `${i * 80}ms` }} className={cn("relative flex flex-col rounded-3xl p-7", i === 0 ? "island bg-navy-900 text-white" : "fx-card border border-line bg-white")}>
              <Quote className={cn("size-8", i === 0 ? "text-seal-400" : "text-brand-200")} aria-hidden />
              <blockquote className={cn("mt-4 flex-1 font-display text-xl leading-relaxed", i === 0 ? "text-white" : "text-navy-900")}>“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-current/10 pt-5">
                <Avatar name={t.name} />
                <div>
                  <p className={cn("font-semibold", i === 0 ? "text-white" : "text-navy-900")}>{t.name}</p>
                  <p className={cn("text-sm", i === 0 ? "text-navy-200" : "text-muted")}>{t.courseTitle}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
        {items.some((t) => t.isSample) && <p className="mt-6 text-center text-xs text-muted">{content.sampleNotice}</p>}
      </div>
    </section>
  );
}

/* 20. News ------------------------------------------------------------ */
const newsArt: Record<NewsItem["category"], string> = {
  "Course Launch": "from-brand-600 to-navy-900",
  "Upcoming Training": "from-navy-700 to-navy-950",
  Ceremony: "from-seal-500 to-seal-700",
  Partners: "from-verify-600 to-navy-900",
  Programs: "from-[#3b3fb8] to-navy-900",
  Workshop: "from-slate-600 to-navy-900",
};

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="fx-card group relative flex h-full flex-col overflow-hidden rounded-(--radius-card) border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-(--shadow-lift)">
      <div className={cn("island relative aspect-[16/8] bg-gradient-to-br", newsArt[item.category])} aria-hidden>
        <div className="guilloche absolute inset-0" />
        <span className="absolute bottom-4 left-5 font-display text-5xl font-semibold text-white/20">{formatDate(item.date, "short").split(" ").slice(0, 2).join(" ")}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-brand-700">{item.category}</span>
          <span className="text-navy-200" aria-hidden>•</span>
          <time dateTime={item.date} className="text-muted">
            {formatDate(item.date)}
          </time>
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug text-navy-900">
          <Link href={`/news/${item.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {item.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{item.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-brand-700">
          Read More <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export function NewsSection({ content, items }: { content: HomePage["news"]; items: NewsItem[] }) {
  return (
    <section className="bg-surface py-20 sm:py-24" aria-labelledby="news-title">
      <div className="container-page">
        <SectionHeader
          id="news-title"
          eyebrow={content.eyebrow}
          title={content.title}
          action={
            <ButtonLink href="/news" variant="secondary">
              All updates <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n, i) => (
            <div key={n.id} data-reveal style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
              <NewsCard item={n} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 14. Closing CTA ------------------------------------------------------ */
export function FinalCTA({ content }: { content: HomePage["finalCta"] }) {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-page">
        <div data-reveal className="island relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-navy-800 to-navy-950 px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <div className="guilloche absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <p className="eyebrow justify-center text-brand-200!">{content.eyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-5xl">{content.title}</h2>
            <p className="mt-5 text-lg text-navy-100">{content.description}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href={content.primary.href} variant="inverse" size="lg">
                {content.primary.label}
              </ButtonLink>
              <ButtonLink href={content.secondary.href} variant="inverse-outline" size="lg">
                {content.secondary.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Fancy themes: scrolling category ribbon under the stats ------------- */
export function CategoryMarquee({ categories }: { categories: Category[] }) {
  const items = [...categories, ...categories];
  return (
    <section aria-label="Course categories" className="hidden overflow-hidden border-b border-line py-5 fancy:block spark:border-y-2 spark:border-navy-900 spark:bg-seal-100">
      <ul className="animate-marquee flex w-max gap-3">
        {items.map((c, i) => (
          <li key={`${c.id}-${i}`} aria-hidden={i >= categories.length}>
            <Link
              href={`/courses?category=${c.id}`}
              tabIndex={i >= categories.length ? -1 : undefined}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:border-brand-400 aurora:bg-white/60 spark:border-2 spark:border-navy-900"
            >
              <Icon name={c.icon} className="size-4 text-brand-600" />
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* 3D-world themes: an unobstructed window onto the scene (Quest's certificate reveal) */
export function WorldWindow({ content }: { content?: HomePage["worldWindow"] }) {
  if (!content) return null;
  return (
    <section data-world-window className="relative hidden h-[90vh] min-h-[560px] world:block" aria-label={content.title}>
      {/* Quest & Lab: the student stands centre-stage, so the caption sits top (mobile) or left (desktop) */}
      <div className="container-page flex h-full flex-col items-center justify-end pb-[8vh] text-center story:justify-start story:pb-0 story:pt-24 lg:story:items-start lg:story:justify-end lg:story:pb-[10vh] lg:story:text-left">
        {content.eyebrow && <p className="eyebrow justify-center lg:story:justify-start">{content.eyebrow}</p>}
        <p className="display mt-3 text-4xl sm:text-6xl story:text-3xl sm:story:text-5xl">{content.title}</p>
        {content.caption && <p className="mt-3 max-w-md text-muted lg:story:max-w-xs">{content.caption}</p>}
      </div>
    </section>
  );
}
