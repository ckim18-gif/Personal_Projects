if (typeof THREE === 'undefined') {
  document.getElementById('loadErr').style.display = 'block';
} else {
  main();
}

function main() {

// =========================================================================
// SETUP
// =========================================================================
const container = document.getElementById('container');
const scene = new THREE.Scene();

function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#0a1710');
  g.addColorStop(0.45, '#0d2118');
  g.addColorStop(1, '#183226');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}
scene.background = makeSkyTexture();
scene.fog = new THREE.Fog(0x0d2118, 700, 2600);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 5000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================================================
// LIGHTS
// =========================================================================
scene.add(new THREE.HemisphereLight(0x2f6b4a, 0x090c0a, 0.55));

const sun = new THREE.DirectionalLight(0xfff2d9, 1.1);
sun.position.set(-500, 900, 400);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -900;
sun.shadow.camera.right = 900;
sun.shadow.camera.top = 900;
sun.shadow.camera.bottom = -900;
sun.shadow.camera.far = 2200;
sun.shadow.bias = -0.0003;
scene.add(sun);

const rim = new THREE.DirectionalLight(0x34d399, 0.5);
rim.position.set(600, 250, -500);
scene.add(rim);

const playerLight = new THREE.PointLight(0x34d399, 1.4, 420, 2);
playerLight.position.set(0, 90, 0);
scene.add(playerLight);

// =========================================================================
// ARENA
// =========================================================================
const ARENA_RADIUS = 620;
const GROUND_SIZE = 3200;

const groundMat = new THREE.MeshStandardMaterial({ color: 0x0c1b13, roughness: 0.95, metalness: 0.05 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(GROUND_SIZE, 64, 0x1f4a35, 0x122a1e);
grid.position.y = 0.2;
scene.add(grid);

const ringGeo = new THREE.RingGeometry(ARENA_RADIUS - 3, ARENA_RADIUS + 3, 128);
const arenaRingMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
const arenaRing = new THREE.Mesh(ringGeo, arenaRingMat);
arenaRing.rotation.x = -Math.PI / 2;
arenaRing.position.y = 0.5;
scene.add(arenaRing);

const plazaGeo = new THREE.CircleGeometry(120, 64);
const plazaMat = new THREE.MeshStandardMaterial({ color: 0x11291d, roughness: 0.8, transparent: true, opacity: 0.85 });
const plaza = new THREE.Mesh(plazaGeo, plazaMat);
plaza.rotation.x = -Math.PI / 2;
plaza.position.y = 0.3;
scene.add(plaza);
const plazaRingMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const plazaRing = new THREE.Mesh(new THREE.RingGeometry(118, 122, 64), plazaRingMat);
plazaRing.rotation.x = -Math.PI / 2;
plazaRing.position.y = 0.35;
scene.add(plazaRing);

const stalkGeo = new THREE.CylinderGeometry(4, 5, 140, 6);
const stalkMat = new THREE.MeshStandardMaterial({ color: 0x1c3a28, roughness: 0.7, metalness: 0.1, emissive: 0x0c2417, emissiveIntensity: 0.4 });
const stalkGroup = new THREE.Group();
for (let i = 0; i < 90; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = ARENA_RADIUS + 40 + Math.random() * 900;
  const s = new THREE.Mesh(stalkGeo, stalkMat);
  s.position.set(Math.cos(a) * r, 70, Math.sin(a) * r);
  s.scale.setScalar(0.7 + Math.random() * 0.8);
  s.rotation.y = Math.random() * Math.PI;
  s.castShadow = true;
  stalkGroup.add(s);
}
scene.add(stalkGroup);

// =========================================================================
// PRACTICE DUMMY
// =========================================================================
const DUMMY_X = 340, DUMMY_Z = -420;
const dummyGroup = new THREE.Group();
dummyGroup.position.set(DUMMY_X, 0, DUMMY_Z);
scene.add(dummyGroup);

const dummyStripeH = 22;
for (let i = 0; i < 6; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xcf2f2f : 0xe9e2d2, roughness: 0.85 });
  const seg = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, dummyStripeH, 12), mat);
  seg.position.y = 20 + i * dummyStripeH;
  seg.castShadow = true;
  dummyGroup.add(seg);
}
const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(15, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 0.8 }));
dummyHead.position.y = 20 + 6 * dummyStripeH + 12;
dummyHead.castShadow = true;
dummyGroup.add(dummyHead);
const dummyArm = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 90, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 }));
dummyArm.rotation.z = Math.PI / 2;
dummyArm.position.y = 20 + 5 * dummyStripeH + 6;
dummyGroup.add(dummyArm);

const targetRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
const targetRing = new THREE.Mesh(new THREE.RingGeometry(38, 44, 48), targetRingMat);
targetRing.rotation.x = -Math.PI / 2;
targetRing.position.set(DUMMY_X, 0.6, DUMMY_Z);
scene.add(targetRing);
const targetRing2Mat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
const targetRing2 = new THREE.Mesh(new THREE.RingGeometry(22, 26, 48), targetRing2Mat);
targetRing2.rotation.x = -Math.PI / 2;
targetRing2.position.set(DUMMY_X, 0.6, DUMMY_Z);
scene.add(targetRing2);

