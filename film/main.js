import * as THREE from "three";
import {
  FPS,
  DURATION,
  piecePose,
  offcutOpacity,
  envBlend,
  guidesOpacity,
  cameraPose,
  captionState,
  exposureAt,
  shakeAt,
  idleWobble,
  smooth,
} from "./timeline.js";
import { LOCK, PIECE } from "./fit.js";

const PALETTE = {
  pier: "#d4cdc0",
  wedge: "#c4b6a4",
  lintel: "#e4dacd",
  bearing: "#7a8086",
  offcut: "#b7a898",
  bronze: "#8d7352",
  recess: "#1c1e20",
  ground: "#cfc6b8",
  wall: "#e6e0d6",
  fogHall: "#e3dcd2",
  fogCourt: "#efe6d8",
  skyTopHall: "#c2bbb0",
  skyHorHall: "#e4ddd2",
  skyTopCourt: "#d8d2c6",
  skyHorCourt: "#f3eadc",
};

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(PALETTE.fogHall, 1);
renderer.domElement.id = "view";
document.getElementById("stage").prepend(renderer.domElement);

const gl = renderer.getContext();
const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
window.__glRenderer = debugExt
  ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
  : gl.getParameter(gl.RENDERER);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PALETTE.fogHall, 14, 48);
scene.background = new THREE.Color(PALETTE.fogHall);

const camera = new THREE.PerspectiveCamera(33, 1920 / 1080, 0.08, 120);

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const rand = mulberry32(seed);
  const n = 128;
  const grid = new Float32Array(n * n);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand();
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = fade(x - x0);
    const ty = fade(y - y0);
    const at = (ix, iy) => grid[(((iy % n) + n) % n) * n + (((ix % n) + n) % n)];
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

function fbm(noise, x, y) {
  let amp = 0.55;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < 5; o += 1) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

function rgbOf(hex, h, s, l) {
  const color = new THREE.Color(hex);
  if (h || s || l) color.offsetHSL(h, s, l);
  return [color.r, color.g, color.b];
}

