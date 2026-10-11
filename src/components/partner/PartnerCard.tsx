import { ArrowRight, BadgeCheck, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import type { Partner } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { DataImage } from "@/components/ui/DataImage";
import { cn, modesLabel } from "@/lib/format";

/** Partner logo from data/partners.json, or a monogram when no logo is set. */
export function PartnerLogo({ partner, size = "md" }: { partner: Partner; size?: "md" | "lg" }) {
  if (partner.logo) {
    return (
      <span className={cn("paper relative shrink-0 overflow-hidden rounded-xl border border-line bg-white", size === "lg" ? "h-20 w-40" : "h-14 w-28")}>
        <DataImage src={partner.logo} alt={`${partner.name} logo`} sizes={size === "lg" ? "160px" : "112px"} className="object-contain! p-2" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-navy-50 to-white font-display font-bold tracking-wide text-navy-800",
        size === "lg" ? "size-20 text-2xl" : "size-14 text-base",
      )}
    >
      {partner.shortName}
    </span>
  );
}

export function PartnerStatusBadge({ status }: { status: Partner["status"] }) {
  if (status === "active")
    return (
      <Badge tone="verify" icon={<BadgeCheck className="size-3.5" aria-hidden />}>
        Authorized
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge tone="warning" icon={<Clock className="size-3.5" aria-hidden />}>
        Under review
      </Badge>
    );
  return <Badge tone="danger">Suspended</Badge>;
}

export function PartnerCard({ partner, courseCount }: { partner: Partner; courseCount?: number }) {
  return (
    <article className="fx-card group relative flex h-full flex-col rounded-(--radius-card) border border-line bg-white p-5 shadow-(--shadow-card) transition-all duration-300 hover:-translate-y-1 hover:shadow-(--shadow-lift)">
      <div className="flex items-start justify-between gap-3">
        <PartnerLogo partner={partner} />
        <PartnerStatusBadge status={partner.status} />
      </div>
      <h3 className="mt-4 font-semibold leading-snug text-navy-900">
        <Link href={`/partners/${partner.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {partner.name}
        </Link>
      </h3>
      <p className="mt-0.5 text-xs font-medium text-verify-700">Authorized NYTI Training Partner</p>
      <dl className="mt-4 space-y-2 text-sm text-muted">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-navy-400" aria-hidden />
          <dt className="sr-only">Location</dt>
          <dd>{partner.city}, Bangladesh</dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-line pt-2">
          <dt>Authorized courses</dt>
          <dd className="font-semibold text-ink">{courseCount ?? partner.courseIds.length}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Training type</dt>
          <dd className="font-semibold text-ink">{modesLabel(partner.modes)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Partner since</dt>
          <dd className="font-semibold text-ink">{partner.since}</dd>
        </div>
      </dl>
      <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-brand-700">
        View Partner <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </article>
  );
}
