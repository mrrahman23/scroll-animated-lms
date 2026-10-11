"use client";

import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { hintFor, type FieldHint, type Option, type OptionSource } from "@/lib/content-admin/registry";
import { Input, Select, Textarea } from "@/components/ui/forms";
import { cn } from "@/lib/format";
import { ImageField } from "./ImageField";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Path = (string | number)[];

export interface EditorContext {
  hints?: Record<string, FieldHint>;
  options: Record<OptionSource, Option[]>;
  uploadFolder: string;
}

const LONG_KEYS = new Set(["description", "body", "bio", "quote", "excerpt", "instructions", "answer", "text", "content", "summary", "intro", "lead", "message", "note", "details", "mission", "vision"]);
const IMAGE_KEYS = new Set(["logo", "logoOnDark", "image", "avatarUrl", "photo", "src"]);
const TITLE_KEYS = ["title", "label", "name", "question", "method", "platform", "heading", "key", "id"];

const humanize = (key: string) => {
  const s = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fieldId = (path: Path) => `f-${path.join("-")}`;
const isObject = (v: Json | undefined): v is { [key: string]: Json } => !!v && typeof v === "object" && !Array.isArray(v);

/** An empty copy of a value, used as the pattern for a new list item. */
function blank(v: Json): Json {
  if (Array.isArray(v)) return v.length && isObject(v[0]) ? [blank(v[0])] : [];
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "id" ? "" : blank(x)]));
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  return "";
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function itemTitle(item: Json, i: number) {
  if (isObject(item)) for (const k of TITLE_KEYS) if (typeof item[k] === "string" && item[k]) return item[k] as string;
  if (typeof item === "string" && item) return item.length > 60 ? item.slice(0, 60) + "…" : item;
  return `Item ${i + 1}`;
}

/** Edits any JSON object or list; field types come from the value and the registry hints. */
export function TreeEditor({ value, onChange, ctx, hideKeys = [] }: { value: Json; onChange: (v: Json) => void; ctx: EditorContext; hideKeys?: string[] }) {
  if (isObject(value)) return <ObjectFields value={value} path={[]} onChange={onChange} ctx={ctx} hideKeys={hideKeys} />;
  return <Node name="" value={value} path={[]} onChange={onChange} ctx={ctx} />;
}

/** A few plain fields and nothing nested. */
const isFlat = (v: { [key: string]: Json }) => {
  const entries = Object.entries(v).filter(([k]) => k !== "id");
  return entries.length <= 5 && entries.every(([, x]) => !x || typeof x !== "object");
};

function ObjectFields({ value, path, onChange, ctx, hideKeys = [] }: { value: { [key: string]: Json }; path: Path; onChange: (v: Json) => void; ctx: EditorContext; hideKeys?: string[] }) {
  const entries = Object.entries(value).filter(([k]) => k !== "id" && !hideKeys.includes(k));
  const flat = isFlat(value);
  return (
    <div className={cn("grid gap-4", flat && path.length > 0 && "sm:grid-cols-2 lg:grid-cols-4")}>
      {entries.map(([k, v]) => (
        <Node key={k} name={k} value={v} path={[...path, k]} ctx={ctx} onChange={(nv) => onChange({ ...value, [k]: nv })} />
      ))}
    </div>
  );
}

function Node({ name, value, path, onChange, ctx }: { name: string; value: Json; path: Path; onChange: (v: Json) => void; ctx: EditorContext }) {
  const hint = hintFor(ctx.hints, path);
  if (hint.widget === "hidden") return null;
  const label = hint.label ?? (typeof name === "string" && name ? humanize(name) : "");
  if (Array.isArray(value)) return <ListField label={label} hint={hint} value={value} path={path} onChange={onChange} ctx={ctx} />;
  if (isObject(value)) {
    return (
      <fieldset className="min-w-0 rounded-xl border border-line p-4 sm:col-span-full">
        <legend className="px-1 text-sm font-semibold text-navy-900">{label}</legend>
        {hint.help && <p className="mb-3 text-xs text-muted">{hint.help}</p>}
        <ObjectFields value={value} path={path} onChange={onChange} ctx={ctx} />
      </fieldset>
    );
  }
  return <ScalarField name={name} label={label} hint={hint} value={value} path={path} onChange={onChange} ctx={ctx} />;
}

