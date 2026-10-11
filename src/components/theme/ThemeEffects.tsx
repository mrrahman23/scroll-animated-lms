"use client";

import { useEffect, useRef } from "react";
import { VERIFIED_EVENT } from "@/components/three/scenes/medal";
import { useUiTheme } from "./ThemeProvider";

const confettiColors = {
  aurora: ["#7c6cff", "#22d3ee", "#f472b6", "#a5b4fc", "#2ee6b0"],
  spark: ["#7a35f0", "#ff5fa2", "#ffb938", "#3ddc97", "#5b8cff"],
  ember: ["#e0412f", "#ff6b52", "#e8a33d", "#ece8e1", "#8a1d1d"],
  lunar: ["#e6ecf7", "#9fc4ff", "#5b8cff", "#ffffff", "#c9d6ea"],
  quest: ["#38e1ff", "#8b5cf6", "#a3ff4f", "#e6f6ff", "#22d3ee"],
  lab: ["#0ea5a4", "#14d3c8", "#ff7a1a", "#22c55e", "#1f2a37"],
};

/** Themes with the page-wide 3D world get the cursor ring. */
const WORLD_THEMES = ["ember", "lunar", "quest", "lab"];

/**
 * Global motion layer for the expressive themes:
 * ambient sky, scroll progress, pointer-reactive cards and confetti.
 */
export function ThemeEffects() {
  const { theme } = useUiTheme();
  const progressRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const fancy = theme !== "classic";

  // Ember: trailing cursor ring that grows over interactive elements
  useEffect(() => {
    if (!WORLD_THEMES.includes(theme) || window.matchMedia("(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)").matches) return;
    const el = cursorRef.current;
    if (!el) return;
    const pos = { x: -100, y: -100 };
    const cur = { x: -100, y: -100 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      const interactive = (e.target as Element | null)?.closest?.("a, button, [role='button'], input, select, textarea, label");
      el.dataset.active = interactive ? "true" : "false";
    };
    const tick = () => {
      cur.x += (pos.x - cur.x) * 0.2;
      cur.y += (pos.y - cur.y) * 0.2;
      el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    const hide = () => (el.style.opacity = "0");
    const show = () => (el.style.opacity = "1");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", hide);
    document.addEventListener("pointerenter", show);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("pointerenter", show);
    };
  }, [theme]);

  // Scroll progress
  useEffect(() => {
    if (!fancy) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current?.style.setProperty("--progress", String(max > 0 ? window.scrollY / max : 0));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [fancy]);

  // Pointer-reactive cards: spotlight (aurora) / tilt (spark)
  useEffect(() => {
    if (!fancy || window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let active: HTMLElement | null = null;
    let frame = 0;
    const reset = (el: HTMLElement) => {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    };
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = (e.target as Element | null)?.closest?.(".fx-card") as HTMLElement | null;
        if (active && active !== el) reset(active);
        active = el;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        if (theme === "spark") {
          el.style.setProperty("--rx", `${((y / r.height) - 0.5) * -6}deg`);
          el.style.setProperty("--ry", `${((x / r.width) - 0.5) * 6}deg`);
        }
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      if (active) reset(active);
    };
  }, [fancy, theme]);

  // Confetti when a certificate verifies as valid
  useEffect(() => {
    if (!fancy || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = confettiColors[theme as keyof typeof confettiColors];
    let raf = 0;
    const onVerified = (e: Event) => {
      if ((e as CustomEvent<{ status?: string }>).detail?.status !== "valid") return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      const W = window.innerWidth;
      const pieces = Array.from({ length: 160 }, (_, i) => ({
        x: W / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 14 - 4,
        size: 5 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        round: Math.random() > 0.6,
      }));
      const start = performance.now();
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        ctx.clearRect(0, 0, W, window.innerHeight);
        const life = (now - start) / 2600;
        pieces.forEach((p) => {
          p.vy += 0.35;
          p.vx *= 0.99;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          if (p.round) {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        });
        if (life < 1) raf = requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, W, window.innerHeight);
      };
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener(VERIFIED_EVENT, onVerified);
    return () => {
      window.removeEventListener(VERIFIED_EVENT, onVerified);
      cancelAnimationFrame(raf);
    };
  }, [fancy, theme]);

  return (
    <>
      <div className="aurora-sky" aria-hidden />
      <div className="spark-sky" aria-hidden />
      <div ref={progressRef} className="scroll-progress" aria-hidden />
      {WORLD_THEMES.includes(theme) && <div ref={cursorRef} className="ember-cursor hidden [@media(hover:hover)_and_(pointer:fine)]:block" aria-hidden />}
      {fancy && <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[90] size-full" aria-hidden />}
    </>
  );
}