function mixRgb(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function makeStoneTextures(hex, seed) {
  const size = 512;
  const noise = makeNoise(seed);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x / size) * 4;
      const v = (y / size) * 4;
      const warp = fbm(noise, u * 0.35 + 4, v * 0.35);
      height[y * size + x] = fbm(noise, u + warp * 0.8, v + warp * 0.55);
    }
  }

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;

  const cctx = colorCanvas.getContext("2d");
  const rctx = roughCanvas.getContext("2d");
  const nctx = normalCanvas.getContext("2d");
  const cimg = cctx.createImageData(size, size);
  const rimg = rctx.createImageData(size, size);
  const nimg = nctx.createImageData(size, size);
  const warm = rgbOf(hex, 0.015, 0.03, 0.045);
  const cool = rgbOf(hex, -0.012, -0.02, -0.06);
  const veinRgb = rgbOf("#6e675e", 0, 0, 0);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const h = height[i];
      const vein = Math.exp(-(((h - 0.46) * 7.5) ** 2));
      const col = mixRgb(mixRgb(cool, warm, 0.34 + h * 0.38), veinRgb, vein * 0.1);
      const p = i * 4;
      cimg.data[p] = Math.round(col[0] * 255);
      cimg.data[p + 1] = Math.round(col[1] * 255);
      cimg.data[p + 2] = Math.round(col[2] * 255);
      cimg.data[p + 3] = 255;
      const rough = Math.min(1, Math.max(0, 0.78 + (1 - h) * 0.18 - vein * 0.08));
      const rv = Math.round(rough * 255);
      rimg.data[p] = rv;
      rimg.data[p + 1] = rv;
      rimg.data[p + 2] = rv;
      rimg.data[p + 3] = 255;

      const hl = height[y * size + ((x - 1 + size) % size)];
      const hr = height[y * size + ((x + 1) % size)];
      const hd = height[((y - 1 + size) % size) * size + x];
      const hu = height[((y + 1) % size) * size + x];
      const dx = (hl - hr) * 2.4;
      const dy = (hd - hu) * 2.4;
      const dz = 1;
      const len = Math.hypot(dx, dy, dz);
      nimg.data[p] = Math.round((dx / len * 0.5 + 0.5) * 255);
      nimg.data[p + 1] = Math.round((dy / len * 0.5 + 0.5) * 255);
      nimg.data[p + 2] = Math.round((dz / len * 0.5 + 0.5) * 255);
      nimg.data[p + 3] = 255;
    }
  }
  cctx.putImageData(cimg, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  nctx.putImageData(nimg, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  const normalMap = new THREE.CanvasTexture(normalCanvas);
  for (const tex of [map, roughnessMap, normalMap]) {
    tex.colorSpace = tex === map ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }
  return { map, roughnessMap, normalMap };
}

function makeFloorTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const noise = makeNoise(11);
  const img = ctx.createImageData(size, size);
  const base = rgbOf(PALETTE.ground, 0, 0, 0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const h = fbm(noise, (x / size) * 5, (y / size) * 5);
      const lift = (h - 0.5) * 0.06;
      let r = base[0] + lift;
      let g = base[1] + lift;
      let b = base[2] + lift;
      if (x % 256 < 2 || y % 256 < 2) {
        r *= 0.945;
        g *= 0.945;
        b *= 0.945;
      }
      const p = (y * size + x) * 4;
      img.data[p] = Math.round(Math.min(1, Math.max(0, r)) * 255);
      img.data[p + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
      img.data[p + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 8);
  map.anisotropy = 4;
  return map;
}

function makeBlobTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 16, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.45, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGrainTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(256, 256);
  const rand = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 112 + Math.floor(rand() * 32);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  document.getElementById("grain").style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
}

const pierTex = makeStoneTextures(PALETTE.pier, 3);
const wedgeTex = makeStoneTextures(PALETTE.wedge, 8);
const lintelTex = makeStoneTextures(PALETTE.lintel, 5);
const bearingTex = makeStoneTextures(PALETTE.bearing, 21);
const offcutTex = makeStoneTextures(PALETTE.offcut, 13);

function stoneMaterial(textures, roughness, metalness = 0) {
  return new THREE.MeshPhysicalMaterial({
    map: textures.map,
    roughnessMap: textures.roughnessMap,
    normalMap: textures.normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness,
    metalness,
    envMapIntensity: 0.14,
  });
}

const pierMat = stoneMaterial(pierTex, 0.9);
const wedgeMat = stoneMaterial(wedgeTex, 0.86);
const lintelMat = stoneMaterial(lintelTex, 0.78);
lintelMat.clearcoat = 0.08;
lintelMat.clearcoatRoughness = 0.55;
const bearingMat = stoneMaterial(bearingTex, 0.94);
bearingMat.envMapIntensity = 0.06;
const offcutMat = stoneMaterial(offcutTex, 0.9);
offcutMat.transparent = true;

const bronzeMat = new THREE.MeshPhysicalMaterial({
  color: PALETTE.bronze,
  roughness: 0.42,
  metalness: 0.62,
  envMapIntensity: 0.55,
});

const floorMap = makeFloorTexture();
const floorMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: floorMap,
  roughness: 0.96,
  metalness: 0,
  envMapIntensity: 0.12,
});

const wallMat = new THREE.MeshStandardMaterial({
  color: PALETTE.wall,
  roughness: 0.94,
  metalness: 0,
  transparent: true,
  opacity: 1,
  envMapIntensity: 0.08,
});

const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function addWall(width, height, x, z, rotY) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
  mesh.position.set(x, height / 2, z);
  mesh.rotation.y = rotY;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

const walls = [
  addWall(42, 7.4, 0, -18, 0),
  addWall(40, 7.4, -18, 0, Math.PI / 2),
  addWall(40, 7.4, 18, 0, -Math.PI / 2),
];

const recess = new THREE.Mesh(
  new THREE.PlaneGeometry(3.2, 5.4),
  new THREE.MeshStandardMaterial({ color: 0xddd6cc, roughness: 1 }),
);
recess.position.set(-2.4, 3.15, -17.96);
scene.add(recess);

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    topColor: { value: new THREE.Color(PALETTE.skyTopHall) },
    horizonColor: { value: new THREE.Color(PALETTE.skyHorHall) },
  },
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: `
    varying vec3 vWorld;
    uniform vec3 topColor;
    uniform vec3 horizonColor;
    void main() {
      float h = normalize(vWorld).y;
      float k = smoothstep(-0.02, 0.45, h);
      gl_FragColor = vec4(mix(horizonColor, topColor, k), 1.0);
    }
  `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 20), skyMat);
