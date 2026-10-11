import type * as T from "three";
import type { SceneSetup } from "../useThreeScene";
import { MONO, buildStudent, canvasTexture, readStoryProgress, smooth } from "./shared";

/**
 * Lab: a student's day in a bright NYTI tech lab, driven by scroll.
 *   Enter   — glass doors slide open under the "NYTI TECH LAB" sign
 *   Learn   — four workstations; each lesson's progress fills as the student passes (✓ when done)
 *   Test    — an assessment screen ticks answers, counts the score and stamps PASSED
 *   Certify — the wall display reveals the certificate; the student celebrates
 * Everything is procedural (primitives, canvas textures, small shaders).
 */

const C = {
  bg: "#e8eef5",
  wall: "#eef2f7",
  wallPanel: "#e2e8f0",
  floor: "#dbe3ec",
  ceiling: "#f5f7fa",
  graphite: "#1f2a37",
  desk: "#f8fafc",
  teal: "#0ea5a4",
  tealBright: "#14d3c8",
  orange: "#ff7a1a",
  glass: "#bfe9ff",
  green: "#22c55e",
  student: { jacket: "#1f3b63", trim: "#14d3c8", pants: "#273244", head: "#f2f5f9", visor: "#0ea5a4", shoes: "#111827", pack: "#ff7a1a" },
};

// Story beats along the path (z positions)
const START_Z = 4;
const DOOR_Z = 0;
const END_Z = -70;
const TEST_FROM = -50;
const TEST_TO = -58;
const WALL_Z = -78;
const ARRIVE = 0.97;

const LESSONS = [
  { title: "Lesson 1 · Python basics", code: ["name = 'Reja'", "skills = ['python']", "print(f'Hi {name}!')"], z: -10, side: -1 },
  { title: "Lesson 2 · Web development", code: ["<nav>…</nav>", "fetch('/api/courses')", "  .then(render)"], z: -18, side: 1 },
  { title: "Lesson 3 · Data & SQL", code: ["SELECT course, AVG(score)", "FROM results", "GROUP BY course;"], z: -26, side: -1 },
  { title: "Lesson 4 · Intro to AI", code: ["model.fit(X, y)", "pred = model.predict(x)", "# accuracy 0.94"], z: -34, side: 1 },
];
const QUESTIONS = ["Variables & types", "HTTP & APIs", "SQL joins", "Version control", "Model evaluation"];

