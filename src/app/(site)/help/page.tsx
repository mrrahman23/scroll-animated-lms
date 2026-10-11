import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Accordion } from "@/components/ui/interactive";
import { PageHero } from "@/components/ui/primitives";
import { getPage } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("help");
  return { title: page.hero.title, description: page.hero.description };
}

export default async function HelpPage() {
  const page = await getPage("help");
  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description} />
      <div className="container-page py-14">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {page.topics.map((t) => (
            <li key={t.title}>
              <Link href={t.href} className="flex items-center gap-3 rounded-2xl border border-line p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                <Icon name={t.icon} className="size-5 text-brand-600" />
                <span className="font-semibold text-navy-900">{t.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <section id="faq" className="mt-16 max-w-3xl scroll-mt-28">
          <h2 className="display mb-6 text-3xl">Frequently asked questions</h2>
          <Accordion items={page.faqs.map((f, i) => ({ id: `faq-${i}`, title: f.question, content: <p className="leading-relaxed text-slate-700">{f.answer}</p> }))} />
        </section>
      </div>
    </>
  );
}
