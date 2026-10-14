// Original 30-second soundtrack for the three·words promo (promo.html), synthesized
// from scratch (no samples, nothing to license). Bright and warm: F major, 104 BPM,
// 13 bars = exactly 30 s, every scene change on a downbeat.
//   Bar 0      (0–2.3 s)    pad and felt keys; a mallet note under each hook line
//   Bar 1      (2.3–4.6 s)  eight bell notes as the star's eight rays burst; IV–V into the groove
//   Bars 2–5   (4.6–13.8 s) groove: kick, claps, hats, shaker, bass, plucked arpeggio;
//                           a whoosh for each subject, three rising notes for its three words
//   Bars 6–7   (13.8–18.5 s) lighter groove; key ticks as the words are typed, a tap, a ding
//   Bars 8–9   (18.5–23.1 s) melody, and a soft note as each new word lands in the cloud
//   Bar 10     (23.1–25.4 s) breakdown: one chord a line, then a fill
//   Bar 11     (25.4–27.7 s) the lift ("Your turn.")
//   Bar 12     (27.7–30 s)   final F chord, strum, the bells again for the star, fade
// Usage: node promo-music.mjs <out.wav>
import fs from "node:fs";

const SR = 44100;
const BPM = 104;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
const DUR = 30;
const N = Math.round(SR * DUR);
const TAU = 2 * Math.PI;

const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N);
const duck = new Float32Array(N).fill(1); // kick sidechain for pad and keys

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 20261014;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed / 4294967296) * 2 - 1; };
const panLR = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];
const at = (bar, beat = 0) => bar * BAR + beat * BEAT;
function put(i, l, r, send) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
  if (send) { sendL[i] += l * send; sendR[i] += r * send; }
}
// Short fade at the end of every note so nothing clicks.
const tailFade = (k, len, ms = 25) => Math.min(1, (len - k) / (SR * ms / 1000));

function biquad(type, f, q = 0.707) {
  const w = (TAU * f) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; } // band-pass, 0 dB peak
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

// ---- Harmony: I–vi–IV–V in F, voice-led ----
const CH = {
  F:  { pad: [53, 57, 60, 65], keys: [57, 60, 65], arp: [53, 57, 60, 65], root: 41 },
  Dm: { pad: [50, 57, 62, 65], keys: [57, 62, 65], arp: [50, 57, 62, 65], root: 38 },
  Bb: { pad: [50, 58, 62, 65], keys: [58, 62, 65], arp: [50, 53, 58, 62], root: 34 },
  C:  { pad: [52, 55, 60, 64], keys: [55, 60, 64], arp: [52, 55, 60, 64], root: 36 },
};
// One chord a bar; bar 1 turns to C halfway, bar 10 is three stabs, bar 11 turns to C on beat 4.
const BARS = ["F", "Bb", "F", "Dm", "Bb", "C", "F", "Dm", "Bb", "C", "Dm", "F", "F"];

// ---- Instruments ----
function pad(t0, t1, notes, gain) {
  const n0 = Math.round(t0 * SR), attack = 0.35, release = 0.45;
  const len = Math.round((t1 - t0 + release) * SR);
  const voices = [[-7, -0.55], [0, 0], [7, 0.55]]; // cents, pan
  for (const m of notes) {
    for (const [cents, p] of voices) {
      const f = mtof(m) * Math.pow(2, cents / 1200);
      const [gl, gr] = panLR(p);
      const ph0 = Math.abs(rnd()) * TAU;
      for (let k = 0; k < len; k++) {
        const t = k / SR, i = n0 + k;
        if (i >= N) break;
        const env = Math.min(1, t / attack) * (t > t1 - t0 ? Math.max(0, 1 - (t - (t1 - t0)) / release) : 1);
        const bright = 0.65 + 0.35 * Math.sin(TAU * 0.13 * (i / SR));
        let v = 0;
        for (let h = 1; h <= 7; h++) {
          const amp = (1 / h) * Math.exp(-(h - 1) / 2.2) * (h >= 3 ? bright : 1);
          v += amp * Math.sin(ph0 * h + TAU * f * h * t);
        }
        v *= env * gain * duck[i];
        put(i, v * gl, v * gr, 0.55);
      }
    }
  }
}

