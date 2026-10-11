import type { SceneSetup } from "../useThreeScene";

/**
 * Ember: a cinematic night world fixed behind the public site.
 * A lantern-lit path crosses a wind-swept meadow towards the institute hall,
 * under an ember moon and drifting leaves. Scrolling moves the camera along
 * the path; the pointer adds a gentle parallax. Built entirely from primitives
 * and shaders — no external models or textures.
 */

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

/**
 * Scene colours — tune the mood here.
 * EMBER: cool (blue) atmosphere with warm accents — ember moon, lamps, windows, red leaves.
 * LUNAR: fully cold moonlight — silver moon, icy light, pale drifting flecks.
 */
export const EMBER_PALETTE = {
  // atmosphere (cool)
  fog: "#0b1322",
  skyTop: "#03060f",
  skyHorizon: "#14223a",
  mist: "#5d7aa8",
  ridges: ["#0e1628", "#0c1322", "#0a101c"],
  ground: "#0a1318",
  path: "#1a1d24",
  ambientSky: "#4a6590",
  ambientGround: "#0a0e12",
  coolLight: "#86a6ff",
  stone: "#1a1e28",
  stoneLight: "#232838",
  posts: "#10131a",
  grassBase: "#05090c",
  grassTip: "#24383a",
  grassTipAlt: "#2f3c4a",
  stars: "#e6ecff",
  // accents (warm)
  moonBright: "#f25c38",
  moonDark: "#8c1f14",
  moonGlow: "#8c2112",
  moonLight: "#ff8a66",
  lampGlow: "#ffa45a",
  windows: "#ffb36b",
  windowsDim: "#c97a3c",
  fireflies: "#ffd27a",
  leaves: ["#9e1a0f", "#d9381a"],
  embers: "#ff9e47",
  trees: ["#6b1a14", "#8a2418", "#4a1410", "#7a3a14"],
};

export type NightPalette = typeof EMBER_PALETTE;

export const LUNAR_PALETTE: NightPalette = {
  // atmosphere (cold)
  fog: "#0a1424",
  skyTop: "#02050d",
  skyHorizon: "#1a2c4a",
  mist: "#7a96c8",
  ridges: ["#101b30", "#0d1728", "#0b1321"],
  ground: "#0a141c",
  path: "#1b2230",
  ambientSky: "#5a78a8",
  ambientGround: "#0a0f16",
  coolLight: "#a8c0ff",
  stone: "#1b2130",
  stoneLight: "#262e40",
  posts: "#11151d",
  grassBase: "#050a10",
  grassTip: "#2b4250",
  grassTipAlt: "#3a5266",
  stars: "#f2f6ff",
  // accents (silver & ice, with a little lamplight)
  moonBright: "#e6ecf7",
  moonDark: "#8b96ad",
  moonGlow: "#3c5a8c",
  moonLight: "#c9d8ff",
  lampGlow: "#ffd9a0",
  windows: "#ffe2b0",
  windowsDim: "#b99a6e",
  fireflies: "#cfe6ff",
  leaves: ["#bcd2f5", "#ffffff"],
  embers: "#9fc4ff",
  trees: ["#1b2a3a", "#23364a", "#152232", "#2c4258"],
};

/** Hex colour → GLSL vec3 literal (display values, matching the other shader colours). */
const vec3 = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `vec3(${(((n >> 16) & 255) / 255).toFixed(3)}, ${(((n >> 8) & 255) / 255).toFixed(3)}, ${((n & 255) / 255).toFixed(3)})`;
};