scene.add(sky);

const obstacleMat = new THREE.MeshStandardMaterial({
  color: 0x2f3336,
  roughness: 0.88,
  metalness: 0.04,
  transparent: true,
  opacity: 0,
});
const obstacle = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.7, 0.38), obstacleMat);
obstacle.position.set(0.2, 0.85, 12.4);
obstacle.castShadow = true;
obstacle.receiveShadow = true;
scene.add(obstacle);

function groundedBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  return geo;
}

const pierGeo = groundedBox(PIECE.pierW, PIECE.pierH, PIECE.pierD);
const bearingGeo = groundedBox(PIECE.bearingW, PIECE.bearingH, PIECE.bearingD);
const lintelGeo = new THREE.BoxGeometry(PIECE.lintelL, PIECE.lintelH, PIECE.lintelD);

function makeWedgeGeometry() {
  const { wedgeBase, wedgeTop, wedgeH, wedgeD } = PIECE;
  const shape = new THREE.Shape();
  shape.moveTo(-wedgeBase / 2, 0);
  shape.lineTo(wedgeBase / 2, 0);
  shape.lineTo(wedgeTop / 2, wedgeH);
  shape.lineTo(-wedgeTop / 2, wedgeH);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: wedgeD, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -wedgeD / 2);
  return geo;
}

const wedgeGeo = makeWedgeGeometry();
const offcutGeo = groundedBox(0.22, 0.36, 0.16);

function addMesh(geo, material) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const pier = new THREE.Group();
pier.add(addMesh(pierGeo, pierMat));
const bearing = new THREE.Group();
bearing.add(addMesh(bearingGeo, bearingMat));
const wedge = new THREE.Group();
wedge.add(addMesh(wedgeGeo, wedgeMat));
const lintel = new THREE.Group();
lintel.add(addMesh(lintelGeo, lintelMat));
const bronze = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.012, 0.012), bronzeMat);
bronze.position.set(0, -PIECE.lintelH / 2 + 0.07, PIECE.lintelD / 2 + 0.004);
bronze.castShadow = true;
lintel.add(bronze);
const offcut = new THREE.Group();
offcut.add(addMesh(offcutGeo, offcutMat));

const pieces = { pier, bearing, wedge, lintel, offcut };
for (const group of Object.values(pieces)) scene.add(group);

const blobMap = makeBlobTexture();
function makeDisc(scale) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    map: blobMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.28,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  mesh.scale.setScalar(scale);
  mesh.renderOrder = 2;
  scene.add(mesh);
  return mesh;
}
const discs = {
  pier: makeDisc(0.85),
  bearing: makeDisc(1.15),
  wedge: makeDisc(0.62),
  offcut: makeDisc(0.4),
};

const guideMat = new THREE.LineBasicMaterial({
  color: 0x6a655c,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const guides = new THREE.Group();
const guideLines = [];
function addGuide(a, b, axis, t0) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a[0] - mid[0], a[1] - mid[1], a[2] - mid[2]),
    new THREE.Vector3(b[0] - mid[0], b[1] - mid[1], b[2] - mid[2]),
  ]);
  const line = new THREE.Line(geo, guideMat);
  line.position.set(mid[0], mid[1], mid[2]);
  line.renderOrder = 3;
  line.scale.set(axis === "x" ? 0.001 : 1, axis === "y" ? 0.001 : 1, 1);
  guides.add(line);
  guideLines.push({ line, axis, t0 });
}
const guideExtent = 3.4;
for (let i = -3; i <= 3; i += 1) {
  const o = i * 1.05;
  addGuide([-guideExtent, 0.02, o], [guideExtent, 0.02, o], "x", 12.0 + (i + 3) * 0.05);
  addGuide([o, 0.02, -guideExtent], [o, 0.02, guideExtent], "y", 12.2 + (i + 3) * 0.05);
}
const TICK_BEATS = [12.45, 13.8, 15.15, 16.5];
for (let i = -8; i <= 8; i += 1) {
  const x = i * 0.42;
  addGuide([x, 0.025, -0.07], [x, 0.025, 0.07], "y", TICK_BEATS[(i + 8) % TICK_BEATS.length]);
}
addGuide([LOCK.pier[0], 0.02, 0.42], [LOCK.pier[0], 2.7, 0.42], "y", 12.35);
addGuide([LOCK.bearing[0], 0.02, 0.5], [LOCK.bearing[0], 1.7, 0.5], "y", 12.55);
for (let y = 0.5; y <= 2.5; y += 0.5) {
  addGuide([LOCK.pier[0] - 0.08, y, 0.42], [LOCK.pier[0] + 0.08, y, 0.42], "x", 12.65 + y * 0.2);
}
scene.add(guides);

