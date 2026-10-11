"use client";

import { ImageUp, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { uploadImageAction } from "@/app/admin/content/actions";
import { Input } from "@/components/ui/forms";

/** Image path/URL with a preview and an upload button. Uploads land in data/uploads/<folder>/. */
export function ImageField({ id, value, onChange, folder }: { id: string; value: string; onChange: (v: string) => void; folder: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = (file: File) => {
    const form = new FormData();
    form.set("file", file);
    form.set("folder", folder);
    start(async () => {
      const r = await uploadImageAction(form);
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok && r.url) onChange(r.url);
    });
  };

  return (
    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(#f1f4f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- preview of any path or URL the admin enters */}
        {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">No image</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Upload, or paste /images/… or https://…" />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-60">
            <ImageUp className="size-4" aria-hidden /> {pending ? "Uploading…" : "Upload image"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-navy-50 hover:text-navy-900">
              <X className="size-4" aria-hidden /> Remove
            </button>
          )}
          {message && <span role="status" className={message.ok ? "text-xs text-verify-700" : "text-xs text-red-700"}>{message.text}</span>}
        </div>
      </div>
    </div>
  );
}
