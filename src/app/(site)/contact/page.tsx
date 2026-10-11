import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { SocialIcon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/primitives";
import { getPage, getSite } from "@/lib/api";
import { ContactForm } from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return { title: "Contact", description: `Contact the ${site.name} head office.` };
}

export default async function ContactPage() {
  const [page, site] = await Promise.all([getPage("contact"), getSite()]);
  const { contact } = site;
  const info = [
    { icon: MapPin, title: "Head Office", lines: [site.name, ...contact.addressLines] },
    { icon: Phone, title: "Phone", lines: contact.phones, href: (l: string) => `tel:${l.replace(/[^\d+]/g, "")}` },
    { icon: Mail, title: "Email", lines: [contact.emails.general, contact.emails.verification], href: (l: string) => `mailto:${l}` },
    { icon: Clock, title: "Office Hours", lines: contact.officeHours },
  ];

  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description} />
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {info.map((i) => (
            <div key={i.title} className="flex gap-4 rounded-2xl border border-line p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><i.icon className="size-5" aria-hidden /></span>
              <div>
                <h2 className="font-semibold text-navy-900">{i.title}</h2>
                {i.lines.map((l) =>
                  i.href ? (
                    <a key={l} href={i.href(l)} className="block text-sm text-slate-700 hover:text-brand-700">{l}</a>
                  ) : (
                    <p key={l} className="text-sm text-slate-700">{l}</p>
                  ),
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            {site.social.map((s) => (
              <a key={s.platform} href={s.url} aria-label={`${site.shortName} on ${s.platform}`} className="flex size-10 items-center justify-center rounded-full border border-line text-navy-700 hover:bg-navy-50"><SocialIcon name={s.platform} className="size-4" /></a>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-(--shadow-card) sm:p-8">
          <h2 className="mb-6 text-xl font-semibold text-navy-900">Send us a message</h2>
          <ContactForm subjects={page.subjects} />
        </div>
      </div>
      <section aria-label="Map" className="container-page pb-16">
        {contact.mapEmbedUrl ? (
          <iframe
            src={contact.mapEmbedUrl}
            title={`Map to ${site.name}`}
            className="aspect-[21/9] min-h-64 w-full rounded-3xl border border-line"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="grid-dots relative flex aspect-[21/9] min-h-64 items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface">
            <svg className="absolute inset-0 size-full text-navy-200" preserveAspectRatio="none" viewBox="0 0 800 340" aria-hidden>
              <path d="M0 220C120 200 180 120 320 140s220 110 480 60" fill="none" stroke="currentColor" strokeWidth="14" />
              <path d="M420 0v340M0 90h800" stroke="currentColor" strokeWidth="6" />
            </svg>
            <div className="relative flex flex-col items-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg ring-8 ring-white"><MapPin className="size-6" aria-hidden /></span>
              <p className="mt-4 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-navy-900 shadow">Add a Google Maps embed URL in data/site.json</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