function Labelled({ id, label, help, children, wide }: { id: string; label: string; help?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-full")}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-navy-900">{label}</label>}
      {children}
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  );
}

function resolveOptions(hint: FieldHint, ctx: EditorContext, name: string): Option[] | null {
  if (Array.isArray(hint.options)) return hint.options;
  if (typeof hint.options === "string") return ctx.options[hint.options] ?? [];
  if (name === "icon") return ctx.options.icons;
  return null;
}

function ScalarField({ name, label, hint, value, path, onChange, ctx }: { name: string; label: string; hint: FieldHint; value: Json; path: Path; onChange: (v: Json) => void; ctx: EditorContext }) {
  const id = fieldId(path);
  if (typeof value === "boolean") {
    return (
      <div className="flex items-start gap-2.5 self-end pb-2">
        <input id={id} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
        <div>
          <label htmlFor={id} className="text-sm font-medium text-navy-900">{label}</label>
          {hint.help && <p className="text-xs text-muted">{hint.help}</p>}
        </div>
      </div>
    );
  }
  if (typeof value === "number") {
    return (
      <Labelled id={id} label={label} help={hint.help}>
        <Input id={id} type="number" step="any" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      </Labelled>
    );
  }
  const text = value === null ? "" : String(value);
  if (hint.widget === "readonly") {
    return (
      <Labelled id={id} label={label} help={hint.help}>
        <p id={id} className="rounded-xl bg-surface px-3 py-2.5 font-mono text-sm text-muted">{text || "—"}</p>
      </Labelled>
    );
  }
  const widget = hint.widget ?? (IMAGE_KEYS.has(name) ? "image" : /date$/i.test(name) || name === "nextIntake" ? "date" : undefined);
  if (widget === "image") {
    return (
      <Labelled id={id} label={label} help={hint.help} wide>
        <ImageField id={id} value={text} onChange={onChange} folder={ctx.uploadFolder} />
      </Labelled>
    );
  }
  const options = resolveOptions(hint, ctx, name);
  if (options) {
    const known = options.some((o) => o.value === text);
    return (
      <Labelled id={id} label={label} help={hint.help}>
        <Select id={id} value={text} onChange={(e) => onChange(e.target.value)}>
          {!text && <option value="">— Choose —</option>}
          {!known && text && <option value={text}>{text}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Labelled>
    );
  }
  if (widget === "date") {
    return (
      <Labelled id={id} label={label} help={hint.help}>
        <Input id={id} type="date" value={text} onChange={(e) => onChange(e.target.value)} />
      </Labelled>
    );
  }
  const long = widget === "textarea" || (widget !== "text" && (LONG_KEYS.has(name) || text.length > 90));
  return (
    <Labelled id={id} label={label} help={hint.help} wide={long}>
      {long ? (
        <Textarea id={id} value={text} onChange={(e) => onChange(e.target.value)} className="min-h-24" />
      ) : (
        <Input id={id} value={text} onChange={(e) => onChange(e.target.value)} />
      )}
    </Labelled>
  );
}

function ItemControls({ i, n, onMove, onRemove, label }: { i: number; n: number; onMove: (to: number) => void; onRemove: () => void; label: string }) {
  const btn = "rounded-lg p-1.5 text-muted hover:bg-navy-50 hover:text-navy-900 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button type="button" className={btn} disabled={i === 0} onClick={() => onMove(i - 1)} aria-label={`Move ${label} up`} title="Move up"><ArrowUp className="size-4" aria-hidden /></button>
      <button type="button" className={btn} disabled={i === n - 1} onClick={() => onMove(i + 1)} aria-label={`Move ${label} down`} title="Move down"><ArrowDown className="size-4" aria-hidden /></button>
      <button type="button" className={cn(btn, "hover:bg-red-50 hover:text-red-700")} onClick={onRemove} aria-label={`Remove ${label}`} title="Remove"><Trash2 className="size-4" aria-hidden /></button>
    </div>
  );
}

function ItemCard({ title, startOpen, controls, children }: { title: string; startOpen: boolean; controls: ReactNode; children: ReactNode }) {
  // Open state is kept here so the card doesn't collapse while its title is being typed
  const [open, setOpen] = useState(startOpen);
  return (
    <details className="group rounded-xl border border-line bg-white open:shadow-sm" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900">{title}</span>
        {/* Buttons inside <summary> would otherwise also open/close the card */}
        <span onClick={(e) => e.preventDefault()}>{controls}</span>
      </summary>
      {open && <div className="border-t border-line p-4">{children}</div>}
    </details>
  );
}

