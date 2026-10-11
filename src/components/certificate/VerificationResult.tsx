"use client";

import { Ban, CircleHelp, Hourglass, ShieldCheck } from "lucide-react";
import { useSite } from "@/components/site/SiteProvider";
import type { CertificateStatus, VerificationResult as Result } from "@/types";
import { cn, formatDate, modeLabel } from "@/lib/format";
import { MarkSheet } from "./MarkSheet";

const statusConfig: Record<
  CertificateStatus,
  { title: string; label: string; message: string; icon: typeof ShieldCheck; tone: string; iconBg: string; pill: string }
> = {
  valid: {
    title: "Certificate Verified",
    label: "Valid",
    message: "This certificate has been verified by the National Youth Training Institute.",
    icon: ShieldCheck,
    tone: "border-verify-200 bg-verify-50/60",
    iconBg: "bg-verify-600 ring-verify-100",
    pill: "bg-verify-600 text-white",
  },
  expired: {
    title: "Certificate Expired",
    label: "Expired",
    message: "This certificate was genuinely issued by NYTI but is past its validity period.",
    icon: Hourglass,
    tone: "border-amber-200 bg-amber-50/60",
    iconBg: "bg-amber-500 ring-amber-100",
    pill: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
  },
  revoked: {
    title: "Certificate Revoked",
    label: "Revoked",
    message: "This certificate was issued but has since been revoked and is no longer valid.",
    icon: Ban,
    tone: "border-red-200 bg-red-50/50",
    iconBg: "bg-red-600 ring-red-100",
    pill: "bg-red-600 text-white",
  },
};

export function VerificationResult({ result, variant = "light" }: { result: Result; variant?: "light" | "card" }) {
  const site = useSite();
  if (!result.found || !result.certificate) {
    return (
      <div role="alert" className="animate-fade-up rounded-2xl border border-line bg-white p-6 text-center shadow-(--shadow-card) sm:p-8">
        <span className="mx-auto flex size-14 animate-seal items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-8 ring-slate-50">
          <CircleHelp className="size-7" aria-hidden />
        </span>
        <h3 className="mt-5 text-xl font-semibold text-navy-900">Certificate Not Found</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {result.query.startsWith("Reg ") ? (
            <>
              No result was found for <strong className="font-mono text-ink">{result.query}</strong>. Check both numbers against the certificate — they must match exactly.
            </>
          ) : (
            <>
              The certificate ID <strong className="font-mono text-ink">{result.query || "—"}</strong> could not be found in the {site.shortName} verification system. Check the ID for typing errors — it should look like <span className="font-mono">{site.verification.exampleId}</span>.
            </>
          )}
        </p>
        <p className="mt-4 text-xs text-muted">If you believe this certificate is genuine, contact {site.contact.emails.verification}.</p>
      </div>
    );
  }

  const c = result.certificate;
  const cfg = statusConfig[c.status];
  const rows: [string, string][] = [
    ["Certificate Holder", c.holderName],
    ["Course", c.courseTitle],
    ["Certificate ID", c.id],
    ["Issued By", c.issuedByName],
    ["Verified By", site.name],
    [result.details ? "Recorded On" : "Issue Date", formatDate(c.issueDate)],
  ];
  if (c.expiryDate) rows.push([c.status === "expired" ? "Expired On" : "Valid Until", formatDate(c.expiryDate)]);
  rows.push(["Training Mode", modeLabel[c.mode]]);

  return (
    <div role="status" className={cn("animate-fade-up overflow-hidden rounded-2xl border border-line bg-white shadow-(--shadow-lift)", variant === "card" && "text-left")}>
      <div className={cn("relative flex flex-col items-center gap-4 border-b px-6 py-7 text-center sm:flex-row sm:text-left", cfg.tone)}>
        <span className={cn("relative flex size-14 shrink-0 animate-seal items-center justify-center rounded-full text-white ring-8", cfg.iconBg)}>
          {c.status === "valid" ? (
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5 10 17.5 19 7" strokeDasharray={30} className="animate-draw" />
            </svg>
          ) : (
            <cfg.icon className="size-7" aria-hidden />
          )}
        </span>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-navy-900">{cfg.title}</h3>
          <p className="mt-1 text-sm text-slate-700">{cfg.message}</p>
        </div>
        <span className={cn("rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-[0.14em]", cfg.pill)}>{cfg.label}</span>
      </div>

      <dl className="grid gap-px bg-line sm:grid-cols-2 sm:[&>div:last-child:nth-child(odd)]:col-span-2">
        {rows.map(([k, v]) => (
          <div key={k} className="bg-white px-6 py-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">{k}</dt>
            <dd className={cn("mt-1 font-semibold text-navy-900", k === "Certificate ID" && "font-mono")}>{v}</dd>
          </div>
        ))}
      </dl>

      {c.statusReason && (
        <p className="border-t border-line bg-surface px-6 py-4 text-sm text-slate-700">
          <strong className="font-semibold">Reason: </strong>
          {c.statusReason}
        </p>
      )}
      {result.details && <MarkSheet details={result.details} holderName={c.holderName} courseTitle={c.courseTitle} />}
      <p className="border-t border-line px-6 py-3 text-xs text-muted">
        Checked {new Date(result.checkedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · For privacy, only essential certificate details are shown.
      </p>
    </div>
  );
}
