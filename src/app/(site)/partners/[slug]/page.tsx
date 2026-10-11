import { Award, BadgeCheck, Building, Globe, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCard, CourseGrid } from "@/components/course/CourseCard";
import { PartnerLogo, PartnerStatusBadge } from "@/components/partner/PartnerCard";
import { ButtonLink } from "@/components/ui/Button";
import { getCategories, getCoursesByIds, getPartner, getPartners } from "@/lib/api";
import { formatNumber, modesLabel } from "@/lib/format";

export async function generateStaticParams() {
  return (await getPartners({ includePending: true })).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/partners/[slug]">): Promise<Metadata> {
  const p = await getPartner((await params).slug);
  return p ? { title: p.name, description: p.description } : {};
}

export default async function PartnerDetailPage({ params }: PageProps<"/partners/[slug]">) {
  const partner = await getPartner((await params).slug);
  if (!partner) notFound();
  const [courses, categories] = await Promise.all([getCoursesByIds(partner.courseIds), getCategories()]);
  const cat = Object.fromEntries(categories.map((c) => [c.id, c]));
  const authorized = partner.status === "active";

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-page py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/partners" className="hover:text-navy-900">Authorized Partners</Link> <span aria-hidden>/</span> {partner.name}
          </nav>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <PartnerLogo partner={partner} size="lg" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="display text-3xl sm:text-4xl">{partner.name}</h1>
                <PartnerStatusBadge status={partner.status} />
              </div>
              <p className="mt-2 text-muted">{partner.type} · {partner.city}, Bangladesh · Partner since {partner.since}</p>
            </div>
            {partner.website && (
              <ButtonLink href={partner.website} variant="secondary" target="_blank" rel="noopener noreferrer">
                <Globe className="size-4" aria-hidden /> Visit website
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-12">
          <section>
            <h2 className="display text-2xl">About</h2>
            <p className="mt-3 leading-relaxed text-slate-700">{partner.description}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Students trained", formatNumber(partner.studentsTrained)],
                ["Certificates issued", formatNumber(partner.certificatesIssued)],
                ["Authorized courses", partner.courseIds.length],
                ["Training type", modesLabel(partner.modes)],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col-reverse rounded-xl border border-line p-4">
                  <dt className="mt-1 text-xs text-muted">{k}</dt>
                  <dd className="text-xl font-semibold text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="display text-2xl">Training facilities</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {partner.facilities.map((f) => (
                <li key={f} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm text-slate-700">
                  <Building className="size-4 text-navy-400" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="display mb-6 text-2xl">Courses offered</h2>
            {courses.length ? (
              <CourseGrid className="lg:grid-cols-2 xl:grid-cols-2">
                {courses.map((c) => <CourseCard key={c.id} course={c} category={cat[c.categoryId]} />)}
              </CourseGrid>
            ) : (
              <p className="text-muted">This institution is not yet authorized to deliver NYTI programmes.</p>
            )}
          </section>

          <section className="flex gap-4 rounded-2xl bg-seal-100/60 p-6 ring-1 ring-seal-400/30">
            <Award className="size-8 shrink-0 text-seal-500" aria-hidden />
            <div>
              <h2 className="font-semibold text-navy-900">Certificate information</h2>
              <p className="mt-1 text-sm text-slate-700">
                Certificates for programmes completed at {partner.shortName} are issued in the partner&apos;s name and co-verified by the National Youth Training Institute. They can be checked at any time on the{" "}
                <Link href="/verify-certificate" className="font-semibold text-brand-700 underline underline-offset-2">verification page</Link>.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className={`rounded-2xl border p-6 ${authorized ? "border-verify-200 bg-verify-50/50" : "border-amber-200 bg-amber-50/50"}`}>
            <div className="flex items-center gap-3">
              <span className={`flex size-11 items-center justify-center rounded-full text-white ${authorized ? "bg-verify-600" : "bg-amber-500"}`}>
                {authorized ? <ShieldCheck className="size-5" aria-hidden /> : <BadgeCheck className="size-5" aria-hidden />}
              </span>
              <div>
                <p className="text-sm font-semibold text-navy-900">NYTI authorization</p>
                <p className={`text-sm font-medium ${authorized ? "text-verify-700" : "text-amber-800"}`}>{authorized ? "Authorized · in good standing" : "Application under review"}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-black/5 pt-5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Authorization no.</dt><dd className="font-mono font-semibold text-navy-900">{partner.authorizationNumber}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Authorized since</dt><dd className="font-semibold text-navy-900">{partner.since}</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl border border-line p-6">
            <h2 className="font-semibold text-navy-900">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />{partner.address}</li>
              <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden /><a href={`tel:${partner.phone.replace(/\s/g, "")}`} className="hover:text-brand-700">{partner.phone}</a></li>
              <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden /><a href={`mailto:${partner.email}`} className="break-all hover:text-brand-700">{partner.email}</a></li>
              {partner.website && <li className="flex gap-3"><Globe className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />{partner.website.replace("https://", "")}</li>}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