function keys(t0, notes, vel, decay, p = 0) {
  const n0 = Math.round(t0 * SR), len = Math.round(Math.min(decay * 3.2, 3.5) * SR);
  for (const m of notes) {
    const f = mtof(m);
    for (let k = 0; k < len; k++) {
      const t = k / SR, i = n0 + k;
      if (i >= N) break;
      const env = (1 - Math.exp(-t / 0.004)) * Math.exp(-t / decay) * tailFade(k, len);
      const index = 1.6 * Math.exp(-t / 0.16) + 0.3;
      const v = (Math.sin(TAU * f * t + index * Math.sin(TAU * f * t)) + 0.12 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.25)) * env * vel * 0.075 * duck[i];
      const trem = 0.25 * Math.sin(TAU * 4.4 * t);
      const [gl, gr] = panLR(Math.max(-1, Math.min(1, p + trem)));
      put(i, v * gl, v * gr, 0.4);
    }
  }
}

// Karplus–Strong plucked string: warm, guitar-like.
function pluck(t0, m, vel, p = 0, ring = 1.0) {
  const f = mtof(m), P = SR / f - 0.5, Pi = Math.floor(P);
  const len = Math.round(ring * SR), y = new Float32Array(len);
  let lp = 0, mean = 0;
  for (let n = 0; n <= Pi + 1; n++) { lp += 0.45 * (rnd() - lp); y[n] = lp; mean += lp; }
  mean /= Pi + 2;
  for (let n = 0; n <= Pi + 1; n++) y[n] -= mean;
  for (let n = Pi + 2; n < len; n++) {
    const d = n - P, i0 = Math.floor(d), fr = d - i0;
    const a = y[i0] * (1 - fr) + y[i0 + 1] * fr;
    const b = y[i0 - 1] * (1 - fr) + y[i0] * fr;
    y[n] = 0.996 * 0.5 * (a + b);
  }
  const n0 = Math.round(t0 * SR), [gl, gr] = panLR(p);
  for (let k = 0; k < len; k++) {
    const v = y[k] * vel * 0.55 * tailFade(k, len, 40);
    put(n0 + k, v * gl, v * gr, 0.3);
  }
}

// Marimba-like mallet for the melody.
function mallet(t0, m, vel, p = 0, ring = 1.3) {
  const f = mtof(m), n0 = Math.round(t0 * SR), len = Math.round(ring * SR), [gl, gr] = panLR(p);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const v = ((1 - Math.exp(-t / 0.002)) * Math.exp(-t / 0.42) * Math.sin(TAU * f * t)
      + 0.3 * Math.exp(-t / 0.07) * Math.sin(TAU * 3.93 * f * t)
      + 0.06 * Math.exp(-t / 0.025) * Math.sin(TAU * 9.2 * f * t)) * vel * 0.13 * tailFade(k, len);
    put(n0 + k, v * gl, v * gr, 0.35);
  }
}

// Glockenspiel-like bell (bar partials at 2.76× and 5.4×): the star's rays and the words.
function bell(t0, m, vel, p = 0, ring = 1.6) {
  const f = mtof(m), n0 = Math.round(t0 * SR), len = Math.round(ring * SR), [gl, gr] = panLR(p);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const v = (1 - Math.exp(-t / 0.0015)) * (Math.exp(-t / 0.5) * Math.sin(TAU * f * t)
      + 0.32 * Math.exp(-t / 0.16) * Math.sin(TAU * 2.76 * f * t)
      + 0.1 * Math.exp(-t / 0.06) * Math.sin(TAU * 5.4 * f * t)) * vel * 0.085 * tailFade(k, len);
    put(n0 + k, v * gl, v * gr, 0.5);
  }
}

