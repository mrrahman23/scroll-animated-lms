"use client";

import { useActionState } from "react";
import { claimCertificateAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/forms";
import type { FormResult } from "@/lib/forms/validate";

/** Students with an earlier NYTI certificate (or one issued without their email) can request it. */
export function ClaimCertificate({ claims }: { claims: { certificateId: string; status: string; note: string | null }[] }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(claimCertificateAction, null);
  return (
    <div>
      <p className="mb-4 text-sm text-muted">Have an NYTI certificate that isn&apos;t listed here? Enter the registration and roll number printed on it. NYTI checks the request and adds it to your account.</p>
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Registration No." htmlFor="cl-reg" required><Input id="cl-reg" name="reg" required inputMode="numeric" /></Field>
        <Field label="Roll No." htmlFor="cl-roll" required><Input id="cl-roll" name="roll" required inputMode="numeric" /></Field>
        <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Request certificate"}</Button>
      </form>
      {state && <p role="status" className={`mt-3 text-sm ${state.ok ? "text-verify-700" : "text-red-700"}`}>{state.message}</p>}
      {claims.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {claims.map((c) => (
            <li key={c.certificateId} className="text-muted">
              <span className="font-mono text-ink">{c.certificateId}</span> — {c.status === "pending" ? "waiting for NYTI" : c.status === "approved" ? "added" : `not approved${c.note ? `: ${c.note}` : ""}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
