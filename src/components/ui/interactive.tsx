"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

/* ProgressBar ----------------------------------------------------------- */
export function ProgressBar({
  value,
  label,
  showValue = true,
  tone = "brand",
  size = "md",
}: {
  value: number;
  label: string;
  showValue?: boolean;
  tone?: "brand" | "verify";
  size?: "sm" | "md";
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div>
      {showValue && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
          <span>{label}</span>
          <span className="tabular-nums text-ink">{value}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("overflow-hidden rounded-full", tone === "brand" ? "bg-brand-100" : "bg-verify-100", size === "sm" ? "h-1.5" : "h-2.5")}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-out", tone === "brand" ? "bg-brand-600" : "bg-verify-600")}
          style={{ width: `${shown}%` }}
        />
      </div>
    </div>
  );
}

/* Counter — counts up once when scrolled into view ------------------------ */
export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1400);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return (
    <span ref={ref} className="tabular-nums">
      <span aria-hidden>
        {n.toLocaleString("en-US")}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toLocaleString("en-US")}
        {suffix}
      </span>
    </span>
  );
}

/* Reveal observer — mounted once in the root layout ------------------------ */
export function RevealObserver() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () => document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

/* Accordion ------------------------------------------------------------- */
export interface AccordionItem {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  content: ReactNode;
}

export function Accordion({ items, defaultOpen = [] }: { items: AccordionItem[]; defaultOpen?: string[] }) {
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const baseId = useId();
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const btnId = `${baseId}-${item.id}-btn`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={btnId}
                aria-controls={panelId}
                aria-expanded={isOpen}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface sm:px-6"
              >
                <span className="flex-1 font-semibold text-navy-900">{item.title}</span>
                {item.meta && <span className="hidden text-sm text-muted sm:block">{item.meta}</span>}
                <ChevronDown className={cn("size-5 shrink-0 text-navy-400 transition-transform duration-300", isOpen && "rotate-180")} aria-hidden />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
            >
              <div className="overflow-hidden" inert={!isOpen}>
                <div className="px-5 pb-5 sm:px-6">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Tabs — WAI-ARIA tabs with arrow-key navigation --------------------------- */
export function Tabs({
  tabs,
  label,
  className,
}: {
  tabs: { id: string; label: ReactNode; content: ReactNode }[];
  label: string;
  className?: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    const next = (i + dir + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-xl bg-navy-50 p-1">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`${baseId}-${t.id}-tab`}
            aria-controls={`${baseId}-${t.id}-panel`}
            aria-selected={active === t.id}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              active === t.id ? "bg-white text-navy-900 shadow-sm" : "text-muted hover:text-navy-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-${t.id}-panel`}
          aria-labelledby={`${baseId}-${t.id}-tab`}
          hidden={active !== t.id}
          tabIndex={0}
          className="mt-6 focus-visible:outline-offset-4"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}

/* Modal — native <dialog> gives focus trapping and Esc handling ------------ */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-white p-0 shadow-(--shadow-lift) backdrop:bg-navy-950/50 backdrop:backdrop-blur-sm open:animate-fade-up"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold text-navy-900">
          {title}
        </h2>
        <button onClick={onClose} className="-mr-2 rounded-lg p-2 text-muted hover:bg-navy-50" aria-label="Close dialog">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && <div className="flex justify-end gap-3 border-t border-line bg-surface px-6 py-4">{footer}</div>}
    </dialog>
  );
}
