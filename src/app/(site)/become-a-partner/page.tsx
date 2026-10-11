import { FileSearch, Handshake } from "lucide-react";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/primitives";
import { getCategories, getPage } from "@/lib/api";
import { PartnerApplicationForm } from "./PartnerApplicationForm";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("become-a-partner");
  return { title: page.hero.title, description: page.hero.description };
}

export default async function BecomePartnerPage() {
  const [page, categories] = await Promise.all([getPage("become-a-partner"), getCategories()]);
  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description} />
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-10">
          <ul className="space-y-5">
            {page.benefits.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white"><Icon name={b.icon} className="size-5" /></span>
                <div><h2 className="font-semibold text-navy-900">{b.title}</h2><p className="mt-1 text-sm text-muted">{b.body}</p></div>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900"><FileSearch className="size-5 text-brand-600" aria-hidden /> Authorization process</h2>
            <ol className="mt-5 space-y-4">
              {page.process.map((p, i) => (
                <li key={p.title} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-navy-900 ring-1 ring-line">{i + 1}</span>
                  <span><strong className="font-semibold text-navy-900">{p.title}.</strong> <span className="text-muted">{p.body}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-(--shadow-card) sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-900"><Handshake className="size-5 text-brand-600" aria-hidden /> Partner application</h2>
          <p className="mb-6 mt-1 text-sm text-muted">Fields marked * are required.</p>
          <PartnerApplicationForm categories={categories} />
        </div>
      </div>
    </>
  );
}