// =========================================================================
// CHARACTER RIG — proportioned closer to human (~6.7 heads tall), with an
// actual elbow joint and light armor detailing instead of flat boxes.
// =========================================================================
const JADE_GLOW = 0x59f2a8;
const ROBE_COLOR = 0xcf9a2e;
const ARMOR_DARK = 0x263a30;
const TRIM_DARK = 0x1c1712;
const STEEL_BLADE = 0xd7dd7e;   // yellow with a touch of green, as requested
const HILT_GOLD = 0xd9a83b;
const BOOT = 0x3d2716;

function stdMat(color, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.15 }, opts || {}));
}

// ---- proportions ----
const HEAD_SIZE = 24;
const TORSO_H = 58, TORSO_W = 34, TORSO_D = 19;
const UPPER_ARM_L = 30, FOREARM_L = 26;
const THIGH_L = 40, SHIN_L = 38;

const SHIN_Y = SHIN_L / 2;                       // 19
const HIP_Y = SHIN_L + THIGH_L;                  // 78
const TORSO_Y = HIP_Y + TORSO_H / 2;              // 107
const SHOULDER_TOP_Y = HIP_Y + TORSO_H;           // 136
const NECK_GAP = 6;
const HEAD_PIVOT_Y = SHOULDER_TOP_Y + NECK_GAP;   // 142

const player = new THREE.Group();
scene.add(player);

// --- Torso ---
const torso = new THREE.Mesh(new THREE.BoxGeometry(TORSO_W, TORSO_H, TORSO_D), stdMat(ROBE_COLOR, { roughness: 0.8 }));
torso.position.y = TORSO_Y;
torso.castShadow = true;
player.add(torso);

// Chest armor plate (breastplate accent, narrower & centered, dark trim)
const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(TORSO_W - 8, TORSO_H - 16, 3), stdMat(TRIM_DARK, { roughness: 0.4, metalness: 0.55 }));
chestPlate.position.set(0, TORSO_Y + 4, -TORSO_D / 2 - 1);
player.add(chestPlate);

// Belt
const belt = new THREE.Mesh(new THREE.BoxGeometry(TORSO_W + 2, 7, TORSO_D + 2), stdMat(TRIM_DARK, { roughness: 0.5, metalness: 0.3 }));
belt.position.y = HIP_Y + 2;
player.add(belt);

// Pauldrons (shoulder armor) — faceted "cap" over each shoulder joint
const pauldronGeo = new THREE.CylinderGeometry(11, 13, 16, 8, 1, false, 0, Math.PI);
function makePauldron(sign) {
  const m = new THREE.Mesh(pauldronGeo, stdMat(TRIM_DARK, { roughness: 0.4, metalness: 0.6 }));
  m.position.set(sign * 25, SHOULDER_TOP_Y - 4, 0);
  m.rotation.z = Math.PI / 2 + (sign > 0 ? 0 : Math.PI);
  m.rotation.y = Math.PI / 2;
  m.castShadow = true;
  player.add(m);
}
makePauldron(-1);
makePauldron(1);

// --- Cape ---
const capeGeo = new THREE.PlaneGeometry(32, 66, 6, 10);
const capeMat = stdMat(0x18120a, { roughness: 0.95, side: THREE.DoubleSide, metalness: 0.02 });
const cape = new THREE.Mesh(capeGeo, capeMat);
cape.position.set(0, TORSO_Y + 2, TORSO_D / 2 + 2);
cape.rotation.x = 0.12;
cape.castShadow = true;
player.add(cape);
const capeBasePos = capeGeo.attributes.position.array.slice();

// --- Head ---
const headPivot = new THREE.Group();
headPivot.position.y = HEAD_PIVOT_Y;
player.add(headPivot);

const helmet = new THREE.Mesh(new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE, HEAD_SIZE), stdMat(ARMOR_DARK, { roughness: 0.4, metalness: 0.4 }));
helmet.position.y = HEAD_SIZE * 0.55;
helmet.castShadow = true;
headPivot.add(helmet);

// brow ridge
const brow = new THREE.Mesh(new THREE.BoxGeometry(HEAD_SIZE + 2, 3, 6), stdMat(TRIM_DARK, { roughness: 0.35, metalness: 0.6 }));
brow.position.set(0, HEAD_SIZE * 0.55 + 4, -HEAD_SIZE / 2 - 1);
headPivot.add(brow);
// ear guards
[-1, 1].forEach((sign) => {
  const ear = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 14), stdMat(TRIM_DARK, { roughness: 0.4, metalness: 0.5 }));
  ear.position.set(sign * (HEAD_SIZE / 2 + 1), HEAD_SIZE * 0.4, -1);
  headPivot.add(ear);
});
// hood drape
const hood = new THREE.Mesh(new THREE.BoxGeometry(HEAD_SIZE + 4, HEAD_SIZE - 4, HEAD_SIZE + 4), stdMat(ROBE_COLOR, { roughness: 0.85 }));
hood.position.set(0, HEAD_SIZE * 0.5 - 5, 3);
headPivot.add(hood);

