"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reviewClaimAction } from "@/app/admin/results/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type Claim = { id: number; createdAt: string; userName: string; userEmail: string; certId: string; holderName: string; courseTitle: string };

/** Students asking to add a certificate (found by reg + roll) to their account. */
export function ClaimsReview({ claims }: { claims: Claim[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  if (!claims.length) return <p className="text-sm text-muted">No requests waiting.</p>;
  const decide = (id: number, decision: "approved" | "rejected") => {
    const note = decision === "rejected" ? window.prompt("Reason (sent to the student):") ?? "" : "";
    if (decision === "rejected" && !note.trim()) return;
    start(async () => {
      const r = await reviewClaimAction(id, decision, note);
      toast({ tone: r?.ok ? "success" : "error", title: r?.ok ? "Done" : "Not done", description: r?.message });
      if (r?.ok) router.refresh();
    });
  };
  return (
    <ul className="divide-y divide-line">
      {claims.map((c) => (
        <li key={c.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
          <div className="flex-1 text-sm">
            <p className="font-semibold text-navy-900">
              {c.userName} <span className="font-normal text-muted">({c.userEmail})</span>
            </p>
            <p className="text-muted">
              wants <span className="font-mono text-ink">{c.certId}</span> — issued to <strong className={c.holderName.toLowerCase() === c.userName.toLowerCase() ? "text-verify-700" : "text-amber-700"}>{c.holderName}</strong>, {c.courseTitle}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => decide(c.id, "rejected")}>Decline</Button>
            <Button size="sm" disabled={pending} onClick={() => decide(c.id, "approved")}>Approve</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
