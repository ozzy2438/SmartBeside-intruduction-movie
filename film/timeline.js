// Frame-locked clock for the Kinbuild film.
// Objects ease from isolation, through a measured miss, into exact seats.

import { LOCK, PIECE } from "./fit.js";

export const FPS = 24;
export const DURATION = 35;

const GROUND_LINTEL_Y = PIECE.lintelH / 2;
const R0 = [0, 0, 0];

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

const PIER_HOME = [-4.7, 0, -1.6];
const BEARING_HOME = [4.4, 0, 1.8];
const WEDGE_HOME = [-1.45, 0, 3.35];
const LINTEL_HOME = [0.55, GROUND_LINTEL_Y, -3.7];

const TRIAL = {
  pier: [-1.35, 0, 0],
  bearing: [1.55, 0, 0],
  wedge: [0.1, 0, 0.95],
  lintel: [0, GROUND_LINTEL_Y, -1.7],
};

// Pier — tall limestone. Slides on the ground, then stands exactly under the beam.
const pierKeys = [
  { t: 0, p: PIER_HOME, r: [0, 0.45, 0] },
  { t: 6.3, p: PIER_HOME, r: [0, 0.45, 0] },
  { t: 9.5, p: [-2.05, 0, 0.35], r: [0, 0.28, 0] },
  { t: 10.15, p: [-2.05, 0, 0.35], r: [0, 0.28, 0] },
  { t: 11.35, p: [-1.82, 0, 0.2], r: [0, 0.08, 0] },
  { t: 12.3, p: [-1.7, 0, 0.12], r: [0, 0.12, 0] },
  { t: 13.15, p: TRIAL.pier, r: R0 },
  { t: 13.7, p: TRIAL.pier, r: R0 },
  { t: 14.45, p: [-1.9, 0, 0], r: [0, -0.12, 0] },
  { t: 15.05, p: [-1.9, 0, 0], r: [0, -0.12, 0] },
  { t: 15.85, p: TRIAL.pier, r: [0, 0.06, 0] },
  { t: 16.4, p: TRIAL.pier, r: [0, 0.06, 0] },
  { t: 17.2, p: TRIAL.pier, r: R0 },
  { t: 19.6, p: [-1.35, 0, 4.4], r: [0.03, 0, 0.02] },
  { t: 21.2, p: [-1.35, 0, 4.7], r: [0.05, 0, 0.04] },
  { t: 22.5, p: [-1.4, 0, 4.5], r: R0 },
  { t: 24.5, p: LOCK.pier, r: R0 },
  { t: 35, p: LOCK.pier, r: R0 },
];

const bearingKeys = [
  { t: 0, p: BEARING_HOME, r: [0, -0.55, 0] },
  { t: 6.3, p: BEARING_HOME, r: [0, -0.55, 0] },
  { t: 10.4, p: [3.2, 0, 1.1], r: [0, -0.2, 0] },
  { t: 12.4, p: [2.15, 0, 0.25], r: [0, -0.08, 0] },
  { t: 13.15, p: TRIAL.bearing, r: R0 },
  { t: 13.7, p: TRIAL.bearing, r: R0 },
  { t: 14.45, p: [2.15, 0, 0], r: [0, 0.1, 0] },
  { t: 15.05, p: [2.15, 0, 0], r: [0, 0.1, 0] },
  { t: 15.85, p: TRIAL.bearing, r: [0, -0.05, 0] },
  { t: 16.4, p: TRIAL.bearing, r: [0, -0.05, 0] },
  { t: 17.2, p: TRIAL.bearing, r: R0 },
  { t: 19.6, p: [1.55, 0, 4.4], r: [0.03, 0, 0.02] },
  { t: 21.2, p: [1.55, 0, 4.7], r: [0.05, 0, 0.035] },
  { t: 22.55, p: [1.6, 0, 4.5], r: R0 },
  { t: 24.45, p: LOCK.bearing, r: R0 },
  { t: 35, p: LOCK.bearing, r: R0 },
];