const visorMat = new THREE.MeshStandardMaterial({ color: JADE_GLOW, emissive: JADE_GLOW, emissiveIntensity: 2.2, roughness: 0.3 });
const visor = new THREE.Mesh(new THREE.BoxGeometry(15, 4.5, 2), visorMat);
visor.position.set(0, HEAD_SIZE * 0.55, -HEAD_SIZE / 2 - 0.8);
headPivot.add(visor);
const visorGlow = new THREE.PointLight(JADE_GLOW, 1.1, 60, 2);
visorGlow.position.set(0, HEAD_SIZE * 0.55, -HEAD_SIZE / 2 - 2);
headPivot.add(visorGlow);
[[-6, 4], [6, 4], [-7, 12], [7, 12]].forEach(([lx, ly]) => {
  const lens = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 2), visorMat);
  lens.position.set(lx, HEAD_SIZE * 0.55 + ly - 4, -HEAD_SIZE / 2 - 0.9);
  headPivot.add(lens);
});

// --- Arms: shoulder -> upper arm -> elbow -> forearm (a real elbow joint now) ---
function buildArm(side) {
  const sign = side === 'L' ? -1 : 1;
  const shoulder = new THREE.Group();
  shoulder.position.set(sign * 24, SHOULDER_TOP_Y - 6, 0);
  shoulder.rotation.z = sign * 0.5; // fixed inward tuck, set once — NOT animated (this is what caused the "arms flying backward" glitch before)
  player.add(shoulder);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(13, UPPER_ARM_L, 13), stdMat(ROBE_COLOR, { roughness: 0.82 }));
  upper.position.y = -UPPER_ARM_L / 2;
  upper.castShadow = true;
  shoulder.add(upper);
  // shoulder cuff trim
  const shoulderCuff = new THREE.Mesh(new THREE.BoxGeometry(14.5, 4, 14.5), stdMat(TRIM_DARK, { roughness: 0.4, metalness: 0.5 }));
  shoulderCuff.position.y = -2;
  shoulder.add(shoulderCuff);

  const elbow = new THREE.Group();
  elbow.position.y = -UPPER_ARM_L;
  shoulder.add(elbow);

  const fore = new THREE.Mesh(new THREE.BoxGeometry(11, FOREARM_L, 11), stdMat(ARMOR_DARK, { roughness: 0.45, metalness: 0.35 }));
  fore.position.y = -FOREARM_L / 2;
  fore.castShadow = true;
  elbow.add(fore);
  // wrist/gauntlet cuff
  const wristCuff = new THREE.Mesh(new THREE.BoxGeometry(12.5, 4, 12.5), stdMat(TRIM_DARK, { roughness: 0.35, metalness: 0.55 }));
  wristCuff.position.y = -FOREARM_L + 1;
  elbow.add(wristCuff);

  return { shoulder, elbow, fore };
}
const armL = buildArm('L');
const armR = buildArm('R');

// --- Sword: independent mount near the right chest, blade UP by default,
// with a faceted double-ring guard for a sharper, more ornate look. ---
const swordMount = new THREE.Group();
swordMount.position.set(21, TORSO_Y + 6, 5);
swordMount.rotation.z = 0.16;
player.add(swordMount);

const grip = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 15, 8), stdMat(0x2a2015, { roughness: 0.9 }));
grip.position.y = -7;
swordMount.add(grip);
const pommel = new THREE.Mesh(new THREE.SphereGeometry(4.5, 10, 8), stdMat(HILT_GOLD, { roughness: 0.35, metalness: 0.8 }));
pommel.position.y = -15;
swordMount.add(pommel);

// crossbar
const crossbar = new THREE.Mesh(new THREE.BoxGeometry(22, 4, 8), stdMat(HILT_GOLD, { roughness: 0.3, metalness: 0.85 }));
swordMount.add(crossbar);

// two faceted guard rings (low tube-segment torus = sharp, cut-gem look)
const ringGuardGeo = new THREE.TorusGeometry(9, 1.4, 6, 8);
const ringGuardMat = stdMat(HILT_GOLD, { roughness: 0.25, metalness: 0.9 });
[-6, 6].forEach((zOff) => {
  const rg = new THREE.Mesh(ringGuardGeo, ringGuardMat);
  rg.rotation.x = Math.PI / 2;
  rg.position.set(0, 0, zOff);
  rg.castShadow = true;
  swordMount.add(rg);
});

