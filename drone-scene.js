import * as THREE from "./vendor/three/build/three.module.js";

const stage = document.querySelector("#drone-scene");
const canvas = document.querySelector("#drone-canvas");

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

// Materials
const whiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0f4f9,
  metalness: 0.65,
  roughness: 0.25,
});

const lightMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x8ba0b5,
  metalness: 0.88,
  roughness: 0.22,
});

const carbonMaterial = new THREE.MeshStandardMaterial({
  color: 0x141d28,
  metalness: 0.75,
  roughness: 0.35,
});

const deepMaterial = new THREE.MeshStandardMaterial({
  color: 0x09111c,
  metalness: 0.45,
  roughness: 0.25,
});

const lensMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.2,
  roughness: 0.05,
  transmission: 0.9,
  thickness: 0.4,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
});

let currentAccentHex = 0x00f0ff;
const accentMaterials = [];

let renderer, scene, camera, drone, gimbal;
let cursorSpotlight, cursorLight, droneGlow;
let softBeamGroup, softBeamPlane, softBeamCross;
let starfield, dustMotesMesh, dustMoteData = [];
const rotorBlades = [];

// Pointer & Scroll Tracking
let pointerX = window.innerWidth * 0.75;
let pointerY = window.innerHeight * 0.3;

let currentScrollProgress = 0;
let targetScrollProgress = 0;

const droneState = {
  x: 2.3,
  y: 0.35,
  z: 0.0,
  pitch: 0.04,
  yaw: -0.22,
  roll: 0.0,
  gimbalPitch: 0,
  gimbalYaw: 0,
  rotorRpm: 4600,
  altitude: 22.0,
};

let disposed = false;

// DOM Section Elements for Accurate Real-Time Flight Zone Tracking
const stackEl = document.querySelector("#stack");
const workEl = document.querySelector("#work");
const projectRows = document.querySelectorAll(".project-split-row");
const heroDroneStage = document.querySelector(".hero-drone-stage");
const ringEl = document.querySelector(".flight-grid-ring");

// ============================================================================
// 1. Minimal Universe Stars Background (3D Cosmic Starfield)
// ============================================================================
function buildUniverseStarfield() {
  const starCount = 420;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 2] = -12 - Math.random() * 45; // Deep cosmic background
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Soft circular star alpha map
  const sCanvas = document.createElement("canvas");
  sCanvas.width = 32;
  sCanvas.height = 32;
  const sCtx = sCanvas.getContext("2d");
  const sGrad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  sGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  sGrad.addColorStop(0.35, "rgba(200, 230, 255, 0.75)");
  sGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 32, 32);

  const starTexture = new THREE.CanvasTexture(sCanvas);
  const starMat = new THREE.PointsMaterial({
    size: 0.32,
    map: starTexture,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);
}

