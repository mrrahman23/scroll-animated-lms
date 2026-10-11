"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";

export type Three = typeof THREE_NS;

export interface SceneContext {
  THREE: Three;
  scene: THREE_NS.Scene;
  renderer: THREE_NS.WebGLRenderer;
  width: number;
  height: number;
  /** Fires the named DOM event on window; lets scenes react to app events. */
  on: (event: string, handler: (e: Event) => void) => void;
}

export interface SceneFrame {
  /** Seconds since start. */
  t: number;
  /** Seconds since last frame (clamped). */
  dt: number;
  /** Smoothed pointer, -1..1 relative to the canvas. */
  pointer: { x: number; y: number };
}

export interface SceneController {
  camera: THREE_NS.Camera;
  update: (frame: SceneFrame) => void;
  resize?: (width: number, height: number) => void;
  dispose?: () => void;
}

export type SceneSetup = (ctx: SceneContext) => SceneController | Promise<SceneController>;

/**
 * Mounts a Three.js scene into a container div.
 * - three.js is code-split and only downloaded when a scene mounts
 * - pauses when off-screen or the tab is hidden
 * - honours prefers-reduced-motion (renders a still frame)
 * - reports `failed` when WebGL is unavailable so callers can show a fallback
 */
export function useThreeScene(setup: SceneSetup) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const setupRef = useRef(setup);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      let renderer: THREE_NS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        setStatus("failed");
        return;
      }
      const small = window.innerWidth < 640;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.setAttribute("aria-hidden", "true");
      el.appendChild(canvas);

      const scene = new THREE.Scene();
      const rect = el.getBoundingClientRect();
      let width = Math.max(1, rect.width);
      let height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);

      const on = (event: string, handler: (e: Event) => void) => {
        window.addEventListener(event, handler);
        cleanups.push(() => window.removeEventListener(event, handler));
      };

      const ctrl = await setupRef.current({ THREE, scene, renderer, width, height, on });
      if (disposed) {
        ctrl.dispose?.();
        renderer.dispose();
        return;
      }
      ctrl.resize?.(width, height);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Pointer (smoothed)
      const target = { x: 0, y: 0 };
      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        target.y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
      };
      window.addEventListener("pointermove", onPointer, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", onPointer));

      // Resize
      const ro = new ResizeObserver(([entry]) => {
        width = Math.max(1, entry.contentRect.width);
        height = Math.max(1, entry.contentRect.height);
        renderer.setSize(width, height, false);
        ctrl.resize?.(width, height);
        if (reduced) renderOnce();
      });
      ro.observe(el);
      cleanups.push(() => ro.disconnect());

      const clock = new THREE.Clock();
      let t = 0;
      const renderOnce = () => {
        ctrl.update({ t: 2, dt: 0, pointer });
        renderer.render(scene, ctrl.camera);
      };

      let visible = true;
      const loop = () => {
        const dt = Math.min(clock.getDelta(), 1 / 20);
        if (!visible || document.hidden) return;
        t += dt;
        pointer.x += (target.x - pointer.x) * 0.06;
        pointer.y += (target.y - pointer.y) * 0.06;
        ctrl.update({ t, dt, pointer });
        renderer.render(scene, ctrl.camera);
      };

      if (reduced) {
        renderOnce();
      } else {
        const io = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) clock.getDelta();
        });
        io.observe(el);
        cleanups.push(() => io.disconnect());
        renderer.setAnimationLoop(loop);
      }
      setStatus("ready");

      cleanups.push(() => {
        renderer.setAnimationLoop(null);
        ctrl.dispose?.();
        scene.traverse((obj) => {
          const mesh = obj as THREE_NS.Mesh;
          mesh.geometry?.dispose();
          const mat = mesh.material as THREE_NS.Material | THREE_NS.Material[] | undefined;
          (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => m.dispose());
        });
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      });
    })().catch(() => !disposed && setStatus("failed"));

    return () => {
      disposed = true;
      cleanups.reverse().forEach((c) => c());
    };
  }, []);

  return { containerRef, status };
}