function bass(t0, m, beats, vel) {
  const f = mtof(m), n0 = Math.round(t0 * SR), len = Math.round(beats * BEAT * 0.92 * SR);
  const lp = biquad("lp", 900);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.006) * (0.72 + 0.28 * Math.exp(-t / 0.15)) * tailFade(k, len, 30);
    const ph = TAU * f * t;
    const v = lp((Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * env * vel * 0.2);
    put(n0 + k, v * 0.707, v * 0.707, 0);
  }
}

function kick(t0, vel = 1) {
  const n0 = Math.round(t0 * SR), len = Math.round(0.42 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    ph += (TAU * (48 + 75 * Math.exp(-t / 0.032))) / SR;
    const click = k < SR * 0.003 ? rnd() * 0.25 * (1 - k / (SR * 0.003)) : 0;
    const v = (Math.sin(ph) * Math.exp(-t / 0.26) + click) * vel * 0.42 * tailFade(k, len);
    put(n0 + k, v * 0.707, v * 0.707, 0);
  }
  // Sidechain: pads and keys dip under each kick, the "pumping" modern feel.
  const dlen = Math.round(0.35 * SR);
  for (let k = 0; k < dlen; k++) {
    const i = n0 + k;
    if (i >= N) break;
    duck[i] = Math.min(duck[i], 1 - 0.38 * Math.exp(-k / SR / 0.11));
  }
}

function clap(t0, vel = 1, p = 0.05) {
  const n0 = Math.round(t0 * SR), len = Math.round(0.32 * SR), bp = biquad("bp", 1500, 0.9), [gl, gr] = panLR(p);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    let env = 0;
    for (const off of [0, 0.011, 0.022]) if (t >= off) env = Math.max(env, Math.exp(-(t - off) / 0.007));
    env = Math.max(env, 0.55 * Math.exp(-Math.max(0, t - 0.022) / 0.11) * (t >= 0.022 ? 1 : 0));
    const v = bp(rnd()) * env * vel * 0.5 * tailFade(k, len);
    put(n0 + k, v * gl, v * gr, 0.45);
  }
}

function hat(t0, vel, p = 0.25, decay = 0.028) {
  const n0 = Math.round(t0 * SR), len = Math.round(decay * 5 * SR), hp = biquad("hp", 7500, 0.8), [gl, gr] = panLR(p);
  for (let k = 0; k < len; k++) {
    const v = hp(rnd()) * Math.exp(-k / SR / decay) * vel * 0.16 * tailFade(k, len, 5);
    put(n0 + k, v * gl, v * gr, 0.1);
  }
}

function shaker(t0, vel, p = -0.3) {
  const n0 = Math.round(t0 * SR), len = Math.round(0.09 * SR), bp = biquad("bp", 6000, 1.2), [gl, gr] = panLR(p);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const v = bp(rnd()) * Math.min(1, t / 0.012) * Math.exp(-t / 0.035) * vel * 0.2 * tailFade(k, len, 5);
    put(n0 + k, v * gl, v * gr, 0.15);
  }
}

function riser(t0, t1, vel) {
  const n0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR);
  let lpState = 0;
  for (let k = 0; k < len; k++) {
    const x = k / len;
    const cutoff = 400 + 6500 * x * x;
    const a = 1 - Math.exp((-TAU * cutoff) / SR);
    lpState += a * (rnd() - lpState);
    const v = lpState * x * x * vel * 0.22 * tailFade(k, len, 15);
    put(n0 + k, v * 0.8, v * 0.6, 0.6);
  }
}

function crash(t0, vel) {
  const n0 = Math.round(t0 * SR), len = Math.round(1.8 * SR), hp = biquad("hp", 4500, 0.7);
  for (let k = 0; k < len; k++) {
    const v = hp(rnd()) * Math.exp(-k / SR / 0.55) * vel * 0.12 * tailFade(k, len);
    put(n0 + k, v * 0.6, v * 0.8, 0.5);
  }
}

