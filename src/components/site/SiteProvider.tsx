"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteContent } from "@/types/content";

const SiteContext = createContext<SiteContent | null>(null);

/** Makes data/site.json available to client components (navbar, logo, verification form). */
export function SiteProvider({ site, children }: { site: SiteContent; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const site = useContext(SiteContext);
  if (!site) throw new Error("useSite must be used inside SiteProvider");
  return site;
}
