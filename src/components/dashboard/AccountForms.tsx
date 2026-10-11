"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/forms";
import { useToast } from "@/components/ui/Toast";
import { changePassword, updateProfile } from "@/lib/auth/actions";
import type { FormResult } from "@/lib/forms/validate";

function useResultToast(state: FormResult, onOk?: () => void) {
  const toast = useToast();
  useEffect(() => {
    if (!state) return;
    toast({ tone: state.ok ? "success" : "error", title: state.ok ? state.message : "Not saved", description: state.ok ? undefined : state.message });
    if (state.ok) onOk?.();
  }, [state, toast, onOk]);
}

const demoAction = async (): Promise<FormResult> => ({ ok: false, message: "Saving needs the database (demo mode)." });

export function ProfileDetailsForm({ user, demo }: { user: { name: string; email: string; phone?: string; location?: string }; demo?: boolean }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(demo ? demoAction : updateProfile, null);
  useResultToast(state);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Field label="Full name" htmlFor="p-name" required error={err.name}><Input id="p-name" name="name" defaultValue={user.name} autoComplete="name" required /></Field>
      <Field label="Email" htmlFor="p-email" hint="Contact support to change your sign-in email."><Input id="p-email" type="email" defaultValue={user.email} disabled /></Field>
      <Field label="Phone" htmlFor="p-phone"><Input id="p-phone" name="phone" type="tel" defaultValue={user.phone} autoComplete="tel" /></Field>
      <Field label="Location" htmlFor="p-loc"><Input id="p-loc" name="location" defaultValue={user.location} /></Field>
      <p className="text-xs text-muted sm:col-span-2">Your name appears on certificates exactly as entered here. Name changes after certification require a support request.</p>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
    </form>
  );
}

export function PasswordForm({ demo }: { demo?: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormResult, FormData>(demo ? demoAction : changePassword, null);
  useResultToast(state, () => ref.current?.reset());
  const err = state?.fieldErrors ?? {};
  return (
    <form ref={ref} action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2 sm:max-w-sm">
        <Field label="Current password" htmlFor="current" required error={err.current}><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
      </div>
      <Field label="New password" htmlFor="password" required hint="At least 8 characters, with letters and numbers." error={err.password}><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
      <Field label="Confirm new password" htmlFor="confirm" required error={err.confirm}><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></Field>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button></div>
    </form>
  );
}
