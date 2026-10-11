"use client";

import { useEffect, useRef } from "react";
import { useUiTheme } from "@/components/theme/ThemeProvider";
import { ThreeStage, type StageScene } from "./ThreeStage";

/** Full-bleed hero background scene (aurora & spark). Ember uses the page-wide EmberWorld instead. */
export function HeroScene() {
  const { theme } = useUiTheme();
  if (theme !== "aurora" && theme !== "spark") return null;
  return (
    <ThreeStage
      key={theme}
      scene={theme}
      className="absolute inset-0"
      fallbackClassName={theme === "aurora" ? "bg-[radial-gradient(circle_at_75%_40%,rgb(124_108_255/.35),transparent_45%)]" : "bg-[radial-gradient(circle_at_70%_40%,rgb(255_95_162/.25),transparent_45%)]"}
    />
  );
}

const medalFor: Record<string, StageScene> = { aurora: "medal-aurora", spark: "medal-spark", ember: "medal-ember", lunar: "medal-lunar", quest: "medal-quest", lab: "medal-lab" };

/** Themes that place a 3D night world behind the whole public site. */
const worldFor: Record<string, { scene: StageScene; fallback: string }> = {
  ember: { scene: "ember-world", fallback: "bg-[radial-gradient(circle_at_70%_25%,rgb(224_65_47/.35)_0,transparent_30%),linear-gradient(#0b1322,#0a1318)]" },
  lunar: { scene: "lunar-world", fallback: "bg-[radial-gradient(circle_at_70%_25%,rgb(230_236_247/.3)_0,transparent_30%),linear-gradient(#0a1424,#0a141c)]" },
  lab: { scene: "lab-world", fallback: "bg-[linear-gradient(#f5f7fa,#e8eef5_60%,#dbe3ec)]" },
  quest: { scene: "quest-world", fallback: "bg-[radial-gradient(circle_at_50%_45%,rgb(56_225_255/.25)_0,transparent_35%),linear-gradient(#0a0f2a,#050816)]" },
};

/** 3D certificate medal shown in the verification section (expressive themes). */
export function MedalScene({ className }: { className?: string }) {
  const { theme } = useUiTheme();
  const scene = medalFor[theme];
  if (!scene) return null;
  return <ThreeStage key={theme} scene={scene} className={className} />;
}

/**
 * Ember, Lunar & Quest themes: a 3D world fixed behind the whole public site,
 * with a veil that deepens as you scroll (keeps long-form text legible) and film grain.
 */
export function EmberWorld() {
  const { theme } = useUiTheme();
  const world = worldFor[theme];
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!world) return;
    const onScroll = () => {
      // Clear over the hero, then fade to ~60% darkness behind the content
      let v = Math.min(0.6, Math.max(0, (window.scrollY - window.innerHeight * 0.35) / window.innerHeight) * 0.6);
      // Clear the view while a [data-world-window] section is on screen
      const win = document.querySelector("[data-world-window]");
      if (win) {
        const r = win.getBoundingClientRect();
        const visible = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) / window.innerHeight;
        v *= 1 - Math.min(1, visible * 1.6);
      }
      veilRef.current?.style.setProperty("--veil", v.toFixed(3));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [world]);

  if (!world) return null;
  return (
    <>
      <ThreeStage key={world.scene} scene={world.scene} className="ember-world pointer-events-none fixed inset-0 -z-20" fallbackClassName={world.fallback} />
      <div ref={veilRef} className="ember-veil" aria-hidden />
      <div className="ember-grain" aria-hidden />
    </>
  );
}
