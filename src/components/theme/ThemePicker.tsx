"use client";

import { Check } from "lucide-react";
import { UI_THEMES, themeMeta, type UiTheme } from "@/config/themes";
import { cn } from "@/lib/format";

/** Radio-card list of UI themes with visual previews. */
export function ThemePicker({ value, onChange, name, compact }: { value: UiTheme; onChange: (t: UiTheme) => void; name: string; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="UI theme" className={cn("grid gap-3", !compact && "sm:grid-cols-2 lg:grid-cols-3")}>
      {UI_THEMES.map((t) => {
        const m = themeMeta[t];
        const selected = value === t;
        return (
          <label
            key={t}
            className={cn(
              "group relative flex cursor-pointer gap-3 rounded-2xl border-2 bg-white p-3 transition-all has-focus-visible:ring-4 has-focus-visible:ring-brand-200",
              compact ? "items-center" : "flex-col",
              selected ? "border-brand-600" : "border-line hover:border-navy-300",
            )}
          >
            <input type="radio" name={name} value={t} checked={selected} onChange={() => onChange(t)} className="sr-only" />
            <span
              className={cn("relative block shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10", compact ? "h-12 w-16" : "aspect-[16/9] w-full")}
              style={{ background: m.preview.background }}
              aria-hidden
            >
              <span className="absolute bottom-1.5 left-1.5 flex gap-1">
                {m.preview.swatches.map((c) => (
                  <span key={c} className="size-2.5 rounded-full ring-1 ring-white/70" style={{ background: c }} />
                ))}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold text-navy-900">
                {m.name}
                {m.dark && <span className="rounded-full bg-navy-50 px-1.5 text-[10px] font-semibold uppercase text-muted">Dark</span>}
              </span>
              <span className="block text-xs text-muted">{m.tagline}</span>
              {!compact && <span className="mt-2 block text-xs leading-relaxed text-slate-700">{m.description}</span>}
            </span>
            {selected && (
              <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