const bladeMat = stdMat(STEEL_BLADE, { roughness: 0.28, metalness: 0.7, emissive: 0x000000, emissiveIntensity: 0 });
const blade = new THREE.Mesh(new THREE.BoxGeometry(5, 98, 12), bladeMat);
blade.position.y = 56;
blade.castShadow = true;
swordMount.add(blade);
// blade edge trims (thin bright strips along both edges for a "sharpened" highlight)
const edgeMat = stdMat(0xf3f7c9, { roughness: 0.15, metalness: 0.85 });
[-5.2, 5.2].forEach((zOff) => {
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 98, 1.4), edgeMat);
  edge.position.set(0, 56, zOff);
  swordMount.add(edge);
});
const bladeTip = new THREE.Object3D();
bladeTip.position.y = 105;
swordMount.add(bladeTip);
const bladeGlow = new THREE.PointLight(0x67e8f9, 0, 90, 2);
bladeGlow.position.y = 60;
swordMount.add(bladeGlow);

// --- Legs (single hip joint, as before — walking pendulum swing) ---
function buildLeg(side) {
  const sign = side === 'L' ? -1 : 1;
  const hip = new THREE.Group();
  hip.position.set(sign * 11, HIP_Y, 0);
  player.add(hip);

  const thigh = new THREE.Mesh(new THREE.BoxGeometry(16, THIGH_L, 16), stdMat(ROBE_COLOR, { roughness: 0.82 }));
  thigh.position.y = -THIGH_L / 2;
  thigh.castShadow = true;
  hip.add(thigh);

  const knee = new THREE.Mesh(new THREE.BoxGeometry(17, 5, 17), stdMat(TRIM_DARK, { roughness: 0.4, metalness: 0.5 }));
  knee.position.y = -THIGH_L + 1;
  hip.add(knee);

  const shin = new THREE.Mesh(new THREE.BoxGeometry(14, SHIN_L, 14), stdMat(BOOT, { roughness: 0.7 }));
  shin.position.y = -THIGH_L - SHIN_L / 2;
  shin.castShadow = true;
  hip.add(shin);

  const ankleCuff = new THREE.Mesh(new THREE.BoxGeometry(15.5, 4, 15.5), stdMat(TRIM_DARK, { roughness: 0.4, metalness: 0.4 }));
  ankleCuff.position.y = -THIGH_L - SHIN_L + 4;
  hip.add(ankleCuff);

  return { hip };
}
const legL = buildLeg('L');
const legR = buildLeg('R');

player.castShadow = true;

// =========================================================================
// ANIMATION STATE
// =========================================================================
const REST_SHOULDER_X = 0.45;
const REST_ELBOW_X = -2.05;
const SWORD_REST_TILT = -0.32;

const pose = {
  headX: 0,
  armLX: REST_SHOULDER_X, armLElbowX: REST_ELBOW_X,
  armRX: REST_SHOULDER_X, armRElbowX: REST_ELBOW_X,
  legLX: 0, legRX: 0,
  swordTiltX: SWORD_REST_TILT,
};
const poseTarget = Object.assign({}, pose);

function easePose(dt, snappy) {
  const rate = snappy ? 20 : 7;
  const k = 1 - Math.exp(-rate * dt);
  for (const key in pose) pose[key] += (poseTarget[key] - pose[key]) * k;
}

// =========================================================================
// GAMEPLAY STATE
// =========================================================================
let px = 0, pz = 0;
let playerAngle = 0, targetAngle = 0;
const baseSpeed = 260;
let playerSpeed = baseSpeed;

let currentAnim = 'idle';
let slashActive = false, slashTimer = 0;
const slashDuration = 0.32;
let attackCount = 0, doubleStrikeActive = false;

let alphaActive = false, alphaTimer = 0;
const alphaDuration = 1.0;
let meditateActive = false;
let wujuActive = false, wujuTimer = 0;
const wujuDuration = 5.0;
let highlanderActive = false, highlanderTimer = 0;
const highlanderDuration = 7.0;

let qcd = 0, wcd = 0, ecd = 0, rcd = 0;
const QCD_MAX = 4.0, WCD_MAX = 3.0, ECD_MAX = 8.0, RCD_MAX = 20.0;

const keys = { up: false, down: false, left: false, right: false };
const trailHistory = [];

// =========================================================================
// CAMERA — locked angle, zoom only (no free rotation). First-person (Z) is
// a separate optional view with its own look-around.
// =========================================================================
let camMode = 'moba';
const orbitYaw = 0.0;
const orbitPitch = 0.62;
let camDist = 430;
const camDistMin = 200, camDistMax = 800;

let fpYaw = 0, fpPitch = 0;
let dragging = false, lastX = 0, lastY = 0;

renderer.domElement.addEventListener('mousedown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging || camMode !== 'first') return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  fpYaw -= dx * 0.005;
  fpPitch = Math.min(1.1, Math.max(-1.1, fpPitch - dy * 0.005));
});
renderer.domElement.addEventListener('wheel', (e) => {
  if (camMode !== 'moba') return;
  camDist = Math.min(camDistMax, Math.max(camDistMin, camDist + e.deltaY * 0.4));
});

