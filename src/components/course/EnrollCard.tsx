"use client";

import { Award, CalendarDays, Check, Clock, Globe, Hourglass, LogIn, MonitorPlay, School } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { enrollAction } from "@/app/(site)/courses/[slug]/actions";
import type { Course, LearningMode } from "@/types";
import type { SiteContent } from "@/types/content";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/forms";
import { useToast } from "@/components/ui/Toast";
import type { FormResult } from "@/lib/forms/validate";
import { cn, formatDate, formatPrice, modeLabel } from "@/lib/format";

type Viewer = { signedIn: false; demo?: boolean } | { signedIn: true; role: string; status: string | null; demo?: boolean };

/**
 * The course page is pre-built for everyone, so the visitor's own state (signed in? enrolled?)
 * is always fetched here at runtime — never baked into the page.
 */
export function EnrollCard({ course, payments }: { course: Course; payments?: SiteContent["payments"] }) {
  const [mode, setMode] = useState<LearningMode>(course.modes[0]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [state, action, pending] = useActionState<(FormResult & { status?: string }) | null, FormData>(enrollAction, null);
  const toast = useToast();
  const paid = course.price > 0;

  // With a database, the visitor's own state loads here so the page itself can stay static.
  useEffect(() => {
    let live = true;
    fetch(`/api/me/enrollment?course=${encodeURIComponent(course.slug)}`)
      .then((r) => r.json())
      .then((v: Viewer) => live && setViewer(v))
      .catch(() => live && setViewer({ signedIn: false }));
    return () => {
      live = false;
    };
  }, [course.slug]);

  useEffect(() => {
    if (!state) return;
    toast({ tone: state.ok ? "success" : "error", title: state.ok ? "Enrolment" : "Not enrolled", description: state.message });
  }, [state, toast]);

  // A successful enrolment in this session takes precedence over the loaded state.
  const demo = viewer?.demo ?? false;
  const status = state?.ok && state.status ? state.status : viewer?.signedIn ? viewer.status : null;
  const items = [
    { icon: Clock, label: `${course.durationWeeks} weeks · ${course.hoursPerWeek} hrs/week` },
    { icon: Globe, label: course.language },
    { icon: mode === "online" ? MonitorPlay : School, label: mode === "online" ? "Self-paced lessons" : "Classroom sessions at a partner center" },
    { icon: Award, label: "NYTI Certified on completion" },
  ];

  const cta = () => {
    if (status === "active" || status === "completed")
      return (
        <ButtonLink href={`/dashboard/courses/${course.slug}`} size="lg" variant="verify" className="mt-5 w-full">
          <Check className="size-5" aria-hidden /> {status === "completed" ? "Completed · View course" : "Enrolled · Continue Learning"}
        </ButtonLink>
      );
    if (status === "pending")
      return (
        <p role="status" className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden /> Payment under review. Your course unlocks once it&apos;s confirmed.
        </p>
      );
    if (demo)
      return (
        <Button size="lg" className="mt-5 w-full" onClick={() => toast({ tone: "info", title: "Demo mode", description: "Enrolment is saved once the database is connected." })}>
          Enroll Now
        </Button>
      );
    if (!viewer) return <div className="mt-5 h-13 animate-pulse rounded-xl bg-navy-50" aria-hidden />;
    if (!viewer.signedIn)
      return (
        <ButtonLink href={`/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`} size="lg" className="mt-5 w-full">
          <LogIn className="size-5" aria-hidden /> Sign in to enrol
        </ButtonLink>
      );
    if (viewer.role !== "student") return <p className="mt-5 rounded-xl bg-surface p-3 text-sm text-muted">Sign in with a student account to enrol.</p>;
    return (
      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="course" value={course.slug} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="paid" value={paid ? "1" : "0"} />
        {paid && payments && (
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4 text-sm">
            <p className="text-slate-700">{payments.instructions}</p>
            <ul className="space-y-1 text-xs text-muted">
              {payments.methods.map((m) => (
                <li key={m.method}><strong className="text-navy-900">{m.method}:</strong> {m.details}</li>
              ))}
            </ul>
            <Field label="Paid with" htmlFor="method" required error={state?.fieldErrors?.method}>
              <Select id="method" name="method" defaultValue="">
                <option value="" disabled>Choose…</option>
                {payments.methods.map((m) => <option key={m.method}>{m.method}</option>)}
              </Select>
            </Field>
            <Field label="Transaction ID" htmlFor="trx" required error={state?.fieldErrors?.trx}>
              <Input id="trx" name="trx" autoComplete="off" placeholder="e.g. 9BX7K2L3QA" />
            </Field>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Enrolling…" : paid ? `Enrol · ${formatPrice(course.price)}` : "Enroll Now — Free"}
        </Button>
      </form>
    );
  };

  return (
    <div className="fx-card rounded-2xl border border-line bg-white p-6 shadow-(--shadow-lift)">
      <p className="text-3xl font-bold text-navy-900">{formatPrice(course.price)}</p>
      {paid && <p className="mt-1 text-xs text-muted">One-time fee · bKash, Nagad or bank transfer</p>}

      {course.modes.length > 1 && !status && (
        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-medium text-navy-900">Learning mode</legend>
          <div className="grid grid-cols-2 gap-2">
            {course.modes.map((m) => (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all has-focus-visible:ring-4 has-focus-visible:ring-brand-200",
                  mode === m ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line text-slate-700 hover:border-navy-300",
                )}
              >
                <input type="radio" name="mode-choice" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                {m === "online" ? <MonitorPlay className="size-4" aria-hidden /> : <School className="size-4" aria-hidden />}
                {modeLabel[m]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {course.nextIntake && (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm text-slate-700">
          <CalendarDays className="size-4 text-brand-600" aria-hidden />
          Next intake: <strong className="font-semibold text-navy-900">{formatDate(course.nextIntake)}</strong>
        </p>
      )}

      {cta()}

      <ul className="mt-6 space-y-3 border-t border-line pt-6 text-sm text-slate-700">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3">
            <i.icon className="size-4 shrink-0 text-navy-400" aria-hidden />
            {i.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
