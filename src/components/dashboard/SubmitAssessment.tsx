"use client";

import { useActionState, useEffect, useState } from "react";
import { submitAssessmentAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/forms";
import { useToast } from "@/components/ui/Toast";
import type { FormResult } from "@/lib/forms/validate";

export function SubmitAssessment({ assessmentId, resubmit }: { assessmentId: string; resubmit?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormResult, FormData>(submitAssessmentAction, null);
  const toast = useToast();
  // Close the form after a successful submit (state adjustment during render).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setOpen(false);
  }
  useEffect(() => {
    if (!state) return;
    toast({ tone: state.ok ? "success" : "error", title: state.ok ? "Submitted" : "Not submitted", description: state.message });
  }, [state, toast]);

  if (!open)
    return (
      <Button size="sm" variant={resubmit ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {resubmit ? "Update submission" : "Submit"}
      </Button>
    );
  return (
    <form action={action} className="mt-3 w-full space-y-3 rounded-xl border border-line bg-surface p-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <Field label="Your answer" htmlFor={`content-${assessmentId}`}>
        <Textarea id={`content-${assessmentId}`} name="content" className="min-h-24" />
      </Field>
      <Field label="Link to your work (optional)" htmlFor={`link-${assessmentId}`} hint="e.g. Google Drive, GitHub or Behance" error={state?.fieldErrors?.link}>
        <Input id={`link-${assessmentId}`} name="link" type="url" placeholder="https://" />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Submitting…" : "Submit"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
