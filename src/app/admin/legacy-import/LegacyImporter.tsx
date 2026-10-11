"use client";

import { CheckCircle2, CloudDownload, FileUp, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ImportPreview, InstituteChoice } from "@/lib/legacy/import";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/forms";
import { DashboardCard } from "@/components/dashboard/widgets";
import { useToast } from "@/components/ui/Toast";
import type { LegacyCoursePlan } from "@/lib/legacy/courses";
import { addLegacyCoursesAction, copyLegacyImagesAction, runLegacyImportAction, uploadLegacyDumpAction } from "./actions";

const choiceValue = (c: InstituteChoice) => (c.type === "partner" ? `partner:${c.id}` : c.type);

export function LegacyImporter({ initial, images, coursePlan }: { initial: ImportPreview | null; images: { local: number; remote: number }; coursePlan: LegacyCoursePlan[] | null }) {
  const router = useRouter();
  const toast = useToast();
  const [preview, setPreview] = useState(initial);
  const [choices, setChoices] = useState<Record<string, InstituteChoice>>(() => Object.fromEntries((initial?.institutes ?? []).map((i) => [i.key, i.choice])));
  const [pending, start] = useTransition();
  const [copying, setCopying] = useState<{ copied: number; remaining: number; failed: string[] } | null>(null);

  const upload = (form: FormData) =>
    start(async () => {
      const r = await uploadLegacyDumpAction(form);
      if (!r.ok) return void toast({ tone: "error", title: "Not read", description: r.message });
      setPreview(r.preview);
      setChoices(Object.fromEntries(r.preview.institutes.map((i) => [i.key, i.choice])));
      toast({ tone: "success", title: "File read", description: `${r.preview.students} students found. Check the preview, then import.` });
    });

  const runImport = () =>
    start(async () => {
      const r = await runLegacyImportAction(choices);
      toast({ tone: r.ok ? "success" : "error", title: r.ok ? "Import finished" : "Not imported", description: r.message });
      if (r.ok) router.refresh();
    });

  const addCourses = () =>
    start(async () => {
      const r = await addLegacyCoursesAction();
      toast({ tone: r.ok ? "success" : "error", title: r.ok ? "Courses added" : "Not added", description: r.message });
      if (r.ok) router.refresh();
    });
  const missingCourses = coursePlan?.filter((c) => !c.exists) ?? [];

  const copyImages = async () => {
    let total = 0;
    const failed: string[] = [];
    setCopying({ copied: 0, remaining: images.remote, failed });
    // Small batches, so no single request runs long on shared hosting
    for (let guard = 0; guard < 200; guard++) {
      const r = await copyLegacyImagesAction();
      if (!r.ok) {
        toast({ tone: "error", title: "Copy stopped", description: r.message });
        break;
      }
      total += r.copied;
      failed.push(...r.failed);
      setCopying({ copied: total, remaining: r.remaining, failed: [...failed] });
      if (r.remaining === 0 || (r.copied === 0 && r.failed.length === 0)) break;
    }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <DashboardCard title="1. Upload the old database export">
        <p className="mb-4 text-sm text-muted">
          In the old system&apos;s cPanel → phpMyAdmin → database <code>…_verify</code> → <strong>Export</strong> (Quick, SQL). Include the <code>students</code>, <code>results</code> and <code>courses</code> tables — one file or several. You can import again later with a newer export: existing certificates are updated, not duplicated.
        </p>
        <form action={upload} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input name="files" type="file" accept=".sql" multiple required className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 file:px-3 file:py-2 file:font-semibold file:text-navy-800" />
          <Button type="submit" disabled={pending}>
            <FileUp className="size-4" aria-hidden /> {pending ? "Reading…" : "Read file"}
          </Button>
        </form>
      </DashboardCard>

      {preview && (
        <DashboardCard title="2. Check and import">
          <dl className="grid gap-3 sm:grid-cols-4">
            {[
              ["Students", preview.students],
              ["Subject results", preview.subjects],
              ["Courses", preview.courses],
              ["Already imported", preview.alreadyImported],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface p-3">
                <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
                <dd className="text-xl font-semibold tabular-nums text-navy-900">{v}</dd>
              </div>
            ))}
          </dl>

          {(preview.sharedRegNumbers.length > 0 || preview.withoutSubjects.length > 0 || preview.skippedSubjects > 0) && (
            <ul className="mt-4 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {preview.sharedRegNumbers.map((d) => (
                <li key={d.regNo} className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Reg No. {d.regNo} is used by {d.students.join(" and ")} — both are imported; lookups use reg + roll together.</li>
              ))}
              {preview.withoutSubjects.length > 0 && (
                <li className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> No subject results for: {preview.withoutSubjects.map((s) => s.name).join(", ")} — their certificates are imported without a mark sheet.</li>
              )}
              {preview.skippedSubjects > 0 && <li className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {preview.skippedSubjects} subject result(s) marked inactive in the old system will be skipped.</li>}
            </ul>
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-navy-900">Who issued them?</h3>
          <p className="mb-3 text-sm text-muted">Each institute becomes the issuer shown on verification. Choose an existing partner, NYTI itself, or add it as a new partner (added as <em>pending</em> — complete its profile in Partners).</p>
          <ul className="space-y-3">
            {preview.institutes.map((inst) => {
              const c = choices[inst.key] ?? inst.choice;
              return (
                <li key={inst.key} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-medium text-navy-900">
                    {inst.names.join(" / ")} <span className="font-normal text-muted">· {inst.count} students</span>
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Select
                      aria-label={`Issuer for ${inst.names[0]}`}
                      value={choiceValue(c)}
                      onChange={(e) => {
                        const v = e.target.value;
                        const next: InstituteChoice = v === "nyti" ? { type: "nyti" } : v === "new" ? { type: "new", name: inst.names[0] } : { type: "partner", id: v.slice(8) };
                        setChoices({ ...choices, [inst.key]: next });
                      }}
                      className="sm:w-72"
                    >
                      <option value="nyti">NYTI (issued directly)</option>
                      <option value="new">Add as a new partner…</option>
                      {preview.partners.map((p) => <option key={p.id} value={`partner:${p.id}`}>Partner: {p.name}</option>)}
                    </Select>
                    {c.type === "new" && (
                      <Input aria-label="New partner name" value={c.name} onChange={(e) => setChoices({ ...choices, [inst.key]: { type: "new", name: e.target.value } })} className="flex-1" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">Tip: to merge two spellings into one partner, add the first as new, import, then choose that partner for the other and import again.</p>

          <div className="mt-6 flex justify-end">
            <Button onClick={runImport} disabled={pending}>{pending ? "Importing…" : `Import ${preview.students} results`}</Button>
          </div>
        </DashboardCard>
      )}

      {coursePlan && (
        <DashboardCard title="3. Add the old courses to the course list">
          <p className="text-sm text-muted">
            Creates each old course in <strong>Courses</strong> with its mark-sheet subjects (taken from its most recent batch), so you can enter new results for it in <strong>Results</strong>. They&apos;re hidden from the public catalogue and offline-only; category, duration and description are filled in as a starting point — edit them any time. Courses already in the list are never changed. Partners also get the courses their students took.
          </p>
          <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Old courses</caption>
              <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wide text-muted">
                <tr><th scope="col" className="px-3 py-2">Course</th><th scope="col" className="px-3 py-2 text-right">Subjects</th><th scope="col" className="px-3 py-2 text-right">Students</th><th scope="col" className="px-3 py-2">In course list</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {coursePlan.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-navy-900">{c.title}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.subjects || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.students}</td>
                    <td className="px-3 py-2">{c.exists ? <span className="text-verify-700">Yes</span> : <span className="text-muted">Not yet</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            {missingCourses.length > 0 ? (
              <Button onClick={addCourses} disabled={pending}>{pending ? "Adding…" : `Add ${missingCourses.length} courses`}</Button>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-verify-700"><CheckCircle2 className="size-4" aria-hidden /> All old courses are in the course list.</p>
            )}
          </div>
        </DashboardCard>
      )}

      <DashboardCard title="4. Copy photos and certificate scans">
        <p className="text-sm text-muted">
          Imported records show photos from the old site until they&apos;re copied here. Copy them before switching the old site off.
        </p>
        <p className="mt-3 text-sm">
          <strong className="tabular-nums">{images.local}</strong> copied · <strong className="tabular-nums">{images.remote}</strong> still on the old site
        </p>
        {copying && (
          <p className="mt-2 text-sm text-navy-800" role="status">
            {copying.remaining > 0 ? `Copying… ${copying.copied} done, ${copying.remaining} to go` : `Done — ${copying.copied} copied.`}
            {copying.failed.length > 0 && ` ${copying.failed.length} could not be copied.`}
          </p>
        )}
        {copying && copying.failed.length > 0 && (
          <details className="mt-2 text-xs text-muted">
            <summary className="cursor-pointer">Show the ones that failed</summary>
            <ul className="mt-1 list-disc pl-5">{copying.failed.map((f) => <li key={f}>{f}</li>)}</ul>
          </details>
        )}
        <div className="mt-4">
          {images.remote > 0 ? (
            <Button variant="secondary" onClick={copyImages} disabled={!!copying && copying.remaining > 0}>
              <CloudDownload className="size-4" aria-hidden /> Copy {images.remote} images
            </Button>
          ) : (
            images.local > 0 && <p className="inline-flex items-center gap-2 text-sm font-semibold text-verify-700"><CheckCircle2 className="size-4" aria-hidden /> All images are on this site.</p>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
