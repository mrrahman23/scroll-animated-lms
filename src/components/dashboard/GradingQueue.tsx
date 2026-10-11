"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { gradeAction } from "@/app/instructor/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/forms";
import { useToast } from "@/components/ui/Toast";

export interface QueueItem {
  id: number;
  status: "submitted" | "graded";
  score: number | null;
  feedback: string | null;
  content: string | null;
  link: string | null;
  submittedAt: string;
  assessment: { title: string; maxScore: number };
  course: string;
  learner: { name: string; email: string };
}

function GradeForm({ item }: { item: QueueItem }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(item.status === "submitted");
  const toast = useToast();
  const router = useRouter();
  if (!editing)
    return (
      <div className="flex items-center gap-3">
        <Badge tone={(item.score ?? 0) >= item.assessment.maxScore * 0.5 ? "verify" : "danger"}>{item.score}/{item.assessment.maxScore}</Badge>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Change grade</Button>
      </div>
    );
  return (
    <form
      className="grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await gradeAction(item.id, Number(f.get("score")), String(f.get("feedback") ?? ""));
          toast({ tone: r?.ok ? "success" : "error", title: r?.ok ? "Saved" : "Not saved", description: r?.message });
          if (r?.ok) {
            setEditing(false);
            router.refresh();
          }
        });
      }}
    >
      <Field label={`Score / ${item.assessment.maxScore}`} htmlFor={`score-${item.id}`} required>
        <Input id={`score-${item.id}`} name="score" type="number" min={0} max={item.assessment.maxScore} defaultValue={item.score ?? undefined} required />
      </Field>
      <Field label="Feedback" htmlFor={`fb-${item.id}`}>
        <Textarea id={`fb-${item.id}`} name="feedback" defaultValue={item.feedback ?? ""} className="min-h-11" />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save grade"}</Button>
    </form>
  );
}

export function GradingQueue({ items }: { items: QueueItem[] }) {
  if (!items.length) return <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">No submissions yet.</p>;
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-navy-900">{item.assessment.title}</p>
              <p className="text-sm text-muted">{item.learner.name} · {item.course} · submitted {new Date(item.submittedAt).toLocaleDateString("en-GB")}</p>
            </div>
            <Badge tone={item.status === "graded" ? "verify" : "warning"}>{item.status === "graded" ? "Graded" : "To grade"}</Badge>
          </div>
          {item.content && <p className="mt-3 whitespace-pre-line rounded-xl bg-surface p-3 text-sm text-slate-700">{item.content}</p>}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              Open submitted work <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          {!item.content && !item.link && item.status === "graded" && <p className="mt-2 text-xs text-muted">Imported result (no submission content).</p>}
          <div className="mt-4">
            <GradeForm item={item} />
          </div>
        </li>
      ))}
    </ul>
  );
}