// ---- Sound effects synced to the picture (promo.html timings) ----
// A soft "pop" for taps.
function popSfx(t0, vel = 1, f0 = 1100, f1 = 480) {
  const n0 = Math.round(t0 * SR), len = Math.round(0.12 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t / 0.018))) / SR;
    const v = Math.sin(ph) * Math.min(1, t / 0.002) * Math.exp(-t / 0.035) * vel * 0.22 * tailFade(k, len, 10);
    put(n0 + k, v * 0.707, v * 0.707, 0.25);
  }
}
// A short airy whoosh that peaks on the beat, for each subject's colour wipe.
function whoosh(tPeak, vel = 1, p = 0.4) {
  const pre = 0.16, post = 0.12, n0 = Math.round((tPeak - pre) * SR), len = Math.round((pre + post) * SR);
  const [gl, gr] = panLR(p);
  let lpState = 0, hpState = 0, prevIn = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR - pre; // negative before the peak
    const env = t < 0 ? Math.pow(1 + t / pre, 2) : Math.exp(-t / 0.05);
    const cutoff = 900 + 4200 * (k / len);
    const a = 1 - Math.exp((-TAU * cutoff) / SR);
    const x = rnd();
    lpState += a * (x - lpState);
    hpState = 0.97 * (hpState + lpState - prevIn); prevIn = lpState; // remove the rumble
    const v = hpState * env * vel * 0.16 * tailFade(k, len, 10);
    put(n0 + k, v * gl, v * gr, 0.3);
  }
}
// A key tick for each typed letter: a short bright click over a soft low knock.
function tick(t0, vel = 1, p = 0) {
  const n0 = Math.round(t0 * SR), len = Math.round(0.03 * SR), bp = biquad("bp", 3000 + 900 * rnd(), 1.4), [gl, gr] = panLR(p);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const v = (bp(rnd()) * Math.exp(-t / 0.0035) + 0.35 * Math.sin(TAU * 190 * t) * Math.exp(-t / 0.008)) * vel * 0.3 * tailFade(k, len, 4);
    put(n0 + k, v * gl, v * gr, 0.08);
  }
}

// ---- When each word first lands in the cloud: the same schedule as promo.html ----
const data = {}; new Function("window", fs.readFileSync(new URL("./data.js", import.meta.url), "utf8"))(data);
const CLOUD_WORDS = data.PROMO_DATA.clouds["2026"].words;
function cloudArrivals() {
  const tokens = [];
  for (const [w, c] of CLOUD_WORDS) for (let k = 0; k < c; k++) tokens.push(w);
  let s = 20261014;
  const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = tokens.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tokens[i], tokens[j]] = [tokens[j], tokens[i]]; }
  const first = tokens.indexOf("expensive"); tokens.splice(first, 1); tokens.splice(2, 0, "expensive");
  const B0 = 0.9, B1 = 6.4, seen = new Set(), out = [];
  tokens.forEach((w, i) => {
    if (seen.has(w)) return;
    seen.add(w);
    out.push({ w, beat: B0 + (B1 - B0) * Math.pow(i / (tokens.length - 1), 0.62) });
  });
  return out;
}

// ---- Arrangement (13 bars) ----
const GROOVE = [2, 3, 4, 5, 6, 7, 8, 9, 11];
// Kicks first, so the sidechain is in place before pads and keys are drawn.
for (const bar of GROOVE) {
  if (bar === 11) [0, 1, 2, 3].forEach((b) => kick(at(11, b), b % 2 ? 0.6 : 0.85));
  else { kick(at(bar, 0), 0.8); kick(at(bar, 2), 0.65); }
}
[0, 1, 2].forEach((b) => kick(at(10, b), 0.55));
kick(at(12, 0), 0.9);

