"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Honeypot, Input } from "@/components/ui/forms";
import { login, register } from "@/lib/auth/actions";
import type { FormResult } from "@/lib/forms/validate";

function PasswordInput({ id, autoComplete, invalid }: { id: string; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={id === "password" ? "password" : id} type={show ? "text" : "password"} autoComplete={autoComplete} required className="pr-11" aria-invalid={invalid} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-navy-900" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

function FormMessage({ state }: { state: FormResult }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      {state.message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(login, null);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <PasswordInput id="password" autoComplete="current-password" />
      </Field>
      <p className="text-right text-sm">
        <Link href="/help#faq" className="font-semibold text-brand-700 hover:text-brand-800">Forgot password?</Link>
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Login"}
      </Button>
      <p className="text-center text-sm text-muted">
        New to NYTI?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:text-brand-800">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(register, null);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="relative space-y-5" noValidate>
      <Honeypot />
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first" required error={err.first}><Input id="first" name="first" autoComplete="given-name" required aria-invalid={!!err.first} /></Field>
        <Field label="Last name" htmlFor="last" required error={err.last}><Input id="last" name="last" autoComplete="family-name" required aria-invalid={!!err.last} /></Field>
      </div>
      <Field label="Email" htmlFor="email" required error={err.email}><Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!err.email} /></Field>
      <Field label="Mobile number" htmlFor="phone" hint="Used for course updates."><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" /></Field>
      <Field label="Password" htmlFor="password" required hint="At least 8 characters, with letters and numbers." error={err.password}>
        <PasswordInput id="password" autoComplete="new-password" invalid={!!err.password} />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="terms" className="mt-0.5 size-4 rounded border-navy-300 accent-brand-600" />
          <span>I agree to the <Link href="/terms" className="font-semibold text-brand-700">Terms</Link> and <Link href="/privacy" className="font-semibold text-brand-700">Privacy Policy</Link>.</span>
        </label>
        {err.terms && <p role="alert" className="mt-1 text-xs font-medium text-red-700">{err.terms}</p>}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create Account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">Login</Link>
      </p>
    </form>
  );
}
