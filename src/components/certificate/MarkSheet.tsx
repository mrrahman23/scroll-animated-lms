"use client";

import { ChevronDown, FileImage, Printer } from "lucide-react";
import { useId, useState } from "react";
import type { CertificateDetails, MarkSheetSubject } from "@/types";
import { cn } from "@/lib/format";

const ordinal = (n: number) => ["", "1st", "2nd", "3rd"][n] ?? `${n}th`;

/** "Show details" panel: the student record and subject-wise grades (offline/diploma results). */
export function MarkSheet({ details, holderName, courseTitle }: { details: CertificateDetails; holderName: string; courseTitle: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const groups = new Map<number, MarkSheetSubject[]>();
  for (const s of details.subjects) groups.set(s.semester, [...(groups.get(s.semester) ?? []), s]);
  const showGp = details.subjects.some((s) => s.gradePoint);
  const showMarks = details.subjects.some((s) => s.marks);

  const record: [string, string | null][] = [
    ["Name", holderName],
    ["Father's name", details.fatherName],
    ["Mother's name", details.motherName],
    ["Student type", details.studentType],
    ["Institute", details.institute],
    ["Roll No.", details.rollNo],
    ["Reg No.", details.regNo],
    ["Course duration", details.courseDuration],
    ["Batch", details.batch],
    ["CGPA", details.cgpa],
  ];

  return (
    <div className="border-t border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 bg-surface px-6 py-3.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 print:hidden"
      >
        {open ? "Hide details" : "Show details & mark sheet"}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="mark-sheet animate-fade-up space-y-6 px-6 py-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Subject-wise grade / mark sheet</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{courseTitle}</p>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row">
            {details.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- photo from the student record (may be on the old site)
              <img src={details.photoUrl} alt={`Photo of ${holderName}`} className="mx-auto h-36 w-28 shrink-0 rounded-lg border border-line object-cover sm:mx-0" />
            )}
            <dl className="grid flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {record
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-dashed border-line py-1.5 sm:block sm:border-0 sm:py-0">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted">{k}</dt>
                    <dd className={cn("text-right font-semibold text-navy-900 sm:text-left", k === "CGPA" && "text-verify-700")}>{v}</dd>
                  </div>
                ))}
            </dl>
          </div>

          {details.subjects.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="sr-only">Subject results</caption>
                <thead className="bg-navy-900 text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Code</th>
                    <th scope="col" className="px-4 py-2.5">Subject</th>
                    <th scope="col" className="px-4 py-2.5 text-center">Grade</th>
                    {showGp && <th scope="col" className="px-4 py-2.5 text-center">GP</th>}
                    {showMarks && <th scope="col" className="px-4 py-2.5 text-center">Marks</th>}
                  </tr>
                </thead>
                {[...groups].map(([semester, rows]) => (
                  <tbody key={semester} className="divide-y divide-line">
                    {semester > 0 && (
                      <tr className="bg-navy-50">
                        <th scope="colgroup" colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-navy-800">
                          {ordinal(semester)} semester
                        </th>
                      </tr>
                    )}
                    {rows.map((r, i) => (
                      <tr key={`${semester}-${i}`}>
                        <td className="px-4 py-2 font-mono text-xs text-muted">{r.code ?? ""}</td>
                        <td className="px-4 py-2 text-navy-900">{r.name}</td>
                        <td className="px-4 py-2 text-center font-semibold text-navy-900">{r.grade ?? "—"}</td>
                        {showGp && <td className="px-4 py-2 text-center tabular-nums">{r.gradePoint ?? ""}</td>}
                        {showMarks && <td className="px-4 py-2 text-center tabular-nums">{r.marks ?? ""}</td>}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          ) : (
            <p className="rounded-xl bg-surface p-4 text-center text-sm text-muted">No subject results are recorded for this certificate.</p>
          )}

          <div className="flex flex-wrap justify-center gap-3 print:hidden">
            {details.scanUrl && (
              <a href={details.scanUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50">
                <FileImage className="size-4" aria-hidden /> View certificate copy
              </a>
            )}
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50">
              <Printer className="size-4" aria-hidden /> Print
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