// Pads: one chord a bar, with the turns inside bars 1, 10 and 11.
pad(0, at(1), CH.F.pad, 0.042);
pad(at(1), at(1, 2), CH.Bb.pad, 0.046); pad(at(1, 2), at(2), CH.C.pad, 0.046);
for (let bar = 2; bar <= 9; bar++) pad(at(bar), at(bar + 1), CH[BARS[bar]].pad, 0.04);
pad(at(10), at(10, 1), CH.Dm.pad, 0.04); pad(at(10, 1), at(10, 2), CH.Bb.pad, 0.04); pad(at(10, 2), at(11), CH.C.pad, 0.04);
pad(at(11), at(11, 3), CH.F.pad, 0.045); pad(at(11, 3), at(12), CH.C.pad, 0.045);
pad(at(12), DUR - 0.4, CH.F.pad, 0.05);

// Bar 0: felt keys, a mallet note under each hook line, ending on the open ninth ("In three words?").
keys(at(0, 0), CH.F.keys, 0.7, 1.8, -0.1);
[72, 74, 77, 79].forEach((m, i) => mallet(at(0, i * 0.75), m, 0.72, i % 2 ? 0.25 : -0.25, 1.3));

// Bar 1: eight bells for the star's eight rays, the name on IV, the line on V; shaker and riser into the groove.
[77, 79, 82, 84, 86, 89, 91, 94].forEach((m, k) => bell(at(1, k * 0.07), m, 0.42 + k * 0.03, -0.6 + k * 0.17, 1.5));
keys(at(1, 0.95), CH.Bb.keys, 0.85, 1.4, -0.1);
mallet(at(1, 0.95), 86, 0.75, 0.15, 1.4);
keys(at(1, 2), CH.C.keys, 0.6, 1.0, 0.1);
mallet(at(1, 1.75), 77, 0.6, -0.2, 1.1); mallet(at(1, 2.25), 79, 0.6, 0.2, 1.1);
for (let s = 8; s < 16; s++) shaker(at(1, s / 4), [0.8, 0.3, 0.55, 0.3][s % 4] * (0.3 + 0.05 * (s - 8)));
riser(at(1, 1.5), at(2, 0), 0.8);

// The groove.
const ARP = [0, 2, 3, 2, 1, 2, 3, 2], ARPV = [0.9, 0.5, 0.7, 0.45, 0.8, 0.5, 0.7, 0.45];
for (const bar of GROOVE) {
  const ch = CH[BARS[bar]], light = bar === 6 || bar === 7;
  for (let s = 0; s < 16; s++) shaker(at(bar, s / 4), [0.8, 0.3, 0.55, 0.3][s % 4] * (light ? 0.5 : 0.7));
  for (let e = 0; e < 8; e++) { const off = e % 2 === 1; hat(at(bar, e / 2) + (off ? 0.018 : 0), off ? 0.42 : 0.2, off ? 0.3 : 0.15); }
  clap(at(bar, 1), 0.5); clap(at(bar, 3), 0.5);
  const arpGain = light ? 0.45 : bar === 8 || bar === 9 ? 0.6 : 0.8;
  for (let e = 0; e < 8; e++) pluck(at(bar, e / 2), ch.arp[ARP[e]] + 12, ARPV[e] * arpGain, e % 2 ? 0.35 : -0.35, 0.9);
  if (bar === 11) {
    // the lift: F, turning to C on the last beat
    bass(at(11, 0), 41, 1.5, 1.0); bass(at(11, 1.5), 41, 0.5, 0.7); bass(at(11, 2), 41, 1, 0.9); bass(at(11, 3), 36, 0.5, 0.8); bass(at(11, 3.5), 36, 0.5, 0.8);
    continue;
  }
  const r = ch.root;
  bass(at(bar, 0), r, 1.5, 0.95); bass(at(bar, 1.5), r, 0.5, 0.6); bass(at(bar, 2), r, 1, 0.85); bass(at(bar, 3), r + 7, 0.5, 0.6); bass(at(bar, 3.5), r, 0.5, 0.7);
  keys(at(bar, 1.5), ch.keys, 0.36, 0.3, -0.2); keys(at(bar, 3.5), ch.keys, 0.3, 0.3, 0.2);
}

