import type * as T from "three";
import type { SceneSetup } from "../useThreeScene";
import { MONO, buildStudent, canvasTexture, readStoryProgress, smooth } from "./shared";

/**
 * Quest: a student's journey through a tech-skills world, driven by scroll.
 *   Enter   — the student steps through a portal
 *   Learn   — walks a glowing path past floating code; skill cubes fly in and orbit them
 *   Assess  — passes through a scanner gate that turns green
 *   Certify — reaches a podium as a holographic NYTI certificate rises
 * Everything is procedural (primitives, shaders and canvas textures).
 */

const C = {
  bg: "#050816",
  grid: "#22d3ee",
  gridMajor: "#38e1ff",
  violet: "#8b5cf6",
  lime: "#a3ff4f",
  amber: "#ffb84d",
  tileOff: "#0d2236",
  tileOn: "#38e1ff",
  student: { jacket: "#1b2a4a", trim: "#38e1ff", pants: "#121a2e", head: "#e6ecf7", visor: "#38e1ff", shoes: "#0b1020", pack: "#8b5cf6" },
};

// Story beats along the path (z positions)
const START_Z = 3;
const PODIUM_Z = -84;
const GATE_Z = -60;
const CERT_Z = -91;

const SNIPPETS: { title: string; lines: string[] }[] = [
  { title: "learn.py", lines: ["def learn(skill):", "    practice(skill)", "    build_project()", "    return certified", "", "learn('python')"] },
  { title: "server.js", lines: ["const app = express()", "app.get('/api/skills',", "  (req, res) => res.json(ok))", "app.listen(3000)"] },
  { title: "query.sql", lines: ["SELECT learner, score", "FROM assessments", "WHERE passed = TRUE", "ORDER BY score DESC;"] },
  { title: "index.html", lines: ["<section class='hero'>", "  <h1>Build Skills</h1>", "  <p>Get certified</p>", "</section>"] },
  { title: "terminal", lines: ["$ git commit -m 'week 6'", "$ git push origin main", "✓ build passed", "✓ deployed"] },
  { title: "model.ipynb", lines: ["model.fit(X_train, y)", "acc = model.score(X, y)", "print(acc)  # 0.94", "✓ assessment ready"] },
];
const SKILLS = ["</>", "{ }", "SQL", "AI", "API", "git", "UX", "☁"];

