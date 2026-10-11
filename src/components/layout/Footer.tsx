import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { SocialIcon } from "@/components/ui/Icon";
import { LearnCertifyVerify } from "@/components/home/LearnCertifyVerify";
import { getSite } from "@/lib/api";
import { Logo } from "./Logo";

export async function Footer() {
  const site = await getSite();
  const { contact } = site;
  return (
    <footer className="island guilloche bg-navy-950 text-navy-200">
      <div className="container-page">
        <div className="flex flex-col gap-6 border-b border-white/10 py-10 md:flex-row md:items-center md:justify-between">
          <LearnCertifyVerify inverse />
          <p className="max-w-sm text-sm text-navy-300">{site.footerNote}</p>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo inverse />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-navy-300">{site.tagline}</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                {contact.addressLines.join(", ")}
              </li>
              {contact.phones.slice(0, 1).map((p) => (
                <li key={p} className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                  <a href={`tel:${p.replace(/[^\d+]/g, "")}`} className="hover:text-white">{p}</a>
                </li>
              ))}
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                <a href={`mailto:${contact.emails.general}`} className="hover:text-white">{contact.emails.general}</a>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-8">
            {site.navigation.footer.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="text-sm font-semibold text-white">{col.title}</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-xs sm:flex-row">
          <p>{site.copyright}</p>
          <ul className="flex items-center gap-2" aria-label="Social media">
            {site.social.map((s) => (
              <li key={s.platform}>
                <a
                  href={s.url}
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 text-navy-200 transition-colors hover:border-white/30 hover:text-white"
                  aria-label={`${site.shortName} on ${s.platform === "x" ? "X" : s.platform[0].toUpperCase() + s.platform.slice(1)}`}
                >
                  <SocialIcon name={s.platform} className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
