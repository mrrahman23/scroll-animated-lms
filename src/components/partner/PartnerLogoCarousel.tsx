import Link from "next/link";
import type { Partner } from "@/types";
import { DataImage } from "@/components/ui/DataImage";
import { cn } from "@/lib/format";

/**
 * Continuously sliding strip of authorized partner logos.
 * Pauses on hover/focus; under reduced motion it becomes a static, scrollable row.
 * The list is rendered twice for a seamless loop — the copy is hidden from assistive tech.
 */
export function PartnerLogoCarousel({ partners, seconds = 35, label = "Authorized training partners" }: { partners: Partner[]; seconds?: number; label?: string }) {
  if (partners.length === 0) return null;
  // Repeat short lists so the strip is always wider than the screen
  const base = partners.length < 6 ? [...partners, ...partners, ...partners] : partners;

  return (
    <div
      role="region"
      aria-label={label}
      className="logo-carousel group relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      <div className="logo-track flex w-max gap-4" style={{ animationDuration: `${seconds}s` }}>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 gap-4" aria-hidden={copy === 1 || undefined}>
            {base.map((p, i) => (
              <li key={`${p.id}-${i}`}>
                <Link
                  href={`/partners/${p.slug}`}
                  tabIndex={copy === 1 ? -1 : undefined}
                  title={p.name}
                  className="paper flex h-20 w-48 items-center justify-center rounded-2xl border border-line bg-white px-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-(--shadow-card) spark:border-2 spark:border-navy-900"
                >
                  {p.logo ? (
                    <span className="relative block h-12 w-full grayscale-[60%] opacity-80 transition-all duration-300 group-hover:grayscale-0 hover:opacity-100 fancy:grayscale-0 fancy:opacity-100">
                      <DataImage src={p.logo} alt={`${p.name} logo`} sizes="176px" className="object-contain!" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 font-display text-sm font-bold text-navy-800">{p.shortName}</span>
                      <span className={cn("line-clamp-2 text-left text-xs font-semibold leading-tight text-navy-900")}>{p.name}</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