/** A night world in the given palette (used by the Ember and Lunar themes). */
export function nightWorldScene(PALETTE: NightPalette): SceneSetup {
  return ({ THREE, scene, renderer, width, height }) => {
  const FOG_COLOR = PALETTE.fog;
  const small = width < 700;
  // A full-page background renders every frame, so keep resolution modest
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const fogColor = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.FogExp2(fogColor, 0.022);
  scene.background = fogColor;

  const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 400);
  camera.position.set(0, 1.7, 14);

  const rand = (() => {
    let seed = 7;
    return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  })();

  /* ---------------- Sky dome with stars ---------------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        ${NOISE}
        varying vec3 vDir; uniform float uTime;
        void main() {
          float h = clamp(vDir.y, -0.2, 1.0);
          vec3 top = ${vec3(PALETTE.skyTop)};
          vec3 horizon = ${vec3(PALETTE.skyHorizon)};
          vec3 col = mix(horizon, top, smoothstep(0.0, 0.55, h));
          // warm glow around the moon
          vec3 moonDir = normalize(vec3(0.28, 0.32, -1.0));
          float g = max(dot(normalize(vDir), moonDir), 0.0);
          col += ${vec3(PALETTE.moonGlow)} * pow(g, 18.0) * 0.9 + ${vec3(PALETTE.moonGlow)} * pow(g, 4.0) * 0.12;
          // stars
          vec2 sp = vDir.xz / (vDir.y + 1.2) * 520.0;
          vec2 cell = floor(sp);
          float s = step(0.993, hash(cell)) * smoothstep(0.05, 0.4, h);
          vec2 off = vec2(hash(cell + 7.0), hash(cell + 13.0)) * 0.6 + 0.2;  // jitter inside the cell
          s *= smoothstep(0.16, 0.0, length(fract(sp) - off));
          float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash(cell + 3.0) * 30.0);
          col += ${vec3(PALETTE.stars)} * s * tw * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(sky);

  /* ---------------- Ember moon + halo ---------------- */
  const moonPos = new THREE.Vector3(26, 32, -110);
  const moon = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        ${NOISE}
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          float limb = sqrt(1.0 - r * r);
          float maria = fbm(p * 2.2 + 4.0);
          vec3 col = mix(${vec3(PALETTE.moonBright)}, ${vec3(PALETTE.moonDark)}, smoothstep(0.45, 0.75, maria));
          col *= 0.55 + 0.6 * limb;
          float edge = smoothstep(1.0, 0.96, r);
          gl_FragColor = vec4(col, edge);
        }`,
    }),
  );
  moon.position.copy(moonPos);
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 58),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 3.2) * 0.38; gl_FragColor = vec4(${vec3(PALETTE.moonBright)} * 0.85 * a, a); }`,
    }),
  );
  halo.position.copy(moonPos).add(new THREE.Vector3(0, 0, -1));
  scene.add(halo, moon);

  /* ---------------- Mountain ridges ---------------- */
  const ridge = (z: number, base: number, amp: number, color: string, seed: number) => {
    const shape = new THREE.Shape();
    const span = 260;
    shape.moveTo(-span, -10);
    for (let i = 0; i <= 120; i++) {
      const x = -span + (i / 120) * span * 2;
      const n = Math.sin(x * 0.035 + seed) * 0.5 + Math.sin(x * 0.09 + seed * 2.1) * 0.25 + Math.sin(x * 0.21 + seed * 3.7) * 0.1;
      shape.lineTo(x, base + n * amp);
    }
    shape.lineTo(span, -10);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, fog: true }));
    mesh.position.z = z;
    scene.add(mesh);
  };
  ridge(-150, 16, 14, PALETTE.ridges[0], 1.3);
  ridge(-105, 9, 9, PALETTE.ridges[1], 4.1);
  ridge(-72, 4, 5, PALETTE.ridges[2], 2.2);

  /* ---------------- Ground ---------------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220, 1, 1),
    new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 52), new THREE.MeshStandardMaterial({ color: PALETTE.path, roughness: 1 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, -8);
  scene.add(path);

  /* ---------------- Lighting ---------------- */
  scene.add(new THREE.HemisphereLight(PALETTE.ambientSky, PALETTE.ambientGround, 0.6));
  const coolLight = new THREE.DirectionalLight(PALETTE.coolLight, 0.55);
  coolLight.position.set(-30, 40, 20);
  scene.add(coolLight);
  const moonLight = new THREE.DirectionalLight(PALETTE.moonLight, 0.55);
  moonLight.position.set(26, 32, -60);
  scene.add(moonLight);
  const doorLight = new THREE.PointLight(PALETTE.windows, 26, 30, 1.6);
  doorLight.position.set(0, 3, -27);
  scene.add(doorLight);

  /* ---------------- The institute hall ---------------- */
  const hall = new THREE.Group();
  hall.position.set(0, 0, -36);
  const stone = new THREE.MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.92 });
  const stoneLight = new THREE.MeshStandardMaterial({ color: PALETTE.stoneLight, roughness: 0.85 });
  const glow = new THREE.MeshBasicMaterial({ color: PALETTE.windows });
  const glowDim = new THREE.MeshBasicMaterial({ color: PALETTE.windowsDim });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: InstanceType<typeof THREE.Material>) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    hall.add(mesh);
    return mesh;
  };
  // plinth + steps
  box(26, 1.2, 12, 0, 0.6, 0, stoneLight);
  for (let i = 0; i < 4; i++) box(9 - i * 0.6, 0.3, 1.2, 0, 0.15 + i * 0.3, 6.6 - i * 0.6, stoneLight);
  // main block + wings
  box(18, 7, 8, 0, 4.7, -1, stone);
  box(5, 5, 7, -11, 3.7, -0.5, stone);
  box(5, 5, 7, 11, 3.7, -0.5, stone);
  // colonnade
  const colGeo = new THREE.CylinderGeometry(0.32, 0.38, 6.2, 12);
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Mesh(colGeo, stoneLight);
    c.position.set(-7 + i * 2, 4.3, 3.6);
    hall.add(c);
  }
  box(16.8, 0.7, 1.4, 0, 7.6, 3.6, stoneLight);
  // pediment
  const ped = new THREE.Shape();
  ped.moveTo(-9, 0);
  ped.lineTo(0, 3.2);
  ped.lineTo(9, 0);
  ped.lineTo(-9, 0);
  const pediment = new THREE.Mesh(new THREE.ExtrudeGeometry(ped, { depth: 9.6, bevelEnabled: false }), stone);
  pediment.position.set(0, 7.95, -5.4);
  hall.add(pediment);
  // clock tower
  box(3.4, 6, 3.4, 0, 13.4, -1.5, stone);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4, 4), stoneLight);
  spire.rotation.y = Math.PI / 4;
  spire.position.set(0, 18.4, -1.5);
  hall.add(spire);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), glow);
  clock.position.set(0, 14.2, 0.22);
  hall.add(clock);
  // lit windows + doorway
  const winGeo = new THREE.PlaneGeometry(0.9, 1.6);
  [2.6, 5.6].forEach((y) =>
    [-7.5, -5.5, -3.5, 3.5, 5.5, 7.5].forEach((x) => {
      const w = new THREE.Mesh(winGeo, rand() > 0.25 ? glow : glowDim);
      w.position.set(x, y + 0.6, 3.02);
      hall.add(w);
    }),
  );
  [-11, 11].forEach((x) =>
    [-1.4, 1.4].forEach((dx) => {
      const w = new THREE.Mesh(winGeo, rand() > 0.3 ? glow : glowDim);
      w.position.set(x + dx, 3.6, 3.02);
      hall.add(w);
    }),
  );
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6), glow);
  door.position.set(0, 3, 3.02);
  hall.add(door);
  scene.add(hall);

  /* ---------------- Lamp posts along the path ---------------- */
  const postGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.4, 6);
  const postMat = new THREE.MeshStandardMaterial({ color: PALETTE.posts, roughness: 0.7 });
  const lanternGeo = new THREE.BoxGeometry(0.16, 0.24, 0.16);
  const lanternMat = new THREE.MeshStandardMaterial({ color: "#3a2412", emissive: PALETTE.lampGlow, emissiveIntensity: 2.2, roughness: 0.6 });
  const lampHeads: number[] = [];
  for (let z = 4; z > -30; z -= 4.5) {
    [-2.2, 2.2].forEach((x) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 1.2, z);
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(x, 2.55, z);
      scene.add(post, lantern);
      lampHeads.push(x, 2.55, z);
    });
  }

  /* ---------------- Trees (low-poly autumn canopies) ---------------- */
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 2.6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#16110e", roughness: 1 });
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  const leafMats = PALETTE.trees.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
  const trees: InstanceType<typeof THREE.Group>[] = [];
  const treeSpots: [number, number, number][] = [
    [-7, 4, 1.1], [8, 1, 1.3], [-12, -6, 1.5], [13, -10, 1.4], [-6, -16, 1.2], [7, -20, 1.0],
    [-18, -24, 1.7], [19, -28, 1.6], [-26, -12, 1.8], [24, -4, 1.7], [-4.5, -26, 0.9], [4.6, -28, 0.9],
  ];
  treeSpots.forEach(([x, z, s]) => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.3;
    t.add(trunk);
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.Mesh(leafGeo, leafMats[Math.floor(rand() * leafMats.length)]);
      leaf.position.set((rand() - 0.5) * 1.6, 2.8 + rand() * 1.2, (rand() - 0.5) * 1.6);
      leaf.scale.setScalar(0.8 + rand() * 0.7);
      leaf.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      t.add(leaf);
    }
    t.position.set(x, 0, z);
    t.scale.setScalar(s);
    t.userData.phase = rand() * Math.PI * 2;
    trees.push(t);
    scene.add(t);
  });

  /* ---------------- Grass (instanced, wind in the vertex shader) ---------------- */
  const bladeGeo = new THREE.PlaneGeometry(0.07, 0.75, 1, 4);
  bladeGeo.translate(0, 0.375, 0);
  const grassMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uFog: { value: fogColor },
      uDensity: { value: 0.022 },
    },
    vertexShader: `
      uniform float uTime;
      varying float vH; varying float vFogDepth; varying float vShade;
      void main() {
        vec3 p = position;
        p.x *= 1.0 - uv.y * 0.85;                       // taper to a point
        vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
        float sway = sin(uTime * 1.4 + world.x * 0.35 + world.z * 0.22) * 0.5
                   + sin(uTime * 2.3 + world.x * 0.9) * 0.18;
        world.x += sway * 0.22 * uv.y * uv.y;
        world.z += sway * 0.08 * uv.y * uv.y;
        vH = uv.y;
        vShade = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9, 78.2))) * 43758.5);
        vec4 mv = viewMatrix * world;
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uFog; uniform float uDensity;
      varying float vH; varying float vFogDepth; varying float vShade;
      void main() {
        vec3 base = ${vec3(PALETTE.grassBase)};
        vec3 tip = mix(${vec3(PALETTE.grassTip)}, ${vec3(PALETTE.grassTipAlt)}, vShade * 0.7);
        vec3 col = mix(base, tip, vH);
        col += ${vec3(PALETTE.moonGlow)} * pow(vH, 3.0) * 0.18;  // faint ember rim on the tips
        float fog = 1.0 - exp(-uDensity * uDensity * vFogDepth * vFogDepth);
        gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
      }`,
  });
  const bladeCount = small ? 6000 : 16000;
  const grass = new THREE.InstancedMesh(bladeGeo, grassMat, bladeCount);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  let placed = 0;
  while (placed < bladeCount) {
    const x = (rand() - 0.5) * 60;
    const z = 14 - rand() * 46;
    if (Math.abs(x) < 1.5 && z > -30) continue; // keep the path clear
    e.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
    q.setFromEuler(e);
    const s = 0.7 + rand() * 0.8;
    sc.set(1, s, 1);
    v.set(x, 0, z);
    m4.compose(v, q, sc);
    grass.setMatrixAt(placed++, m4);
  }
  grass.frustumCulled = false;
  scene.add(grass);

  /* ---------------- Glows: lanterns, fireflies ---------------- */
  const glowPoints = (positions: number[], size: number, color: string, twinkle: number) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const seeds = new Float32Array(positions.length / 3).map(() => rand() * 100);
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uTwinkle: { value: twinkle }, uPixel: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float aSeed; uniform float uTime; uniform float uSize; uniform float uTwinkle; uniform float uPixel;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.7 + aSeed) * 0.25 * uTwinkle;
          p.x += cos(uTime * 0.5 + aSeed * 1.3) * 0.35 * uTwinkle;
          vA = mix(1.0, 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 7.0)), uTwinkle);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * uPixel * (12.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = pow(max(1.0 - d * 2.0, 0.0), 2.2) * vA;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return mat;
  };
  const lanternGlow = glowPoints(lampHeads, 10, PALETTE.lampGlow, 0);
  const fireflyPos: number[] = [];
  for (let i = 0; i < (small ? 60 : 140); i++) fireflyPos.push((rand() - 0.5) * 34, 0.4 + rand() * 1.8, 12 - rand() * 40);
  const fireflies = glowPoints(fireflyPos, 6, PALETTE.fireflies, 1);

  /* ---------------- Drifting leaves & embers ---------------- */
  const leafCount = small ? 160 : 380;
  const leafPos = new Float32Array(leafCount * 3);
  const leafSeed = new Float32Array(leafCount);
  for (let i = 0; i < leafCount; i++) {
    leafPos[i * 3] = (rand() - 0.5) * 40;
    leafPos[i * 3 + 1] = rand() * 16;
    leafPos[i * 3 + 2] = 14 - rand() * 50;
    leafSeed[i] = rand();
  }
  const leafGeo2 = new THREE.BufferGeometry();
  leafGeo2.setAttribute("position", new THREE.BufferAttribute(leafPos, 3));
  leafGeo2.setAttribute("aSeed", new THREE.BufferAttribute(leafSeed, 1));
  const leafMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uPixel;
      varying float vSeed; varying float vRot;
      void main() {
        vec3 p = position;
        float fall = uTime * (0.35 + aSeed * 0.5);
        p.y = mod(p.y - fall, 16.0);
        p.x += sin(uTime * 0.6 + aSeed * 20.0) * 1.2 + uTime * 0.25;
        p.x = mod(p.x + 20.0, 40.0) - 20.0;
        p.z += cos(uTime * 0.4 + aSeed * 11.0) * 0.6;
        vSeed = aSeed;
        vRot = uTime * (1.0 + aSeed * 2.0) + aSeed * 6.28;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (5.0 + aSeed * 6.0) * uPixel * (10.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vSeed; varying float vRot;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vRot), co = cos(vRot);
        c = mat2(co, -s, s, co) * c;
        c.x *= 1.0 + 0.6 * abs(sin(vRot * 0.7));        // tumbling flatten
        float leaf = abs(c.x) + abs(c.y) * 1.6;          // pointed leaf / diamond
        if (leaf > 0.42) discard;
        vec3 col = vSeed > 0.75 ? ${vec3(PALETTE.embers)} : mix(${vec3(PALETTE.leaves[0])}, ${vec3(PALETTE.leaves[1])}, vSeed);
        gl_FragColor = vec4(col, 0.9);
      }`,
  });
  const leaves = new THREE.Points(leafGeo2, leafMat);
  leaves.frustumCulled = false;
  scene.add(leaves);

  /* ---------------- Ground mist ---------------- */
  const mistMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      ${NOISE}
      varying vec2 vUv; uniform float uTime;
      void main() {
        float n = fbm(vUv * vec2(4.0, 1.5) + vec2(uTime * 0.02, 0.0));
        float band = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
        float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        float a = n * band * edge * 0.42;
        gl_FragColor = vec4(${vec3(PALETTE.mist)}, a);
      }`,
  });
  [-2, -14, -26, -40].forEach((z, i) => {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(90, 5 + i), mistMat);
    mist.position.set(0, 1.4 + i * 0.3, z);
    scene.add(mist);
  });

  /* ---------------- Camera path driven by scroll ---------------- */
  let progress = 0;
  const target = new THREE.Vector3();
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };

  return {
    camera,
    resize: (w, h) => {
      camera.aspect = w / h;
      // Wider field of view on portrait screens so the hall stays in frame
      camera.fov = w / h < 1 ? 66 : 52;
      camera.updateProjectionMatrix();
    },
    update: ({ t, pointer }) => {
      progress += (readScroll() - progress) * 0.06;
      const p = progress;
      // glide down the path, rising slightly mid-way, ending before the steps
      camera.position.set(
        Math.sin(p * Math.PI * 1.2) * 1.6 + pointer.x * 0.6,
        1.7 + Math.sin(p * Math.PI) * 1.4 + p * 1.2 + pointer.y * 0.25,
        14 - p * 24,
      );
      target.set(pointer.x * 1.2, 3.4 - p * 0.8, -40);
      camera.lookAt(target);

      moon.lookAt(camera.position);
      halo.lookAt(camera.position);
      (sky.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms.uTime.value = t;
      grassMat.uniforms.uTime.value = t;
      leafMat.uniforms.uTime.value = t;
      mistMat.uniforms.uTime.value = t;
      fireflies.uniforms.uTime.value = t;
      lanternGlow.uniforms.uTime.value = t;
      doorLight.intensity = 24 + Math.sin(t * 3.1) * 2 + Math.sin(t * 7.3) * 1.2; // candle-like flicker
      trees.forEach((tr) => (tr.rotation.z = Math.sin(t * 0.8 + tr.userData.phase) * 0.02));
    },
  };
};
}

export const emberScene = nightWorldScene(EMBER_PALETTE);
export const lunarScene = nightWorldScene(LUNAR_PALETTE);
