"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  hideOnMobile?: boolean;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  caption,
  empty = "No records found.",
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  empty?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
    });
  }, [rows, columns, sort]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === 1 ? "ascending" : "descending") : undefined}
                  className={cn("px-4 py-3 font-semibold", c.hideOnMobile && "hidden md:table-cell", c.className)}
                >
                  {c.sortValue ? (
                    <button
                      className="inline-flex items-center gap-1 uppercase hover:text-navy-900"
                      onClick={() => setSort({ key: c.key, dir: active && sort!.dir === 1 ? -1 : 1 })}
                    >
                      {c.header}
                      {active ? sort!.dir === 1 ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden /> : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-surface/70">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3.5 align-middle", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