const hemi = new THREE.HemisphereLight(0xf3eee6, 0xb3aa9d, 0.72);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1df, 3.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 55;
key.shadow.camera.left = -16;
key.shadow.camera.right = 16;
key.shadow.camera.top = 16;
key.shadow.camera.bottom = -16;
key.shadow.bias = -0.00018;
key.shadow.normalBias = 0.035;
scene.add(key);
scene.add(key.target);
const fill = new THREE.DirectionalLight(0xd7dbe2, 0.55);
fill.position.set(8, 6, 10);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xfff6ea, 0.7);
rim.position.set(-4, 7, -12);
scene.add(rim);
const exitLight = new THREE.DirectionalLight(0xfff4e4, 0.4);
exitLight.position.set(2, 8, 18);
scene.add(exitLight);

const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envGeo = new THREE.PlaneGeometry(12, 12);
function envPlane(color, x, y, z, rx, ry) {
  const mesh = new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0);
  envScene.add(mesh);
}
envPlane(0xf4eee6, 0, 0, -6, 0, 0);
envPlane(0xd8d2c8, 0, 0, 6, 0, Math.PI);
envPlane(0xc9c2b6, -6, 0, 0, 0, Math.PI / 2);
envPlane(0xb7b0a4, 6, 0, 0, 0, -Math.PI / 2);
envPlane(0xf7f3ec, 0, 6, 0, -Math.PI / 2, 0);
envPlane(0x8e867b, 0, -6, 0, Math.PI / 2, 0);
scene.environment = pmrem.fromScene(envScene, 0.12).texture;
pmrem.dispose();

function makeDust() {
  const count = 170;
  const positions = new Float32Array(count * 3);
  const rand = mulberry32(123);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (rand() - 0.5) * 15;
    positions[i * 3 + 1] = rand() * 4.4;
    positions[i * 3 + 2] = (rand() - 0.5) * 15 + 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xfff2dd,
    size: 0.032,
    map: blobMap,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 4;
  scene.add(pts);
  return pts;
}
const dust = makeDust();

function makeRayTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255,246,230,0.85)");
  g.addColorStop(0.55, "rgba(255,246,230,0.28)");
  g.addColorStop(1, "rgba(255,246,230,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, "rgba(255,247,232,0.9)");
  g.addColorStop(0.5, "rgba(255,247,232,0.32)");
  g.addColorStop(1, "rgba(255,247,232,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const rayTex = makeRayTexture();
const rayMat = new THREE.MeshBasicMaterial({
  map: rayTex,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
});
const rays = new THREE.Group();
for (const [x, z, rot] of [[-1.2, 3.6, 0.42], [0.35, 3.1, 0.5], [1.7, 4.0, 0.36]]) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 9.5), rayMat);
  mesh.position.set(x, 3.6, z);
  mesh.rotation.z = rot;
  mesh.renderOrder = 5;
  rays.add(mesh);
}
rays.visible = false;
scene.add(rays);

const glowMat = new THREE.MeshBasicMaterial({
  map: makeGlowTexture(),
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
});
const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), glowMat);
glow.position.set(0, 2.1, 7.6);
glow.rotation.y = Math.PI;
glow.renderOrder = 5;
glow.visible = false;
scene.add(glow);

