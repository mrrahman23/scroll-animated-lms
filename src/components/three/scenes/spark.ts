import type { SceneSetup } from "../useThreeScene";

/**
 * Spark hero: glossy floating shapes around a 3D graduation cap.
 * Shapes drift with the pointer; clicking makes them pop.
 */
export const sparkScene: SceneSetup = async ({ THREE, scene, renderer, width, height }) => {
  const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.45;
  // Neutral tone mapping keeps the bright brand colours saturated (ACES washes them out)
  renderer.toneMapping = THREE.NeutralToneMapping;

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 0, 11);

  scene.add(new THREE.HemisphereLight("#ffffff", "#ffd6f0", 0.5));
  const key = new THREE.DirectionalLight("#ffffff", 1.1);
  key.position.set(4, 6, 6);
  scene.add(key);

  const glossy = (color: string) =>
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2 });

  const world = new THREE.Group();
  scene.add(world);

  // --- Graduation cap ------------------------------------------------------
  const cap = new THREE.Group();
  const ink = glossy("#2f1f66");
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.6), ink);
  board.rotation.y = Math.PI / 4;
  const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.7, 48, 1, true), ink);
  skull.position.y = -0.4;
  const skullBottom = new THREE.Mesh(new THREE.CircleGeometry(0.95, 48), ink);
  skullBottom.rotation.x = Math.PI / 2;
  skullBottom.position.y = -0.75;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 24), glossy("#ffb938"));
  button.position.y = 0.1;
  // Tassel pivots from the button so it can swing
  const tasselPivot = new THREE.Group();
  tasselPivot.position.set(0, 0.1, 0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), glossy("#ffb938"));
  cord.rotation.z = Math.PI / 2;
  cord.position.x = 0.65;
  const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), glossy("#ffb938"));
  drop.position.set(1.3, -0.45, 0);
  const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 16), glossy("#ffb938"));
  fringe.position.set(1.3, -1.0, 0);
  tasselPivot.add(cord, drop, fringe);
  tasselPivot.rotation.y = -Math.PI / 5;
  cap.add(board, skull, skullBottom, button, tasselPivot);
  cap.rotation.set(0.35, 0, -0.12);
  world.add(cap);

  // --- Floating shapes -------------------------------------------------------
  type Floater = { mesh: InstanceType<typeof THREE.Mesh>; base: InstanceType<typeof THREE.Vector3>; amp: number; speed: number; phase: number; spin: [number, number]; depth: number };
  const floaters: Floater[] = [];
  const add = (geo: ConstructorParameters<typeof THREE.Mesh>[0], color: string, pos: [number, number, number], scale = 1) => {
    const mesh = new THREE.Mesh(geo, glossy(color));
    mesh.scale.setScalar(scale);
    mesh.position.set(...pos);
    world.add(mesh);
    floaters.push({
      mesh,
      base: new THREE.Vector3(...pos),
      amp: 0.18 + Math.random() * 0.25,
      speed: 0.6 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      spin: [(Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8],
      depth: 0.3 + (pos[2] + 3) * 0.15,
    });
  };
  add(new THREE.TorusGeometry(0.55, 0.22, 32, 64), "#ff5fa2", [-3.1, 1.6, -0.5]);
  add(new THREE.SphereGeometry(0.5, 48, 48), "#ffb938", [2.9, 2.0, -1]);
  add(new THREE.CapsuleGeometry(0.28, 0.6, 12, 24), "#3ddc97", [-2.6, -1.8, 0.5]);
  add(new THREE.ConeGeometry(0.45, 0.9, 40), "#7a35f0", [3.0, -1.6, 0.2]);
  add(new THREE.BoxGeometry(0.7, 0.7, 0.7), "#5b8cff", [-0.4, 2.7, -2]);
  add(new THREE.TorusKnotGeometry(0.32, 0.11, 120, 16), "#7a35f0", [0.6, -2.7, -1]);
  add(new THREE.OctahedronGeometry(0.42), "#ff8a3d", [-3.2, -0.3, -2]);
  add(new THREE.SphereGeometry(0.22, 32, 32), "#ff5fa2", [1.9, 0.4, 1.2]);

  // Pop on click
  let pop = 0;
  const onDown = () => (pop = 1);
  renderer.domElement.addEventListener("pointerdown", onDown);

  return {
    camera,
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Pull back on tall/narrow screens so every shape stays in frame;
      // on desktop the scene spans the hero, so shift it right of the headline
      camera.position.z = w / h < 1 ? 15 : 12;
      world.position.x = w >= 1000 ? Math.min(4, (w / h) * 1.9) : 0;
    },
    update: ({ t, dt, pointer }) => {
      pop = Math.max(0, pop - dt * 2.5);
      const popScale = 1 + Math.sin(pop * Math.PI) * 0.25;
      world.rotation.y += (pointer.x * 0.35 - world.rotation.y) * 0.05;
      world.rotation.x += (-pointer.y * 0.2 - world.rotation.x) * 0.05;
      cap.position.y = Math.sin(t * 0.9) * 0.15;
      cap.rotation.y = Math.sin(t * 0.4) * 0.35;
      tasselPivot.rotation.z = Math.sin(t * 1.6) * 0.12 - pointer.x * 0.1;
      floaters.forEach((f) => {
        f.mesh.position.set(
          f.base.x + pointer.x * f.depth * 0.6,
          f.base.y + Math.sin(t * f.speed + f.phase) * f.amp + pointer.y * f.depth * 0.4,
          f.base.z,
        );
        f.mesh.rotation.x += dt * f.spin[0];
        f.mesh.rotation.y += dt * f.spin[1];
        f.mesh.scale.setScalar(popScale);
      });
    },
    dispose: () => {
      renderer.domElement.removeEventListener("pointerdown", onDown);
      envTex.dispose();
      pmrem.dispose();
    },
  };
};
