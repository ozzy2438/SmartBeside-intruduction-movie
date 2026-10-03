// Frame-locked clock for the Kinbuild film.
// Objects ease from isolation, through friction and a trial outside,
// into one asymmetric gateway.

export const FPS = 24;
export const DURATION = 35;

const LINTEL_HALF = 2.3;
const LINTEL_HALF_THICK = 0.22;

export function smooth(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sample(keys, t) {
  if (t <= keys[0].t) return clonePose(keys[0]);
  const last = keys[keys.length - 1];
  if (t >= last.t) return clonePose(last);
  let i = 1;
  while (keys[i].t < t) i += 1;
  const a = keys[i - 1];
  const b = keys[i];
  const u = smooth((t - a.t) / (b.t - a.t));
  const ar = a.r || [0, 0, 0];
  const br = b.r || [0, 0, 0];
  const al = a.l || a.p;
  const bl = b.l || b.p;
  return {
    p: a.p.map((v, k) => lerp(v, b.p[k], u)),
    r: ar.map((v, k) => lerp(v, br[k], u)),
    f: lerp(a.f ?? 35, b.f ?? 35, u),
    l: al.map((v, k) => lerp(v, bl[k], u)),
  };
}

function clonePose(k) {
  return {
    p: k.p.slice(),
    r: k.r ? k.r.slice() : [0, 0, 0],
    f: k.f ?? 35,
    l: (k.l || k.p).slice(),
  };
}

// Pier — tall limestone. "A skill."
const pierKeys = [
  { t: 0, p: [-4.8, 0, -1.4], r: [0, 0.55, -0.02] },
  { t: 6.3, p: [-4.8, 0, -1.4], r: [0, 0.55, -0.02] },
  { t: 9.55, p: [-2.28, 0, 0.22], r: [0, 1.18, -0.01] },
  { t: 10.35, p: [-2.28, 0, 0.22], r: [0, 1.18, -0.01] },
  { t: 11.45, p: [-2.02, 0, 0.32], r: [0, 1.36, -0.008] },
  { t: 12.35, p: [-1.7, 0, 0.16], r: [0, 1.46, 0] },
  { t: 13.2, p: [-1.18, 0, 0.02], r: [0.012, 1.58, -0.018] },
  { t: 13.85, p: [-1.18, 0, 0.02], r: [0.012, 1.58, -0.018] },
  { t: 14.6, p: [-1.92, 0, 0.4], r: [0.02, 1.1, -0.028] },
  { t: 15.15, p: [-1.92, 0, 0.4], r: [0.02, 1.1, -0.028] },
  { t: 16.05, p: [-1.28, 0, -0.02], r: [-0.018, 1.74, 0.03] },
  { t: 16.55, p: [-1.28, 0, -0.02], r: [-0.018, 1.74, 0.03] },
  { t: 17.4, p: [-1.1, 0, -0.04], r: [0, 1.5, -0.012] },
  { t: 19.5, p: [-1.16, 0, 3.7], r: [0.035, 1.46, 0.05] },
  { t: 21.05, p: [-1.22, 0, 5.2], r: [0.065, 1.38, 0.085] },
  { t: 22.55, p: [-1.3, 0, 5.05], r: [0.015, 1.36, 0.018] },
  { t: 24.7, p: [-1.72, 0, 0.03], r: [0.008, -0.05, -0.03] },
  { t: 35, p: [-1.72, 0, 0.03], r: [0.008, -0.05, -0.03] },
];

// Bearing — low graphite mass.
const bearingKeys = [
  { t: 0, p: [4.2, 0, 1.8], r: [0, -0.65, 0] },
  { t: 6.3, p: [4.2, 0, 1.8], r: [0, -0.65, 0] },
  { t: 10.2, p: [3.7, 0, 1.45], r: [0, -0.12, 0] },
  { t: 12.4, p: [2.2, 0, 0.4], r: [0, 0.18, 0] },
  { t: 13.2, p: [1.5, 0, -0.04], r: [0, 0.26, 0] },
  { t: 13.85, p: [1.5, 0, -0.04], r: [0, 0.26, 0] },
  { t: 14.6, p: [2.25, 0, 0.42], r: [0, -0.1, 0] },
  { t: 15.15, p: [2.25, 0, 0.42], r: [0, -0.1, 0] },
  { t: 16.05, p: [1.5, 0, -0.14], r: [0, 0.4, 0.025] },
  { t: 16.55, p: [1.5, 0, -0.14], r: [0, 0.4, 0.025] },
  { t: 17.4, p: [1.4, 0, 0.02], r: [0, 0.3, 0] },
  { t: 19.7, p: [1.5, 0, 4.35], r: [0.028, 0.28, 0.045] },
  { t: 21.15, p: [1.58, 0, 5.55], r: [0.055, 0.2, 0.09] },
  { t: 22.65, p: [1.66, 0, 5.35], r: [0.01, 0.16, 0.018] },
  { t: 24.6, p: [1.52, 0, -0.02], r: [0, 0.08, 0.01] },
  { t: 35, p: [1.52, 0, -0.02], r: [0, 0.08, 0.01] },
];

// Wedge — the piece that does not match. It tries, fails, then locks one haunch.
const wedgeKeys = [
  { t: 0, p: [-1.35, 0, 3.55], r: [0.1, -0.35, 0.22] },
  { t: 6.3, p: [-1.35, 0, 3.55], r: [0.1, -0.35, 0.22] },
  { t: 9.6, p: [-1.12, 0, 1.02], r: [0.14, 0.78, 0.56] },
  { t: 10.25, p: [-1.12, 0, 1.02], r: [0.14, 0.78, 0.56] },
  { t: 10.95, p: [-1.12, 0, 1.02], r: [0.02, 1.24, 0.18] },
  { t: 11.6, p: [-1.38, 0, 0.66], r: [0.02, 1.32, 0.22] },
  { t: 13.2, p: [0.02, 0, 0.62], r: [0.06, 0.92, 0.36] },
  { t: 13.85, p: [0.02, 0, 0.62], r: [0.06, 0.92, 0.36] },
  { t: 14.6, p: [-0.5, 0, 1.25], r: [0.2, 0.32, 0.68] },
  { t: 15.2, p: [-0.5, 0, 1.25], r: [0.2, 0.32, 0.68] },
  { t: 16.05, p: [0.48, 0, 0.28], r: [0, 1.32, 0.16] },
  { t: 16.55, p: [0.48, 0, 0.28], r: [0, 1.32, 0.16] },
  { t: 17.45, p: [1.02, 0, 0.16], r: [0.03, 1.05, 0.26] },
  { t: 19.6, p: [0.82, 0, 4.55], r: [0.07, 0.98, 0.34] },
  { t: 21.05, p: [0.55, 0, 5.6], r: [0.13, 0.82, 0.55] },
  { t: 22.75, p: [1.48, 0, 5.3], r: [0.015, 0.28, 0.1] },
  { t: 24.05, p: [1.28, 0, 0.9], r: [0.02, 0.18, 0.04] },
  { t: 25.2, p: [1.18, 1.82, 0.0], r: [0.01, 0.04, -0.02] },
  { t: 26.25, p: [1.18, 1.74, 0.0], r: [0.008, 0.03, -0.06] },
  { t: 35, p: [1.18, 1.74, 0.0], r: [0.008, 0.03, -0.06] },
];

// Lintel — a tall slab that only later becomes the span.
const lintelKeys = [
  { t: 0, p: [0.45, 0.24, -3.7], r: [0.04, 0.5, 0.03] },
  { t: 6.3, p: [0.45, 0.24, -3.7], r: [0.04, 0.5, 0.03] },
  { t: 10.4, p: [0.15, 0.24, -2.3], r: [0.03, 0.85, 0.05] },
  { t: 12.5, p: [0.0, 0.24, -1.45], r: [0.02, 1.1, 0.04] },
  { t: 13.25, p: [-0.15, 0.24, -1.05], r: [0.04, 1.25, 0.09] },
  { t: 13.9, p: [-0.15, 0.24, -1.05], r: [0.04, 1.25, 0.09] },
  { t: 14.65, p: [0.4, 0.24, -2.05], r: [0.01, 0.55, 0.02] },
  { t: 15.2, p: [0.4, 0.24, -2.05], r: [0.01, 0.55, 0.02] },
  { t: 16.1, p: [-0.25, 0.24, -0.7], r: [0.06, 1.45, 0.12] },
  { t: 16.6, p: [-0.25, 0.24, -0.7], r: [0.06, 1.45, 0.12] },
  { t: 17.45, p: [0.05, 0.24, -0.45], r: [0.02, 1.05, 0.04] },
  { t: 19.9, p: [0.2, 0.26, 3.3], r: [0.08, 0.85, 0.1] },
  { t: 21.25, p: [0.35, 0.28, 4.7], r: [0.12, 0.6, 0.16] },
  { t: 22.85, p: [0.1, 0.24, 4.2], r: [0.03, 0.45, 0.04] },
  { t: 24.25, p: [0.02, 1.7, 1.15], r: [0.02, 0.15, 0.35] },
  { t: 25.3, p: [0.0, 3.2, 0.06], r: [0.01, -0.01, 0.04] },
  { t: 26.2, p: [0.0, 3.1, 0.0], r: [0.005, -0.02, -0.07] },
  { t: 26.55, p: [0.0, 3.06, 0.0], r: [0.004, -0.02, -0.09] },
  { t: 35, p: [0.0, 3.06, 0.0], r: [0.004, -0.02, -0.09] },
];

const FALL = 21.15;

function lintelPose(t) {
  const pose = sample(lintelKeys, t);
  const theta = Math.abs(pose.r[2]);
  const minY = LINTEL_HALF * Math.sin(Math.min(theta, Math.PI / 2))
    + LINTEL_HALF_THICK * Math.abs(Math.cos(theta))
    + 0.04;
  pose.p[1] = Math.max(pose.p[1], minY);
  return pose;
}

function offcutPose(t) {
  const b = sample(bearingKeys, Math.min(t, FALL));
  const lean = -0.42;
  if (t <= FALL) {
    return {
      p: [b.p[0] + 0.78, 0, b.p[2] + 0.16],
      r: [0, b.r[1] * 0.15, lean],
    };
  }
  const snap = sample(bearingKeys, FALL);
  const originX = snap.p[0] + 0.78;
  const originZ = snap.p[2] + 0.16;
  const dt = t - FALL;
  const dur = 0.7;
  const u = Math.min(1, dt / dur);
  const accel = u * u;
  const angle = lean + (-Math.PI / 2 - lean) * accel;
  let wobble = 0;
  if (dt > dur) {
    const s = dt - dur;
    wobble = Math.sin(s * 13.5) * Math.exp(-4.2 * s) * 0.045;
  }
  const slide = accel * 0.38;
  return {
    p: [originX + slide, 0, originZ + slide * 0.12],
    r: [wobble * 0.4, snap.r[1] * 0.15, angle + wobble],
  };
}

export function piecePose(name, t) {
  if (name === "pier") return sample(pierKeys, t);
  if (name === "bearing") return sample(bearingKeys, t);
  if (name === "wedge") return sample(wedgeKeys, t);
  if (name === "lintel") return lintelPose(t);
  if (name === "offcut") return offcutPose(t);
  throw new Error(`Unknown piece ${name}`);
}

export function offcutOpacity(t) {
  if (t < 23.05) return 1;
  if (t > 24.35) return 0;
  return 1 - smooth((t - 23.05) / 1.3);
}

export function envBlend(t) {
  if (t < 17.55) return 0;
  if (t < 19.15) return smooth((t - 17.55) / 1.6);
  if (t < 22.15) return 1;
  if (t < 23.85) return 1 - smooth((t - 22.15) / 1.7);
  return 0;
}

export function guidesOpacity(t) {
  if (t < 11.7) return 0;
  if (t < 12.45) return smooth((t - 11.7) / 0.75) * 0.4;
  if (t < 17.35) return 0.4;
  if (t < 18.25) return 0.4 * (1 - smooth((t - 17.35) / 0.9));
  return 0;
}

function orbit(t) {
  const u = smooth((t - 26.05) / (28.85 - 26.05));
  const a = lerp(0.58, Math.PI, u);
  const radius = lerp(6.7, 9.5, u);
  const y = lerp(1.82, 2.42, u);
  return {
    p: [Math.sin(a) * radius, y, Math.cos(a) * radius],
    l: [0, 1.55, 0],
    f: lerp(30, 36, u),
  };
}

const cameraKeys = [
  { t: 0, p: [0.4, 3.9, 14.2], l: [-0.15, 1.2, -0.3], f: 40 },
  { t: 2.25, p: [-2.35, 1.55, 1.7], l: [-4.8, 1.5, -1.4], f: 27 },
  { t: 3.7, p: [-3.5, 1.5, -0.5], l: [-4.75, 1.58, -1.35], f: 18 },
  { t: 5.1, p: [0.55, 1.15, 6.15], l: [-1.35, 0.5, 3.55], f: 30 },
  { t: 6.55, p: [3.7, 2.1, 0.55], l: [0.4, 0.28, -3.6], f: 34 },
  { t: 8.15, p: [0.15, 13.2, 4.8], l: [0, 0, 0.3], f: 39 },
  { t: 9.7, p: [0.95, 1.32, 3.55], l: [-1.7, 0.72, 0.55], f: 26 },
  { t: 11.5, p: [2.35, 1.72, 4.7], l: [-0.7, 0.95, 0.35], f: 31 },
  { t: 13.25, p: [5.15, 2.45, 5.35], l: [0.05, 1.05, 0.1], f: 34 },
  { t: 15.25, p: [0.25, 8.4, 6.1], l: [0.1, 0.35, 0.05], f: 32 },
  { t: 17.15, p: [-3.35, 1.5, 4.55], l: [0.15, 1.15, 0.05], f: 29 },
  { t: 19.4, p: [-6.4, 2.35, 0.2], l: [0.15, 1.35, 4.4], f: 36 },
  { t: 21.65, p: [6.2, 1.9, 0.8], l: [0.45, 1.15, 5.2], f: 32 },
  { t: 23.3, p: [3.8, 2.2, 8.4], l: [0.2, 1.35, 3.6], f: 33 },
  { t: 25.15, p: [4.35, 1.78, 5.9], l: [0, 1.45, 0.05], f: 30 },
  { t: 26.05, p: [3.685, 1.82, 5.601], l: [0, 1.55, 0], f: 30 },
  { t: 28.85, p: [0, 2.42, -9.5], l: [0, 1.55, 0], f: 36 },
  { t: 30.05, p: [0.04, 1.58, -5.6], l: [0.02, 1.55, 0.1], f: 32 },
  { t: 31.2, p: [0.03, 1.5, -2.55], l: [0, 1.65, 1.2], f: 36 },
  { t: 32.15, p: [0.02, 1.48, -1.15], l: [0, 1.85, 4], f: 42 },
  { t: 35, p: [0.0, 1.52, -0.55], l: [0, 2.05, 6], f: 46 },
];

export function cameraPose(t) {
  if (t >= 26.05 && t < 28.85) return orbit(t);
  const pose = sample(cameraKeys, t);
  return { p: pose.p, l: pose.l, f: pose.f };
}

function fadeWindow(t, t0, t1, fade = 0.38) {
  if (t < t0 || t > t1) return 0;
  return Math.min(1, (t - t0) / fade, (t1 - t) / fade);
}

function fadeIn(t, t0, dur = 0.4) {
  if (t < t0) return 0;
  return smooth(Math.min(1, (t - t0) / dur));
}

const LINES = [
  { text: "A skill.", t0: 1.25, t1: 3.2 },
  { text: "An idea.", t0: 3.55, t1: 5.2 },
  { text: "A different point of view.", t0: 5.45, t1: 7.05 },
  { text: "Meeting is easy.", t0: 7.35, t1: 8.95 },
  { text: "Building together is different.", t0: 9.4, t1: 11.45 },
  { text: "Test.", t0: 12.4, t1: 13.45 },
  { text: "Learn.", t0: 13.75, t1: 14.8 },
  { text: "Adjust.", t0: 15.1, t1: 16.15 },
  { text: "Build again.", t0: 16.45, t1: 17.55 },
  { text: "The idea meets reality.", t0: 18.45, t1: 20.45 },
  { text: "Evidence changes the plan.", t0: 20.8, t1: 22.85 },
  { text: "Different strengths.", t0: 23.55, t1: 25.45 },
  { text: "Shared direction.", t0: 25.85, t1: 28.35 },
];

export function captionState(t) {
  let line = "";
  let lineOpacity = 0;
  for (const entry of LINES) {
    const o = fadeWindow(t, entry.t0, entry.t1, 0.36);
    if (o > lineOpacity) {
      line = entry.text;
      lineOpacity = o;
    }
  }
  let wash = 0;
  if (t >= 31.25) {
    wash = smooth(Math.min(1, (t - 31.25) / 1.05)) * 0.97;
  }
  return {
    line,
    lineOpacity: lineOpacity * (1 - smooth(Math.min(1, wash / 0.35))),
    markOpacity: fadeIn(t, 31.9, 0.4),
    subOpacity: fadeIn(t, 32.35, 0.36),
    tagOpacity: fadeIn(t, 32.75, 0.34),
    wash,
    vignette: 1 - wash,
  };
}

export function exposureAt(t) {
  const env = envBlend(t);
  let exposure = 1.04 + env * 0.12;
  if (t > 29.5) exposure = lerp(exposure, 1.65, smooth(Math.min(1, (t - 29.5) / 1.35)));
  if (t > 30.8) exposure = lerp(exposure, 2.15, smooth(Math.min(1, (t - 30.8) / 1.1)));
  return exposure;
}

export const cues = [
  { t: 2.05, type: "scrape", gain: 0.16, pan: -0.45 },
  { t: 4.15, type: "tick", gain: 0.1, pan: -0.2 },
  { t: 5.7, type: "scrape", gain: 0.12, pan: 0.15 },
  { t: 7.7, type: "scrape", gain: 0.18, pan: -0.25 },
  { t: 9.55, type: "tick", gain: 0.26, pan: -0.1 },
  { t: 10.7, type: "scrape", gain: 0.18, pan: 0.05 },
  { t: 11.45, type: "tick", gain: 0.2, pan: -0.15 },
  { t: 12.45, type: "pulse", gain: 0.2, pan: 0 },
  { t: 13.8, type: "pulse", gain: 0.22, pan: 0.08 },
  { t: 15.15, type: "pulse", gain: 0.22, pan: -0.06 },
  { t: 16.5, type: "pulse", gain: 0.24, pan: 0.04 },
  { t: 17.85, type: "pulse", gain: 0.16, pan: 0 },
  { t: 18.7, type: "air", gain: 0.18, pan: 0 },
  { t: 19.2, type: "pulse", gain: 0.15, pan: 0.12 },
  { t: 20.55, type: "pulse", gain: 0.14, pan: -0.1 },
  { t: 21.15, type: "fall", gain: 0.42, pan: 0.32 },
  { t: 22.4, type: "scrape", gain: 0.2, pan: 0.22 },
  { t: 22.55, type: "pulse", gain: 0.12, pan: 0 },
  { t: 23.9, type: "pulse", gain: 0.1, pan: -0.05 },
  { t: 24.35, type: "scrape", gain: 0.16, pan: 0 },
  { t: 25.45, type: "tick", gain: 0.2, pan: 0.18 },
  { t: 26.2, type: "impact", gain: 0.62, pan: 0 },
];
