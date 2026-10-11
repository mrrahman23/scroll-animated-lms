import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import { PartnerDirectory } from "@/components/partner/PartnerDirectory";
import { PartnerLogoCarousel } from "@/components/partner/PartnerLogoCarousel";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/primitives";
import { getCategories, getPage, getPartners } from "@/lib/api";

export const metadata: Metadata = {
  title: "Authorized Partners",
  description: "Search the directory of institutions authorized by NYTI to deliver certified training programmes.",
};

export default async function PartnersPage({ searchParams }: PageProps<"/partners">) {
  const { city } = await searchParams;
  const [partners, categories, page] = await Promise.all([getPartners(), getCategories(), getPage("partners")]);
  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description}>
        <div className="flex flex-wrap items-center gap-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-verify-50 px-4 py-2 text-sm font-medium text-verify-800 ring-1 ring-verify-100">
            <BadgeCheck className="size-4" aria-hidden /> Every listed partner is currently authorized
          </p>
          <ButtonLink href="/become-a-partner" variant="secondary" size="sm">
            Become an Authorized Partner
          </ButtonLink>
        </div>
      </PageHero>
      <div className="border-b border-line py-8">
        <PartnerLogoCarousel partners={partners} />
      </div>
      <section className="container-page py-12 sm:py-16">
        <PartnerDirectory partners={partners} categories={categories} initialCity={typeof city === "string" ? city : "all"} />
      </section>
    </>
  );
}