function ListField({ label, hint, value, path, onChange, ctx }: { label: string; hint: FieldHint; value: Json[]; path: Path; onChange: (v: Json) => void; ctx: EditorContext }) {
  const id = fieldId(path);
  const options = resolveOptions(hint, ctx, "");
  const move = (from: number, to: number) => {
    const next = [...value];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const remove = (i: number) => {
    if (isObject(value[i]) && !window.confirm(`Remove "${itemTitle(value[i], i)}"?`)) return;
    onChange(value.filter((_, j) => j !== i));
  };
  const add = () => {
    const pattern = hint.itemTemplate !== undefined ? clone(hint.itemTemplate as Json) : value.length ? blank(value[0]) : "";
    onChange([...value, pattern]);
  };

  // Pick several from a fixed list (modes, categories, partners…)
  if (hint.widget === "multiselect" && options) {
    const selected = new Set(value.map(String));
    const toggle = (v: string) => onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
    return (
      <fieldset className="min-w-0 sm:col-span-full">
        <legend className="mb-1.5 text-sm font-medium text-navy-900">{label}</legend>
        <div className="grid gap-x-4 gap-y-2 rounded-xl border border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="size-4 accent-brand-600" checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
          {options.length === 0 && <p className="text-sm text-muted">Nothing to choose from yet.</p>}
        </div>
        {hint.help && <p className="mt-1 text-xs text-muted">{hint.help}</p>}
      </fieldset>
    );
  }

  const objects = value.some(isObject) || (!value.length && isObject(hint.itemTemplate as Json));
  return (
    <fieldset className="min-w-0 sm:col-span-full">
      <legend className="mb-1.5 text-sm font-medium text-navy-900">
        {label} <span className="font-normal text-muted">({value.length})</span>
      </legend>
      {hint.help && <p className="-mt-1 mb-2 text-xs text-muted">{hint.help}</p>}
      <ol className="space-y-2">
        {value.map((item, i) => {
          const itemPath = [...path, i];
          const title = itemTitle(item, i);
          if (objects && isObject(item) && isFlat(item)) {
            // Small items (a lesson, a stat, a link) are edited inline as a row
            return (
              <li key={i} className="flex items-start gap-2 rounded-xl border border-line bg-white p-3">
                <div className="min-w-0 flex-1">
                  <ObjectFields value={item} path={itemPath} ctx={ctx} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
                </div>
                <ItemControls i={i} n={value.length} label={title} onMove={(to) => move(i, to)} onRemove={() => remove(i)} />
              </li>
            );
          }
          if (objects && isObject(item)) {
            return (
              <li key={i}>
                <ItemCard title={title} startOpen={title.startsWith("Item ")} controls={<ItemControls i={i} n={value.length} label={title} onMove={(to) => move(i, to)} onRemove={() => remove(i)} />}>
                  <ObjectFields value={item} path={itemPath} ctx={ctx} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
                </ItemCard>
              </li>
            );
          }
          const itemHint = hintFor(ctx.hints, itemPath);
          const text = typeof item === "string" ? item : JSON.stringify(item);
          const long = itemHint.widget === "textarea" || text.length > 90;
          const set = (v: string) => onChange(value.map((x, j) => (j === i ? (typeof x === "number" ? Number(v) : v) : x)));
          return (
            <li key={i} className="flex items-start gap-2">
              {long ? (
                <Textarea id={i === 0 ? id : undefined} aria-label={`${label} ${i + 1}`} value={text} onChange={(e) => set(e.target.value)} className="min-h-20 flex-1" />
              ) : (
                <Input id={i === 0 ? id : undefined} aria-label={`${label} ${i + 1}`} value={text} onChange={(e) => set(e.target.value)} className="flex-1" />
              )}
              <div className="pt-1.5"><ItemControls i={i} n={value.length} label={`${label} ${i + 1}`} onMove={(to) => move(i, to)} onRemove={() => remove(i)} /></div>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={add} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        <Plus className="size-4" aria-hidden /> Add {objects ? "item" : "row"}
      </button>
    </fieldset>
  );
}
