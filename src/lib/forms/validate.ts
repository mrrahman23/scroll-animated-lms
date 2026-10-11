/** Tiny form validation helpers (no extra dependency). */
export type FormResult = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

export function field(form: FormData, name: string, max = 500) {
  return String(form.get(name) ?? "").trim().slice(0, max);
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Honeypot: a hidden input real visitors never fill. */
export const isBot = (form: FormData) => String(form.get("website") ?? "").length > 0;
