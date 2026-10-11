import type { SceneSetup } from "../useThreeScene";

export const VERIFIED_EVENT = "nyti:verified";

/**
 * Certificate medal: coin with an embossed check mark and ribbons.
 * Spins in celebration when a certificate verifies as valid.
 */
type MetalSpec = { color: string; roughness: number; clearcoat?: number; iridescence?: number };
interface MedalFinish {
  env: number;
  rimLight: string;
  metal: MetalSpec;
  face: MetalSpec & { metalness: number };
  check: { color: string; emissive: string; emissiveIntensity: number };
  ribbons: [string, string];
}

/** Medal finish per theme. */
const FINISHES = {
  aurora: {
    env: 1,
    rimLight: "#22d3ee",
    metal: { color: "#c4b5fd", roughness: 0.18, iridescence: 1 },
    face: { color: "#1b1f52", metalness: 0.6, roughness: 0.35, iridescence: 0.6 },
    check: { color: "#67e8f9", emissive: "#22d3ee", emissiveIntensity: 0.6 },
    ribbons: ["#7c6cff", "#22d3ee"],
  },
  spark: {
    env: 0.7,
    rimLight: "#ff5fa2",
    metal: { color: "#ffc53d", roughness: 0.22, clearcoat: 0.6 },
    face: { color: "#7a35f0", metalness: 0.2, roughness: 0.3, clearcoat: 1 },
    check: { color: "#ffffff", emissive: "#000000", emissiveIntensity: 0 },
    ribbons: ["#ff5fa2", "#3ddc97"],
  },
  ember: {
    env: 0.55,
    rimLight: "#ff6b3d",
    metal: { color: "#e0a060", roughness: 0.28, clearcoat: 0.3 },
    face: { color: "#4a0f0a", metalness: 0.4, roughness: 0.45, clearcoat: 0.6 },
    check: { color: "#ffd29a", emissive: "#ff7a3d", emissiveIntensity: 0.45 },
    ribbons: ["#b3261a", "#1c1c20"],
  },
  lunar: {
    env: 0.8,
    rimLight: "#8fb6ff",
    metal: { color: "#dfe6f2", roughness: 0.16, clearcoat: 0.8 },
    face: { color: "#0f1a33", metalness: 0.5, roughness: 0.35, clearcoat: 0.8 },
    check: { color: "#dcebff", emissive: "#7fb2ff", emissiveIntensity: 0.5 },
    ribbons: ["#3b5a8c", "#c9d6ea"],
  },
  quest: {
    env: 0.9,
    rimLight: "#38e1ff",
    metal: { color: "#cfd8e6", roughness: 0.12, clearcoat: 1 },
    face: { color: "#0a1430", metalness: 0.5, roughness: 0.3, clearcoat: 1 },
    check: { color: "#a3ff4f", emissive: "#a3ff4f", emissiveIntensity: 0.7 },
    ribbons: ["#38e1ff", "#8b5cf6"],
  },
  lab: {
    env: 0.9,
    rimLight: "#14d3c8",
    metal: { color: "#e2e8f0", roughness: 0.2, clearcoat: 0.8 },
    face: { color: "#1f2a37", metalness: 0.4, roughness: 0.35, clearcoat: 0.8 },
    check: { color: "#14d3c8", emissive: "#0ea5a4", emissiveIntensity: 0.5 },
    ribbons: ["#0ea5a4", "#ff7a1a"],
  },
} satisfies Record<string, MedalFinish>;

export type MedalVariant = keyof typeof FINISHES;

export function medalScene(variant: MedalVariant): SceneSetup {
  const f: MedalFinish = FINISHES[variant];
  return async ({ THREE, scene, renderer, width, height, on }) => {
    const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = f.env;
    renderer.toneMapping = THREE.NeutralToneMapping;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.set(0, 0, 7.5);
    scene.add(new THREE.AmbientLight("#ffffff", 0.4));
    const rim = new THREE.PointLight(f.rimLight, 30, 20);
    rim.position.set(-3, 2, 3);
    scene.add(rim);

    const iridescent = (m: MetalSpec) => (m.iridescence ? { iridescence: m.iridescence, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 800] as [number, number] } : {});
    const metal = new THREE.MeshPhysicalMaterial({ color: f.metal.color, metalness: 1, roughness: f.metal.roughness, clearcoat: f.metal.clearcoat ?? 0, ...iridescent(f.metal) });
    const faceMat = new THREE.MeshPhysicalMaterial({ color: f.face.color, metalness: f.face.metalness, roughness: f.face.roughness, clearcoat: f.face.clearcoat ?? 0, ...iridescent(f.face) });
    const checkMat = new THREE.MeshPhysicalMaterial({ ...f.check, roughness: 0.2, clearcoat: 1 });

    const medal = new THREE.Group();
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.2, 72), faceMat);
    coin.rotation.x = Math.PI / 2;
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.1, 24, 96), metal);
    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 16, 96), metal);
    innerRim.position.z = 0.11;

    // Embossed check mark (both faces)
    const check = new THREE.Shape([
      new THREE.Vector2(-0.58, 0.02),
      new THREE.Vector2(-0.38, -0.18),
      new THREE.Vector2(-0.14, -0.42),
      new THREE.Vector2(0.6, 0.36),
      new THREE.Vector2(0.42, 0.54),
      new THREE.Vector2(-0.14, -0.06),
      new THREE.Vector2(-0.4, 0.2),
    ]);
    const checkGeo = new THREE.ExtrudeGeometry(check, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3 });
    const front = new THREE.Mesh(checkGeo, checkMat);
    front.position.z = 0.1;
    const back = new THREE.Mesh(checkGeo, checkMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.1;

    medal.add(coin, rimMesh, innerRim, front, back);

    // Ribbons
    const ribbonColors = f.ribbons;
    const ribbons = new THREE.Group();
    ribbonColors.forEach((c, k) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 0.04), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, clearcoat: 0.4, side: THREE.DoubleSide }));
      r.position.set(k ? 0.32 : -0.32, -1.55, -0.12);
      r.rotation.z = k ? -0.28 : 0.28;
      ribbons.add(r);
    });

    const root = new THREE.Group();
    root.add(ribbons, medal);
    scene.add(root);

    let spinAngle = 0;
    let spinTarget = 0;
    let swing = 0;
    let burst = 0;
    on(VERIFIED_EVENT, (e) => {
      if ((e as CustomEvent<{ status?: string }>).detail?.status === "valid") {
        spinTarget += Math.PI * 4;
        burst = 1;
      }
    });

    return {
      camera,
      resize: (w, h) => {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      },
      update: ({ t, dt, pointer }) => {
        spinAngle += (spinTarget - spinAngle) * Math.min(1, dt * 2.5);
        swing += (Math.sin(t * 0.8) * 0.5 + pointer.x * 0.6 - swing) * 0.05;
        burst = Math.max(0, burst - dt * 1.2);
        medal.rotation.y = swing + spinAngle;
        medal.rotation.x = -pointer.y * 0.25;
        root.position.y = Math.sin(t * 1.2) * 0.1 + 0.35;
        root.scale.setScalar(1 + Math.sin(burst * Math.PI) * 0.12);
        rim.intensity = 30 + Math.sin(t * 2) * 8 + burst * 60;
      },
      dispose: () => {
        envTex.dispose();
        pmrem.dispose();
      },
    };
  };
}