// ============================================================================
// 2. Ultra-Soft Gaussian Volumetric Spotlight Beam
// ============================================================================
function createSoftGaussianBeamTexture() {
  const w = 512;
  const h = 256;
  const bCanvas = document.createElement("canvas");
  bCanvas.width = w;
  bCanvas.height = h;
  const ctx = bCanvas.getContext("2d");
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    const yNorm = y / (h - 1);
    // Smooth longitudinal envelope tapering naturally at cursor and drone
    const longitudinalEnvelope = Math.sin(yNorm * Math.PI) * Math.pow(1.0 - yNorm * 0.45, 0.5);
    for (let x = 0; x < w; x++) {
      const xNorm = (x / (w - 1) - 0.5) * 2;
      const widthScale = 0.38 + yNorm * 0.42;
      const normalizedDist = Math.abs(xNorm) / widthScale;
      // Exponential Gaussian falloff for ultra-soft, diffused beam edges
      const gaussian = Math.exp(-normalizedDist * normalizedDist * 3.8);
      const alpha = Math.min(Math.max(gaussian * longitudinalEnvelope, 0), 1);
      const idx = (y * w + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(bCanvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function buildCinematicSpotlightSystem() {
  // Physical SpotLight casting real light onto the drone
  cursorSpotlight = new THREE.SpotLight(0xffffff, 22, 55, Math.PI / 2.6, 1.0, 1.3);
  cursorSpotlight.castShadow = false;
  cursorSpotlight.target = drone;
  scene.add(cursorSpotlight);

  // Soft spherical ambient point light at the cursor
  cursorLight = new THREE.PointLight(0xffffff, 1.8, 6.5, 1.8);
  scene.add(cursorLight);

  // Soft Cinematic Gaussian Volumetric Beam System (diffused light with gradual falloff, no harsh edges)
  softBeamGroup = new THREE.Group();
  scene.add(softBeamGroup);

  const beamTexture = createSoftGaussianBeamTexture();

  // Dual billboard plane cross with smooth Gaussian falloff
  const beamGeo = new THREE.PlaneGeometry(1, 1, 16, 16);
  beamGeo.translate(0, 0.5, 0); // Origin at cursor
  beamGeo.rotateX(Math.PI / 2); // Point along +Z

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: beamTexture,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  softBeamPlane = new THREE.Mesh(beamGeo, beamMat);
  softBeamGroup.add(softBeamPlane);

  const crossMat = beamMat.clone();
  crossMat.opacity = 0.12;
  softBeamCross = new THREE.Mesh(beamGeo, crossMat);
  softBeamCross.rotation.z = Math.PI / 2; // Cross perpendicular plane
  softBeamGroup.add(softBeamCross);

  // Floating Dust Motes (Particles drifting through the soft beam volume)
  const moteCount = 36;
  const motePositions = new Float32Array(moteCount * 3);
  dustMoteData = [];

  for (let i = 0; i < moteCount; i++) {
    dustMoteData.push({
      t: Math.random(),
      lateralX: (Math.random() - 0.5) * 0.6,
      lateralY: (Math.random() - 0.5) * 0.6,
      speed: 0.0012 + Math.random() * 0.002,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));

  const mCanvas = document.createElement("canvas");
  mCanvas.width = 16;
  mCanvas.height = 16;
  const mCtx = mCanvas.getContext("2d");
  const mGrad = mCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
  mGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  mGrad.addColorStop(0.4, "rgba(220, 240, 255, 0.5)");
  mGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, 16, 16);

  const moteTex = new THREE.CanvasTexture(mCanvas);
  const moteMat = new THREE.PointsMaterial({
    size: 0.18,
    map: moteTex,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  dustMotesMesh = new THREE.Points(moteGeo, moteMat);
  scene.add(dustMotesMesh);
}

// ============================================================================
// 3. Drone 3D Assembly & Structure
// ============================================================================
function makeMesh(geometry, material, parent, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function makeCylinder(radiusTop, radiusBottom, height, material, parent, position, segments = 24) {
  return makeMesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    parent,
    position,
  );
}

function makeStrut(start, end, material, radius = 0.075) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(b, a);
  const mesh = makeMesh(
    new THREE.CylinderGeometry(radius * 0.76, radius, direction.length(), 10),
    material,
    drone,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function buildRotor(x, z, direction) {
  makeStrut([x * 0.3, 0.02, z * 0.3], [x * 0.89, 0.055, z * 0.89], carbonMaterial, 0.092);
  makeStrut([x * 0.34, 0.089, z * 0.34], [x * 0.84, 0.105, z * 0.84], lightMetalMaterial, 0.023);

  const rotor = new THREE.Group();
  rotor.position.set(x, 0.13, z);
  drone.add(rotor);

  makeCylinder(0.18, 0.16, 0.25, carbonMaterial, rotor, [0, -0.015, 0]);
  makeCylinder(0.145, 0.17, 0.065, lightMetalMaterial, rotor, [0, 0.12, 0]);
  makeCylinder(0.115, 0.125, 0.1, deepMaterial, rotor, [0, 0.2, 0]);

  const spinningBlades = new THREE.Group();
  spinningBlades.position.y = 0.29;
  rotor.add(spinningBlades);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0.11, -0.048);
  bladeShape.quadraticCurveTo(0.42, -0.09, 0.68, -0.04);
  bladeShape.quadraticCurveTo(0.75, 0.01, 0.66, 0.06);
  bladeShape.quadraticCurveTo(0.39, 0.08, 0.11, 0.048);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
  });

  const rotorAccent = new THREE.MeshStandardMaterial({
    color: currentAccentHex,
    roughness: 0.25,
    metalness: 0.5,
  });
  accentMaterials.push(rotorAccent);

  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle) => {
    const blade = new THREE.Mesh(bladeGeo, rotorAccent);
    blade.rotation.y = angle;
    blade.rotation.x = 0.08 * direction;
    spinningBlades.add(blade);
  });

  rotorBlades.push({ group: spinningBlades, direction });
}

function buildGimbal() {
  gimbal = new THREE.Group();
  gimbal.position.set(0, -0.19, 0.52);
  drone.add(gimbal);

  makeCylinder(0.095, 0.095, 0.09, lightMetalMaterial, gimbal, [0, 0.06, 0]);
  const ball = makeMesh(new THREE.SphereGeometry(0.165, 24, 20), deepMaterial, gimbal, [0, 0, 0]);
  ball.scale.set(1.05, 0.95, 1.25);

  makeCylinder(0.085, 0.085, 0.11, lightMetalMaterial, gimbal, [0, 0, 0.11], 20);
  const ring = makeMesh(new THREE.TorusGeometry(0.086, 0.016, 12, 28), whiteMaterial, gimbal, [0, 0, 0.16]);
  ring.rotation.x = Math.PI / 2;

  const glass = makeMesh(new THREE.CircleGeometry(0.076, 24), lensMaterial, gimbal, [0, 0, 0.175]);
  glass.rotation.y = Math.PI;

  const sensorDot = new THREE.MeshBasicMaterial({ color: 0xffffff });
  makeMesh(new THREE.CircleGeometry(0.026, 16), sensorDot, gimbal, [0, 0, 0.177]);
}

function buildDrone() {
  drone = new THREE.Group();
  scene.add(drone);

  // Central Avionics Core
  const fuselageGeo = new THREE.BoxGeometry(0.78, 0.24, 1.18);
  makeMesh(fuselageGeo, whiteMaterial, drone, [0, 0.02, 0]);

  const upperShell = makeMesh(new THREE.CylinderGeometry(0.31, 0.38, 0.15, 28), lightMetalMaterial, drone, [0, 0.15, -0.04]);
  upperShell.scale.set(1.18, 0.75, 1.35);

  const spine = makeMesh(new THREE.BoxGeometry(0.18, 0.075, 0.98), carbonMaterial, drone, [0, 0.19, -0.04]);
  spine.rotation.x = -0.02;

  // Undercarriage Landing Skids
  [-0.32, 0.32].forEach((x) => {
    makeStrut([x, -0.03, -0.32], [x, -0.29, -0.32], lightMetalMaterial, 0.028);
    makeStrut([x, -0.03, 0.32], [x, -0.29, 0.32], lightMetalMaterial, 0.028);
    const skid = makeMesh(new THREE.CylinderGeometry(0.024, 0.024, 0.95, 12), carbonMaterial, drone, [x, -0.29, 0]);
    skid.rotation.x = Math.PI / 2;
  });

  // LED Navigation Beacons
  const navLightMat = new THREE.MeshStandardMaterial({
    color: currentAccentHex,
    emissive: currentAccentHex,
    emissiveIntensity: 2.5,
    metalness: 0.2,
    roughness: 0.2,
  });
  accentMaterials.push(navLightMat);

  makeMesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), navLightMat, drone, [-0.58, 0.075, 0.493]);
  makeMesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), navLightMat, drone, [0.58, 0.075, 0.493]);

  // Rotors & Arms
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((front) => {
      const x = side * 1.42;
      const z = front * 0.94;
      buildRotor(x, z, side === front ? 1 : -1);
    });
  });

  buildGimbal();

  droneGlow = new THREE.PointLight(0xffffff, 3.2, 5.5, 1.6);
  droneGlow.position.set(0, 0, 0.2);
  drone.add(droneGlow);
}