// Bars 2–5: the title, then a whoosh as each subject's colour sweeps in and three rising
// bell notes (the chord's own tones) as its three words pop up.
mallet(at(2, 0), 81, 0.7, -0.2, 1.2); mallet(at(2, 0.62), 84, 0.75, 0.2, 1.2);
for (let k = 0; k < 7; k++) {
  const lb = 2 + 2 * k, bar = 2 + Math.floor(lb / 4), beat = lb % 4;
  whoosh(at(bar, beat), 0.85, k % 2 ? -0.4 : 0.4);
  CH[BARS[bar]].keys.forEach((m, i) => bell(at(bar, beat + 0.42 + i * 0.2), m + 24, 0.5 + i * 0.08, -0.3 + i * 0.3, 1.1));
}

// Bars 6–7: the headline, a tap on the first field, a tick per typed letter, the send tap, a ding.
mallet(at(6, 0), 81, 0.7, -0.2, 1.2); mallet(at(6, 0.72), 84, 0.75, 0.2, 1.2);
popSfx(at(6, 1.95), 1.0, 1300, 520);
for (const [word, t0, t1] of [["expensive", 2.25, 3.0], ["chaotic", 3.15, 3.75], ["hopeful", 3.9, 4.5]])
  for (let i = 1; i <= word.length; i++) tick(at(6, t0 + ((i - 0.5) / word.length) * (t1 - t0)), 0.75 + 0.25 * Math.abs(rnd()), 0.15 * rnd());
popSfx(at(6, 5.25), 1.0, 1250, 500);
bell(at(6, 5.45), 84, 0.9, -0.1, 1.4); bell(at(6, 5.7), 89, 1.0, 0.1, 1.8);

// Bars 8–9: the headline, a counter-melody, and a soft note as each new word lands
// (rising through the F major pentatonic), with a low knock when "expensive" arrives.
mallet(at(8, 0), 86, 0.7, -0.2, 1.2); mallet(at(8, 0.62), 89, 0.75, 0.2, 1.2);
for (const [bar, b, m] of [[8, 1.5, 77], [8, 2, 82], [8, 3, 81], [9, 0, 79], [9, 1, 76], [9, 2, 79], [9, 3, 84]]) mallet(at(bar, b), m, 0.55, 0.1, 1.1);
const PENTA = [72, 74, 77, 79, 81, 84, 86, 89, 91, 93];
cloudArrivals().forEach(({ w, beat }, i) => {
  if (w === "expensive") { kick(at(8, beat), 0.45); mallet(at(8, beat), 65, 0.8, 0, 1.2); }
  if (i < 28) bell(at(8, beat), PENTA[i % PENTA.length], Math.max(0.22, 0.6 - i * 0.014), ((i * 37) % 13) / 6.5 - 1, 0.9);
});

// Bar 10: breakdown, a chord and a rising note for each line, then a clap fill and a riser.
[["Dm", 86], ["Bb", 89], ["C", 91]].forEach(([c, m], b) => {
  keys(at(10, b), CH[c].keys, 0.7, 1.0, b === 1 ? 0.2 : -0.2);
  bass(at(10, b), CH[c].root, b === 2 ? 2 : 1, 0.8);
  mallet(at(10, b), m, 0.8, 0.1, 1.3);
});
[3.25, 3.5, 3.75].forEach((b, j) => clap(at(10, b), 0.4 + j * 0.15, j % 2 ? -0.2 : 0.2));
riser(at(10, 2.25), at(11, 0), 0.9);

// Bar 11: "Your turn." — crash, big F, a pop as the button lands.
crash(at(11, 0), 0.6);
keys(at(11, 0), CH.F.keys.map((x) => x + 12), 0.9, 1.4, 0);
mallet(at(11, 0), 84, 0.8, -0.1, 1.2);
popSfx(at(11, 1.0), 0.9, 1200, 500); mallet(at(11, 1.0), 89, 0.8, 0.15, 1.2);
keys(at(11, 3), CH.C.keys.map((x) => x + 12), 0.55, 0.8, 0);

