"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitRequestAction } from "@/app/partner-portal/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useToast } from "@/components/ui/Toast";
import type { FormResult } from "@/lib/forms/validate";

export function CertificationRequestForm({ courses }: { courses: { id: string; title: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const [state, action, pending] = useActionState<FormResult, FormData>(submitRequestAction, null);
  useEffect(() => {
    if (!state) return;
    toast({ tone: state.ok ? "success" : "error", title: state.ok ? "Request submitted" : "Not submitted", description: state.message });
    if (state.ok) ref.current?.reset();
  }, [state, toast]);
  const err = state?.fieldErrors ?? {};
  return (
    <form ref={ref} action={action} className="grid gap-5 sm:grid-cols-2">
      <Field label="Course" htmlFor="course" required error={err.course}>
        <Select id="course" name="course" defaultValue="">
          <option value="" disabled>Choose a course</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
      </Field>
      <Field label="Batch reference" htmlFor="batch" required hint="e.g. GD-DHK-2026-10" error={err.batch}><Input id="batch" name="batch" /></Field>
      <div className="sm:col-span-2">
        <Field label="Learners who passed" htmlFor="learners" required hint="One per line: Full name, email (email optional — it links the certificate to their NYTI account)." error={err.learners}>
          <Textarea id="learners" name="learners" className="min-h-40 font-mono text-xs" placeholder={"Mim Akter, mim@example.com\nArif Hasan"} />
        </Field>
      </div>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit for certification"}</Button></div>
    </form>
  );
}
