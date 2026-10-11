"use client";

import { ClipboardPaste, IdCard, Plus, Save, Send, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteBatchAction, publishBatchAction, rejectBatchAction, saveBatchAction, submitBatchAction, uploadStudentPhotoAction } from "@/app/admin/results/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/Toast";
import { GradeError, gradeCell, summarize } from "@/lib/grading";
import { cn } from "@/lib/format";
import type { CourseSubject, GradingScale } from "@/types";

export interface EditorStudent {
  id?: number;
  name: string;
  fatherName: string;
  motherName: string;
  rollNo: string;
  regNo: string;
  email: string;
  studentType: string;
  photo: string;
  certificateId: string | null;
  cells: Record<string, string>;
}

type Row = EditorStudent & { key: string };
type Status = "draft" | "submitted" | "published" | "rejected";

const statusInfo: Record<Status, { label: string; tone: "navy" | "warning" | "verify" | "danger" }> = {
  draft: { label: "Draft", tone: "navy" },
  submitted: { label: "Waiting for NYTI approval", tone: "warning" },
  published: { label: "Published", tone: "verify" },
  rejected: { label: "Sent back for changes", tone: "danger" },
};

let seq = 0;
const blankRow = (): Row => ({ key: `n${++seq}`, name: "", fatherName: "", motherName: "", rollNo: "", regNo: "", email: "", studentType: "Regular", photo: "", certificateId: null, cells: {} });
const ordinal = (n: number) => (n === 0 ? "Subjects" : `${["", "1st", "2nd", "3rd"][n] ?? `${n}th`} semester`);

