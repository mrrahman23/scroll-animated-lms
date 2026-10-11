"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setApplicationStatusAction, setMessageStatusAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/interactive";

export interface MessageRow { id: number; name: string; email: string; phone: string | null; subject: string; message: string; status: "new" | "read" | "archived"; createdAt: string }
export interface ApplicationRow { id: number; orgName: string; orgType: string; contactName: string; email: string; phone: string; district: string; category: string; mode: string | null; about: string | null; status: "pending" | "approved" | "rejected"; createdAt: string }

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function InboxView({ messages, applications }: { messages: MessageRow[]; applications: ApplicationRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const msgList = (
    <ul className="space-y-3">
      {messages.length === 0 && <li className="text-sm text-muted">No messages yet.</li>}
      {messages.filter((m) => m.status !== "archived").map((m) => (
        <li key={m.id} className={`rounded-2xl border p-5 ${m.status === "new" ? "border-brand-200 bg-brand-50/40" : "border-line bg-white"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-navy-900">{m.subject} {m.status === "new" && <Badge tone="brand">New</Badge>}</p>
              <p className="text-sm text-muted">{m.name} · <a className="text-brand-700 hover:underline" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>{m.email}</a>{m.phone && ` · ${m.phone}`} · {when(m.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              {m.status === "new" && <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => setMessageStatusAction(m.id, "read"))}>Mark read</Button>}
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setMessageStatusAction(m.id, "archived"))}>Archive</Button>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{m.message}</p>
        </li>
      ))}
    </ul>
  );

  const appList = (
    <ul className="space-y-3">
      {applications.length === 0 && <li className="text-sm text-muted">No applications yet.</li>}
      {applications.map((a) => (
        <li key={a.id} className="rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-navy-900">{a.orgName} <span className="text-sm font-normal text-muted">· {a.orgType}</span></p>
              <p className="text-sm text-muted">{a.contactName} · <a className="text-brand-700 hover:underline" href={`mailto:${a.email}`}>{a.email}</a> · {a.phone} · {a.district} · {when(a.createdAt)}</p>
              <p className="text-xs text-muted">{a.category}{a.mode && ` · ${a.mode}`}</p>
            </div>
            <Badge tone={a.status === "approved" ? "verify" : a.status === "rejected" ? "danger" : "warning"} className="capitalize">{a.status}</Badge>
          </div>
          {a.about && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{a.about}</p>}
          {a.status === "pending" && (
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => setApplicationStatusAction(a.id, "rejected"))}>Reject</Button>
              <Button size="sm" variant="verify" disabled={pending} onClick={() => act(() => setApplicationStatusAction(a.id, "approved"))}>Mark approved</Button>
            </div>
          )}
          {a.status === "approved" && (
            <p className="mt-3 rounded-xl bg-surface p-3 text-xs text-muted">
              Next: add the partner to <code>data/partners.json</code> (so it appears in the directory), then create a partner account for {a.email} in Users and link it to that partner.
            </p>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <Tabs
      label="Inbox"
      tabs={[
        { id: "messages", label: `Messages (${messages.filter((m) => m.status === "new").length} new)`, content: msgList },
        { id: "applications", label: `Partner applications (${applications.filter((a) => a.status === "pending").length} pending)`, content: appList },
      ]}
    />
  );
}
