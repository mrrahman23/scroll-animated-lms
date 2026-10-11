import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getPortalIdentity } from "@/lib/api";
import { listDefs } from "@/lib/content-admin/store";

export const metadata: Metadata = { title: "Website" };

export default async function ContentHubPage() {
  await getPortalIdentity("admin");
  const defs = await listDefs();
  const groups = ["Website", "Catalogue", "Page text"] as const;
  return (
    <>
      <DashboardHeader title="Website content" description="Edit what visitors see. Changes are checked before saving, go live immediately, and every version is kept so you can roll back." />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{g}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {defs.filter((d) => d.group === g).map((d) => (
                <li key={d.key}>
                  <Link href={`/admin/content/${d.key}`} className="flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                    <span className="flex-1">
                      <span className="block font-semibold text-navy-900">{d.label}</span>
                      <span className="mt-0.5 block text-sm text-muted">{d.description}</span>
                    </span>
                    <ChevronRight className="mt-0.5 size-5 shrink-0 text-navy-300" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
