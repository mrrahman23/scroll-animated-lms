"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SERIES } from "@/lib/chart-tokens";
import { cn } from "@/lib/format";


function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const makeFormat = (decimals = 0) => (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: decimals });

function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v / s <= 5) ?? pow * 10;
  return { max: Math.ceil(v / step) * step, step };
}

function Tooltip({ x, y, children, containerWidth }: { x: number; y: number; children: ReactNode; containerWidth: number }) {
  const flip = x > containerWidth - 170;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-(--shadow-lift)"
      style={{ left: flip ? undefined : x + 12, right: flip ? containerWidth - x + 12 : undefined, top: Math.max(0, y - 20) }}
    >
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          <span className="text-slate-700">{i.label}</span>
          {i.value && <span className="font-semibold text-ink">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export function DataTableView({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="group mt-4 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold text-brand-700 hover:text-brand-800">View as table</summary>
      <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface text-muted">
            <tr>{headers.map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={String(r[0])}>{r.map((c, i) => <td key={i} className={cn("px-3 py-1.5", i > 0 && "tabular-nums")}>{typeof c === "number" ? c.toLocaleString("en-US") : c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/* Line chart ------------------------------------------------------------ */
export function LineChart({
  labels,
  series,
  height = 240,
  decimals,
  ariaLabel,
}: {
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
  decimals?: number;
  ariaLabel: string;
}) {
  const format = makeFormat(decimals);
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 44, r: 72, t: 12, b: 28 };
  const iw = Math.max(0, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const { max, step } = niceMax(Math.max(...series.flatMap((s) => s.values)));
  const x = (i: number) => m.l + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const last = labels.length - 1;

  const onMove = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const rel = (clientX - rect.left - m.l) / iw;
    setHover(Math.min(last, Math.max(0, Math.round(rel * last))));
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="block touch-pan-y focus-visible:outline-offset-4"
          onMouseMove={(e) => onMove(e.clientX)}
          onTouchMove={(e) => onMove(e.touches[0].clientX)}
          onMouseLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(last, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? last + 1) - 1));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} className="fill-muted">{format(t)}</text>
            </g>
          ))}
          {labels.map((l, i) => (
            <text key={l} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} className={cn("fill-muted", i % 2 === 1 && width < 520 && "hidden")}>{l}</text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} className="stroke-navy-300" strokeWidth={1} />}
          {series.map((s) => (
            <g key={s.name}>
              <polyline fill="none" style={{ stroke: s.color }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
              <circle cx={x(last)} cy={y(s.values[last])} r={4} style={{ fill: s.color }} className="stroke-white" strokeWidth={2} />
              <text x={x(last) + 10} y={y(s.values[last])} dy="0.32em" fontSize={11} fontWeight={600} className="fill-ink">{s.name}</text>
              {hover !== null && <circle cx={x(hover)} cy={y(s.values[hover])} r={5} style={{ fill: s.color }} className="stroke-white" strokeWidth={2} />}
            </g>
          ))}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover)} y={Math.min(...series.map((s) => y(s.values[hover])))} containerWidth={width}>
          <p className="mb-1 font-semibold text-ink">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center justify-between gap-4 text-muted">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: s.color }} />{s.name}</span>
              <span className="font-semibold tabular-nums text-ink">{format(s.values[hover])}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* Column chart (single series) ------------------------------------------ */
export function ColumnChart({
  labels,
  values,
  color = SERIES[0],
  height = 240,
  decimals,
  ariaLabel,
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  decimals?: number;
  ariaLabel: string;
}) {
  const format = makeFormat(decimals);
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 44, r: 8, t: 22, b: 28 };
  const iw = Math.max(0, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const { max, step } = niceMax(Math.max(...values));
  const band = iw / values.length;
  const bw = Math.min(24, band * 0.6);
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const last = values.length - 1;
  const bar = (i: number, v: number) => {
    const x0 = m.l + i * band + (band - bw) / 2;
    const top = y(v);
    const r = Math.min(4, bw / 2, m.t + ih - top);
    const b = m.t + ih;
    return `M${x0},${b}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + bw - r}Q${x0 + bw},${top} ${x0 + bw},${top + r}V${b}Z`;
  };
  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} className="stroke-line" />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} className="fill-muted">{format(t)}</text>
            </g>
          ))}
          {values.map((v, i) => (
            <g key={labels[i]} onMouseEnter={() => setHover(i)}>
              <rect x={m.l + i * band} y={m.t} width={band} height={ih} fill="transparent" />
              <path d={bar(i, v)} style={{ fill: color }} opacity={hover === null || hover === i ? 1 : 0.45} className="transition-opacity" />
              <text x={m.l + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize={11} className={cn("fill-muted", i % 2 === 1 && width < 520 && "hidden")}>{labels[i]}</text>
            </g>
          ))}
          <text x={m.l + last * band + band / 2} y={y(values[last]) - 7} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-ink">{format(values[last])}</text>
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={m.l + hover * band + band / 2} y={y(values[hover])} containerWidth={width}>
          <p className="font-semibold text-ink">{labels[hover]}</p>
          <p className="tabular-nums text-muted">{format(values[hover])}</p>
        </Tooltip>
      )}
    </div>
  );
}

/* Horizontal bar ranking ---------------------------------------------- */
export function BarList({ items, color = SERIES[0], decimals }: { items: { label: string; value: number }[]; color?: string; decimals?: number }) {
  const format = makeFormat(decimals);
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.label} className="group" title={`${i.label}: ${format(i.value)}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{format(i.value)}</span>
          </div>
          <div className="h-2.5">
            <div className="h-full rounded-r-[4px] transition-opacity group-hover:opacity-80" style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Part-to-whole: single 100% bar with 2px surface gaps ---------------- */
export function ShareBar({ parts }: { parts: { label: string; value: number; color: string; darkText?: boolean }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-8 gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}>
        {parts.map((p) => (
          <div key={p.label} className={cn("flex h-full items-center px-3 text-xs font-semibold", p.darkText ? "text-ink" : "text-white")} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value.toLocaleString("en-US")}`}>
            {Math.round((p.value / total) * 100)}%
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Legend items={parts.map((p) => ({ label: p.label, color: p.color, value: p.value.toLocaleString("en-US") }))} />
      </div>
    </div>
  );
}