function toggleCameraMode() {
  camMode = camMode === 'moba' ? 'first' : 'moba';
  document.getElementById('camModeText').textContent = camMode === 'moba' ? 'MOBA' : 'FIRST-PERSON';
  showToast3d(camMode === 'moba' ? '3인칭 시점' : '1인칭 시점');
}

function forwardXZ(yaw) { return { x: -Math.sin(yaw), z: -Math.cos(yaw) }; }
function rightXZ(yaw) { return { x: Math.cos(yaw), z: -Math.sin(yaw) }; }

function updateCamera(dt) {
  if (camMode === 'moba') {
    const targetX = px + Math.sin(orbitYaw) * camDist * Math.cos(orbitPitch * 0.55);
    const targetZ = pz + Math.cos(orbitYaw) * camDist * Math.cos(orbitPitch * 0.55);
    const targetY = 150 + camDist * Math.sin(orbitPitch) * 0.9;
    camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 6);
    camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 6);
    camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 6);
    camera.lookAt(px, 105, pz);
  } else {
    const headWorld = new THREE.Vector3();
    headPivot.getWorldPosition(headWorld);
    camera.position.copy(headWorld).add(new THREE.Vector3(0, 6, 0));
    const lookYaw = playerAngle + fpYaw;
    const f = forwardXZ(lookYaw);
    const cosPitch = Math.cos(fpPitch);
    const dir = new THREE.Vector3(f.x * cosPitch, Math.sin(fpPitch), f.z * cosPitch).normalize();
    camera.lookAt(camera.position.clone().add(dir.multiplyScalar(100)));
  }
}
camera.position.set(0, 270, 440);
camera.lookAt(0, 105, 0);

// =========================================================================
// TOASTS
// =========================================================================
let toastTimer3d = null;
function showToast3d(text, ms) {
  const el = document.getElementById('toast3d');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer3d);
  toastTimer3d = setTimeout(() => el.classList.remove('show'), ms || 1800);
}

// =========================================================================
// SKILLS
// =========================================================================
function triggerSlash() {
  if (meditateActive) meditateActive = false;
  slashActive = true;
  slashTimer = 0;
  currentAnim = 'slash';
  attackCount++;
  doubleStrikeActive = (attackCount % 4 === 0);
}
function cancelSlash() {
  slashActive = false;
  slashTimer = 0;
  doubleStrikeActive = false;
}
function useQ() {
  if (alphaActive || qcd > 0) return;
  if (slashActive) cancelSlash();
  alphaActive = true; alphaTimer = 0; meditateActive = false; currentAnim = 'slash';
  qcd = QCD_MAX;
  showToast3d('Alpha Strike!');
}
function useW() {
  if (alphaActive) return;
  if (!meditateActive && wcd <= 0) {
    if (slashActive) cancelSlash();
    meditateActive = true; currentAnim = 'meditate';
    showToast3d('명상 시작');
  } else if (meditateActive) {
    meditateActive = false; currentAnim = 'idle'; wcd = WCD_MAX;
  }
}
function useE() {
  if (alphaActive || ecd > 0) return;
  if (slashActive) cancelSlash();
  wujuActive = true; wujuTimer = wujuDuration; ecd = ECD_MAX;
  showToast3d('Wuju Style!');
}
function useR() {
  if (alphaActive || rcd > 0) return;
  if (slashActive) cancelSlash();
  highlanderActive = true; highlanderTimer = highlanderDuration; rcd = RCD_MAX;
  showToast3d('Highlander!');
}

// =========================================================================
// INPUT
// =========================================================================
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  if (k === 'q') useQ();
  else if (k === 'w') useW();
  else if (k === 'e') useE();
  else if (k === 'r') useR();
  else if (k === 'a' || k === ' ') { if (!slashActive && !alphaActive) triggerSlash(); }
  else if (k === 'z') toggleCameraMode();
  if (k === 'arrowup') keys.up = true;
  if (k === 'arrowdown') keys.down = true;
  if (k === 'arrowleft') keys.left = true;
  if (k === 'arrowright') keys.right = true;
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'arrowup') keys.up = false;
  if (k === 'arrowdown') keys.down = false;
  if (k === 'arrowleft') keys.left = false;
  if (k === 'arrowright') keys.right = false;
});
renderer.domElement.addEventListener('click', () => {
  if (!slashActive && !alphaActive) triggerSlash();
});