export const questScene: SceneSetup = ({ THREE, scene, renderer, width, height }) => {
  const small = width < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const bg = new THREE.Color(C.bg);
  scene.background = bg;
  scene.fog = new THREE.FogExp2(bg, 0.018);

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 400);

  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* ---------------- Sky: deep gradient + digital stars ---------------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vDir; uniform float uTime;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main(){
          float h = clamp(vDir.y, -0.2, 1.0);
          vec3 col = mix(vec3(0.05, 0.06, 0.16), vec3(0.008, 0.012, 0.04), smoothstep(0.0, 0.6, h));
          col += vec3(0.05, 0.25, 0.35) * pow(1.0 - abs(h), 12.0) * 0.6;   // horizon glow
          vec2 sp = vDir.xz / (vDir.y + 1.2) * 480.0;
          vec2 cell = floor(sp);
          float s = step(0.994, hash(cell)) * smoothstep(0.05, 0.5, h);
          s *= smoothstep(0.18, 0.0, length(fract(sp) - 0.5));
          col += mix(vec3(0.4, 0.9, 1.0), vec3(0.7, 0.5, 1.0), hash(cell + 2.0)) * s * (0.6 + 0.4 * sin(uTime * 3.0 + hash(cell) * 40.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(sky);

  /* ---------------- Grid floor with pulse rings from the student ---------------- */
  const floorMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uStudent: { value: new THREE.Vector3() },
      uGrid: { value: new THREE.Color(C.grid) },
      uMajor: { value: new THREE.Color(C.gridMajor) },
      uViolet: { value: new THREE.Color(C.violet) },
    },
    vertexShader: `varying vec3 vW; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uStudent; uniform vec3 uGrid; uniform vec3 uMajor; uniform vec3 uViolet;
      varying vec3 vW; varying float vDepth;
      float line(vec2 p, float s) {
        vec2 q = p / s;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        float fine = line(vW.xz, 1.5) * 0.35;
        float major = line(vW.xz, 9.0) * 0.8;
        float d = distance(vW.xz, uStudent.xz);
        float ring = smoothstep(0.35, 0.0, abs(fract(d * 0.12 - uTime * 0.35) - 0.5) * 2.0 - 0.6) * exp(-d * 0.06);
        float fade = exp(-vDepth * 0.022);
        vec3 col = uGrid * fine + uMajor * major + uViolet * ring * 0.9;
        col += uMajor * exp(-d * 0.5) * 0.25;  // light pool around the student
        float a = clamp(fine + major + ring + exp(-d * 0.5) * 0.4, 0.0, 1.0) * fade;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const floorBase = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: "#040714" }));
  floorBase.rotation.x = -Math.PI / 2;
  floorBase.position.y = -0.02;
  scene.add(floorBase);

  /* ---------------- Lighting ---------------- */
  scene.add(new THREE.HemisphereLight("#6b8cff", "#05070f", 0.7));
  const key = new THREE.DirectionalLight("#cfe8ff", 1.0);
  key.position.set(6, 10, 8);
  scene.add(key);
  const studentLight = new THREE.PointLight(C.gridMajor, 8, 9, 1.8);
  scene.add(studentLight);

  /* ---------------- Path tiles (light up once visited) ---------------- */
  const tileZs: number[] = [];
  for (let z = START_Z - 0.6; z > PODIUM_Z + 3; z -= 1.6) tileZs.push(z);
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 0.05, 1.05), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), tileZs.length);
  const m4 = new THREE.Matrix4();
  tileZs.forEach((z, i) => {
    m4.makeTranslation(0, 0.03, z);
    tiles.setMatrixAt(i, m4);
  });
  const tileOff = new THREE.Color(C.tileOff);
  const tileOn = new THREE.Color(C.tileOn);
  const tileTmp = new THREE.Color();
  scene.add(tiles);

  /* ---------------- Portal (Enter) ---------------- */
  const portal = new THREE.Group();
  portal.position.set(0, 0, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.09, 16, 96), new THREE.MeshBasicMaterial({ color: C.gridMajor, toneMapped: false }));
  ring.position.y = 2.2;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: C.violet, toneMapped: false }));
  ring2.position.y = 2.2;
  const portalMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpen: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uOpen;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float swirl = sin(a * 6.0 + r * 10.0 - uTime * 3.0) * 0.5 + 0.5;
        vec3 col = mix(vec3(0.13, 0.83, 0.93), vec3(0.55, 0.36, 0.96), swirl);
        float alpha = (0.15 + swirl * 0.35) * smoothstep(1.0, 0.2, r) * uOpen;
        gl_FragColor = vec4(col * alpha, alpha);
      }`,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.05, 64), portalMat);
  disc.position.y = 2.2;
  portal.add(ring, ring2, disc);
  scene.add(portal);

  /* ---------------- Floating code panels (Learn) ---------------- */
  const panels: { mesh: T.Mesh; baseY: number; phase: number }[] = [];
  SNIPPETS.forEach((snip, i) => {
    const tex = canvasTexture(THREE, 640, 400, (g) => {
      g.fillStyle = "rgba(6, 14, 32, 0.82)";
      g.fillRect(0, 0, 640, 400);
      g.strokeStyle = i % 2 ? "rgba(139, 92, 246, 0.9)" : "rgba(56, 225, 255, 0.9)";
      g.lineWidth = 3;
      g.strokeRect(2, 2, 636, 396);
      g.fillStyle = "rgba(255,255,255,0.06)";
      g.fillRect(2, 2, 636, 46);
      ["#ff5f57", "#febc2e", "#28c840"].forEach((c, k) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(28 + k * 22, 25, 7, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = "#9fb3cc";
      g.font = `500 22px ${MONO}`;
      g.fillText(snip.title, 110, 33);
      g.font = `500 26px ${MONO}`;
      snip.lines.forEach((line, k) => {
        g.fillStyle = line.startsWith("✓") ? "#a3ff4f" : line.startsWith("$") ? "#38e1ff" : k % 3 === 0 ? "#e6f6ff" : "#c4b5fd";
        g.fillText(line, 30, 96 + k * 46);
      });
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    const side = i % 2 === 0 ? -1 : 1;
    const z = -10 - i * 6.6;
    mesh.position.set(side * (4.2 + rand() * 1.2), 2.4 + rand() * 1.2, z);
    mesh.rotation.y = side * -0.55;
    panels.push({ mesh, baseY: mesh.position.y, phase: rand() * 6 });
    scene.add(mesh);
  });

  /* ---------------- Skill cubes: collected as the student passes ---------------- */
  const cubeGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const edgeGeo = new THREE.EdgesGeometry(cubeGeo);
  const cubes: { group: T.Group; home: T.Vector3; z: number; index: number }[] = [];
  SKILLS.forEach((label, i) => {
    const tex = canvasTexture(THREE, 256, 256, (g) => {
      g.fillStyle = "#081226";
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = i % 2 ? "#8b5cf6" : "#38e1ff";
      g.lineWidth = 10;
      g.strokeRect(5, 5, 246, 246);
      g.fillStyle = "#e6f6ff";
      g.font = `700 ${label.length > 2 ? 84 : 110}px ${MONO}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(label, 128, 136);
    });
    const group = new THREE.Group();
    group.add(new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
    group.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: i % 2 ? C.violet : C.gridMajor, toneMapped: false })));
    const z = -12 - i * 4.8;
    const home = new THREE.Vector3((i % 2 ? 1 : -1) * (1.7 + rand() * 0.6), 1.9 + rand() * 0.9, z);
    group.position.copy(home);
    cubes.push({ group, home, z, index: i });
    scene.add(group);
  });

  /* ---------------- Rising data streams ---------------- */
  const streamCount = small ? 260 : 600;
  const sPos = new Float32Array(streamCount * 3);
  const sSeed = new Float32Array(streamCount);
  for (let i = 0; i < streamCount; i++) {
    const side = rand() > 0.5 ? 1 : -1;
    sPos[i * 3] = side * (3 + rand() * 18);
    sPos[i * 3 + 1] = rand() * 14;
    sPos[i * 3 + 2] = 6 - rand() * 100;
    sSeed[i] = rand();
  }
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  streamGeo.setAttribute("aSeed", new THREE.BufferAttribute(sSeed, 1));
  const streamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uPixel; varying float vSeed; varying float vY;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.6 + aSeed * 1.4), 14.0);
        vSeed = aSeed; vY = p.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + aSeed * 3.0) * uPixel * (14.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vSeed; varying float vY;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        if (abs(c.x) > 0.18) discard;                 // thin vertical dashes
        float a = (1.0 - abs(c.y) * 2.0) * smoothstep(14.0, 9.0, vY) * smoothstep(0.0, 1.5, vY);
        vec3 col = vSeed > 0.7 ? vec3(0.55, 0.36, 0.96) : vec3(0.22, 0.88, 1.0);
        gl_FragColor = vec4(col * a, a);
      }`,
  });
  const streams = new THREE.Points(streamGeo, streamMat);
  streams.frustumCulled = false;
  scene.add(streams);

  /* ---------------- Scanner gate (Assess) ---------------- */
  const gate = new THREE.Group();
  gate.position.z = GATE_Z;
  const gateColor = new THREE.Color(C.amber);
  const gateAmber = new THREE.Color(C.amber);
  const gateLime = new THREE.Color(C.lime);
  const gateMat = new THREE.MeshBasicMaterial({ color: gateColor, toneMapped: false });
  const pillarGeo = new THREE.BoxGeometry(0.25, 4.6, 0.25);
  [-1.7, 1.7].forEach((x) => {
    const pillar = new THREE.Mesh(pillarGeo, gateMat);
    pillar.position.set(x, 2.3, 0);
    gate.add(pillar);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.25, 0.25), gateMat);
  lintel.position.y = 4.6;
  gate.add(lintel);
  const scanMat = new THREE.MeshBasicMaterial({ color: gateColor, transparent: true, opacity: 0.35, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.08), scanMat);
  gate.add(scan);
  const gateLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.5),
    new THREE.MeshBasicMaterial({
      transparent: true,
      toneMapped: false,
      map: canvasTexture(THREE, 512, 108, (g) => {
        g.fillStyle = "#e6f6ff";
        g.font = `600 52px ${MONO}`;
        g.textAlign = "center";
        g.fillText("ASSESSMENT", 256, 72);
      }),
    }),
  );
  gateLabel.position.set(0, 5.15, 0);
  gate.add(gateLabel);
  scene.add(gate);

  /* ---------------- Podium, light beam & holographic certificate (Certify) ---------------- */
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.3, 0.5, 64), new THREE.MeshStandardMaterial({ color: "#0b1426", roughness: 0.4, metalness: 0.6 }));
  podium.position.set(0, 0.25, PODIUM_Z);
  const podiumRing = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.04, 8, 128), new THREE.MeshBasicMaterial({ color: C.lime, toneMapped: false }));
  podiumRing.rotation.x = Math.PI / 2;
  podiumRing.position.set(0, 0.52, PODIUM_Z);
  scene.add(podium, podiumRing);

  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uOn: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uOn; uniform float uTime;
      void main(){ float a = (1.0 - vUv.y) * 0.35 * uOn * (0.85 + 0.15 * sin(uTime * 4.0 + vUv.y * 20.0)); gl_FragColor = vec4(vec3(0.64, 1.0, 0.31) * a, a); }`,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 14, 48, 1, true), beamMat);
  beam.position.set(0, 7.5, PODIUM_Z);
  scene.add(beam);

  const certTex = canvasTexture(THREE, 1024, 680, (g) => {
    const grd = g.createLinearGradient(0, 0, 1024, 680);
    grd.addColorStop(0, "rgba(10, 24, 52, 0.92)");
    grd.addColorStop(1, "rgba(30, 16, 62, 0.92)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 680);
    g.strokeStyle = "#38e1ff";
    g.lineWidth = 6;
    g.strokeRect(14, 14, 996, 652);
    g.strokeStyle = "rgba(139, 92, 246, 0.8)";
    g.lineWidth = 2;
    g.strokeRect(34, 34, 956, 612);
    g.textAlign = "center";
    g.fillStyle = "#9fb3cc";
    g.font = `600 30px ${MONO}`;
    g.fillText("NATIONAL YOUTH TRAINING INSTITUTE", 512, 110);
    g.fillStyle = "#e6f6ff";
    g.font = `700 92px ${MONO}`;
    g.fillText("CERTIFIED", 512, 240);
    g.fillStyle = "#38e1ff";
    g.font = `500 40px ${MONO}`;
    g.fillText("Tech Skills Programme", 512, 310);
    // check badge
    g.beginPath();
    g.arc(512, 440, 78, 0, Math.PI * 2);
    g.fillStyle = "rgba(163, 255, 79, 0.15)";
    g.fill();
    g.strokeStyle = "#a3ff4f";
    g.lineWidth = 8;
    g.stroke();
    g.beginPath();
    g.moveTo(472, 442);
    g.lineTo(502, 472);
    g.lineTo(556, 408);
    g.lineWidth = 14;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.stroke();
    g.fillStyle = "#9fb3cc";
    g.font = `500 28px ${MONO}`;
    g.fillText("ID NYTI-2026-000123  ·  VERIFIED", 512, 600);
  });
  const cert = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.25), new THREE.MeshBasicMaterial({ map: certTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
  cert.position.set(0, 5, CERT_Z);
  scene.add(cert);

  // celebration sparkles orbiting the certificate
  const sparkCount = small ? 120 : 260;
  const spPos = new Float32Array(sparkCount * 3);
  const spSeed = new Float32Array(sparkCount);
  for (let i = 0; i < sparkCount; i++) {
    spSeed[i] = rand();
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  sparkGeo.setAttribute("aSeed", new THREE.BufferAttribute(spSeed, 1));
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uCenter: { value: new THREE.Vector3(0, 5.6, CERT_Z) }, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uOn; uniform vec3 uCenter; uniform float uPixel; varying float vSeed;
      void main(){
        float a = aSeed * 6.2831 + uTime * (0.3 + aSeed * 0.6);
        float r = 3.2 + aSeed * 3.0;
        vec3 p = uCenter + vec3(cos(a) * r * 1.2, sin(a * 1.3 + aSeed * 9.0) * 2.4, sin(a) * r * 0.6);
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (3.0 + aSeed * 5.0) * uOn * uPixel * (16.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vSeed;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float star = max(0.0, 1.0 - (abs(c.x) + abs(c.y)) * 2.6);   // 4-point twinkle
        vec3 col = vSeed > 0.66 ? vec3(0.64, 1.0, 0.31) : vSeed > 0.33 ? vec3(0.22, 0.88, 1.0) : vec3(0.75, 0.6, 1.0);
        gl_FragColor = vec4(col * star, star);
      }`,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);

  /* ---------------- The student ---------------- */
  const student = buildStudent(THREE, C.student);
  student.group.position.set(0, 0.06, START_Z);
  scene.add(student.group);

  /* ---------------- Scroll-driven story ---------------- */
  let progress = 0;
  let wide = width / height > 1.1;
  // Story timing (fraction of page scroll): arrive & certify before the dense content at the bottom
  const ARRIVE = 0.97;
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const readScroll = () => readStoryProgress(ARRIVE);

  return {
    camera,
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 68 : 55;
      wide = w / h > 1.1;
      camera.updateProjectionMatrix();
    },
    update: ({ t, dt, pointer }) => {
      progress += (readScroll() - progress) * 0.07;
      const p = progress;

      // Student walks the path, then steps onto the podium and raises an arm
      const z = START_Z + (PODIUM_Z - START_Z) * Math.min(1, p / ARRIVE);
      const arrived = smooth(ARRIVE - 0.04, ARRIVE, p);
      student.animate({ z, t, dt, cheer: arrived });
      student.group.position.y = 0.06 + arrived * 0.48;
      studentLight.position.set(0, 2.2, z + 1);

      // Camera: third-person follow. Wide screens frame the student right of centre
      // (clear of the headline); tall screens frame them low (below the hero text).
      // Near the end it pulls back so the certificate sits high in the view.
      const reveal = smooth(ARRIVE - 0.2, ARRIVE, p);
      const sideCam = wide ? -2.4 : 0.8;
      const sideLook = wide ? 2.4 : 0;
      const lookY = wide ? 1.5 : 3.4;
      camPos.set(sideCam * (1 - reveal) + 1.6 * reveal + pointer.x * 0.8, 2.5 + reveal * 1.2 + pointer.y * 0.3, z + 7.5 - reveal * 0.5);
      camera.position.lerp(camPos, 0.12);
      look.set(sideLook * (1 - reveal), lookY * (1 - reveal) + 4.2 * reveal, z - 8 - reveal * 0);
      camera.lookAt(look);

      // Portal shimmers and closes behind the student
      portalMat.uniforms.uTime.value = t;
      portalMat.uniforms.uOpen.value = 1 - smooth(0.06, 0.2, p) * 0.6;
      ring.rotation.z = t * 0.4;
      ring2.rotation.z = -t * 0.25;

      // Visited tiles light up
      tileZs.forEach((tz, i) => {
        // tiles behind the student stay lit; the next few glow faintly to guide the way
        const ahead = z - tz; // > 0 for tiles still in front of the student
        const visited = tz > z ? 1 : Math.max(0.12, 0.6 - ahead * 0.08);
        tileTmp.copy(tileOff).lerp(tileOn, visited * (0.75 + 0.25 * Math.sin(t * 3 - i * 0.4)));
        tiles.setColorAt(i, tileTmp);
      });
      if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;

      // Code panels float
      panels.forEach((pn) => (pn.mesh.position.y = pn.baseY + Math.sin(t * 0.8 + pn.phase) * 0.15));

      // Skill cubes: idle near the path, then fly in and orbit the student once passed
      const collected = cubes.filter((c) => z < c.z);
      cubes.forEach((c) => {
        const k = collected.indexOf(c);
        if (k >= 0) {
          const a = t * 1.4 + (k / Math.max(1, collected.length)) * Math.PI * 2;
          tmpV.set(Math.cos(a) * 0.95, 1.45 + Math.sin(a * 2) * 0.15, z + Math.sin(a) * 0.95);
          c.group.position.lerp(tmpV, 0.12);
          c.group.scale.setScalar(c.group.scale.x + (0.32 - c.group.scale.x) * 0.1);
        } else {
          tmpV.copy(c.home);
          tmpV.y += Math.sin(t * 1.2 + c.index) * 0.18;
          c.group.position.lerp(tmpV, 0.08);
          c.group.scale.setScalar(c.group.scale.x + (1 - c.group.scale.x) * 0.1);
        }
        c.group.rotation.x += dt * 0.6;
        c.group.rotation.y += dt * 0.9;
      });

      // Scanner gate: amber while ahead, green once the student passes
      const passed = smooth(GATE_Z + 0.5, GATE_Z - 1.5, z);
      gateColor.copy(gateAmber).lerp(gateLime, passed);
      gateMat.color.copy(gateColor);
      scanMat.color.copy(gateColor);
      scan.position.y = 0.3 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 4;

      // Certification
      const certify = smooth(ARRIVE - 0.07, ARRIVE, p);
      cert.scale.setScalar(0.001 + certify * 1.15);
      cert.position.y = 2 + certify * 3.6;
      cert.rotation.y = Math.sin(t * 0.6) * 0.08 * certify;
      beamMat.uniforms.uOn.value = certify;
      beamMat.uniforms.uTime.value = t;
      sparkMat.uniforms.uOn.value = certify;
      sparkMat.uniforms.uTime.value = t;
      podiumRing.scale.setScalar(1 + Math.sin(t * 3) * 0.015 * certify);

      floorMat.uniforms.uTime.value = t;
      floorMat.uniforms.uStudent.value.set(0, 0, z);
      streamMat.uniforms.uTime.value = t;
      (sky.material as T.ShaderMaterial).uniforms.uTime.value = t;
    },
  };
};

