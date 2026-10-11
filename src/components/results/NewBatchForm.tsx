"use client";

import { useActionState } from "react";
import { createBatchAction } from "@/app/admin/results/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/forms";
import type { FormResult } from "@/lib/forms/validate";

export function NewBatchForm({ courses, partners }: { courses: { id: string; title: string; subjects: number }[]; partners?: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(createBatchAction, null);
  if (!courses.length) {
    return <p className="text-sm text-muted">No course has mark sheet subjects yet. Add subjects to a course first (Courses → choose a course → <em>Mark sheet subjects</em>).</p>;
  }
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <Field label="Course" htmlFor="nb-course" required>
        <Select id="nb-course" name="course" required>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.subjects} subjects)</option>)}
        </Select>
      </Field>
      <Field label="Batch" htmlFor="nb-name" required>
        <Input id="nb-name" name="name" required placeholder="Jan–Jun 2026" />
      </Field>
      <Field label="Course duration" htmlFor="nb-dur">
        <Input id="nb-dur" name="duration" placeholder="6 Months" />
      </Field>
      {partners && (
        <Field label="Issued by" htmlFor="nb-partner">
          <Select id="nb-partner" name="partner" defaultValue="">
            <option value="">NYTI (issued directly)</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      )}
      <div className="sm:col-span-2 lg:col-span-4">
        {state && !state.ok && <p role="alert" className="mb-3 text-sm text-red-700">{state.message}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create batch & enter results"}</Button>
      </div>
    </form>
  );
}
