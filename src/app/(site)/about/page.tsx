import { Eye, Target } from "lucide-react";
import type { Metadata } from "next";
import { LearnCertifyVerify } from "@/components/home/LearnCertifyVerify";
import { ReasonList } from "@/components/home/sections";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Avatar, PageHero } from "@/components/ui/primitives";
import { getPage, getPlatformStats } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return { title: page.hero.eyebrow ?? page.hero.title, description: page.mission };
}

export default async function AboutPage() {
  const [page, home, stats] = await Promise.all([getPage("about"), getPage("home"), getPlatformStats()]);
  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description}>
        <LearnCertifyVerify size="lg" />
      </PageHero>

      <section id="mission" className="scroll-mt-28 py-20">
        <div className="container-page grid gap-6 md:grid-cols-2">
          <div className="island relative overflow-hidden rounded-3xl bg-navy-900 p-8 text-white sm:p-10">
            <div className="guilloche absolute inset-0" aria-hidden />
            <Target className="relative size-8 text-seal-400" aria-hidden />
            <h2 className="relative mt-5 font-display text-2xl font-semibold">Our Mission</h2>
            <p className="relative mt-3 text-lg leading-relaxed text-navy-100">{page.mission}</p>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-8 sm:p-10">
            <Eye className="size-8 text-brand-600" aria-hidden />
            <h2 className="mt-5 font-display text-2xl font-semibold text-navy-900">Our Vision</h2>
            <p className="mt-3 text-lg leading-relaxed text-slate-700">{page.vision}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Objectives</p>
            <h2 className="display mt-3 text-3xl">What we work towards</h2>
            <ol className="mt-8 space-y-4">
              {page.objectives.map((o, i) => (
                <li key={o} className="flex gap-4">
                  <span className="font-display text-2xl font-semibold text-brand-300">{String(i + 1).padStart(2, "0")}</span>
                  <p className="pt-1 text-slate-700">{o}</p>
                </li>
              ))}
            </ol>
          </div>
          <dl className="grid grid-cols-2 gap-4 self-center">
            {stats.map((s) => (
              <div key={s.key} className="flex flex-col-reverse rounded-2xl bg-white p-6 ring-1 ring-line">
                <dt className="mt-1 text-sm text-muted">{s.label}</dt>
                <dd className="font-display text-4xl font-semibold text-navy-900">{s.value.toLocaleString("en-US")}{s.suffix}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="py-20">
        <div className="container-page">
          <p className="eyebrow">{home.why.eyebrow}</p>
          <h2 className="display mt-3 text-3xl">{page.standardsTitle}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {page.standards.map((s) => (
              <div key={s.title} className="rounded-2xl border border-line p-6">
                <Icon name={s.icon} className="size-6 text-brand-600" />
                <h3 className="mt-4 font-semibold text-navy-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
          <ReasonList items={home.why.reasons} />
        </div>
      </section>

      <section id="leadership" className="scroll-mt-28 border-t border-line bg-surface py-20">
        <div className="container-page">
          <p className="eyebrow">Leadership</p>
          <h2 className="display mt-3 text-3xl">Institute leadership</h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {page.leadership.map((l) => (
              <li key={l.name} className="rounded-2xl bg-white p-6 text-center ring-1 ring-line">
                <Avatar name={l.name} size="lg" className="mx-auto" />
                <p className="mt-4 font-semibold text-navy-900">{l.name}</p>
                <p className="text-sm text-muted">{l.role}</p>
              </li>
            ))}
          </ul>
          {page.leadershipNotice && <p className="mt-6 text-xs text-muted">{page.leadershipNotice}</p>}
          <div className="mt-12 flex flex-wrap gap-3">
            <ButtonLink href="/courses">Explore Courses</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">Contact Us</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