// =========================================================================
// UPDATE
// =========================================================================
function updateMovementAndSkills(dt) {
  if (qcd > 0) qcd = Math.max(0, qcd - dt);
  if (wcd > 0) wcd = Math.max(0, wcd - dt);
  if (ecd > 0) ecd = Math.max(0, ecd - dt);
  if (rcd > 0) rcd = Math.max(0, rcd - dt);

  if (wujuActive) { wujuTimer -= dt; if (wujuTimer <= 0) wujuActive = false; }

  if (highlanderActive) {
    highlanderTimer -= dt;
    playerSpeed = baseSpeed * 2.0;
    if (highlanderTimer <= 0) { highlanderActive = false; playerSpeed = baseSpeed; }
  } else {
    playerSpeed = baseSpeed;
  }

  if (alphaActive) {
    alphaTimer += dt;
    if (alphaTimer >= alphaDuration) {
      alphaActive = false;
      const f = forwardXZ(playerAngle);
      px += f.x * 130; pz += f.z * 130;
      const d = Math.hypot(px, pz);
      if (d > ARENA_RADIUS) { px *= ARENA_RADIUS / d; pz *= ARENA_RADIUS / d; }
      slashActive = true; slashTimer = 0; currentAnim = 'slash';
    }
    return;
  }

  let inZ = 0, inX = 0;
  if (keys.up) inZ += 1;
  if (keys.down) inZ -= 1;
  if (keys.right) inX += 1;
  if (keys.left) inX -= 1;

  if (inZ !== 0 || inX !== 0) {
    if (meditateActive) { meditateActive = false; currentAnim = 'idle'; }
    if (slashActive) { slashActive = false; slashTimer = 0; doubleStrikeActive = false; }

    const effYaw = camMode === 'moba' ? orbitYaw : (playerAngle + fpYaw);
    const f = forwardXZ(effYaw), r = rightXZ(effYaw);
    let wx = f.x * inZ + r.x * inX;
    let wz = f.z * inZ + r.z * inX;
    const len = Math.hypot(wx, wz);
    wx /= len; wz /= len;

    px += wx * playerSpeed * dt;
    pz += wz * playerSpeed * dt;
    targetAngle = Math.atan2(-wx, -wz);
    currentAnim = 'walk';
  } else if (currentAnim === 'walk' && !slashActive && !meditateActive) {
    currentAnim = 'idle';
  }

  const dist = Math.hypot(px, pz);
  if (dist > ARENA_RADIUS) { px *= ARENA_RADIUS / dist; pz *= ARENA_RADIUS / dist; }

  if (highlanderActive) {
    trailHistory.push({ x: px, z: pz, angle: playerAngle, age: 0 });
    if (trailHistory.length > 14) trailHistory.shift();
  }

  // Slower, smoother turn (previously snapped almost instantly)
  let angleDiff = targetAngle - playerAngle;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  playerAngle += angleDiff * Math.min(1, dt * 6);
}

function updatePoseTargets(dt, t) {
  let visible = true;

  if (alphaActive) {
    visible = false;
  } else if (meditateActive) {
    const breathe = Math.sin(t * 3.2) * 0.07;
    poseTarget.headX = breathe * 0.5;
    poseTarget.armRX = -0.15 + breathe; poseTarget.armRElbowX = -2.35;
    poseTarget.armLX = -0.15 - breathe; poseTarget.armLElbowX = -2.35;
    poseTarget.legLX = 0; poseTarget.legRX = 0;
    poseTarget.swordTiltX = SWORD_REST_TILT + 0.25;
  } else if (slashActive) {
    slashTimer += dt;
    const duration = doubleStrikeActive ? slashDuration * 2 : slashDuration;
    if (slashTimer >= duration) {
      slashActive = false; slashTimer = 0; doubleStrikeActive = false; currentAnim = 'idle';
    }
    if (doubleStrikeActive) {
      const half = duration / 2;
      if (slashTimer < half) {
        const p = slashTimer / half, f = Math.sin(p * Math.PI);
        poseTarget.armRX = REST_SHOULDER_X - f * 2.2; poseTarget.armRElbowX = REST_ELBOW_X + f * 1.1;
        poseTarget.armLX = REST_SHOULDER_X - f * 1.7; poseTarget.armLElbowX = REST_ELBOW_X + f * 0.8;
        poseTarget.swordTiltX = SWORD_REST_TILT - 0.5 + f * 3.2;
      } else {
        const p = (slashTimer - half) / half, f = Math.sin(p * Math.PI);
        poseTarget.armRX = REST_SHOULDER_X + 1.0 - f * 2.6; poseTarget.armRElbowX = REST_ELBOW_X - f * 1.0;
        poseTarget.armLX = REST_SHOULDER_X + 0.8 - f * 2.1; poseTarget.armLElbowX = REST_ELBOW_X - f * 0.7;
        poseTarget.swordTiltX = SWORD_REST_TILT + 0.9 - f * 3.2;
      }
    } else {
      const p = slashTimer / duration, f = Math.sin(p * Math.PI);
      poseTarget.armRX = REST_SHOULDER_X - f * 2.2; poseTarget.armRElbowX = REST_ELBOW_X + f * 1.1;
      poseTarget.armLX = REST_SHOULDER_X - f * 1.7; poseTarget.armLElbowX = REST_ELBOW_X + f * 0.8;
      poseTarget.swordTiltX = SWORD_REST_TILT - 0.5 + f * 3.2;
    }
    poseTarget.legLX = 0.4; poseTarget.legRX = -0.4; poseTarget.headX = 0.15;
  } else if (currentAnim === 'walk') {
    const tw = t * (highlanderActive ? 11 : 6.5);
    poseTarget.legLX = Math.sin(tw) * 0.8; poseTarget.legRX = -Math.sin(tw) * 0.8;
    // Hands stay near the grip while moving (holding a two-handed sword,
    // not swinging free arms) — just a small bob for life.
    poseTarget.armRX = REST_SHOULDER_X + Math.sin(tw * 2) * 0.06;
    poseTarget.armLX = REST_SHOULDER_X + Math.sin(tw * 2 + Math.PI) * 0.06;
    poseTarget.armRElbowX = REST_ELBOW_X; poseTarget.armLElbowX = REST_ELBOW_X;
    poseTarget.headX = Math.sin(tw * 2) * 0.05;
    poseTarget.swordTiltX = SWORD_REST_TILT + Math.sin(tw) * 0.04;
  } else {
    const breathe = Math.sin(t * 2.6) * 0.035;
    poseTarget.headX = breathe * 0.4;
    poseTarget.armRX = REST_SHOULDER_X + breathe; poseTarget.armLX = REST_SHOULDER_X - breathe;
    poseTarget.armRElbowX = REST_ELBOW_X; poseTarget.armLElbowX = REST_ELBOW_X;
    poseTarget.legLX = 0; poseTarget.legRX = 0;
    poseTarget.swordTiltX = SWORD_REST_TILT + breathe * 0.3;
  }

  player.visible = visible;
}

