"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

type ToastTone = "success" | "info" | "error";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

const ToastContext = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const toneStyles: Record<ToastTone, { icon: ReactNode; bar: string }> = {
  success: { icon: <CircleCheck className="size-5 text-verify-600" aria-hidden />, bar: "bg-verify-500" },
  info: { icon: <Info className="size-5 text-brand-600" aria-hidden />, bar: "bg-brand-500" },
  error: { icon: <CircleAlert className="size-5 text-red-600" aria-hidden />, bar: "bg-red-500" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { ...t, id }]);
    setTimeout(() => dismiss(id), 5000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto relative flex w-full max-w-sm animate-fade-up items-start gap-3 overflow-hidden rounded-xl border border-line bg-white p-4 pl-5 shadow-(--shadow-lift)"
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", toneStyles[t.tone].bar)} aria-hidden />
            {toneStyles[t.tone].icon}
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="rounded p-1 text-muted hover:bg-navy-50" aria-label="Dismiss notification">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
