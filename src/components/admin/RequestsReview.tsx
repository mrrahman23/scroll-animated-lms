"use client";

import { reviewRequestAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { ReviewButtons } from "./ReviewButtons";

export interface RequestRow {
  id: number;
  partner: string;
  course: string;
  batch: string;
  learners: { name: string; email?: string }[];
  status: "pending" | "approved" | "rejected";
  note: string | null;
  createdAt: string;
}

export function RequestsReview({ rows }: { rows: RequestRow[] }) {
  if (!rows.length) return <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">No certification requests yet.</p>;
  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-navy-900">{r.course}</p>
              <p className="text-sm text-muted">
                {r.partner} · batch <span className="font-mono">{r.batch}</span> · {r.learners.length} learner{r.learners.length === 1 ? "" : "s"} · {new Date(r.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <Badge tone={r.status === "approved" ? "verify" : r.status === "rejected" ? "danger" : "warning"} className="capitalize">{r.status}</Badge>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-brand-700">Learners</summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {r.learners.map((l, i) => (
                <li key={i} className="text-slate-700">{l.name}{l.email && <span className="text-muted"> · {l.email}</span>}</li>
              ))}
            </ul>
          </details>
          {r.note && <p className="mt-2 text-sm text-muted">Note: {r.note}</p>}
          {r.status === "pending" && (
            <div className="mt-4">
              <ReviewButtons
                approveLabel={`Approve & issue ${r.learners.length} certificate${r.learners.length === 1 ? "" : "s"}`}
                onApprove={() => reviewRequestAction(r.id, true)}
                onReject={(note) => reviewRequestAction(r.id, false, note)}
                askNote="Reason for rejecting (shared with the partner):"
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
