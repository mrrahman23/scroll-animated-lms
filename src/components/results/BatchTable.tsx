import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

type Row = { id: number; name: string; courseTitle: string; issuer: string; status: "draft" | "submitted" | "published" | "rejected"; students: number; issued: number; updatedAt: Date };
const tone = { draft: "navy", submitted: "warning", published: "verify", rejected: "danger" } as const;
const label = { draft: "Draft", submitted: "Waiting for approval", published: "Published", rejected: "Sent back" } as const;

export function BatchTable({ rows, base, showIssuer }: { rows: Row[]; base: string; showIssuer?: boolean }) {
  if (!rows.length) return <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">No result batches yet.</p>;
  return (
    <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Result batches</caption>
        <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3">Batch</th>
            <th scope="col" className="px-4 py-3">Course</th>
            {showIssuer && <th scope="col" className="px-4 py-3">Issued by</th>}
            <th scope="col" className="px-4 py-3 text-right">Students</th>
            <th scope="col" className="px-4 py-3 text-right">Certificates</th>
            <th scope="col" className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3"><Link href={`${base}/${b.id}`} className="font-semibold text-navy-900 hover:text-brand-700">{b.name}</Link></td>
              <td className="px-4 py-3 text-muted">{b.courseTitle}</td>
              {showIssuer && <td className="px-4 py-3 text-muted">{b.issuer}</td>}
              <td className="px-4 py-3 text-right tabular-nums">{b.students}</td>
              <td className="px-4 py-3 text-right tabular-nums">{b.issued}</td>
              <td className="px-4 py-3"><Badge tone={tone[b.status]}>{label[b.status]}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