/** Students × subjects results grid, shared by NYTI admins and partners. */
export function BatchEditor(p: {
  batchId: number;
  role: "admin" | "partner";
  status: Status;
  reviewNote: string | null;
  name: string;
  courseDuration: string;
  partnerId: string | null;
  courseTitle: string;
  subjects: CourseSubject[];
  grading: GradingScale;
  students: EditorStudent[];
  partners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [meta, setMeta] = useState({ name: p.name, courseDuration: p.courseDuration, partnerId: p.partnerId ?? "" });
  const [rows, setRows] = useState<Row[]>(() => (p.students.length ? p.students.map((s, i) => ({ ...s, key: `s${s.id ?? i}` })) : [blankRow()]));
  const [dirty, setDirty] = useState(false);
  const [problems, setProblems] = useState<{ title: string; items: string[]; tone: "error" | "info" } | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const semesters = useMemo(() => [...new Set(p.subjects.map((s) => s.semester))].sort((a, b) => a - b), [p.subjects]);
  const [semester, setSemester] = useState<number | "all">(semesters.length > 1 ? semesters[0] : "all");
  const [pending, start] = useTransition();

  const readOnly = p.role === "partner" && (p.status === "submitted" || p.status === "published");
  const visible = p.subjects.filter((s) => semester === "all" || s.semester === semester);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (key: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const setCell = (key: string, subjectId: string, value: string) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, cells: { ...r.cells, [subjectId]: value } } : r)));
    setDirty(true);
  };

  const preview = (r: Row) => {
    const cells = p.subjects.map((s) => {
      try {
        return gradeCell(r.cells[s.id] ?? "", s, p.grading);
      } catch {
        return null;
      }
    });
    return summarize(cells, p.subjects.length, p.grading);
  };

  const save = () =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        const r = await saveBatchAction(p.batchId, {
          name: meta.name,
          courseDuration: meta.courseDuration,
          partnerId: p.role === "admin" ? meta.partnerId || null : undefined,
          students: rows.map(({ key: _k, certificateId: _c, ...s }) => (void _k, void _c, s)),
        });
        setProblems(r.problems?.length ? { title: r.message, items: r.problems, tone: "error" } : null);
        toast({ tone: r.ok ? "success" : "error", title: r.ok ? "Saved" : "Not saved", description: r.ok ? r.message : r.problems?.length ? "See the list above the grid." : r.message });
        if (r.ok) {
          setDirty(false);
          router.refresh();
        }
        resolve(r.ok);
      }),
    );

  const run = (fn: () => Promise<{ ok: boolean; message: string; problems?: string[] } | null>, title: string) =>
    start(async () => {
      const r = await fn();
      if (!r) return;
      toast({ tone: r.ok ? "success" : "error", title: r.ok ? title : "Not done", description: r.message });
      setProblems(r.problems?.length ? { title: r.message, items: r.problems, tone: r.ok ? "info" : "error" } : null);
      if (r.ok) router.refresh();
    });

  const addPasted = (text: string) => {
    const added = text
      .split(/\r?\n/)
      .map((l) => l.split(/\t|,/).map((x) => x.trim()))
      .filter((c) => c[0])
      .map(([name, rollNo = "", regNo = "", fatherName = "", motherName = "", email = ""]) => ({ ...blankRow(), name, rollNo, regNo, fatherName, motherName, email }));
    if (!added.length) return;
    setRows((rs) => [...rs.filter((r) => r.name || Object.values(r.cells).some(Boolean)), ...added]);
    setDirty(true);
    setPasteOpen(false);
  };

  const unpublished = rows.filter((r) => !r.certificateId && r.name).length;
  const info = statusInfo[p.status];
  const detailRow = rows.find((r) => r.key === details);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={info.tone}>{info.label}</Badge>
        <span className="text-sm text-muted">{p.courseTitle} · {p.subjects.length} subjects · {rows.filter((r) => r.name).length} students</span>
      </div>
      {p.status === "rejected" && p.reviewNote && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>NYTI&apos;s note:</strong> {p.reviewNote}</p>
      )}
      {readOnly && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">{p.status === "submitted" ? "Submitted — NYTI is reviewing these results. You can't change them until they're published or sent back." : "Published — contact NYTI to correct a result."}</p>}

      <div className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-3">
        <Field label="Batch" htmlFor="b-name" hint="e.g. Jan–Jun 2026">
          <Input id="b-name" value={meta.name} disabled={readOnly} onChange={(e) => (setMeta({ ...meta, name: e.target.value }), setDirty(true))} />
        </Field>
        <Field label="Course duration" htmlFor="b-dur" hint="Shown on the mark sheet, e.g. 6 Months">
          <Input id="b-dur" value={meta.courseDuration} disabled={readOnly} onChange={(e) => (setMeta({ ...meta, courseDuration: e.target.value }), setDirty(true))} />
        </Field>
        {p.role === "admin" && (
          <Field label="Issued by" htmlFor="b-issuer">
            <Select id="b-issuer" value={meta.partnerId} disabled={p.status === "published"} onChange={(e) => (setMeta({ ...meta, partnerId: e.target.value }), setDirty(true))}>
              <option value="">NYTI (issued directly)</option>
              {p.partners.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
        )}
      </div>

      <p className="text-sm text-muted">
        Type <strong>marks</strong> (the grade is worked out from the <em>grading scale</em>) or a <strong>grade</strong> such as <code>A+</code>. Grades: {p.grading.scale.map((g) => `${g.grade} ≥${g.minMarks}%`).join(" · ")}.
      </p>

      {problems && (
        <div role="alert" className={cn("rounded-xl border p-4 text-sm", problems.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
          <p className="font-semibold">{problems.title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{problems.items.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {semesters.length > 1 && (
          <div role="tablist" aria-label="Semester" className="flex flex-wrap gap-1 rounded-xl bg-navy-50 p-1">
            {[...semesters, "all" as const].map((s) => (
              <button key={String(s)} role="tab" aria-selected={semester === s} onClick={() => setSemester(s)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", semester === s ? "bg-white text-navy-900 shadow-sm" : "text-muted hover:text-navy-800")}>
                {s === "all" ? "All subjects" : ordinal(s)}
              </button>
            ))}
          </div>
        )}
        {!readOnly && (
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPasteOpen(true)}><ClipboardPaste className="size-4" aria-hidden /> Paste students</Button>
            <Button variant="secondary" size="sm" onClick={() => (setRows((rs) => [...rs, blankRow()]), setDirty(true))}><Plus className="size-4" aria-hidden /> Add student</Button>
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="min-w-full border-collapse text-sm">
          <caption className="sr-only">Students and results</caption>
          <thead className="bg-surface text-xs text-muted">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-56 bg-surface px-3 py-2 text-left font-semibold uppercase tracking-wide">Student</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Roll</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Reg</th>
              {visible.map((s) => (
                <th key={s.id} scope="col" className="max-w-28 px-2 py-2 text-center align-bottom font-medium normal-case" title={`${s.code} ${s.name} (out of ${s.fullMarks})`}>
                  <span className="line-clamp-2 text-navy-900">{s.name}</span>
                  <span className="block font-mono text-[10px]">{s.code} · /{s.fullMarks}</span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-center font-semibold uppercase tracking-wide">CGPA</th>
              <th scope="col" className="px-2 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => {
              const sum = preview(r);
              const locked = readOnly;
              return (
                <tr key={r.key} className="align-top">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2">
                    <div className="w-56">
                      <Input aria-label={`Student ${i + 1} name`} value={r.name} disabled={locked} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Full name" className="h-9" />
                    </div>
                    <button type="button" onClick={() => setDetails(r.key)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                      <IdCard className="size-3.5" aria-hidden /> {r.fatherName || r.email || r.photo ? "Details ✓" : "Add details"}
                    </button>
                    {r.certificateId && <span className="ml-2 font-mono text-[11px] text-verify-700">{r.certificateId}</span>}
                  </td>
                  <td className="px-2 py-2"><div className="w-24"><Input aria-label={`Student ${i + 1} roll`} value={r.rollNo} disabled={locked} onChange={(e) => update(r.key, { rollNo: e.target.value })} className="h-9" inputMode="numeric" /></div></td>
                  <td className="px-2 py-2"><div className="w-24"><Input aria-label={`Student ${i + 1} reg`} value={r.regNo} disabled={locked} onChange={(e) => update(r.key, { regNo: e.target.value })} className="h-9" inputMode="numeric" /></div></td>
                  {visible.map((s) => {
                    const raw = r.cells[s.id] ?? "";
                    let shown = "";
                    let bad = false;
                    try {
                      const c = gradeCell(raw, s, p.grading);
                      shown = c ? (c.marks !== null ? c.grade ?? "" : c.gradePoint ?? "") : "";
                    } catch (err) {
                      bad = err instanceof GradeError;
                    }
                    return (
                      <td key={s.id} className="px-1 py-2 text-center">
                        <input
                          aria-label={`${r.name || `Student ${i + 1}`} — ${s.name}`}
                          value={raw}
                          disabled={locked}
                          onChange={(e) => setCell(r.key, s.id, e.target.value)}
                          className={cn("h-9 w-16 rounded-lg border px-2 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-surface", bad ? "border-red-400 bg-red-50" : "border-navy-200")}
                        />
                        <span className={cn("mt-0.5 block h-4 text-[11px] font-semibold", shown === p.grading.failGrade ? "text-red-600" : "text-muted")}>{bad ? "?" : shown}</span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <span className={cn("font-semibold tabular-nums", sum.failed ? "text-red-600" : "text-navy-900")}>{sum.cgpa ?? "—"}</span>
                    <span className="block text-[11px] text-muted">{sum.failed ? "Failed" : sum.complete ? "Complete" : `${sum.graded}/${p.subjects.length}`}</span>
                  </td>
                  <td className="px-2 py-2">
                    {!locked && !r.certificateId && (
                      <button type="button" onClick={() => (setRows((rs) => rs.filter((x) => x.key !== r.key)), setDirty(true))} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${r.name || `student ${i + 1}`}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-72">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-8">
          <p className="mr-auto hidden text-sm text-muted sm:block" aria-live="polite">{dirty ? "Unsaved changes" : "All changes saved"}</p>
          {p.role === "admin" && p.status !== "published" && rows.every((r) => !r.certificateId) && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => window.confirm("Delete this batch and all its results?") && run(() => deleteBatchAction(p.batchId), "Deleted")} className="text-red-700">Delete batch</Button>
          )}
          {p.role === "admin" && p.status === "submitted" && (
            <Button variant="secondary" disabled={pending} onClick={() => setRejectOpen(true)}><Undo2 className="size-4" aria-hidden /> Send back</Button>
          )}
          {!readOnly && <Button variant="secondary" disabled={pending || !dirty} onClick={() => void save()}><Save className="size-4" aria-hidden /> {pending ? "Working…" : "Save"}</Button>}
          {p.role === "partner" && !readOnly && (
            <Button disabled={pending} onClick={async () => (!dirty || (await save())) && run(() => submitBatchAction(p.batchId), "Submitted")}><Send className="size-4" aria-hidden /> Submit to NYTI</Button>
          )}
          {p.role === "admin" && unpublished > 0 && (
            <Button
              variant="verify"
              disabled={pending}
              onClick={async () => {
                if (dirty && !(await save())) return;
                if (window.confirm(`Publish results and issue certificates to ${unpublished} student(s)? Students with missing or failing results are skipped.`)) run(() => publishBatchAction(p.batchId), "Published");
              }}
            >
              <ShieldCheck className="size-4" aria-hidden /> Publish & issue certificates
            </Button>
          )}
        </div>
      </div>

      <Modal open={!!detailRow} onClose={() => setDetails(null)} title={detailRow?.name || "Student details"} footer={<Button onClick={() => setDetails(null)}>Done</Button>}>
        {detailRow && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Father's name" htmlFor="d-f"><Input id="d-f" value={detailRow.fatherName} disabled={readOnly} onChange={(e) => update(detailRow.key, { fatherName: e.target.value })} /></Field>
            <Field label="Mother's name" htmlFor="d-m"><Input id="d-m" value={detailRow.motherName} disabled={readOnly} onChange={(e) => update(detailRow.key, { motherName: e.target.value })} /></Field>
            <Field label="Email" htmlFor="d-e" hint="The certificate appears in their account when they sign up with this email."><Input id="d-e" type="email" value={detailRow.email} disabled={readOnly} onChange={(e) => update(detailRow.key, { email: e.target.value })} /></Field>
            <Field label="Student type" htmlFor="d-t">
              <Select id="d-t" value={detailRow.studentType} disabled={readOnly} onChange={(e) => update(detailRow.key, { studentType: e.target.value })}>
                <option>Regular</option>
                <option>Irregular</option>
                <option>Private</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <PhotoField value={detailRow.photo} disabled={readOnly} onChange={(photo) => update(detailRow.key, { photo })} />
            </div>
          </div>
        )}
      </Modal>

      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onAdd={addPasted} />

      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} onSend={(note) => (setRejectOpen(false), run(() => rejectBatchAction(p.batchId, note), "Sent back"))} />
    </div>
  );
}

function PhotoField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface text-xs text-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded student photo */}
        {value ? <img src={value} alt="" className="size-full object-cover" /> : "No photo"}
      </div>
      {!disabled && (
        <div className="space-y-2">
          <input
            ref={ref}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const form = new FormData();
              form.set("file", f);
              start(async () => {
                const r = await uploadStudentPhotoAction(form);
                setMsg(r.message);
                if (r.ok && r.url) onChange(r.url);
              });
            }}
          />
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => ref.current?.click()}>{pending ? "Uploading…" : value ? "Change photo" : "Upload photo"}</Button>
          {value && <button type="button" onClick={() => onChange("")} className="ml-2 text-sm text-muted hover:underline">Remove</button>}
          {msg && <p className="text-xs text-muted" role="status">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function PasteModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Paste students" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => (onAdd(text), setText(""))}>Add students</Button></>}>
      <p className="mb-3 text-sm text-muted">One student per line: <code>Name, Roll, Reg, Father&apos;s name, Mother&apos;s name, Email</code>. Only the name is required. You can copy rows straight from Excel.</p>
      <Textarea aria-label="Students" value={text} onChange={(e) => setText(e.target.value)} className="min-h-48 font-mono text-xs" placeholder={"Rahim Uddin, 24701, 25601, Abdul Karim, Rokeya Begum, rahim@example.com"} />
    </Modal>
  );
}

function RejectModal({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Send back to the partner" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSend(note)} disabled={!note.trim()}>Send back</Button></>}>
      <Field label="What needs to change?" htmlFor="rj-note" required>
        <Textarea id="rj-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-28" />
      </Field>
    </Modal>
  );
}
