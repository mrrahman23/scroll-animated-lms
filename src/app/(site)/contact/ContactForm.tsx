"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/forms";
import { useToast } from "@/components/ui/Toast";
import type { FormResult } from "@/lib/forms/validate";
import { sendContactMessage } from "./actions";

export function ContactForm({ subjects }: { subjects: string[] }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormResult, FormData>(sendContactMessage, null);
  const err = state?.fieldErrors ?? {};

  useEffect(() => {
    if (!state) return;
    toast({ tone: state.ok ? "success" : "error", title: state.ok ? "Message sent" : "Message not sent", description: state.message });
    if (state.ok) formRef.current?.reset();
  }, [state, toast]);

  return (
    <form ref={formRef} action={action} className="relative grid gap-5 sm:grid-cols-2" noValidate>
      <Honeypot />
      <Field label="Name" htmlFor="c-name" required error={err.name}>
        <Input id="c-name" name="name" autoComplete="name" required aria-invalid={!!err.name} />
      </Field>
      <Field label="Email" htmlFor="c-email" required error={err.email}>
        <Input id="c-email" name="email" type="email" autoComplete="email" required aria-invalid={!!err.email} />
      </Field>
      <Field label="Phone" htmlFor="c-phone">
        <Input id="c-phone" name="phone" type="tel" autoComplete="tel" />
      </Field>
      <Field label="Subject" htmlFor="c-subject" required error={err.subject}>
        <Select id="c-subject" name="subject" required defaultValue="" aria-invalid={!!err.subject}>
          <option value="" disabled>Choose a subject</option>
          {subjects.map((subject) => (
            <option key={subject}>{subject}</option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Message" htmlFor="c-msg" required error={err.message}>
          <Textarea id="c-msg" name="message" required aria-invalid={!!err.message} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          <Send className="size-4" aria-hidden />
          {pending ? "Sending…" : "Send Message"}
        </Button>
      </div>
    </form>
  );
}
