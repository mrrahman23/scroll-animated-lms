"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { VerificationResult as Result } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/format";
import { VERIFIED_EVENT } from "@/components/three/scenes/medal";
import { useSite } from "@/components/site/SiteProvider";
import { VerificationResult } from "./VerificationResult";


type Query = string | { reg: string; roll: string };

async function requestVerification(q: Query): Promise<Result> {
  const qs = typeof q === "string" ? `id=${encodeURIComponent(q)}` : `reg=${encodeURIComponent(q.reg)}&roll=${encodeURIComponent(q.roll)}`;
  const res = await fetch(`/api/certificates/verify?${qs}`);
  if (!res.ok) throw new Error("Verification service unavailable");
  return res.json();
}

/** Keeps the loading state visible briefly so the result doesn't flash. */
async function lookupWithMinDelay(q: Query) {
  const [r] = await Promise.all([requestVerification(q), new Promise((res) => setTimeout(res, 450))]);
  return r;
}

const fieldClass =
  "h-14 w-full rounded-xl border-0 bg-white px-4 font-mono text-base tracking-wide text-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-200";

export function VerificationForm({
  initialId = "",
  initialReg = "",
  initialRoll = "",
  initialBy,
  variant = "page",
  syncUrl,
}: {
  initialId?: string;
  /** Registration + roll number (certificates from the previous NYTI system) */
  initialReg?: string;
  initialRoll?: string;
  initialBy?: "id" | "numbers";
  /** `inverse` renders on the navy homepage band. */
  variant?: "page" | "inverse";
  syncUrl?: boolean;
}) {
  const { verification } = useSite();
  const inputId = useId();
  const hintId = useId();
  const startByNumbers = initialBy === "numbers" || (!initialId && !!(initialReg || initialRoll));
  const [by, setBy] = useState<"id" | "numbers">(startByNumbers ? "numbers" : "id");
  const [value, setValue] = useState(initialId);
  const [reg, setReg] = useState(initialReg);
  const [roll, setRoll] = useState(initialRoll);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(initialId || (initialReg && initialRoll) ? "loading" : "idle");
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const show = useCallback(
    (r: Result) => {
      setResult(r);
      setState("done");
      // Lets themes celebrate (3D medal spin, confetti)
      window.dispatchEvent(new CustomEvent(VERIFIED_EVENT, { detail: { status: r.certificate?.status ?? "not-found" } }));
      if (syncUrl && (r.found || !r.query.startsWith("Reg "))) window.history.replaceState(null, "", `?id=${encodeURIComponent(r.query)}`);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    },
    [syncUrl],
  );

  const verify = (q: Query) => {
    if (typeof q === "string" ? !q.trim() : !q.reg.trim() || !q.roll.trim()) return;
    setState("loading");
    lookupWithMinDelay(typeof q === "string" ? q.trim() : q).then(show, () => setState("error"));
  };

  // Deep links (e.g. from a certificate QR code, or an old /show_result link) verify on arrival
  useEffect(() => {
    const q: Query | null = initialId.trim() ? initialId.trim() : initialReg.trim() && initialRoll.trim() ? { reg: initialReg, roll: initialRoll } : null;
    if (!q) return;
    let cancelled = false;
    lookupWithMinDelay(q).then(
      (r) => !cancelled && show(r),
      () => !cancelled && setState("error"),
    );
    return () => {
      cancelled = true;
    };
  }, [initialId, initialReg, initialRoll, show]);

  const inverse = variant === "inverse";
  const canSubmit = by === "id" ? !!value.trim() : !!reg.trim() && !!roll.trim();

  return (
    <div>
      <div role="radiogroup" aria-label="Verify by" className={cn("mb-3 inline-flex rounded-xl p-1 text-sm font-semibold", inverse ? "bg-white/10" : "bg-navy-50")}>
        {(
          [
            ["id", "Certificate ID"],
            ["numbers", "Reg & Roll No."],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={by === k}
            onClick={() => setBy(k)}
            className={cn(
              "rounded-lg px-4 py-1.5 transition-colors",
              by === k ? (inverse ? "bg-white text-navy-900" : "bg-white text-navy-900 shadow-sm") : inverse ? "text-navy-100 hover:text-white" : "text-muted hover:text-navy-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {by === "numbers" ? (
        <form
          role="search"
          aria-label="Verify by registration and roll number"
          onSubmit={(e) => {
            e.preventDefault();
            verify({ reg, roll });
          }}
          className={cn("flex flex-col gap-3 rounded-2xl p-2 sm:flex-row", inverse ? "bg-white/10 ring-1 ring-white/15 backdrop-blur" : "bg-white shadow-(--shadow-lift) ring-1 ring-line")}
        >
          <label className="flex-1">
            <span className="sr-only">Registration number</span>
            <input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="Registration No." inputMode="numeric" autoComplete="off" className={fieldClass} />
          </label>
          <label className="flex-1">
            <span className="sr-only">Roll number</span>
            <input value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="Roll No." inputMode="numeric" autoComplete="off" className={fieldClass} />
          </label>
          <Button type="submit" variant="verify" size="lg" className="h-14 sm:px-8" disabled={state === "loading" || !canSubmit}>
            {state === "loading" ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <ShieldCheck className="size-5" aria-hidden />}
            {state === "loading" ? "Searching…" : "Search Result"}
          </Button>
        </form>
      ) : (
      <form
        role="search"
        aria-label="Certificate verification"
        onSubmit={(e) => {
          e.preventDefault();
          verify(value);
        }}
        className={cn("flex flex-col gap-3 rounded-2xl p-2 sm:flex-row", inverse ? "bg-white/10 ring-1 ring-white/15 backdrop-blur" : "bg-white shadow-(--shadow-lift) ring-1 ring-line")}
      >
        <label htmlFor={inputId} className="sr-only">
          Certificate ID
        </label>
        <div className="relative flex-1">
          <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-navy-400" aria-hidden />
          <input
            id={inputId}
            aria-describedby={hintId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter Certificate ID"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full rounded-xl border-0 bg-white pl-12 pr-4 font-mono text-base uppercase tracking-wide text-ink placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-200"
          />
        </div>
        <Button type="submit" variant="verify" size="lg" className="h-14 sm:px-8" disabled={state === "loading" || !value.trim()}>
          {state === "loading" ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <ShieldCheck className="size-5" aria-hidden />}
          {state === "loading" ? "Verifying…" : "Verify Certificate"}
        </Button>
      </form>
      )}

      {by === "numbers" ? (
        <p id={hintId} className={cn("mt-4 text-sm", inverse ? "text-navy-200" : "text-muted")}>
          For NYTI certificates and diploma results issued before the new system: enter both numbers exactly as printed.
        </p>
      ) : (
      <div id={hintId} className={cn("mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm", inverse ? "text-navy-200" : "text-muted")}>
        <span>
          Example: <span className={cn("font-mono", inverse ? "text-white" : "text-ink")}>{verification.exampleId}</span>
        </span>
        <span aria-hidden className="hidden sm:inline">·</span>
        <span className="flex flex-wrap items-center gap-2">
          Try a sample:
          {verification.samples.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setValue(s.id);
                verify(s.id);
              }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                inverse ? "bg-white/10 text-white hover:bg-white/20" : "bg-navy-50 text-navy-800 hover:bg-navy-100",
              )}
            >
              {s.label}
            </button>
          ))}
        </span>
      </div>

      )}

      <div ref={resultRef} aria-live="polite" className="mt-8 scroll-mt-28 empty:mt-0">
        {state === "error" && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
            The verification service could not be reached. Please try again in a moment.
          </p>
        )}
        {state === "done" && result && <VerificationResult key={result.checkedAt} result={result} />}
      </div>
    </div>
  );
}
