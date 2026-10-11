"use client";

import Link from "next/link";
import { useSite } from "@/components/site/SiteProvider";
import { cn } from "@/lib/format";

/**
 * The logo image from site.json (`logo`, and `logoOnDark` for dark backgrounds), or the built-in shield.
 * Without a dark version, the logo sits on a white badge on dark backgrounds so it stays visible.
 */
export function LogoMark({ className, inverse }: { className?: string; inverse?: boolean }) {
  const site = useSite();
  const src = inverse ? site.logoOnDark || site.logo : site.logo;
  if (src) {
    return (
      <span className={cn("inline-flex shrink-0 items-center", inverse && !site.logoOnDark && "rounded-lg bg-white p-1")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- any uploaded format (incl. SVG), sized by height */}
        <img src={src} alt="" className={cn("h-10 w-auto max-w-[200px] object-contain", className)} />
      </span>
    );
  }
  return (
    <svg viewBox="0 0 40 44" className={cn("h-10 w-auto", className)} aria-hidden>
      <path d="M20 2 37 8v13c0 11-7.5 18-17 21C10.5 39 3 32 3 21V8Z" className={inverse ? "fill-white" : "fill-navy-900"} />
      <path d="M20 6.5 33 11v10c0 8.8-5.7 14.4-13 17-7.3-2.6-13-8.2-13-17V11Z" fill="none" stroke="#d2a54c" strokeOpacity={0.75} strokeWidth={1} />
      <path d="m12.5 22 5.5 5.5 10-12" fill="none" className={inverse ? "stroke-navy-900" : "stroke-white"} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={28} cy={15.5} r={2.3} fill="#13a37f" />
    </svg>
  );
}

export function Logo({ inverse, compact }: { inverse?: boolean; compact?: boolean }) {
  const site = useSite();
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label={`${site.name} — Home`}>
      <LogoMark inverse={inverse} className="transition-transform duration-300 group-hover:-rotate-3" />
      <span className={cn("flex flex-col leading-none", site.logo && site.showNameWithLogo === false && "sr-only")}>
        <span className={cn("font-display text-xl font-bold tracking-wide", inverse ? "text-white" : "text-navy-900")}>{site.shortName}</span>
        {!compact && (
          <span className={cn("mt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em]", inverse ? "text-navy-200" : "text-muted")}>
            {site.name}
          </span>
        )}
      </span>
    </Link>
  );
}