// Base Scroll Waypoints — Coherent, physically continuous path with no crossing jumps
const waypoints = [
  { progress: 0.00, x: 2.30,  y: 0.35,  z: 0.00, pitch: 0.04,  yaw: -0.22, altitude: 22.0 }, // Hero (Right)
  { progress: 0.22, x: 2.35,  y: -0.05, z: 0.15, pitch: 0.05,  yaw: -0.24, altitude: 15.0 }, // Tech Stack (Fixed Stage Right)
  { progress: 0.44, x: 2.25,  y: 0.06,  z: 0.15, pitch: 0.04,  yaw: -0.20, altitude: 11.5 }, // Research (Right)
  { progress: 0.60, x: 2.35,  y: 0.05,  z: 0.20, pitch: 0.04,  yaw: -0.22, altitude: 8.5 },  // Project 1 (Fixed Stage Right)
  { progress: 0.74, x: -2.35, y: 0.05,  z: 0.20, pitch: 0.04,  yaw: 0.22,  altitude: 6.0 },  // Project 2 (Fixed Stage Left)
  { progress: 0.85, x: -2.25, y: -0.08, z: -0.45, pitch: 0.03, yaw: 0.18,  altitude: 4.2 },  // Certifications (Recessed in Depth on Left)
  { progress: 0.94, x: -1.20, y: -0.05, z: -0.35, pitch: 0.02, yaw: 0.08,  altitude: 3.0 },  // Journey (Smooth Transition towards Center)
  { progress: 1.00, x: 0.00,  y: 0.65,  z: -0.20, pitch: -0.02, yaw: 0.00, altitude: 1.8 },  // Contact (Centered above terminal)
];

