import { ArrowRight, Award, CirclePlay, MapPin, ShieldCheck, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/layout/Logo";
import { HeroScene } from "@/components/three/ThemedScenes";
import type { HomePage } from "@/types/content";
import { LearnCertifyVerify } from "./LearnCertifyVerify";

type HeroContent = HomePage["hero"];
type Visual = HeroContent["visual"];

export function Hero({ content }: { content: HeroContent }) {
  return (
    <section className="relative overflow-hidden bg-surface world:flex world:min-h-[calc(100svh-108px)] world:items-start" aria-labelledby="hero-title">
      <div className="grid-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_70%)] world:hidden" aria-hidden />
      {/* Ember: soft scrim so the headline reads over the 3D world */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-full bg-gradient-to-r from-black/60 via-black/25 to-transparent world:block lab:from-white/80 lab:via-white/40 lg:w-2/3" aria-hidden />
      <EmberBackdrop content={content} />
      <div className="island absolute -right-40 top-0 hidden h-full w-[55%] rounded-l-[4rem] bg-navy-900 classic:lg:block" aria-hidden>
        <div className="guilloche absolute inset-0 rounded-l-[4rem]" />
      </div>

      <div className="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24 fancy:lg:static fancy:lg:min-h-[680px] world:w-full world:pb-[30vw] world:pt-14 lg:world:min-h-0 lg:world:grid-cols-[1fr_auto] lg:world:pt-16 lg:world:pb-[15vw]">
        <div className="relative z-10 min-w-0 animate-fade-up">
          <p className="eyebrow">
            <span className="size-1.5 rounded-full bg-verify-500 world:hidden" aria-hidden />
            {content.eyebrow}
          </p>
          <h1 id="hero-title" className="display mt-5 text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-[4.1rem] world:text-[2.3rem] sm:world:text-5xl lg:world:text-[3.6rem]">
            {content.headline.map((line, i) => (
              <span key={line}>
                {line} <br className={i === content.headline.length - 1 ? undefined : "hidden sm:block"} />
              </span>
            ))}
            <span className="text-gradient text-brand-600">{content.highlight}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            {content.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={content.primaryCta.href} size="lg">
              {content.primaryCta.label} <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
            <ButtonLink href={content.secondaryCta.href} size="lg" variant="secondary">
              <ShieldCheck className="size-5 text-verify-600" aria-hidden /> {content.secondaryCta.label}
            </ButtonLink>
          </div>
          <div className="mt-10 border-t border-line pt-6 world:hidden">
            <LearnCertifyVerify />
          </div>
        </div>

        {/* Visual slot: classic product collage, or the theme's 3D scene (full-bleed on desktop) */}
        <EmberChapters content={content} />
        <div className="relative fancy:min-h-[360px] fancy:sm:min-h-[420px] fancy:lg:static world:hidden">
          <div className="absolute inset-0 hidden fancy:block">
            <HeroScene />
          </div>
          <div className="fancy:hidden">
            <HeroVisual v={content.visual} />
          </div>
          <FancyHeroChips v={content.visual} />
        </div>
      </div>
    </section>
  );
}

/**
 * Product-led hero visual: shows the learn → certify → verify journey in
 * the actual NYTI interface instead of stock photography.
 */
function HeroVisual({ v }: { v: Visual }) {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:150ms] lg:mr-0" aria-hidden>
      <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-navy-900 lg:hidden">
        <div className="guilloche absolute inset-0 rounded-[2.5rem]" />
      </div>
      <div className="p-5 sm:p-8 lg:p-0">
        {/* Lesson player */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-navy-950/40">
          <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-700 via-navy-800 to-navy-950">
            <div className="guilloche absolute inset-0" />
            {/* stylised classroom scene */}
            <svg viewBox="0 0 400 250" className="absolute inset-0 size-full">
              <rect x="40" y="36" width="190" height="112" rx="8" fill="#ffffff" fillOpacity="0.08" stroke="#ffffff" strokeOpacity="0.25" />
              <path d="M62 120 98 84l26 22 30-34 52 48" fill="none" stroke="#93b4fd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="186" cy="64" r="10" fill="#d2a54c" />
              <rect x="252" y="48" width="104" height="10" rx="5" fill="#ffffff" fillOpacity="0.35" />
              <rect x="252" y="68" width="78" height="8" rx="4" fill="#ffffff" fillOpacity="0.18" />
              <rect x="252" y="84" width="90" height="8" rx="4" fill="#ffffff" fillOpacity="0.18" />
              {/* learners */}
              {[70, 150, 230, 310].map((x, i) => (
                <g key={x} transform={`translate(${x} 176)`}>
                  <circle cx="20" cy="14" r="12" fill={["#608cf9", "#13a37f", "#d2a54c", "#93b4fd"][i]} />
                  <path d="M-4 60c0-18 11-30 24-30s24 12 24 30" fill={["#608cf9", "#13a37f", "#d2a54c", "#93b4fd"][i]} fillOpacity="0.55" />
                  <rect x="-10" y="46" width="60" height="6" rx="3" fill="#ffffff" fillOpacity="0.4" />
                </g>
              ))}
            </svg>
            <span className="absolute left-1/2 top-[38%] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-brand-600 shadow-lg">
              <CirclePlay className="size-8" strokeWidth={1.6} />
            </span>
            <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{v.lessonLabel}</span>
          </div>
          <div className="flex items-center gap-4 p-5">
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy-900">{v.courseTitle}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${v.progress}%` }} />
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums text-navy-900">{v.progress}%</span>
          </div>
        </div>

        {/* Floating certificate */}
        <div className="relative -mt-3 ml-auto w-[80%] rotate-2 rounded-xl bg-[#fffdf8] p-1.5 shadow-2xl shadow-navy-950/30 ring-1 ring-seal-400/40 transition-transform duration-500 hover:rotate-0 sm:-mt-4">
          <div className="guilloche-ink flex items-center gap-4 rounded-lg border border-seal-400/50 p-4">
            <LogoMark className="h-10" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-seal-700">Certificate of Completion</p>
              <p className="truncate font-display text-lg italic text-navy-900">{v.certificateName}</p>
              <p className="truncate font-mono text-[11px] text-muted">{v.certificateId}</p>
            </div>
            <Award className="size-9 shrink-0 text-seal-500" strokeWidth={1.5} />
          </div>
        </div>

        {/* Verified chip */}
        <div className="absolute -left-2 bottom-20 flex animate-fade-up items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl shadow-navy-950/20 ring-1 ring-line [animation-delay:600ms] sm:-left-8 sm:bottom-24">
          <span className="flex size-9 items-center justify-center rounded-full bg-verify-600 text-white ring-4 ring-verify-100">
            <ShieldCheck className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-navy-900">{v.verifiedTitle}</span>
            <span className="block text-xs text-muted">{v.verifiedMeta}</span>
          </span>
        </div>

        {/* Offline batch chip */}
        <div className="absolute -right-2 top-2 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl shadow-navy-950/20 ring-1 ring-line sm:flex lg:-right-6 lg:-top-6">
          <MapPin className="size-5 text-seal-500" />
          <span>
            <span className="block text-sm font-semibold text-navy-900">{v.batchTitle}</span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Star className="size-3 fill-seal-400 text-seal-400" /> {v.batchMeta}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Floating glass chips (aurora) / stickers (spark) placed over the 3D scene. */
function FancyHeroChips({ v }: { v: Visual }) {
  const chip =
    "absolute flex items-center gap-3 rounded-2xl px-4 py-3 text-sm aurora:bg-white/60 aurora:ring-1 aurora:ring-white/10 aurora:backdrop-blur-md spark:border-2 spark:border-navy-900 spark:shadow-(--shadow-card)";
  return (
    <div className="pointer-events-none relative hidden h-full min-h-[360px] fancy:block lg:min-h-[520px]" aria-hidden>
      <div className={`${chip} bottom-6 left-0 animate-bob spark:-rotate-3 spark:bg-white lg:bottom-16`}>
        <span className="flex size-9 items-center justify-center rounded-full bg-verify-600 text-white">
          <ShieldCheck className="size-5" />
        </span>
        <span>
          <span className="block font-semibold text-navy-900">{v.verifiedTitle}</span>
          <span className="block text-xs text-muted">{v.certificateId} · just now</span>
        </span>
      </div>
      <div className={`${chip} right-0 top-4 animate-bob [animation-delay:1.2s] spark:rotate-2 spark:bg-seal-100 lg:top-10`}>
        <MapPin className="size-5 text-seal-500" />
        <span>
          <span className="block font-semibold text-navy-900">{v.batchTitle}</span>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Star className="size-3 fill-seal-400 text-seal-400" /> {v.batchMeta}
          </span>
        </span>
      </div>
      <div className={`${chip} bottom-28 right-2 hidden animate-bob [animation-delay:2.1s] sm:flex spark:rotate-6 spark:bg-brand-100 lg:bottom-40`}>
        <Award className="size-5 text-brand-600" />
        <span className="font-semibold text-navy-900">{v.badge}</span>
      </div>
    </div>
  );
}

/** Ember: giant word rising out of the mist at the bottom of the hero. */
function EmberBackdrop({ content }: { content: HeroContent }) {
  const word = content.backdropWord ?? "NYTI";
  return (
    <p
      aria-hidden
      className="world-word pointer-events-none absolute inset-x-0 bottom-0 hidden select-none justify-between px-[3vw] font-display text-[30vw] font-medium leading-[0.74] tracking-[-0.05em] text-transparent world:flex lg:text-[19vw]"
    >
      {word.split("").map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="animate-fade-up bg-gradient-to-b from-ink via-ink/70 to-transparent bg-clip-text"
          style={{ animationDelay: `${300 + i * 120}ms` }}
        >
          {ch}
        </span>
      ))}
    </p>
  );
}

/** Ember: vertical caption + numbered chapter links on the right. */
function EmberChapters({ content }: { content: HeroContent }) {
  if (!content.chapters?.length && !content.sideCaption) return null;
  return (
    <div className="relative z-10 hidden flex-col items-end justify-between gap-10 self-stretch lg:world:flex">
      {content.sideCaption && (
        <p className="text-xs font-medium uppercase tracking-[0.5em] text-navy-700 lg:[writing-mode:vertical-rl]">{content.sideCaption}</p>
      )}
      {content.chapters && (
        <nav aria-label="On this page">
          <ol className="flex flex-col gap-3 lg:items-end">
            {content.chapters.map((c, i) => (
              <li key={c.href}>
                <a href={c.href} className="group flex items-baseline gap-3 text-navy-800 transition-colors hover:text-white">
                  <span className="font-display text-2xl font-light tabular-nums text-navy-600 transition-colors group-hover:text-(--accent-soft)">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-xs font-medium uppercase tracking-[0.3em]">{c.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
