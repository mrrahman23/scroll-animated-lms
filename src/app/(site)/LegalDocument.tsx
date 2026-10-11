import { PageHero } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import type { LegalDoc } from "@/types/content";

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} description={`Last updated ${formatDate(doc.updated)}.`} />
      <div className="container-page max-w-3xl space-y-6 py-14 leading-relaxed text-slate-700">
        <p>{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-xl font-semibold text-navy-900">{s.heading}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