function applyPoseToRig() {
  headPivot.rotation.x = pose.headX * 0.6;
  headPivot.rotation.y = pose.headX * 0.3;

  armL.shoulder.rotation.x = pose.armLX;
  armL.elbow.rotation.x = pose.armLElbowX;
  armR.shoulder.rotation.x = pose.armRX;
  armR.elbow.rotation.x = pose.armRElbowX;

  legL.hip.rotation.x = pose.legLX;
  legR.hip.rotation.x = pose.legRX;

  swordMount.rotation.x = pose.swordTiltX;

  const targetGlow = wujuActive ? 2.4 : 0;
  bladeMat.emissive.setHex(0x22d3ee);
  bladeMat.emissiveIntensity += (targetGlow - bladeMat.emissiveIntensity) * 0.15;
  bladeGlow.intensity += ((wujuActive ? 1.6 : 0) - bladeGlow.intensity) * 0.15;
  bladeMat.color.setHex(wujuActive ? 0xbdf5ff : STEEL_BLADE);
}

function updateCape(dt, t) {
  const posAttr = cape.geometry.attributes.position;
  const arr = posAttr.array;
  const intensity = highlanderActive ? 3.2 : (currentAnim === 'walk' ? 1.3 : 0.5);
  for (let i = 0; i < arr.length; i += 3) {
    const by = capeBasePos[i + 1], bz = capeBasePos[i + 2];
    const rowFactor = Math.max(0, (-by + 33) / 66);
    const sway = Math.sin(t * 4.5 + by * 0.12) * intensity * rowFactor;
    arr[i + 2] = bz + sway;
  }
  posAttr.needsUpdate = true;
}

const trailMeshes = [];
const trailGeo = new THREE.BoxGeometry(32, 84, 18);
function spawnTrailMesh() {
  const mat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.2 });
  const m = new THREE.Mesh(trailGeo, mat);
  scene.add(m);
  trailMeshes.push(m);
}
function updateTrail() {
  while (trailMeshes.length < trailHistory.length) spawnTrailMesh();
  while (trailMeshes.length > trailHistory.length) { const m = trailMeshes.pop(); scene.remove(m); }
  for (let i = 0; i < trailHistory.length; i++) {
    const th = trailHistory[i], m = trailMeshes[i];
    m.position.set(th.x, 70, th.z);
    m.rotation.y = th.angle;
    m.material.opacity = ((i + 1) / trailHistory.length) * 0.35;
    m.visible = highlanderActive;
  }
}

const moteGeo = new THREE.SphereGeometry(2.4, 6, 6);
const moteMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.85 });
const moteMeshes = [];
for (let i = 0; i < 10; i++) {
  const m = new THREE.Mesh(moteGeo, moteMat.clone());
  m.visible = false;
  scene.add(m);
  moteMeshes.push(m);
}
const meditateRingGeo = new THREE.RingGeometry(30, 33, 48);
const meditateRingMat1 = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0, side: THREE.DoubleSide });
const meditateRing1 = new THREE.Mesh(meditateRingGeo, meditateRingMat1);
meditateRing1.rotation.x = -Math.PI / 2;
scene.add(meditateRing1);
const meditateRing2 = new THREE.Mesh(meditateRingGeo, meditateRingMat1.clone());
meditateRing2.rotation.x = -Math.PI / 2;
scene.add(meditateRing2);