// Wedge — approaches, leaves a measured gap, then rises and seats.
const wedgeKeys = [
  { t: 0, p: WEDGE_HOME, r: [0, -0.4, 0] },
  { t: 6.3, p: WEDGE_HOME, r: [0, -0.4, 0] },
  { t: 9.5, p: [-0.72, 0, 0.85], r: [0, 0.55, 0] },
  { t: 10.2, p: [-0.72, 0, 0.85], r: [0, 0.55, 0] },
  { t: 10.9, p: [-0.72, 0, 0.85], r: [0, 0.12, 0] },
  { t: 11.5, p: [-0.88, 0, 0.42], r: [0, 0.18, 0] },
  { t: 13.15, p: TRIAL.wedge, r: R0 },
  { t: 13.7, p: TRIAL.wedge, r: R0 },
  { t: 14.45, p: [0.1, 0, 1.55], r: [0, 0.2, 0] },
  { t: 15.05, p: [0.1, 0, 1.55], r: [0, 0.2, 0] },
  { t: 15.85, p: TRIAL.wedge, r: [0, -0.08, 0] },
  { t: 16.4, p: TRIAL.wedge, r: [0, -0.08, 0] },
  { t: 17.2, p: [0.35, 0, 0.9], r: R0 },
  { t: 19.6, p: [0.35, 0, 5.3], r: [0.03, 0, 0.02] },
  { t: 21.15, p: [0.2, 0, 5.55], r: [0.05, 0.1, 0.04] },
  { t: 22.6, p: [2.25, 0, 4.55], r: R0 },
  { t: 24.2, p: [2.32, 0, 0], r: R0 },
  { t: 24.7, p: [2.32, 0, 0], r: R0 },
  { t: 25.2, p: [2.32, LOCK.wedge[1] + 0.02, 0], r: R0 },
  { t: 25.8, p: [LOCK.wedge[0], LOCK.wedge[1] + 0.02, 0], r: R0 },
  { t: 26.08, p: LOCK.wedge, r: R0 },
  { t: 35, p: LOCK.wedge, r: R0 },
];

// Lintel — stays level. It is lifted, slid over the piers, then lowered onto them.
const lintelKeys = [
  { t: 0, p: LINTEL_HOME, r: [0, 0.4, 0] },
  { t: 6.3, p: LINTEL_HOME, r: [0, 0.4, 0] },
  { t: 10.5, p: [0.1, GROUND_LINTEL_Y, -2.5], r: [0, 0.15, 0] },
  { t: 13.15, p: TRIAL.lintel, r: R0 },
  { t: 13.7, p: TRIAL.lintel, r: R0 },
  { t: 14.45, p: [0, GROUND_LINTEL_Y, -2.3], r: [0, 0.12, 0] },
  { t: 15.05, p: [0, GROUND_LINTEL_Y, -2.3], r: [0, 0.12, 0] },
  { t: 15.85, p: TRIAL.lintel, r: R0 },
  { t: 16.4, p: TRIAL.lintel, r: R0 },
  { t: 17.2, p: TRIAL.lintel, r: R0 },
  { t: 19.6, p: [0, GROUND_LINTEL_Y, 2.7], r: [0.025, 0, 0] },
  { t: 21.2, p: [0.05, GROUND_LINTEL_Y, 3.0], r: [0.04, 0, 0.02] },
  { t: 22.6, p: [0, GROUND_LINTEL_Y, 2.6], r: R0 },
  { t: 24.15, p: [LOCK.lintel[0], GROUND_LINTEL_Y, -2.5], r: R0 },
  { t: 25.05, p: [LOCK.lintel[0], 3.62, -2.5], r: R0 },
  { t: 25.85, p: [LOCK.lintel[0], 3.62, LOCK.lintel[2]], r: R0 },
  { t: 26.5, p: LOCK.lintel, r: R0 },
  { t: 35, p: LOCK.lintel, r: R0 },
];