export const labScene: SceneSetup = ({ THREE, scene, renderer, width, height }) => {
  const small = width < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const bg = new THREE.Color(C.bg);
  scene.background = bg;
  scene.fog = new THREE.FogExp2(bg, 0.016);

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 300);

  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const std = (color: string, extra: Partial<T.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra });
  const glow = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const box = (w: number, h: number, d: number, m: T.Material, x: number, y: number, z: number, parent: T.Object3D = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  /* ---------------- Lighting ---------------- */
  scene.add(new THREE.HemisphereLight("#ffffff", "#b8c4d2", 1.6));
  const key = new THREE.DirectionalLight("#ffffff", 1.2);
  key.position.set(5, 10, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#d6f5ff", 0.5);
  fill.position.set(-6, 4, -20);
  scene.add(fill);

  /* ---------------- Room: floor, walls, ceiling, LED strips ---------------- */
  const floorTex = canvasTexture(THREE, 256, 256, (g) => {
    g.fillStyle = C.floor;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "rgba(31, 42, 55, 0.08)";
    g.lineWidth = 2;
    g.strokeRect(0, 0, 256, 256);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(8, 50);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 100), std(C.floor, { map: floorTex, roughness: 0.35, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -36;
  scene.add(floor);

  const wallMat = std(C.wall, { roughness: 0.9 });
  [-8, 8].forEach((x) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(100, 7), wallMat);
    wall.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    wall.position.set(x, 3.5, -36);
    scene.add(wall);
    // vertical acoustic panels
    for (let z = -2; z > -78; z -= 4) box(0.08, 4.2, 1.6, std(C.wallPanel, { roughness: 0.95 }), x + (x < 0 ? 0.05 : -0.05), 3.1, z);
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 100), std(C.ceiling, { roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 7, -36);
  scene.add(ceiling);
  const ledMat = glow("#ffffff");
  [-3, 3].forEach((x) => box(0.25, 0.06, 92, ledMat, x, 6.95, -36));
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), std(C.wall, { roughness: 0.9 }));
  backWall.position.set(0, 3.5, WALL_Z - 0.1);
  scene.add(backWall);

  /* ---------------- Floor progress line (fills behind the student) ---------------- */
  const lineMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uZ: { value: START_Z }, uTime: { value: 0 }, uOn: { value: new THREE.Color(C.tealBright) }, uOff: { value: new THREE.Color("#c3ced9") } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uZ; uniform float uTime; uniform vec3 uOn; uniform vec3 uOff; varying vec3 vW;
      void main(){
        float lit = step(uZ, vW.z);                       // behind the student
        float pulse = 0.85 + 0.15 * sin(vW.z * 1.5 + uTime * 6.0);
        vec3 col = mix(uOff, uOn * pulse * 1.4, lit);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.16, START_Z - END_Z + 2), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.012, (START_Z + END_Z) / 2);
  scene.add(line);

  /* ---------------- Entrance: glass doors + sign ---------------- */
  const glassMat = new THREE.MeshPhysicalMaterial({ color: C.glass, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0, transmission: 0 });
  const frameMat = std(C.graphite, { roughness: 0.4, metalness: 0.5 });
  box(0.2, 4.6, 0.25, frameMat, -3.6, 2.3, DOOR_Z);
  box(0.2, 4.6, 0.25, frameMat, 3.6, 2.3, DOOR_Z);
  box(7.4, 0.3, 0.3, frameMat, 0, 4.6, DOOR_Z);
  // walls either side of the entrance
  box(4.4, 7, 0.2, wallMat, -5.8, 3.5, DOOR_Z - 0.05);
  box(4.4, 7, 0.2, wallMat, 5.8, 3.5, DOOR_Z - 0.05);
  box(7.2, 2.4, 0.2, wallMat, 0, 5.95, DOOR_Z - 0.05);
  const doorL = box(1.75, 4.3, 0.05, glassMat, -0.9, 2.2, DOOR_Z);
  const doorR = box(1.75, 4.3, 0.05, glassMat, 0.9, 2.2, DOOR_Z);
  [doorL, doorR].forEach((d) => box(0.06, 1.2, 0.08, frameMat, d.position.x > 0 ? -0.75 : 0.75, 0, 0.05, d));
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 0.8),
    new THREE.MeshBasicMaterial({
      transparent: true,
      toneMapped: false,
      map: canvasTexture(THREE, 920, 160, (g) => {
        g.fillStyle = "#0f1722";
        g.beginPath();
        g.roundRect(4, 4, 912, 152, 24);
        g.fill();
        g.fillStyle = C.tealBright;
        g.font = `700 80px ${MONO}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("NYTI TECH LAB", 460, 84);
      }),
    }),
  );
  sign.position.set(0, 5.5, DOOR_Z + 0.08);
  scene.add(sign);

  /* ---------------- Workstations (Learn) ---------------- */
  type Station = { z: number; fill: T.Mesh; badge: T.Sprite; done: boolean };
  const stations: Station[] = [];
  const badgeTex = canvasTexture(THREE, 128, 128, (g) => {
    g.fillStyle = C.green;
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#ffffff";
    g.lineWidth = 14;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(36, 66);
    g.lineTo(56, 86);
    g.lineTo(94, 44);
    g.stroke();
  });
  LESSONS.forEach((lesson, i) => {
    const desk = new THREE.Group();
    desk.position.set(lesson.side * 3.2, 0, lesson.z);
    desk.rotation.y = lesson.side * -0.35;
    scene.add(desk);
    box(2.8, 0.08, 1.2, std(C.desk, { roughness: 0.3 }), 0, 1.0, 0, desk);
    [-1.25, 1.25].forEach((x) => box(0.08, 1.0, 1.0, frameMat, x, 0.5, 0, desk));
    box(0.9, 0.04, 0.3, std("#cbd5e1"), 0, 1.06, 0.25, desk); // keyboard
    box(0.1, 0.5, 0.1, frameMat, 0, 1.3, -0.35, desk); // monitor stand
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.1),
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: canvasTexture(THREE, 760, 440, (g) => {
          g.fillStyle = "#0f1722";
          g.fillRect(0, 0, 760, 440);
          g.fillStyle = "rgba(255,255,255,0.06)";
          g.fillRect(0, 0, 760, 56);
          g.fillStyle = "#e2f3ff";
          g.font = `600 30px ${MONO}`;
          g.fillText(lesson.title, 24, 38);
          g.font = `500 30px ${MONO}`;
          lesson.code.forEach((l, k) => {
            g.fillStyle = k === 0 ? "#7dd3fc" : k === 1 ? "#c4b5fd" : "#86efac";
            g.fillText(l, 24, 120 + k * 52);
          });
          g.fillStyle = "#9fb3c8";
          g.font = `500 22px ${MONO}`;
          g.fillText("PROGRESS", 24, 330);
        }),
      }),
    );
    screen.position.set(0, 1.85, -0.38);
    desk.add(screen);
    box(2.0, 1.2, 0.05, frameMat, 0, 1.85, -0.42, desk); // bezel
    // progress bar on screen (track + fill scaled from the left)
    const track = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.07), glow("#334155"));
    track.position.set(0, 1.5, -0.37);
    desk.add(track);
    const fillGeo = new THREE.PlaneGeometry(1.6, 0.07);
    fillGeo.translate(0.8, 0, 0);
    const fill = new THREE.Mesh(fillGeo, glow(C.tealBright));
    fill.position.set(-0.8, 1.5, -0.365);
    fill.scale.x = 0.001;
    desk.add(fill);
    // completion badge
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, transparent: true, toneMapped: false }));
    badge.position.set(lesson.side * 3.2, 3.0, lesson.z);
    badge.scale.setScalar(0.001);
    scene.add(badge);
    // chair
    box(0.6, 0.08, 0.6, std(i % 2 ? C.orange : C.teal), 0, 0.6, 0.85, desk);
    box(0.6, 0.7, 0.08, std(i % 2 ? C.orange : C.teal), 0, 0.95, 1.15, desk);
    stations.push({ z: lesson.z, fill, badge, done: false });
  });

  /* ---------------- Robot arm (robotics bench) ---------------- */
  const robot = new THREE.Group();
  robot.position.set(5.2, 0, -14);
  scene.add(robot);
  box(1.8, 1.0, 1.4, std(C.desk), 0, 0.5, 0, robot);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.3, 24), std(C.graphite, { metalness: 0.6, roughness: 0.3 }));
  base.position.y = 1.15;
  robot.add(base);
  const yaw = new THREE.Group();
  yaw.position.y = 1.3;
  robot.add(yaw);
  const shoulder = new THREE.Group();
  yaw.add(shoulder);
  box(0.18, 0.9, 0.18, std(C.orange, { metalness: 0.2, roughness: 0.35 }), 0, 0.45, 0, shoulder);
  const elbow = new THREE.Group();
  elbow.position.y = 0.9;
  shoulder.add(elbow);
  box(0.14, 0.7, 0.14, std(C.orange, { metalness: 0.2, roughness: 0.35 }), 0, 0.35, 0, elbow);
  const gripper = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), std(C.graphite, { metalness: 0.6 }));
  gripper.position.y = 0.75;
  elbow.add(gripper);
  const parcel = box(0.3, 0.3, 0.3, std(C.teal), 0.55, 1.15, 0.2, robot);

  /* ---------------- Holographic table ---------------- */
  const holo = new THREE.Group();
  holo.position.set(-5.2, 0, -22);
  scene.add(holo);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.0, 32), std(C.graphite, { metalness: 0.5, roughness: 0.3 }));
  pedestal.position.y = 0.5;
  holo.add(pedestal);
  const holoRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.03, 8, 64), glow(C.tealBright));
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.y = 1.02;
  holo.add(holoRing);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 1.8, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: C.tealBright, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
  );
  cone.rotation.x = Math.PI;
  cone.position.y = 1.95;
  holo.add(cone);
  const model = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshBasicMaterial({ color: C.teal, wireframe: true, toneMapped: false }));
  model.position.y = 2.4;
  holo.add(model);

  /* ---------------- Server racks (blinking LEDs) ---------------- */
  const ledPositions: T.Vector3[] = [];
  [-1, 1].forEach((side) =>
    [-41, -44].forEach((z) => {
      box(1.2, 3.2, 1.0, std(C.graphite, { roughness: 0.4, metalness: 0.4 }), side * 6.6, 1.6, z);
      for (let r = 0; r < 10; r++) for (let c = 0; c < 4; c++) ledPositions.push(new THREE.Vector3(side * 6.6 - side * 0.52, 0.5 + r * 0.26, z - 0.3 + c * 0.2));
    }),
  );
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.05, 0.08), new THREE.MeshBasicMaterial({ toneMapped: false }), ledPositions.length);
  const m4 = new THREE.Matrix4();
  const ledColors = [new THREE.Color(C.tealBright), new THREE.Color(C.green), new THREE.Color(C.orange), new THREE.Color("#334155")];
  ledPositions.forEach((pos, i) => {
    m4.makeTranslation(pos.x, pos.y, pos.z);
    leds.setMatrixAt(i, m4);
    leds.setColorAt(i, ledColors[i % 4]);
  });
  scene.add(leds);
  let ledTimer = 0;

  /* ---------------- Assessment screen (Test) ---------------- */
  const testCanvas = document.createElement("canvas");
  testCanvas.width = 1024;
  testCanvas.height = 600;
  const tg = testCanvas.getContext("2d")!;
  const testTex = new THREE.CanvasTexture(testCanvas);
  testTex.colorSpace = THREE.SRGBColorSpace;
  let lastTestStep = -1;
  const drawTest = (step: number, score: number) => {
    tg.fillStyle = "#0f1722";
    tg.fillRect(0, 0, 1024, 600);
    tg.fillStyle = "rgba(20, 211, 200, 0.12)";
    tg.fillRect(0, 0, 1024, 76);
    tg.fillStyle = "#e2f3ff";
    tg.font = `700 38px ${MONO}`;
    tg.fillText("NYTI ASSESSMENT", 32, 50);
    tg.fillStyle = "#9fb3c8";
    tg.font = `500 28px ${MONO}`;
    tg.textAlign = "right";
    tg.fillText(`SCORE ${String(score).padStart(3, " ")}%`, 992, 50);
    tg.textAlign = "left";
    QUESTIONS.forEach((q, k) => {
      const y = 140 + k * 70;
      const answered = k < step;
      tg.fillStyle = answered ? C.green : "#334155";
      tg.beginPath();
      tg.arc(52, y - 10, 18, 0, Math.PI * 2);
      tg.fill();
      if (answered) {
        tg.strokeStyle = "#ffffff";
        tg.lineWidth = 5;
        tg.beginPath();
        tg.moveTo(43, y - 10);
        tg.lineTo(50, y - 3);
        tg.lineTo(62, y - 18);
        tg.stroke();
      }
      tg.fillStyle = answered ? "#e2f3ff" : "#64748b";
      tg.font = `500 32px ${MONO}`;
      tg.fillText(`Q${k + 1}  ${q}`, 92, y);
    });
    if (step > QUESTIONS.length) {
      tg.save();
      tg.translate(800, 420);
      tg.rotate(-0.18);
      tg.strokeStyle = C.green;
      tg.lineWidth = 8;
      tg.strokeRect(-150, -52, 300, 104);
      tg.fillStyle = C.green;
      tg.font = `800 64px ${MONO}`;
      tg.textAlign = "center";
      tg.textBaseline = "middle";
      tg.fillText("PASSED", 0, 4);
      tg.restore();
    }
    testTex.needsUpdate = true;
  };
  drawTest(0, 0);
  const testScreen = new THREE.Group();
  // placed ahead of the test zone so the PASSED stamp is still in view when the score completes
  testScreen.position.set(-3.4, 2.7, TEST_TO - 5);
  testScreen.rotation.y = 0.55;
  scene.add(testScreen);
  box(4.3, 2.6, 0.12, frameMat, 0, 0, -0.08, testScreen);
  const testPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.4), new THREE.MeshBasicMaterial({ map: testTex, toneMapped: false }));
  testScreen.add(testPlane);
  box(0.12, 1.4, 0.12, frameMat, 0, -2.0, -0.1, testScreen);
  // exam terminal on the path side
  box(1.2, 1.0, 0.7, std(C.desk), 1.6, 0.5, TEST_TO + 1);
  const testLamp = box(1.0, 0.04, 0.5, glow(C.orange), 1.6, 1.02, TEST_TO + 1);
  const testLampColor = new THREE.Color();

  /* ---------------- Certification wall ---------------- */
  const certTex = canvasTexture(THREE, 1200, 760, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 1200, 760);
    g.strokeStyle = C.teal;
    g.lineWidth = 10;
    g.strokeRect(24, 24, 1152, 712);
    g.strokeStyle = "rgba(14,165,164,0.35)";
    g.lineWidth = 3;
    g.strokeRect(48, 48, 1104, 664);
    g.textAlign = "center";
    g.fillStyle = "#475569";
    g.font = `600 34px ${MONO}`;
    g.fillText("NATIONAL YOUTH TRAINING INSTITUTE", 600, 140);
    g.fillStyle = "#0f1722";
    g.font = `800 96px ${MONO}`;
    g.fillText("CERTIFIED", 600, 270);
    g.fillStyle = C.teal;
    g.font = `600 44px ${MONO}`;
    g.fillText("Tech Skills Lab Programme", 600, 345);
    g.beginPath();
    g.arc(600, 500, 86, 0, Math.PI * 2);
    g.fillStyle = C.green;
    g.fill();
    g.strokeStyle = "#ffffff";
    g.lineWidth = 18;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(556, 502);
    g.lineTo(588, 534);
    g.lineTo(648, 466);
    g.stroke();
    g.fillStyle = "#64748b";
    g.font = `500 30px ${MONO}`;
    g.fillText("ID NYTI-2026-000123  ·  VERIFIED", 600, 680);
  });
  box(8.2, 5.0, 0.15, frameMat, 0, 3.5, WALL_Z - 0.02);
  const certMat = new THREE.MeshBasicMaterial({ map: certTex, toneMapped: false, transparent: true, opacity: 0 });
  const cert = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 4.6), certMat);
  cert.position.set(0, 3.5, WALL_Z + 0.07);
  scene.add(cert);
  const spot = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.35, 64), glow(C.tealBright));
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, 0.015, END_Z);
  scene.add(spot);

  // celebration sparkles in front of the wall
  const sparkCount = small ? 120 : 240;
  const spSeed = new Float32Array(sparkCount).map(() => rand());
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(sparkCount * 3), 3));
  sparkGeo.setAttribute("aSeed", new THREE.BufferAttribute(spSeed, 1));
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uCenter: { value: new THREE.Vector3(0, 3.6, WALL_Z + 1.5) }, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime; uniform float uOn; uniform vec3 uCenter; uniform float uPixel; varying float vSeed;
      float h(float n) { return fract(sin(n) * 43758.5453); }
      void main(){
        // independent random x / depth / speed / start per strip, so they scatter instead of lining up
        float fall = mod(uTime * (0.5 + h(aSeed * 13.1) * 0.8) + h(aSeed * 71.7) * 6.0, 6.0);
        vec3 p = uCenter + vec3((h(aSeed * 31.3) - 0.5) * 11.0 + sin(uTime * 1.3 + aSeed * 30.0) * 0.35, 3.0 - fall, (h(aSeed * 97.1) - 0.5) * 2.4);
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (4.0 + aSeed * 6.0) * uOn * uPixel * (14.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vSeed;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        if (abs(c.x) > 0.5 || abs(c.y) > 0.25) discard;   // little paper strips
        vec3 col = vSeed > 0.66 ? vec3(0.08, 0.83, 0.78) : vSeed > 0.33 ? vec3(1.0, 0.48, 0.1) : vec3(0.13, 0.77, 0.37);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);

  /* ---------------- The student ---------------- */
  const student = buildStudent(THREE, C.student);
  student.group.position.set(0, 0.02, START_Z);
  scene.add(student.group);

  /* ---------------- Scroll-driven story ---------------- */
  let progress = 0;
  let wide = width / height > 1.1;
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const ledWhite = new THREE.Color("#ffffff");
  const ledCelebrate = new THREE.Color(C.tealBright);

  return {
    camera,
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 68 : 55;
      wide = w / h > 1.1;
      camera.updateProjectionMatrix();
    },
    update: ({ t, dt, pointer }) => {
      progress += (readStoryProgress(ARRIVE) - progress) * 0.07;
      const p = progress;
      const z = START_Z + (END_Z - START_Z) * Math.min(1, p / ARRIVE);

      // Doors slide open as the student approaches
      const open = smooth(START_Z - 0.3, DOOR_Z + 1.5, z);
      doorL.position.x = -0.9 - open * 1.7;
      doorR.position.x = 0.9 + open * 1.7;

      // Lessons: progress fills as the student passes each desk; ✓ pops when complete
      let typing = 0;
      stations.forEach((s) => {
        const c = smooth(s.z + 3, s.z - 3, z);
        s.fill.scale.x = Math.max(0.001, c);
        const target = c >= 0.999 ? 0.55 + Math.sin(t * 3) * 0.03 : 0.001;
        s.badge.scale.setScalar(s.badge.scale.x + (target - s.badge.scale.x) * 0.15);
        typing = Math.max(typing, 1 - Math.min(1, Math.abs(z - s.z) / 2.5));
      });

      // Test: answers tick, score counts up, then PASSED
      const tp = smooth(TEST_FROM, TEST_TO, z);
      const step = Math.min(QUESTIONS.length + 1, Math.floor(tp * (QUESTIONS.length + 1.01)));
      if (step !== lastTestStep) {
        lastTestStep = step;
        drawTest(step, Math.round((Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 92));
      }
      testLampColor.set(C.orange).lerp(ledCelebrate, tp >= 0.999 ? 1 : 0);
      (testLamp.material as T.MeshBasicMaterial).color.copy(testLampColor);
      typing = Math.max(typing, 1 - Math.min(1, Math.abs(z - (TEST_TO + 1)) / 2.5));

      // Certification
      const certify = smooth(ARRIVE - 0.07, ARRIVE, p);
      const cheer = smooth(ARRIVE - 0.04, ARRIVE, p);
      certMat.opacity = certify;
      cert.scale.setScalar(0.85 + certify * 0.15);
      sparkMat.uniforms.uOn.value = certify;
      sparkMat.uniforms.uTime.value = t;
      spot.scale.setScalar(1 + Math.sin(t * 3) * 0.05 * certify);
      ledMat.color.copy(ledWhite).lerp(ledCelebrate, certify * (0.5 + 0.5 * Math.sin(t * 4)));

      student.animate({ z, t, dt, cheer, typing: typing * (1 - cheer) });

      // Ambient motion
      yaw.rotation.y = Math.sin(t * 0.7) * 1.1;
      shoulder.rotation.z = -0.5 + Math.sin(t * 1.3) * 0.35;
      elbow.rotation.z = 0.9 + Math.sin(t * 1.3 + 1) * 0.4;
      parcel.rotation.y = t * 0.5;
      model.rotation.y = t * 0.6;
      model.rotation.x = t * 0.25;
      holoRing.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
      ledTimer += dt;
      if (ledTimer > 0.12) {
        ledTimer = 0;
        for (let k = 0; k < 6; k++) leds.setColorAt(Math.floor(rand() * ledPositions.length), ledColors[Math.floor(rand() * ledColors.length)]);
        if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
      }
      lineMat.uniforms.uZ.value = z;
      lineMat.uniforms.uTime.value = t;

      // Camera: third-person follow (student right of the headline on wide screens),
      // pulling back at the end to frame the certificate wall above the student.
      const reveal = smooth(ARRIVE - 0.2, ARRIVE, p);
      const sideCam = wide ? -2.2 : 0.6;
      const sideLook = wide ? 2.2 : 0;
      const lookY = wide ? 1.7 : 3.3;
      camPos.set(sideCam * (1 - reveal) + 1.2 * reveal + pointer.x * 0.6, 2.7 + reveal * 0.6 + pointer.y * 0.25, z + 7.5 + reveal * 1.5);
      camera.position.lerp(camPos, 0.12);
      look.set(sideLook * (1 - reveal), lookY * (1 - reveal) + 3.3 * reveal, z - 8);
      camera.lookAt(look);
    },
  };
};