const lineEl = document.getElementById("line");
const glyphEl = document.getElementById("glyph");
const wordEl = document.getElementById("word");
const ruleEl = document.getElementById("rule");
const subEl = document.getElementById("sub");
const tagEl = document.getElementById("tag");
const washEl = document.getElementById("wash");
const vignetteEl = document.getElementById("vignette");
const grainEl = document.getElementById("grain");
const flashEl = document.getElementById("flash");
const barTopEl = document.getElementById("barTop");
const barBottomEl = document.getElementById("barBottom");
makeGrainTile();

const glyphStrokes = [...glyphEl.querySelectorAll("line")].map((el) => {
  const x1 = parseFloat(el.getAttribute("x1"));
  const y1 = parseFloat(el.getAttribute("y1"));
  const x2 = parseFloat(el.getAttribute("x2"));
  const y2 = parseFloat(el.getAttribute("y2"));
  const len = Math.hypot(x2 - x1, y2 - y1);
  el.style.strokeDasharray = `${len}`;
  el.style.strokeDashoffset = `${len}`;
  return { el, len };
});
const GLYPH_STAGGER = [
  [0.0, 0.4],
  [0.14, 0.55],
  [0.32, 0.72],
  [0.52, 0.98],
];

const fogA = new THREE.Color(PALETTE.fogHall);
const fogB = new THREE.Color(PALETTE.fogCourt);
const skyTopA = new THREE.Color(PALETTE.skyTopHall);
const skyTopB = new THREE.Color(PALETTE.skyTopCourt);
const skyHorA = new THREE.Color(PALETTE.skyHorHall);
const skyHorB = new THREE.Color(PALETTE.skyHorCourt);
const keyA = new THREE.Color(0xfff1df);
const keyB = new THREE.Color(0xffe2c2);

function applyPose(group, pose) {
  group.position.set(pose.p[0], pose.p[1], pose.p[2]);
  group.rotation.set(pose.r[0], pose.r[1], pose.r[2]);
}

