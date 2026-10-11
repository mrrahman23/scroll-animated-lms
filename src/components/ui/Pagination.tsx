"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const btn = "inline-flex size-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <button className={cn(btn, "text-navy-700 hover:bg-navy-50 disabled:opacity-40")} onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(btn, p === page ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-navy-50")}
        >
          {p}
        </button>
      ))}
      <button className={cn(btn, "text-navy-700 hover:bg-navy-50 disabled:opacity-40")} onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page">
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