const FALL = 21.15;

function lintelPose(t) {
  return sample(lintelKeys, t);
}

function offcutPose(t) {
  const beside = PIECE.bearingW / 2 + 0.16;
  const b = sample(bearingKeys, Math.min(t, FALL));
  const lean = -0.28;
  if (t <= FALL) {
    return {
      p: [b.p[0] + beside, 0, b.p[2] + 0.12],
      r: [0, 0, lean],
    };
  }
  const snap = sample(bearingKeys, FALL);
  const originX = snap.p[0] + beside;
  const originZ = snap.p[2] + 0.12;
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
  const u = smooth((t - 26.7) / (29.2 - 26.7));
  const a = lerp(0.48, Math.PI, u);
  const radius = lerp(7.4, 9.8, u);
  const y = lerp(1.72, 2.4, u);
  return {
    p: [Math.sin(a) * radius, y, Math.cos(a) * radius],
    l: [-0.05, 1.6, 0],
    f: lerp(30, 36, u),
  };
}

const cameraKeys = [
  { t: 0, p: [0.15, 4.4, 17.2], l: [-0.15, 1.05, -0.15], f: 44 },
  { t: 2.2, p: [-2.3, 1.55, 1.2], l: [-4.7, 1.5, -1.6], f: 27 },
  { t: 3.65, p: [-5.5, 1.25, -0.1], l: [-4.75, 1.5, -1.28], f: 22 },
  { t: 4.3, p: [-4.95, 1.45, -0.32], l: [-4.7, 1.52, -1.26], f: 15 },
  { t: 5.05, p: [0.35, 1.12, 5.9], l: [-1.45, 0.45, 3.35], f: 30 },
  { t: 6.5, p: [3.4, 1.95, -0.9], l: [0.55, 0.28, -3.7], f: 33 },
  { t: 8.15, p: [0.4, 13.4, 4.9], l: [0, 0, 0.2], f: 38 },
  { t: 8.95, p: [-1.7, 12.4, 4.3], l: [0, 0, 0.2], f: 40 },
  { t: 9.7, p: [0.55, 1.18, 2.55], l: [-1.3, 0.45, 0.5], f: 28 },
  { t: 11.45, p: [1.7, 1.5, 3.2], l: [-1.25, 0.5, 0.3], f: 32 },
  { t: 13.2, p: [4.7, 2.4, 5.0], l: [0.1, 0.7, 0], f: 35 },
  { t: 13.75, p: [3.9, 2.05, 4.0], l: [0.1, 0.75, 0], f: 29 },
  { t: 15.2, p: [0.2, 9.6, 6.0], l: [0.05, 0.3, 0], f: 32 },
  { t: 15.95, p: [-2.2, 8.0, 5.3], l: [0.05, 0.3, 0], f: 34 },
  { t: 16.5, p: [-3.1, 4.4, 4.9], l: [0.1, 0.5, 0], f: 31 },
  { t: 17.15, p: [-3.2, 1.5, 4.2], l: [0.1, 0.7, 0], f: 29 },
  { t: 19.5, p: [-5.6, 2.15, 1.0], l: [0.1, 0.9, 4.3], f: 36 },
  { t: 20.15, p: [-7.0, 2.45, -0.4], l: [0.1, 1.0, 4.4], f: 41 },
  { t: 21.0, p: [5.9, 1.55, 1.2], l: [0.3, 0.6, 4.6], f: 31 },
  { t: 21.8, p: [4.5, 1.05, 5.7], l: [1.9, 0.12, 5.1], f: 25 },
  { t: 22.7, p: [3.6, 1.7, 6.0], l: [0.9, 0.5, 4.6], f: 30 },
  { t: 23.5, p: [3.4, 2.0, 6.8], l: [0.15, 0.7, 1.2], f: 33 },
  { t: 24.9, p: [4.6, 1.85, 5.0], l: [0, 1.4, -0.8], f: 32 },
  { t: 25.75, p: [3.4, 2.1, 4.3], l: [0, 2.7, -1.0], f: 30 },
  { t: 26.5, p: [3.15, 2.45, 4.15], l: [0.35, 2.35, 0], f: 27 },
  { t: 26.7, p: [3.417, 1.72, 6.564], l: [-0.05, 1.6, 0], f: 30 },
  { t: 29.2, p: [0, 2.4, -9.6], l: [-0.05, 1.6, 0], f: 36 },
  { t: 30.2, p: [-0.1, 1.55, -5.2], l: [-0.05, 1.6, 0.4], f: 39 },
  { t: 30.95, p: [-0.1, 1.5, -2.4], l: [-0.05, 1.7, 2.0], f: 44 },
  { t: 32.0, p: [-0.08, 1.52, -0.9], l: [-0.05, 1.85, 4.0], f: 46 },
  { t: 35, p: [-0.08, 1.55, -0.3], l: [-0.05, 1.95, 5.0], f: 48 },
];