function apply(t) {
  const cap = captionState(t);
  const cam = cameraPose(t);
  camera.position.set(cam.p[0], cam.p[1], cam.p[2]);
  camera.lookAt(cam.l[0], cam.l[1], cam.l[2]);
  const shake = shakeAt(t);
  camera.position.x += shake[0];
  camera.position.y += shake[1];
  camera.fov = cam.f;
  camera.updateProjectionMatrix();

  for (const name of Object.keys(pieces)) applyPose(pieces[name], piecePose(name, t));
  const wob = idleWobble(t);
  if (wob > 0) {
    const phases = { pier: 0.7, bearing: 2.1, wedge: 3.6, lintel: 5.0 };
    for (const [name, phase] of Object.entries(phases)) {
      const group = pieces[name];
      group.rotation.y += Math.sin(t * 0.9 + phase) * 0.006 * wob;
      group.position.y += Math.sin(t * 0.7 + phase * 1.7) * 0.004 * wob;
    }
  }
  const offOp = offcutOpacity(t);
  offcut.visible = offOp > 0.01;
  offcutMat.opacity = offOp;

  const env = envBlend(t);
  wallMat.opacity = 1 - env;
  walls.forEach((wall) => {
    wall.visible = wallMat.opacity > 0.02;
  });
  recess.visible = wallMat.opacity > 0.02;
  recess.material.opacity = wallMat.opacity;
  recess.material.transparent = true;
  obstacleMat.opacity = env;
  obstacle.visible = env > 0.02;

  scene.fog.color.copy(fogA).lerp(fogB, env);
  scene.fog.near = 14 + env * 8;
  scene.fog.far = 46 + env * 24;
  scene.background.copy(scene.fog.color);
  skyMat.uniforms.topColor.value.copy(skyTopA).lerp(skyTopB, env);
  skyMat.uniforms.horizonColor.value.copy(skyHorA).lerp(skyHorB, env);

  key.position.set(-11 - env * 8, 16 - env * 9, 7 - env * 2);
  key.target.position.set(0, 0.6, env * 4);
  key.target.updateMatrixWorld();
  key.color.copy(keyA).lerp(keyB, env);
  key.intensity = 3.35 + env * 0.7;
  exitLight.intensity = 0.35 + env * 0.55;
  renderer.toneMappingExposure = exposureAt(t);

  const guideOp = guidesOpacity(t);
  guideMat.opacity = guideOp;
  guides.visible = guideOp > 0.01;
  if (guides.visible) {
    for (const guide of guideLines) {
      const p = smooth(Math.min(1, Math.max(0, (t - guide.t0) / 0.45)));
      guide.line.scale.set(
        guide.axis === "x" ? Math.max(0.001, p) : 1,
        guide.axis === "y" ? Math.max(0.001, p) : 1,
        1,
      );
    }
  }

  for (const name of ["pier", "bearing", "wedge", "offcut"]) {
    const pose = pieces[name].position;
    const disc = discs[name];
    disc.position.x = pose.x;
    disc.position.z = pose.z;
    const lifted = Math.min(1, Math.max(0, pose.y / 0.45));
    const base = name === "offcut" ? offOp : 1;
    disc.material.opacity = 0.3 * (1 - lifted) * base;
    disc.visible = disc.material.opacity > 0.02;
  }

  dust.rotation.y = t * 0.012;
  dust.position.y = Math.sin(t * 0.05) * 0.2;
  const exitGlow = Math.max(0, Math.min(1, (t - 28.8) / 1.4)) * (1 - cap.wash);
  dust.material.opacity = Math.min(0.55, 0.1 + env * 0.16 + exitGlow * 0.5) * (1 - cap.wash);
  dust.visible = dust.material.opacity > 0.02;

  rayMat.opacity = exitGlow * 0.42;
  rays.visible = exitGlow > 0.02;
  glowMat.opacity = exitGlow * 0.6;
  glow.visible = exitGlow > 0.02;

  lineEl.textContent = cap.line;
  lineEl.style.opacity = String(cap.lineOpacity);
  lineEl.style.transform = `translateY(${((1 - cap.lineEnter) * 14).toFixed(2)}px)`;

  for (let i = 0; i < glyphStrokes.length; i += 1) {
    const stroke = glyphStrokes[i];
    const [a, b] = GLYPH_STAGGER[i];
    const p = Math.min(1, Math.max(0, (cap.glyph - a) / (b - a)));
    stroke.el.style.strokeDashoffset = `${stroke.len * (1 - p)}`;
  }
  glyphEl.style.opacity = String(Math.min(1, cap.glyph * 3));
  wordEl.style.opacity = String(cap.wordOpacity);
  const track = 0.85 - 0.35 * cap.wordTrack;
  wordEl.style.letterSpacing = `${track.toFixed(3)}em`;
  wordEl.style.paddingLeft = `${track.toFixed(3)}em`;
  wordEl.style.transform = `translateY(${((1 - cap.wordTrack) * 10).toFixed(2)}px)`;
  ruleEl.style.transform = `scaleX(${Math.max(0.001, cap.ruleScale).toFixed(3)})`;
  subEl.style.opacity = String(cap.subOpacity);
  tagEl.style.opacity = String(cap.tagOpacity);
  washEl.style.opacity = String(cap.wash);
  vignetteEl.style.opacity = String(cap.vignette * 0.9);
  flashEl.style.opacity = String(cap.flash);
  grainEl.style.opacity = String(0.16 * (1 - cap.wash * 0.85));
  const drift = Math.floor(t * FPS);
  grainEl.style.backgroundPosition = `${-(drift * 17) % 256}px ${-(drift * 11) % 256}px`;
  const barIn = smooth(Math.min(1, t / 1.1));
  barTopEl.style.height = `${(132 * barIn).toFixed(1)}px`;
  barBottomEl.style.height = `${(132 * barIn).toFixed(1)}px`;

  renderer.render(scene, camera);
}

async function boot() {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  window.renderFrame = (frame) => {
    const t = Math.min(DURATION, Math.max(0, frame / FPS));
    apply(t);
    return t;
  };
  window.__ready = true;
  const query = new URLSearchParams(location.search);
  if (query.has("controlled")) return;
  if (query.has("t")) {
    apply(parseFloat(query.get("t")) || 0);
    return;
  }
  const started = performance.now();
  const loop = (now) => {
    const t = Math.min(DURATION, (now - started) / 1000);
    apply(t);
    if (t < DURATION) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
