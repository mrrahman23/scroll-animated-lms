import type { Certificate } from "@/types";
import { LogoMark } from "@/components/layout/Logo";
import { cn, formatDate } from "@/lib/format";

/** The printed certificate artwork. `qrSvg` is generated server-side via lib/qr. */
export function CertificatePreview({
  certificate: c,
  qrSvg,
  signatory,
  issuerName,
  className,
}: {
  certificate: Certificate;
  qrSvg?: string;
  signatory: { signatoryName: string; signatoryTitle: string };
  issuerName: string;
  className?: string;
}) {
  return (
    <figure
      aria-label={`Certificate ${c.id} for ${c.holderName}`}
      className={cn("paper relative overflow-hidden rounded-xl bg-[#fffdf8] p-2 shadow-(--shadow-lift) ring-1 ring-seal-400/30 sm:p-3", className)}
    >
      <div className="guilloche-ink relative rounded-lg border-2 border-navy-800 p-1">
        <div className="relative flex flex-col items-center rounded border border-seal-400/60 px-5 py-8 text-center sm:px-12 sm:py-12">
          {/* corner ornaments */}
          {["left-2 top-2", "right-2 top-2 rotate-90", "bottom-2 right-2 rotate-180", "bottom-2 left-2 -rotate-90"].map((pos) => (
            <svg key={pos} viewBox="0 0 24 24" className={cn("absolute size-6 text-seal-500", pos)} aria-hidden>
              <path d="M2 14V2h12M6 10V6h4" fill="none" stroke="currentColor" strokeWidth={1.2} />
            </svg>
          ))}

          <LogoMark className="h-12 sm:h-14" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-navy-700 sm:text-xs">{issuerName}</p>
          <h3 className="mt-5 font-display text-2xl font-semibold tracking-wide text-navy-900 sm:text-4xl">Certificate of Completion</h3>
          <p className="mt-4 text-xs text-muted sm:text-sm">This is to certify that</p>
          <p className="mt-2 border-b border-seal-400/60 px-6 pb-2 font-display text-2xl italic text-navy-900 sm:text-4xl">{c.holderName}</p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-700 sm:text-sm">
            has successfully completed the required training and assessment for
          </p>
          <p className="mt-2 text-base font-semibold text-navy-900 sm:text-xl">{c.courseTitle}</p>
          <p className="mt-1 text-xs text-muted">
            {c.hours} guided learning hours · delivered by {c.issuedByName}
          </p>

          <div className="mt-8 grid w-full grid-cols-3 items-end gap-3 text-left sm:mt-10">
            <div>
              <p className="font-display text-sm italic text-navy-800 sm:text-base">{signatory.signatoryName}</p>
              <p className="mt-1 border-t border-navy-200 pt-1 text-[9px] uppercase tracking-wider text-muted sm:text-[10px]">{signatory.signatoryTitle}</p>
            </div>
            <div className="flex justify-center">
              <div className="relative flex size-16 items-center justify-center rounded-full bg-seal-500 text-center text-[7px] font-bold uppercase leading-tight tracking-wider text-white ring-4 ring-seal-100 sm:size-20 sm:text-[8px]">
                <span className="absolute inset-1.5 rounded-full border border-dashed border-white/60" />
                NYTI
                <br />
                Certified
              </div>
            </div>
            <div className="flex flex-col items-end">
              {qrSvg && <div className="size-14 sm:size-16 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
              <p className="mt-1 text-right text-[9px] uppercase tracking-wider text-muted sm:text-[10px]">Scan to verify</p>
            </div>
          </div>

          <div className="mt-6 flex w-full flex-wrap justify-between gap-2 border-t border-navy-100 pt-3 font-mono text-[10px] text-muted sm:text-xs">
            <span>ID: {c.id}</span>
            <span>Issued: {formatDate(c.issueDate)}</span>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        Certificate of Completion awarded to {c.holderName} for {c.courseTitle}, issued {formatDate(c.issueDate)}.
      </figcaption>
    </figure>
  );
}
