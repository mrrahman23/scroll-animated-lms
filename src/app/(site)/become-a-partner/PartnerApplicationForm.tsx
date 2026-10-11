"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/forms";
import { useToast } from "@/components/ui/Toast";
import type { FormResult } from "@/lib/forms/validate";
import type { Category } from "@/types";
import { submitPartnerApplication } from "./actions";

export function PartnerApplicationForm({ categories }: { categories: Category[] }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormResult, FormData>(submitPartnerApplication, null);
  const err = state?.fieldErrors ?? {};

  useEffect(() => {
    if (!state) return;
    toast({ tone: state.ok ? "success" : "error", title: state.ok ? "Application submitted" : "Application not submitted", description: state.message });
    if (state.ok) formRef.current?.reset();
  }, [state, toast]);

  return (
    <form ref={formRef} action={action} className="relative grid gap-5 sm:grid-cols-2" noValidate>
      <Honeypot />
      <Field label="Organization name" htmlFor="org" required error={err.orgName}><Input id="org" name="org" required aria-invalid={!!err.orgName} /></Field>
      <Field label="Organization type" htmlFor="type" required error={err.orgType}>
        <Select id="type" name="type" required defaultValue="" aria-invalid={!!err.orgType}>
          <option value="" disabled>Select type</option>
          <option>Training Center</option><option>Technical Institute</option><option>College</option><option>NGO</option><option>Corporate Academy</option>
        </Select>
      </Field>
      <Field label="Contact person" htmlFor="contact" required error={err.contactName}><Input id="contact" name="contact" autoComplete="name" required aria-invalid={!!err.contactName} /></Field>
      <Field label="Email" htmlFor="email" required error={err.email}><Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!err.email} /></Field>
      <Field label="Phone" htmlFor="phone" required error={err.phone}><Input id="phone" name="phone" type="tel" autoComplete="tel" required aria-invalid={!!err.phone} /></Field>
      <Field label="District" htmlFor="district" required error={err.district}><Input id="district" name="district" required aria-invalid={!!err.district} /></Field>
      <Field label="Primary course category" htmlFor="category">
        <Select id="category" name="category" defaultValue={categories[0]?.id}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Training type" htmlFor="mode">
        <Select id="mode" name="mode" defaultValue="offline"><option value="offline">Offline</option><option value="online">Online</option><option value="hybrid">Both</option></Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Facilities & experience" htmlFor="about" hint="Describe classrooms, labs, instructor qualifications and years of operation.">
          <Textarea id="about" name="about" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Submitting…" : "Submit Application"}</Button>
      </div>
    </form>
  );
}
