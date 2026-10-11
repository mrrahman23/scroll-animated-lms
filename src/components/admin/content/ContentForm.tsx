"use client";

import { Braces, ExternalLink, History, ListTree, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteRecordAction, historyAction, restoreVersionAction, saveDocumentAction, saveRecordAction, type SaveResult } from "@/app/admin/content/actions";
import type { FieldHint, Option, OptionSource } from "@/lib/content-admin/registry";
import type { HistoryEntry } from "@/lib/content-admin/store";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/forms";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/Toast";
import { TreeEditor, type Json } from "./TreeEditor";

export interface ContentFormProps {
  defKey: string;
  kind: "document" | "record";
  /** Record id, or null for a new record */
  recordId: string | null;
  singular?: string;
  initial: Json;
  version: string;
  hints?: Record<string, FieldHint>;
  options: Record<OptionSource, Option[]>;
  publicHref: string | null;
  backHref: string;
}

/** Edit → validate → save, with raw JSON mode, version history and delete. */
export function ContentForm(p: ContentFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState<Json>(p.initial);
  const [version, setVersion] = useState(p.version);
  const [dirty, setDirty] = useState(false);
  const [raw, setRaw] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (v: Json) => {
    setValue(v);
    setDirty(true);
  };

  const parseRaw = (): Json | undefined => {
    if (raw === null) return value;
    try {
      const v = JSON.parse(raw) as Json;
      setRawError(null);
      return v;
    } catch (e) {
      setRawError((e as Error).message);
      return undefined;
    }
  };

  const finish = (r: SaveResult, after?: () => void) => {
    setResult(r);
    toast({ tone: r.ok ? "success" : "error", title: r.ok ? "Saved" : "Not saved", description: r.message });
    if (!r.ok) return;
    if (r.version) setVersion(r.version);
    setDirty(false);
    after?.();
    router.refresh();
  };

  const save = () => {
    const v = parseRaw();
    if (v === undefined) return;
    if (raw !== null) setValue(v);
    start(async () => {
      const r = p.kind === "document" ? await saveDocumentAction(p.defKey, v, version) : await saveRecordAction(p.defKey, p.recordId, v as Record<string, unknown>, version);
      finish(r, () => {
        if (p.kind === "record" && p.recordId === null && r.id) router.replace(`/admin/content/${p.defKey}/${encodeURIComponent(r.id)}`);
      });
    });
  };

  const remove = () =>
    start(async () => {
      const r = await deleteRecordAction(p.defKey, p.recordId!, version);
      setConfirmDelete(false);
      finish(r, () => router.push(p.backHref));
    });

  const openHistory = () => start(async () => setHistory(await historyAction(p.defKey)));
  const restore = (id: string) =>
    start(async () => {
      const r = await restoreVersionAction(p.defKey, id, version);
      setHistory(null);
      // The page reloads with the restored content
      finish(r, () => (p.kind === "record" ? router.push(p.backHref) : window.location.reload()));
    });

  const toggleRaw = () => {
    if (raw === null) return setRaw(JSON.stringify(value, null, 2));
    const v = parseRaw();
    if (v === undefined) return;
    setValue(v);
    setRaw(null);
  };

  return (
    <div className="pb-24">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggleRaw} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50">
          {raw === null ? <><Braces className="size-4" aria-hidden /> Edit as JSON</> : <><ListTree className="size-4" aria-hidden /> Back to the form</>}
        </button>
        <button type="button" onClick={openHistory} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50">
          <History className="size-4" aria-hidden /> Version history
        </button>
        {p.publicHref && (
          <Link href={p.publicHref} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            <ExternalLink className="size-4" aria-hidden /> View on the website
          </Link>
        )}
        {p.kind === "record" && p.recordId !== null && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">
            <Trash2 className="size-4" aria-hidden /> Delete {p.singular}
          </button>
        )}
      </div>

      {result && !result.ok && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{result.message}</p>
          {result.problems && result.problems.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">{result.problems.map((x) => <li key={x}>{x}</li>)}</ul>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        {raw === null ? (
          <TreeEditor value={value} onChange={edit} ctx={{ hints: p.hints, options: p.options, uploadFolder: p.defKey.replace(/^page-/, "pages") }} />
        ) : (
          <div>
            <label htmlFor="raw-json" className="mb-1.5 block text-sm font-medium text-navy-900">JSON</label>
            <Textarea
              id="raw-json"
              spellCheck={false}
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setDirty(true);
              }}
              className="min-h-[60vh] font-mono text-xs leading-relaxed"
            />
            {rawError && <p role="alert" className="mt-2 text-sm text-red-700">This isn&apos;t valid JSON: {rawError}</p>}
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-72">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-3 sm:px-8">
          <p className="mr-2 hidden text-sm text-muted sm:block" aria-live="polite">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
          <div className="flex gap-2">
            <Link href={p.backHref} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-navy-50">Back</Link>
            <Button onClick={save} disabled={pending || (!dirty && !(p.kind === "record" && p.recordId === null))}>
              <Save className="size-4" aria-hidden /> {pending ? "Saving…" : p.recordId === null && p.kind === "record" ? `Add ${p.singular}` : "Save changes"}
            </Button>
          </div>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete this ${p.singular}?`} footer={<><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button onClick={remove} disabled={pending} className="bg-red-600 hover:bg-red-700">Delete</Button></>}>
        <p className="text-sm text-slate-700">It disappears from the website straight away. You can bring it back from Version history.</p>
      </Modal>

      <Modal open={history !== null} onClose={() => setHistory(null)} title="Version history">
        {p.kind === "record" && <p className="mb-3 text-xs text-muted">Restoring brings back the whole list as it was at that time.</p>}
        <ol className="max-h-[60vh] space-y-2 overflow-y-auto">
          {history?.map((h, i) => (
            <li key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
              <div>
                <p className="font-medium text-navy-900">{h.savedAt ? new Date(h.savedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Original"}</p>
                <p className="text-xs text-muted">{h.savedBy}{i === 0 && h.savedAt ? " · current" : ""}</p>
              </div>
              {!(i === 0 && h.savedAt) && <Button size="sm" variant="secondary" onClick={() => restore(h.id)} disabled={pending}>Restore</Button>}
            </li>
          ))}
          {history?.length === 0 && <p className="text-sm text-muted">No saved versions yet. Versions are kept from the first save made here.</p>}
        </ol>
      </Modal>
    </div>
  );
}
