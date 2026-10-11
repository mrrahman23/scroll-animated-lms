"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { FormResult } from "@/lib/forms/validate";

/** Approve / reject pair that calls a server action and refreshes. Reject can ask for a note. */
export function ReviewButtons({
  onApprove,
  onReject,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  askNote,
}: {
  onApprove: () => Promise<FormResult>;
  onReject: (note: string) => Promise<FormResult>;
  approveLabel?: string;
  rejectLabel?: string;
  askNote?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<FormResult>) =>
    start(async () => {
      const r = await fn();
      toast({ tone: r?.ok ? "success" : "error", title: r?.ok ? "Done" : "Not changed", description: r?.message });
      router.refresh();
    });
  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          const note = askNote ? window.prompt(askNote) : "";
          if (note === null) return;
          run(() => onReject(note));
        }}
      >
        {rejectLabel}
      </Button>
      <Button size="sm" variant="verify" disabled={pending} onClick={() => run(onApprove)}>
        {approveLabel}
      </Button>
    </div>
  );
}