export function cameraPose(t) {
  if (t >= 26.7 && t < 29.2) return orbit(t);
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

function flashOpacity(t) {
  let flash = 0;
  if (t >= 26.5) flash += 0.14 * Math.exp(-(t - 26.5) / 0.12);
  if (t >= 21.61) flash += 0.05 * Math.exp(-(t - 21.61) / 0.1);
  return Math.min(0.18, flash);
}

export function shakeAt(t) {
  let amp = 0;
  if (t >= 26.5) amp += 0.045 * Math.exp(-(t - 26.5) / 0.3);
  if (t >= 21.61) amp += 0.016 * Math.exp(-(t - 21.61) / 0.22);
  if (amp <= 0.0005) return [0, 0];
  return [
    Math.sin(t * 150) * amp,
    Math.cos(t * 123) * amp * 0.7,
  ];
}

export function idleWobble(t) {
  if (t > 24.0) return 0;
  if (t > 22.8) return 1 - smooth((t - 22.8) / 1.2);
  return 1;
}

export function captionState(t) {
  let line = "";
  let lineOpacity = 0;
  let lineStart = 0;
  for (const entry of LINES) {
    const o = fadeWindow(t, entry.t0, entry.t1, 0.36);
    if (o > lineOpacity) {
      line = entry.text;
      lineOpacity = o;
      lineStart = entry.t0;
    }
  }
  const lineEnter = smooth(Math.min(1, Math.max(0, (t - lineStart) / 0.3)));
  let wash = 0;
  if (t >= 30.9) {
    wash = smooth(Math.min(1, (t - 30.9) / 0.85)) * 0.97;
  }
  return {
    line,
    lineOpacity: lineOpacity * (1 - smooth(Math.min(1, wash / 0.35))),
    lineEnter,
    glyph: t >= 31.15 ? smooth(Math.min(1, (t - 31.15) / 1.05)) : 0,
    wordOpacity: fadeIn(t, 31.95, 0.4),
    wordTrack: smooth(Math.min(1, Math.max(0, (t - 31.95) / 1.0))),
    ruleScale: smooth(Math.min(1, Math.max(0, (t - 32.45) / 0.55))),
    subOpacity: fadeIn(t, 32.75, 0.36),
    tagOpacity: fadeIn(t, 33.15, 0.34),
    flash: flashOpacity(t),
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
  { t: 21.61, type: "tick", gain: 0.3, pan: 0.32 },
  { t: 25.8, type: "scrape", gain: 0.14, pan: 0.1 },
  { t: 26.08, type: "tick", gain: 0.2, pan: 0.16 },
  { t: 26.5, type: "impact", gain: 0.58, pan: 0 },
  { t: 29.35, type: "air", gain: 0.2, pan: 0 },
];
