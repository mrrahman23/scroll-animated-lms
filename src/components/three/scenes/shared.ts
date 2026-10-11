import type * as T from "three";

/** Shared building blocks for the story scenes (Quest, Lab). */

export const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

export const easeInOut = (x: number) => x * x * (3 - 2 * x);
export const smooth = (a: number, b: number, x: number) => easeInOut(Math.min(1, Math.max(0, (x - a) / (b - a))));

/** Draws onto a canvas and returns it as a texture. */
export function canvasTexture(THREE: typeof T, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Story progress 0..1 from scroll. Reaches `arrive` when the homepage's
 * [data-world-window] section is centred on screen (an unobstructed view for the finale).
 * Pages without that section use plain page-scroll progress.
 */
export function readStoryProgress(arrive: number) {
  const win = document.querySelector<HTMLElement>("[data-world-window]");
  if (win && win.offsetHeight) {
    const top = win.getBoundingClientRect().top + window.scrollY;
    const finale = top + win.offsetHeight * 0.5 - window.innerHeight * 0.5;
    return finale > 0 ? Math.min(1, Math.max(0, (window.scrollY / finale) * arrive)) : 1;
  }
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

export interface StudentColors {
  jacket: string;
  trim: string;
  pants: string;
  head: string;
  visor: string;
  shoes: string;
  pack: string;
}

/**
 * Low-poly student with a procedural walk. Call `animate` every frame with the student's
 * current z; stride follows actual movement, so they stand still when scrolling stops.
 */
export function buildStudent(THREE: typeof T, S: StudentColors) {
  const mat = (color: string, emissive = "#000000", ei = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.55, metalness: 0.1 });
  const group = new THREE.Group();
  const body = new THREE.Group(); // bobs while walking
  group.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 6, 16), mat(S.jacket));
  torso.position.y = 1.32;
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.025, 6, 32), mat(S.trim, S.trim, 2));
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16), mat(S.head));
  head.position.y = 1.9;
  const visor = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.03, 6, 24, Math.PI), mat(S.visor, S.visor, 2.5));
  visor.position.set(0, 1.93, 0);
  visor.rotation.set(0, Math.PI / 2, Math.PI / 2);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.2), mat(S.pack, S.pack, 0.35));
  pack.position.set(0, 1.38, 0.27);
  const packLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.02), mat(S.trim, S.trim, 3));
  packLight.position.set(0, 1.45, 0.38);
  body.add(torso, trim, head, visor, pack, packLight);

  const limb = (r: number, len: number, color: string, y: number, x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat(color));
    m.position.y = -len / 2 - r;
    pivot.add(m);
    body.add(pivot);
    return pivot;
  };
  const armL = limb(0.075, 0.5, S.jacket, 1.62, -0.36);
  const armR = limb(0.075, 0.5, S.jacket, 1.62, 0.36);
  const legL = limb(0.1, 0.56, S.pants, 0.86, -0.14);
  const legR = limb(0.1, 0.56, S.pants, 0.86, 0.14);
  [legL, legR].forEach((leg) => {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.32), mat(S.shoes, S.trim, 0.4));
    shoe.position.set(0, -0.82, -0.06);
    leg.add(shoe);
  });

  let lastZ: number | null = null;
  let phase = 0;
  let stride = 0;

  return {
    group,
    /**
     * @param z       student position along the path
     * @param cheer   0..1 — raises the right arm in celebration
     * @param typing  0..1 — both forearms forward, as if at a keyboard
     */
    animate({ z, t, dt, cheer = 0, typing = 0 }: { z: number; t: number; dt: number; cheer?: number; typing?: number }) {
      const moved = lastZ === null ? 0 : Math.abs(z - lastZ);
      lastZ = z;
      const walking = Math.min(1, moved / Math.max(dt, 1e-3) / 3);
      stride += (walking - stride) * 0.12;
      phase += moved * 3.2;
      group.position.z = z;
      const swing = Math.sin(phase) * 0.65 * stride;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      const type = typing * (1 - stride);
      const tap = Math.sin(t * 14) * 0.08 * type;
      armL.rotation.x = -swing * 0.8 * (1 - type) - type * 1.1 + tap;
      armR.rotation.x = swing * 0.8 * (1 - type) - type * 1.1 - tap;
      armR.rotation.x = armR.rotation.x * (1 - cheer) - cheer * 2.6;
      armR.rotation.z = cheer * 0.3;
      body.position.y = Math.abs(Math.sin(phase)) * 0.06 * stride + Math.sin(t * 2) * 0.012;
    },
  };
}
