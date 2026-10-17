// Soundtrack for a 15-second cloud reveal (reveal.html), synthesized from scratch: no samples,
// nothing to license. Calm on purpose: pads, soft keys and a plucked arpeggio, no drums.
// C major, 96 BPM, 6 bars: C | Am | F | G | F | C. A soft pop as each of the first words
// appears (the picture's own schedule, from schedule.js), two notes under "Most said", a
// rising chime under "Add your three words", then a short fade.
// Usage: node music.mjs <slug> <out.wav>
import fs from "node:fs";

// data.js and schedule.js are browser scripts: run them against a stand-in window.
const ctx = {};
for (const f of ["data.js", "schedule.js"]) new Function("window", fs.readFileSync(new URL(`./${f}`, import.meta.url), "utf8"))(ctx);
const { T, wordsOf, schedule } = ctx.REVEAL_T;
const slug = process.argv[2] ?? "2026";
if (!ctx.REVEAL.clouds[slug]) throw new Error(`no cloud "${slug}" in data.js`);
const firsts = schedule(wordsOf(slug)).firsts;   // beats at which new words appear

const SR = 44100;
const BPM = T.BPM;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
const DUR = T.SECONDS;
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


// ---- Harmony: I–vi–IV–V in C, voice-led ----
const PROG = [
  { pad: [48, 55, 60, 64], keys: [60, 64, 67], arp: [60, 64, 67, 72], root: 36 }, // C
  { pad: [45, 52, 57, 60], keys: [57, 60, 64], arp: [57, 60, 64, 69], root: 33 }, // Am
  { pad: [53, 57, 60, 65], keys: [53, 57, 60], arp: [53, 57, 60, 65], root: 41 }, // F
  { pad: [55, 59, 62, 67], keys: [55, 59, 62], arp: [55, 59, 62, 67], root: 43 }, // G
];
const chordOf = (bar) => PROG[bar % 4];


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


// ---- Sound effects synced to the picture (explainer.html v2 timings) ----
// A soft "pop" for taps and arriving comments.
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
// A short airy whoosh that peaks on the beat, for each category card.
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


// ---- Arrangement: C | Am | F | G | F | C ----
const SEQ = [0, 1, 2, 3, 2, 0];
const chordAt = (bar) => PROG[SEQ[bar]];
for (let bar = 0; bar < 6; bar++) pad(at(bar), bar === 5 ? DUR - 0.3 : at(bar + 1), chordAt(bar).pad, 0.05);
// soft keys: the whole chord on each bar, a lighter touch on beat 3
for (let bar = 0; bar < 6; bar++) {
  keys(at(bar, 0), chordAt(bar).keys, bar === 0 ? 0.8 : 0.6, 1.6, -0.1);
  if (bar < 5) keys(at(bar, 2.5), chordAt(bar).keys, 0.35, 0.9, 0.15);
}
// a quiet plucked arpeggio and a light shaker while the cloud fills (bars 1–4)
const ARP = [0, 2, 3, 2, 1, 2, 3, 2], ARPV = [0.8, 0.45, 0.6, 0.4, 0.7, 0.45, 0.6, 0.4];
for (let bar = 1; bar <= 4; bar++) {
  for (let e = 0; e < 8; e++) pluck(at(bar, e / 2), chordAt(bar).arp[ARP[e]] + 12, ARPV[e] * 0.55, e % 2 ? 0.3 : -0.3, 0.8);
  for (let s = 0; s < 16; s++) shaker(at(bar, s / 4), [0.6, 0.25, 0.4, 0.25][s % 4] * 0.5);
}
// a soft pop as each of the first fourteen words appears, rising gently in pitch,
// and a low note under the first (most-said) word
firsts.slice(0, 14).forEach((b, i) => popSfx(b * BEAT, 0.45, 820 + i * 35, 400));
if (firsts.length) mallet(firsts[0] * BEAT, 60, 0.6, 0, 1.4);
// "Most said": two notes
mallet(T.most * BEAT, 76, 0.75, -0.15, 1.3);
mallet((T.most + 0.5) * BEAT, 79, 0.7, 0.15, 1.4);
// "Add your three words": a rising chime that resolves on C, over a held bass note
[[0, 72], [0.25, 76], [0.5, 79], [0.75, 84]].forEach(([b, m]) => mallet((T.cta + b) * BEAT, m, b === 0.75 ? 0.9 : 0.65, 0.1, b === 0.75 ? 1.8 : 0.9));
bass(at(5, 0), 36, 3.5, 0.7);

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
const fadeOutStart = DUR - 0.8;
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
for (const [a, b, label] of [[0, 2.5, "question"], [2.5, 9.4, "cloud fills"], [9.4, 12.5, "most said"], [12.5, 15, "add yours"]])
  console.log(`${label.padEnd(12)} ${a.toFixed(1)}–${b.toFixed(1)}s  RMS ${rmsDb(a, b)} dBFS`);


const out = process.argv[3] ?? "music.wav";
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