function updateMeditateFX(t) {
  for (let i = 0; i < moteMeshes.length; i++) {
    const m = moteMeshes[i];
    if (!meditateActive) { m.visible = false; continue; }
    m.visible = true;
    const sx = Math.sin(t * 1.1 + i) * 26, sz = Math.cos(t * 1.4 + i) * 26;
    const cyc = (t * 30 + i * 15) % 100;
    m.position.set(px + sx, 80 + cyc * 0.9, pz + sz);
    m.material.opacity = 0.85 * (1 - cyc / 100);
  }
  meditateRing1.visible = meditateActive;
  meditateRing2.visible = meditateActive;
  if (meditateActive) {
    const r1 = (t * 90) % 95, r2 = ((t * 90) + 45) % 95;
    meditateRing1.scale.setScalar(0.2 + r1 / 95); meditateRing1.material.opacity = 1 - r1 / 95;
    meditateRing2.scale.setScalar(0.2 + r2 / 95); meditateRing2.material.opacity = 1 - r2 / 95;
    meditateRing1.position.set(px, 88, pz);
    meditateRing2.position.set(px, 88, pz);
  }
}

const alphaBurstGroup = new THREE.Group();
scene.add(alphaBurstGroup);
function spawnAlphaBurst() {
  for (const c of [...alphaBurstGroup.children]) alphaBurstGroup.remove(c);
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.BoxGeometry(2.5, 2.5, 60);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.9 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px + (Math.random() - 0.5) * 80, 80 + (Math.random() - 0.5) * 60, pz + (Math.random() - 0.5) * 80);
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    m.userData.life = 0.4;
    alphaBurstGroup.add(m);
  }
}
let lastAlphaActive = false;
function updateAlphaFX(dt) {
  if (alphaActive && !lastAlphaActive) spawnAlphaBurst();
  lastAlphaActive = alphaActive;
  for (const m of [...alphaBurstGroup.children]) {
    m.userData.life -= dt;
    m.material.opacity = Math.max(0, m.userData.life / 0.4) * 0.9;
    if (m.userData.life <= 0) alphaBurstGroup.remove(m);
  }
}

// =========================================================================
// HUD / SKILL BAR
// =========================================================================
const statusText = document.getElementById('statusText');
const speedText = document.getElementById('speedText');
const coordText = document.getElementById('coordText');
const passiveText = document.getElementById('passiveText');

function syncHud() {
  let status = 'ACTIVE';
  if (alphaActive) status = 'ALPHA STRIKE';
  else if (meditateActive) status = 'MEDITATING';
  else if (highlanderActive) status = 'HIGHLANDER';
  statusText.textContent = status;
  speedText.textContent = (playerSpeed / 60).toFixed(1);
  coordText.textContent = `X ${px.toFixed(0)} · Z ${pz.toFixed(0)}`;

  const rem = attackCount % 4;
  const hitsUntil = rem === 0 ? 4 : 4 - rem;
  if (doubleStrikeActive) {
    passiveText.textContent = 'PASSIVE — 더블 스트라이크!';
    passiveText.style.color = '#f2c14e';
  } else {
    passiveText.textContent = `더블 스트라이크까지 ${hitsUntil}타`;
    passiveText.style.color = '#7fa08c';
  }
}
function syncSkillIcon(el, active, cd, cdMax, activeSecondsLeft) {
  const veil = el.querySelector('.cd-veil'), sub = el.querySelector('.sub');
  el.classList.toggle('active', active);
  el.classList.toggle('ready', !active && cd <= 0);
  el.classList.toggle('cooling', !active && cd > 0);
  if (!active && cd > 0) {
    veil.style.display = 'flex'; veil.textContent = Math.ceil(cd); sub.textContent = 'CD';
  } else {
    veil.style.display = 'none'; sub.textContent = active ? activeSecondsLeft.toFixed(1) + 's' : 'READY';
  }
}
function syncSkillBar() {
  syncSkillIcon(document.getElementById('skillQ'), alphaActive, qcd, QCD_MAX, alphaDuration - alphaTimer);
  syncSkillIcon(document.getElementById('skillW'), meditateActive, wcd, WCD_MAX, 0);
  syncSkillIcon(document.getElementById('skillE'), wujuActive, ecd, ECD_MAX, wujuTimer);
  syncSkillIcon(document.getElementById('skillR'), highlanderActive, rcd, RCD_MAX, highlanderTimer);
}

// =========================================================================
// MAIN LOOP
// =========================================================================
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  updateMovementAndSkills(dt);
  updatePoseTargets(dt, t);
  easePose(dt, slashActive || alphaActive);
  applyPoseToRig();
  updateCape(dt, t);
  updateTrail();
  updateMeditateFX(t);
  updateAlphaFX(dt);

  player.position.set(px, 0, pz);
  player.rotation.y = playerAngle;
  playerLight.position.set(px, 150, pz);

  targetRing.rotation.z += dt * 0.4;
  targetRing2.rotation.z -= dt * 0.6;

  updateCamera(dt);
  syncHud();
  syncSkillBar();

  renderer.render(scene, camera);
}

document.getElementById('loading').classList.add('hidden');
animate();

}