// Bar 12: final F chord and strum; the bells again as the star bursts, a note for the name and the address.
crash(at(12, 0), 0.85);
keys(at(12, 0), [65, 69, 72, 77], 0.9, 1.6, 0);
bass(at(12, 0), 41, 3.5, 1.0);
[41, 48, 53, 57, 60, 65].forEach((m, j) => pluck(at(12, 0) + j * 0.03, m + 12, 0.7, -0.4 + j * 0.16, 2.0));
[77, 79, 81, 84, 86, 89, 91, 93].forEach((m, k) => bell(at(12, k * 0.07), m, 0.4 + k * 0.035, -0.6 + k * 0.17, 1.6));
mallet(at(12, 0.45), 89, 0.95, 0.1, 1.8);
mallet(at(12, 1.5), 84, 0.6, -0.1, 1.2);

// ---- Reverb (Freeverb-style) on the send bus ----
function reverb(input, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(d + spread), i: 0, store: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
  const out = new Float32Array(N), feedback = 0.83, damp = 0.3;
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.015;
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - damp) + c.store * damp;
      c.buf[c.i] = x + c.store * feedback;
      if (++c.i >= c.buf.length) c.i = 0;
      s += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      const o = -s + b;
      a.buf[a.i] = s + b * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
      s = o;
    }
    out[n] = s;
  }
  return out;
}
const wetL = reverb(sendL, 0), wetR = reverb(sendR, 23);

// ---- Master: sum, high-pass, soft limit, fades ----
const hpL = biquad("hp", 32), hpR = biquad("hp", 32);
let peak = 0;
for (let n = 0; n < N; n++) {
  L[n] = hpL(L[n] + wetL[n] * 0.9);
  R[n] = hpR(R[n] + wetR[n] * 0.9);
  peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
}
const drive = 1.5, norm = 1 / peak;
const fadeOutStart = 28.8;
for (let n = 0; n < N; n++) {
  const t = n / SR;
  let g = Math.min(1, t / 0.03);
  if (t > fadeOutStart) g *= 0.5 + 0.5 * Math.cos((Math.PI * (t - fadeOutStart)) / (DUR - fadeOutStart));
  L[n] = (Math.tanh(drive * L[n] * norm) / Math.tanh(drive)) * 0.88 * g;
  R[n] = (Math.tanh(drive * R[n] * norm) / Math.tanh(drive)) * 0.88 * g;
}
const rmsDb = (a, b) => { let s = 0, c = 0; for (let n = Math.round(a * SR); n < Math.min(N, Math.round(b * SR)); n++) { s += L[n] * L[n] + R[n] * R[n]; c += 2; } return (10 * Math.log10(s / c + 1e-12)).toFixed(1); };
let finalPeak = 0, nan = 0;
for (let n = 0; n < N; n++) { if (!Number.isFinite(L[n]) || !Number.isFinite(R[n])) nan++; finalPeak = Math.max(finalPeak, Math.abs(L[n]), Math.abs(R[n])); }
console.log(`peak ${(20 * Math.log10(finalPeak)).toFixed(2)} dBFS, NaN samples ${nan}`);
for (const [a, b, label] of [[0, at(1), "hook"], [at(1), at(2), "brand"], [at(2), at(6), "subjects"], [at(6), at(8), "share"], [at(8), at(10), "cloud"], [at(10), at(11), "breakdown"], [at(11), at(12), "your turn"], [at(12), 30, "end"]])
  console.log(`${label.padEnd(10)} ${a.toFixed(1)}–${b.toFixed(1)}s  RMS ${rmsDb(a, b)} dBFS`);

const out = process.argv[2] ?? "promo-music.wav";
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[n])) * 32767), 44 + n * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[n])) * 32767), 46 + n * 4);
}
fs.writeFileSync(out, buf);
console.log(`wrote ${out}`);
