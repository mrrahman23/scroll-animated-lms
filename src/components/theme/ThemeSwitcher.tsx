"use client";

import { Palette, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { themeMeta } from "@/config/themes";
import { ThemePicker } from "./ThemePicker";
import { useUiTheme } from "./ThemeProvider";

/** Floating visitor theme switcher. Rendered only when the admin allows it. */
export function ThemeSwitcher() {
  const { theme, siteDefault, allowSwitch, setVisitorTheme } = useUiTheme();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Portals have a fixed sidebar on desktop; sit beside it
  const inPortal = /^\/(dashboard|admin|instructor|partner-portal)(\/|$)/.test(pathname);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (!allowSwitch) return null;

  return (
    <div ref={ref} className={cn("theme-switcher fixed bottom-4 left-4 z-[80] print:hidden", inPortal && "lg:left-[19rem]")}>
      <div
        id="theme-panel"
        hidden={!open}
        className="mb-3 w-[min(22rem,calc(100vw-2rem))] animate-fade-up rounded-2xl border border-line bg-white p-4 shadow-(--shadow-lift)"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-navy-900">Choose your look</p>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-navy-50" aria-label="Close theme picker">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <ThemePicker compact name="visitor-theme" value={theme} onChange={(t) => setVisitorTheme(t === siteDefault ? null : t)} />
        <p className="mt-3 text-xs text-muted">Saved in this browser. Site default: {themeMeta[siteDefault].name}.</p>
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="theme-panel"
        className={cn(
          "flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-navy-900 shadow-(--shadow-lift) transition-transform hover:-translate-y-0.5",
        )}
      >
        <Palette className="size-4 text-brand-600" aria-hidden />
        <span className="hidden sm:inline">Theme:</span> {themeMeta[theme].name}
      </button>
    </div>
  );
}
