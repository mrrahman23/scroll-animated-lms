"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { THEME_STORAGE_KEY, isUiTheme, type UiTheme } from "@/config/themes";

interface ThemeContextValue {
  theme: UiTheme;
  siteDefault: UiTheme;
  allowSwitch: boolean;
  /** Visitor preference, persisted in this browser. `null` returns to the site default. */
  setVisitorTheme: (t: UiTheme | null) => void;
  /** Temporary preview for this tab only (used by the admin settings page). */
  preview: (t: UiTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ui"] });
  return () => mo.disconnect();
}

export function ThemeProvider({ siteDefault, allowSwitch, children }: { siteDefault: UiTheme; allowSwitch: boolean; children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    () => {
      const v = document.documentElement.getAttribute("data-ui");
      return isUiTheme(v) ? v : siteDefault;
    },
    () => siteDefault,
  );

  const apply = (t: UiTheme) => document.documentElement.setAttribute("data-ui", t);

  const setVisitorTheme = useCallback(
    (t: UiTheme | null) => {
      try {
        if (t) localStorage.setItem(THEME_STORAGE_KEY, t);
        else localStorage.removeItem(THEME_STORAGE_KEY);
      } catch {
        /* storage unavailable — still apply for this page view */
      }
      apply(t ?? siteDefault);
    },
    [siteDefault],
  );

  const value = useMemo(() => ({ theme, siteDefault, allowSwitch, setVisitorTheme, preview: apply }), [theme, siteDefault, allowSwitch, setVisitorTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useUiTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useUiTheme must be used inside ThemeProvider");
  return ctx;
}
