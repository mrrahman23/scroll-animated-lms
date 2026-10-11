import type { SceneSetup } from "../useThreeScene";

/**
 * Aurora hero: a flowing particle wave (GPU-animated), a wireframe
 * "knowledge core" with orbiting learner nodes, and a far starfield.
 */
export const auroraScene: SceneSetup = ({ THREE, scene, width, height }) => {
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
  camera.position.set(0, 0.4, 10);

  const small = width < 640;

  // --- Particle wave ------------------------------------------------------
  const cols = small ? 90 : 170;
  const rows = small ? 50 : 90;
  const positions = new Float32Array(cols * rows * 3);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions[i++] = (c / (cols - 1) - 0.5) * 34;
      positions[i++] = 0;
      positions[i++] = (r / (rows - 1) - 0.5) * 18 - 4;
    }
  }
  const waveGeo = new THREE.BufferGeometry();
  waveGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const waveMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color("#22d3ee") },
      uB: { value: new THREE.Color("#7c6cff") },
      uC: { value: new THREE.Color("#f472b6") },
      uPixel: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPixel;
      varying float vMix; varying float vFade;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.32 + uTime * 0.7) * 0.55 + cos(p.z * 0.45 + uTime * 0.5) * 0.45
                + sin((p.x + p.z) * 0.18 + uTime * 0.35) * 0.6;
        p.y = w - 2.6;
        vMix = (p.x / 34.0) + 0.5;
        vFade = smoothstep(-13.0, -2.0, p.z) * (1.0 - smoothstep(3.0, 6.0, p.z));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.2 + w * 0.8) * uPixel * (9.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
      varying float vMix; varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(mix(uA, uB, smoothstep(0.0, 0.55, vMix)), uC, smoothstep(0.55, 1.0, vMix));
        gl_FragColor = vec4(col, a * 0.85 * vFade);
      }`,
  });
  const wave = new THREE.Points(waveGeo, waveMat);
  scene.add(wave);

  // --- Knowledge core ------------------------------------------------------
  const core = new THREE.Group();
  const ico = new THREE.IcosahedronGeometry(1.7, 1);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(ico),
    new THREE.LineBasicMaterial({ color: "#8b93ff", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }),
  );
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.62, 1),
    new THREE.MeshBasicMaterial({ color: "#4f3fd6", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const nodes = new THREE.Points(
    ico,
    new THREE.PointsMaterial({ color: "#67e8f9", size: 0.12, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.MeshBasicMaterial({ color: "#f0abfc", wireframe: true, transparent: true, opacity: 0.6 }),
  );
  core.add(shell, edges, nodes, inner);

  // Orbit rings + satellites ("learners")
  const rings: InstanceType<typeof THREE.Mesh>[] = [];
  const satellites: { mesh: InstanceType<typeof THREE.Mesh>; radius: number; speed: number; tilt: number; phase: number }[] = [];
  [
    { r: 2.6, color: "#22d3ee", tilt: 1.2 },
    { r: 3.1, color: "#f472b6", tilt: -0.6 },
  ].forEach((o, idx) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(o.r, 0.008, 8, 160),
      new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.x = Math.PI / 2 + o.tilt * 0.4;
    ring.rotation.y = o.tilt * 0.5;
    rings.push(ring);
    core.add(ring);
    for (let k = 0; k < 3; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: o.color }));
      satellites.push({ mesh: s, radius: o.r, speed: 0.35 + idx * 0.15 + k * 0.05, tilt: ring.rotation.x, phase: (k / 3) * Math.PI * 2 });
      core.add(s);
    }
  });
  scene.add(core);

  // --- Stars -------------------------------------------------------------
  const starCount = small ? 350 : 800;
  const starPos = new Float32Array(starCount * 3);
  for (let s = 0; s < starCount; s++) {
    starPos[s * 3] = (Math.random() - 0.5) * 80;
    starPos[s * 3 + 1] = Math.random() * 30 - 4;
    starPos[s * 3 + 2] = -20 - Math.random() * 40;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: "#c7d2fe", size: 0.08, transparent: true, opacity: 0.7, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const layout = (w: number, h: number) => {
    const aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // Desktop: the scene spans the hero, so the core sits right of the headline.
    // Smaller screens: the scene lives in its own slot, so centre it.
    if (w >= 1000) {
      core.position.set(Math.min(4.4, aspect * 2.2), 0.5, 0);
      core.scale.setScalar(1);
    } else {
      core.position.set(0, 0.6, 0);
      core.scale.setScalar(0.85);
    }
  };

  return {
    camera,
    resize: layout,
    update: ({ t, dt, pointer }) => {
      waveMat.uniforms.uTime.value = t;
      core.rotation.y += dt * 0.18;
      core.rotation.x = Math.sin(t * 0.3) * 0.15 + pointer.y * 0.25;
      inner.rotation.y -= dt * 0.6;
      inner.rotation.z += dt * 0.3;
      nodes.material.size = 0.11 + Math.sin(t * 2) * 0.02;
      satellites.forEach((s) => {
        const a = t * s.speed + s.phase;
        const v = new THREE.Vector3(Math.cos(a) * s.radius, 0, Math.sin(a) * s.radius);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), s.tilt - Math.PI / 2);
        s.mesh.position.copy(v);
      });
      rings.forEach((r, k) => (r.rotation.z += dt * (k ? -0.05 : 0.07)));
      starMat.opacity = 0.55 + Math.sin(t * 0.8) * 0.15;
      camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (0.4 + pointer.y * 0.4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
    },
  };
};
