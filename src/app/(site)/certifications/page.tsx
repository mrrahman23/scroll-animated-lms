import { Ban, CircleCheck, Hourglass, QrCode, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { LearnCertifyVerify } from "@/components/home/LearnCertifyVerify";
import { CertificationSteps } from "@/components/home/sections";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/primitives";
import { getPage, getSite } from "@/lib/api";
import type { CertificateStatus } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("certifications");
  return { title: "Certification", description: page.hero.description };
}

const statusStyle: Record<CertificateStatus, { icon: typeof CircleCheck; tone: string }> = {
  valid: { icon: CircleCheck, tone: "text-verify-600 bg-verify-50" },
  expired: { icon: Hourglass, tone: "text-amber-600 bg-amber-50" },
  revoked: { icon: Ban, tone: "text-red-600 bg-red-50" },
};

export default async function CertificationsPage() {
  const [page, home, site] = await Promise.all([getPage("certifications"), getPage("home"), getSite()]);
  const v = page.verification;
  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description}>
        <LearnCertifyVerify size="lg" />
      </PageHero>
      <CertificationSteps content={home.certification} siteName={site.name} showCta={false} />

      <section id="verification" className="scroll-mt-28 py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{v.eyebrow}</p>
            <h2 className="display mt-3 text-3xl sm:text-4xl">{v.title}</h2>
            <ol className="mt-8 space-y-6">
              {v.steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-navy-900">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/verify-certificate" variant="verify">
                <ShieldCheck className="size-4" aria-hidden /> Verify a Certificate
              </ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                <QrCode className="size-4" aria-hidden /> Bulk verification for employers
              </ButtonLink>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-navy-900">{v.statusesTitle}</h3>
            <ul className="mt-5 space-y-3">
              {v.statuses.map((s) => {
                const style = statusStyle[s.status];
                return (
                  <li key={s.status} className="flex gap-4 rounded-2xl border border-line p-5">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${style.tone}`}>
                      <style.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-navy-900">{s.title}</p>
                      <p className="mt-1 text-sm text-muted">{s.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