function getScrollWaypoint(progress) {
  if (progress <= 0) return waypoints[0];
  if (progress >= 1) return waypoints[waypoints.length - 1];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (progress >= a.progress && progress <= b.progress) {
      const t = (progress - a.progress) / (b.progress - a.progress);
      // Apple smoothstep curve for natural velocity continuity
      const ease = t * t * (3 - 2 * t);
      return {
        x: lerp(a.x, b.x, ease),
        y: lerp(a.y, b.y, ease),
        z: lerp(a.z, b.z, ease),
        pitch: lerp(a.pitch, b.pitch, ease),
        yaw: lerp(a.yaw, b.yaw, ease),
        altitude: lerp(a.altitude, b.altitude, ease),
      };
    }
  }
  return waypoints[0];
}

function updateThemeAccent() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  if (!accent) return;
  const color = new THREE.Color(accent);
  currentAccentHex = color.getHex();

  accentMaterials.forEach((material) => {
    if (material.isMeshStandardMaterial || material.isMeshBasicMaterial) {
      material.color?.copy(color);
      if (material.emissive) material.emissive.copy(color);
    }
  });
}

// ============================================================================
// 4. Main Initialization & Animation Loop
// ============================================================================
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: window.devicePixelRatio <= 1.5,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 8.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 2.4));

  const keyLight = new THREE.DirectionalLight(0xf8fafc, 3.8);
  keyLight.position.set(-3.5, 6, 7);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x818cf8, 2.5);
  rimLight.position.set(4.5, 2, -3.5);
  scene.add(rimLight);

  const ambientFill = new THREE.PointLight(0x60a5fa, 4.0, 14, 1.8);
  ambientFill.position.set(0, 1.5, 4);
  scene.add(ambientFill);

  buildUniverseStarfield();
  buildDrone();
  buildCinematicSpotlightSystem();
  updateThemeAccent();

  const onScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetScrollProgress = clamp(window.scrollY / maxScroll, 0, 1);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const onPointerMove = (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const onResize = () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const isMobile = window.innerWidth <= 768;
    drone.scale.setScalar(isMobile ? 0.38 : 0.52);
  };
  window.addEventListener("resize", onResize, { passive: true });
  onResize();

  window.addEventListener("portfolio:themechange", updateThemeAccent);

  const unprojectTarget = new THREE.Vector3();
  const worldPos = new THREE.Vector3();
  let time = 0;

  const animate = () => {
    if (!renderer || disposed) return;
    time += 0.02;

    currentScrollProgress = lerp(currentScrollProgress, targetScrollProgress, 0.07);
    const waypoint = getScrollWaypoint(currentScrollProgress);

    // Dynamic Starfield Parallax
    if (starfield) {
      starfield.rotation.y = time * 0.0025;
      starfield.position.y = currentScrollProgress * 2.5;
    }

    // ========================================================================
    // KINEMATICS ENGINE:
    // - Mobile View (<= 768px): Drone STAYS STABLE AT ONE PLACE!
    // - Desktop View (> 768px): Full dynamic flight & cursor tracking identical to original!
    // ========================================================================
    const isMobileView = window.innerWidth <= 768;
    const viewH = window.innerHeight;
    let isTechStackZone = false;
    let isProjectZone = false;
    let projectXTarget = 2.35; // Default Right

    // Cursor displacement tracking
    const cursorNormX = (pointerX / window.innerWidth) * 2 - 1;
    const cursorNormY = -((pointerY / window.innerHeight) * 2 - 1);

    if (isMobileView) {
      // Mobile View: Drone stays stable in the circle below "Nagpur, India", and is not present while scrolling other sections
      const targetElement = ringEl || heroDroneStage;

      if (targetElement) {
        const ringRect = targetElement.getBoundingClientRect();
        const viewH = window.innerHeight;

        // The drone is ONLY present while viewing the circle below Nagpur, India
        const isCircleInView = (ringRect.bottom > 30 && ringRect.top < viewH - 20);

        if (!isCircleInView) {
          // Not present while scrolling past the about section
          drone.visible = false;
          if (cursorSpotlight) cursorSpotlight.intensity = 0;
          if (cursorLight) cursorLight.intensity = 0;
        } else {
          // Circle is visible: lock drone right in the center of the circle!
          const enterFade = clamp((viewH - ringRect.top) / 70, 0, 1);
          const leaveFade = clamp((ringRect.bottom - 30) / 70, 0, 1);
          const fade = Math.min(enterFade, leaveFade);

          drone.visible = fade > 0.02;
          drone.scale.setScalar(0.36 * fade);

          // Center of the circle in screen pixels
          const centerX = ringRect.left + ringRect.width / 2;
          const centerY = ringRect.top + ringRect.height / 2;

          const ndcX = (centerX / window.innerWidth) * 2 - 1;
          const ndcY = -((centerY / window.innerHeight) * 2 - 1);

          // Real 3D raycast to the plane z = 0.0 taking camera position & lookAt angle into account
          const rayV = new THREE.Vector3(ndcX, ndcY, 0.5);
          rayV.unproject(camera);
          const rayDir = rayV.sub(camera.position).normalize();
          const rayDist = (0.0 - camera.position.z) / rayDir.z;
          const targetWorld = camera.position.clone().add(rayDir.multiplyScalar(rayDist));

          droneState.x = lerp(droneState.x, targetWorld.x, 0.25);
          droneState.y = lerp(droneState.y, targetWorld.y, 0.25);
          droneState.z = lerp(droneState.z, 0.0, 0.25);
          droneState.pitch = lerp(droneState.pitch, 0.04, 0.1);
          droneState.yaw = lerp(droneState.yaw, -0.16, 0.1);
          droneState.roll = lerp(droneState.roll, 0.0, 0.1);

          drone.position.set(droneState.x, droneState.y, droneState.z);
          drone.rotation.set(droneState.pitch, droneState.yaw, droneState.roll);

          if (cursorSpotlight) {
            cursorSpotlight.intensity = 22 * fade;
            cursorSpotlight.position.set(droneState.x, droneState.y + 2.5, 3.5);
            cursorSpotlight.target = drone;
          }
          if (cursorLight) {
            cursorLight.intensity = 1.6 * fade;
            cursorLight.position.set(droneState.x, droneState.y + 0.8, 1.8);
          }
        }
      }

      if (softBeamGroup) softBeamGroup.visible = false;
      if (dustMotesMesh) dustMotesMesh.visible = false;
      droneState.gimbalYaw = lerp(droneState.gimbalYaw, 0, 0.1);
      droneState.gimbalPitch = lerp(droneState.gimbalPitch, 0, 0.1);
      gimbal.rotation.set(droneState.gimbalPitch, droneState.gimbalYaw, 0);
    } else {
      // Desktop View: Fluid, physically consistent flight tied to scroll progression
      drone.visible = true;
      drone.scale.setScalar(0.52);
      if (cursorSpotlight) cursorSpotlight.intensity = 22;
      if (cursorLight) cursorLight.intensity = 1.8;
      if (softBeamGroup) softBeamGroup.visible = true;
      if (dustMotesMesh) dustMotesMesh.visible = true;

      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Restrained cursor influence to prevent collision with content
      const cursorTrackingX = prefersReduced ? 0 : cursorNormX * 0.55;
      const cursorTrackingY = prefersReduced ? 0 : cursorNormY * 0.30;
      const cursorBankRoll = prefersReduced ? 0 : -cursorNormX * 0.12;
      const cursorPitchTilt = prefersReduced ? 0 : cursorNormY * 0.08;

      // Subtle, high-precision micro-hover harmonics
      const wanderX = prefersReduced ? 0 : Math.sin(time * 0.6) * 0.05;
      const wanderY = prefersReduced ? 0 : Math.cos(time * 0.8) * 0.04;

      // Base position target from continuous waypoints
      let targetBaseX = waypoint.x;
      let targetBaseY = waypoint.y;
      let targetBaseZ = waypoint.z;
      let targetBasePitch = waypoint.pitch;
      let targetBaseYaw = waypoint.yaw;

      // Aerodynamic banking roll derived from horizontal velocity
      // Moving left: negative roll; moving right (scrolling up): positive roll
      const dx = targetBaseX - droneState.x;
      const sweepBankRoll = prefersReduced ? 0 : clamp(dx * -0.18, -0.28, 0.28);

      droneState.x = lerp(droneState.x, targetBaseX + cursorTrackingX + wanderX, 0.08);
      droneState.y = lerp(droneState.y, targetBaseY + cursorTrackingY + wanderY, 0.08);
      droneState.z = lerp(droneState.z, targetBaseZ, 0.08);
      droneState.pitch = lerp(droneState.pitch, targetBasePitch + cursorPitchTilt, 0.08);
      droneState.yaw = lerp(droneState.yaw, targetBaseYaw, 0.08);
      droneState.roll = lerp(droneState.roll, cursorBankRoll + sweepBankRoll, 0.08);

      drone.position.set(droneState.x, droneState.y, droneState.z);
      drone.rotation.set(droneState.pitch, droneState.yaw, droneState.roll);

      // Unproject cursor light source & soft volumetric scattering
      unprojectTarget.set(cursorNormX, cursorNormY, 0.5);
      unprojectTarget.unproject(camera);
      const dir = unprojectTarget.sub(camera.position).normalize();
      const planeZ = 0.0;
      const distToPlane = (planeZ - camera.position.z) / dir.z;
      worldPos.copy(camera.position).add(dir.multiplyScalar(distToPlane));

      if (cursorSpotlight) {
        cursorSpotlight.position.set(worldPos.x, worldPos.y, 2.0);
      }
      if (cursorLight) {
        cursorLight.position.set(worldPos.x, worldPos.y, 0.4);
      }

      // Drone gimbal swivels to observe the incoming light beam
      const gimbalWorldPos = new THREE.Vector3();
      gimbal.getWorldPosition(gimbalWorldPos);
      const gimbalToCursor = worldPos.clone().sub(gimbalWorldPos);

      const targetGimbalYaw = Math.atan2(gimbalToCursor.x, gimbalToCursor.z) - droneState.yaw;
      const targetGimbalPitch = -Math.atan2(gimbalToCursor.y, Math.hypot(gimbalToCursor.x, gimbalToCursor.z)) + droneState.pitch;

      droneState.gimbalYaw = lerp(droneState.gimbalYaw, clamp(targetGimbalYaw, -1.3, 1.3), 0.15);
      droneState.gimbalPitch = lerp(droneState.gimbalPitch, clamp(targetGimbalPitch, -0.95, 0.95), 0.15);
      gimbal.rotation.set(droneState.gimbalPitch, droneState.gimbalYaw, 0);

      // Soft Gaussian Volumetric Beam Orientation (Cursor -> Drone)
      if (softBeamGroup && softBeamPlane) {
        const droneWorldPos = new THREE.Vector3();
        drone.getWorldPosition(droneWorldPos);

        const beamVec = new THREE.Vector3().subVectors(droneWorldPos, worldPos);
        const beamLen = beamVec.length();
        const beamDir = beamVec.clone().normalize();

        softBeamGroup.position.copy(worldPos);

        const beamWidth = 1.3 + beamLen * 0.32;
        softBeamPlane.scale.set(beamWidth, 1, beamLen);
        if (softBeamCross) softBeamCross.scale.set(beamWidth, 1, beamLen);

        softBeamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), beamDir);

        if (dustMotesMesh && dustMoteData.length > 0) {
          const posAttr = dustMotesMesh.geometry.attributes.position;
          dustMoteData.forEach((mote, i) => {
            mote.t += mote.speed;
            if (mote.t > 1) mote.t -= 1;

            const p = new THREE.Vector3().lerpVectors(worldPos, droneWorldPos, mote.t);
            const lateralSpread = (0.2 + mote.t * 0.9) * 0.45;
            p.x += Math.sin(time * 1.6 + mote.phase) * lateralSpread * mote.lateralX;
            p.y += Math.cos(time * 1.3 + mote.phase) * lateralSpread * mote.lateralY;

            posAttr.setXYZ(i, p.x, p.y, p.z);
          });
          posAttr.needsUpdate = true;
        }
      }
    }

    rotorBlades.forEach(({ group, direction }) => {
      group.rotation.y += 0.48 * direction;
    });

    droneState.altitude = Number(waypoint.altitude.toFixed(1));

    if (Math.random() < 0.1) {
      let currentMode = "SCROLL LINKED";
      if (isMobileView) currentMode = "MOBILE STABLE HOVER";
      else if (currentScrollProgress > 0.15 && currentScrollProgress < 0.35) currentMode = "TECH STACK HOVER";
      else if (currentScrollProgress >= 0.35 && currentScrollProgress < 0.52) currentMode = "RESEARCH HOVER";
      else if (currentScrollProgress >= 0.52 && currentScrollProgress < 0.68) currentMode = "PROJECT 01 (RIGHT)";
      else if (currentScrollProgress >= 0.68 && currentScrollProgress < 0.82) currentMode = "PROJECT 02 (LEFT)";
      else if (currentScrollProgress >= 0.82 && currentScrollProgress < 0.95) currentMode = "CREDENTIALS HOVER";
      else if (currentScrollProgress >= 0.95) currentMode = "TERMINAL DOCK";

      window.dispatchEvent(
        new CustomEvent("drone:telemetry", {
          detail: {
            altitude: droneState.altitude,
            rpm: droneState.rotorRpm,
            progress: Math.round(currentScrollProgress * 100),
            mode: currentMode,
          },
        })
      );
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);

  if (stage) {
    stage.classList.add("drone-scene--ready");
  }
} catch (err) {
  console.error("Three.js Drone error:", err);
  if (stage) stage.classList.add("drone-scene--fallback");
}
