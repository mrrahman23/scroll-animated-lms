"use client";

import { Ban, History, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { certificateHistoryAction, issueCertificateAction, setCertificateStatusAction } from "@/app/admin/actions";
import type { Certificate, CertificateStatus, Course, Partner } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, Input, SearchInput, Select, Textarea } from "@/components/ui/forms";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/Toast";
import { useSite } from "@/components/site/SiteProvider";
import type { FormResult } from "@/lib/forms/validate";
import { formatDate } from "@/lib/format";

const statusTone: Record<CertificateStatus, "verify" | "warning" | "danger"> = { valid: "verify", expired: "warning", revoked: "danger" };
type HistoryRow = { id: number; action: string; reason: string | null; actor: string; createdAt: string };

/**
 * Certificate registry. With a database (`live`), issuing/revoking/restoring are saved and audited.
 * In demo mode the controls are shown but disabled.
 */
export function CertificateManager({ initial, courses, partners, live }: { initial: Certificate[]; courses: Course[]; partners: Partner[]; live: boolean }) {
  const toast = useToast();
  const site = useSite();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | CertificateStatus>("all");
  const [issueOpen, setIssueOpen] = useState(false);
  const [changing, setChanging] = useState<{ cert: Certificate; action: "revoke" | "restore" } | null>(null);
  const [history, setHistory] = useState<{ cert: Certificate; rows: HistoryRow[] } | null>(null);
  const [pending, start] = useTransition();
  const [issueState, issue, issuing] = useActionState<FormResult, FormData>(issueCertificateAction, null);
  const [handled, setHandled] = useState(issueState);
  if (issueState !== handled) {
    setHandled(issueState);
    if (issueState?.ok) setIssueOpen(false);
  }
  useEffect(() => {
    if (!issueState) return;
    toast({ tone: issueState.ok ? "success" : "error", title: issueState.ok ? "Certificate issued" : "Not issued", description: issueState.message });
    if (issueState.ok) router.refresh();
  }, [issueState, toast, router]);

  const filtered = useMemo(
    () => initial.filter((r) => (status === "all" || r.status === status) && `${r.id} ${r.holderName} ${r.courseTitle}`.toLowerCase().includes(q.toLowerCase())),
    [initial, q, status],
  );

  const columns: Column<Certificate>[] = [
    { key: "id", header: "Certificate ID", cell: (r) => <span className="font-mono text-xs font-semibold text-navy-900">{r.id}</span>, sortValue: (r) => r.id },
    { key: "holder", header: "Holder", cell: (r) => <span className="font-medium text-navy-900">{r.holderName}</span>, sortValue: (r) => r.holderName },
    { key: "course", header: "Course", cell: (r) => r.courseTitle, hideOnMobile: true },
    { key: "issuer", header: "Issued by", cell: (r) => <span className="text-muted">{r.issuedByName}</span>, hideOnMobile: true },
    { key: "date", header: "Issued", cell: (r) => formatDate(r.issueDate, "short"), sortValue: (r) => r.issueDate },
    { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone[r.status]} className="capitalize">{r.status}</Badge>, sortValue: (r) => r.status },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Link href={`/verify-certificate?id=${r.id}`} className="rounded-lg p-2 text-verify-700 hover:bg-verify-50" aria-label={`Verify ${r.id}`} title="Verify"><ShieldCheck className="size-4" aria-hidden /></Link>
          {live && (
            <button
              className="rounded-lg p-2 text-navy-700 hover:bg-navy-50"
              aria-label={`History of ${r.id}`}
              title="History"
              onClick={() => start(async () => setHistory({ cert: r, rows: await certificateHistoryAction(r.id) }))}
            >
              <History className="size-4" aria-hidden />
            </button>
          )}
          {live && r.status === "valid" && (
            <button onClick={() => setChanging({ cert: r, action: "revoke" })} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Revoke ${r.id}`} title="Revoke"><Ban className="size-4" aria-hidden /></button>
          )}
          {live && r.status === "revoked" && (
            <button onClick={() => setChanging({ cert: r, action: "restore" })} className="rounded-lg p-2 text-verify-700 hover:bg-verify-50" aria-label={`Restore ${r.id}`} title="Restore"><RotateCcw className="size-4" aria-hidden /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput label="Search certificates" placeholder="Search by ID, holder or course" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option><option value="valid">Valid</option><option value="expired">Expired</option><option value="revoked">Revoked</option>
        </Select>
        <Button onClick={() => setIssueOpen(true)} disabled={!live} title={live ? undefined : "Requires the database"}><Plus className="size-4" aria-hidden /> Issue certificate</Button>
      </div>
      <DataTable rows={filtered} columns={columns} caption="Certificate registry" />

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue a certificate" footer={<><Button variant="secondary" onClick={() => setIssueOpen(false)}>Cancel</Button><Button type="submit" form="issue-form" disabled={issuing}>{issuing ? "Issuing…" : "Issue certificate"}</Button></>}>
        <form id="issue-form" action={issue} className="space-y-4">
          <Field label="Learner full name" htmlFor="i-name" required><Input id="i-name" name="name" required /></Field>
          <Field label="Learner email (optional)" htmlFor="i-email" hint="Links the certificate to their account, if they have one."><Input id="i-email" name="email" type="email" /></Field>
          <Field label="Course" htmlFor="i-course" required>
            <Select id="i-course" name="course" required>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>
          </Field>
          <Field label="Issued by" htmlFor="i-issuer">
            <Select id="i-issuer" name="issuer" defaultValue=""><option value="">{site.name}</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          </Field>
          <p className="text-xs text-muted">The next certificate ID for this year is assigned automatically.</p>
        </form>
      </Modal>

      <Modal
        open={!!changing}
        onClose={() => setChanging(null)}
        title={changing?.action === "revoke" ? "Revoke certificate?" : "Restore certificate?"}
        footer={<><Button variant="secondary" onClick={() => setChanging(null)}>Cancel</Button><Button type="submit" form="status-form" disabled={pending} className={changing?.action === "revoke" ? "bg-red-600 hover:bg-red-700" : undefined}>{changing?.action === "revoke" ? "Revoke" : "Restore"}</Button></>}
      >
        <p className="text-sm text-slate-700">
          <strong className="font-mono">{changing?.cert.id}</strong> for <strong>{changing?.cert.holderName}</strong> will show as{" "}
          <strong>{changing?.action === "revoke" ? "Revoked" : "Valid"}</strong> on public verification immediately.
        </p>
        <form
          id="status-form"
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
            const c = changing!;
            start(async () => {
              const r = await setCertificateStatusAction(c.cert.id, c.action, reason);
              toast({ tone: r?.ok ? "success" : "error", title: r?.ok ? "Done" : "Not changed", description: r?.message });
              if (r?.ok) {
                setChanging(null);
                router.refresh();
              }
            });
          }}
        >
          <Field label={changing?.action === "revoke" ? "Reason (shown publicly)" : "Reason (kept in the history)"} htmlFor="r-reason" required>
            <Textarea id="r-reason" name="reason" required className="min-h-24" />
          </Field>
        </form>
      </Modal>

      <Modal open={!!history} onClose={() => setHistory(null)} title={`History · ${history?.cert.id ?? ""}`}>
        <ol className="space-y-3">
          {history?.rows.map((h) => (
            <li key={h.id} className="rounded-xl border border-line p-3 text-sm">
              <p className="font-semibold capitalize text-navy-900">{h.action}</p>
              {h.reason && <p className="mt-0.5 text-slate-700">{h.reason}</p>}
              <p className="mt-1 text-xs text-muted">{new Date(h.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {h.actor}</p>
            </li>
          ))}
          {history && history.rows.length === 0 && <p className="text-sm text-muted">No history recorded.</p>}
        </ol>
      </Modal>
    </>
  );
}
