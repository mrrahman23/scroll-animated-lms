"use client";

import { Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Category, Partner } from "@/types";
import { buttonClasses } from "@/components/ui/Button";
import { SearchInput, Select } from "@/components/ui/forms";
import { EmptyState } from "@/components/ui/primitives";
import { filterPartners, type PartnerFilter } from "@/lib/filters";
import { PartnerCard } from "./PartnerCard";

export function PartnerDirectory({ partners, categories, initialCity = "all" }: { partners: Partner[]; categories: Category[]; initialCity?: string }) {
  const [f, setF] = useState<PartnerFilter>({ city: initialCity, categoryId: "all", mode: "all" });
  const cities = useMemo(() => [...new Set(partners.map((p) => p.city))].sort(), [partners]);
  const results = useMemo(() => filterPartners(partners, f), [partners, f]);
  const update = (patch: Partial<PartnerFilter>) => setF((x) => ({ ...x, ...patch }));

  return (
    <div>
      <div className="grid gap-3 rounded-2xl border border-line bg-white p-3 shadow-(--shadow-card) md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <SearchInput label="Search partners" placeholder="Search by name, city or authorization no." value={f.q ?? ""} onChange={(e) => update({ q: e.target.value })} />
        <Select aria-label="Filter by location" value={f.city} onChange={(e) => update({ city: e.target.value })}>
          <option value="all">All locations</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select aria-label="Filter by course category" value={f.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by training type" value={f.mode} onChange={(e) => update({ mode: e.target.value as PartnerFilter["mode"] })}>
          <option value="all">Online &amp; offline</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </Select>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {results.length} authorized partner{results.length === 1 ? "" : "s"} found
      </p>

      {results.length ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((p) => (
            <PartnerCard key={p.id} partner={p} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={<Building2 className="size-5" />}
            title="No partners match your search"
            description="Try another location or category. Only institutions currently authorized by NYTI are listed."
            action={
              <button className={buttonClasses({ variant: "secondary" })} onClick={() => setF({ city: "all", categoryId: "all", mode: "all", q: "" })}>
                Reset filters
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
