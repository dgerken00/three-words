// Capture an animated page frame by frame with headless Chrome over the
// DevTools protocol (no extra packages: Node's built-in WebSocket).
// Usage: node capture.mjs <outDir> [fps=30] [seconds=30] [width=1080] [height=width] [page=promo.html]
// SNAP="1.5,12,29" captures just those times (t1.5.png …), for checking a layout quickly.
//
// Chrome is started on a port it picks itself (--remote-debugging-port=0, read back
// from DevToolsActivePort), so two captures running at once can never share a browser.
// A fixed port once let a second capture attach to the first one's Chrome: both drove
// the same tab, and each video got the other's frames.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2];
const fps = Number(process.argv[3] ?? 30);
const seconds = Number(process.argv[4] ?? 30);
const W = Number(process.argv[5] ?? 1080);
const H = Number(process.argv[6] ?? W);
const [page, query] = (process.argv[7] ?? "promo.html").split("?"); // e.g. promo.html?wide=1
const snaps = process.env.SNAP ? process.env.SNAP.split(",").map(Number) : null;
fs.mkdirSync(outDir, { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cap-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--allow-file-access-from-files",
  `--window-size=${W},${H}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let port, target;
for (let i = 0; i < 75 && !target; i++) {
  await sleep(200);
  try {
    port ??= Number(fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]) || undefined;
    if (!port) continue;
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === "page");
  } catch {}
}
if (!target) { chrome.kill(); throw new Error("Chrome did not start"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: pathToFileURL(path.join(here, page)).href + `?${query ? query + "&" : ""}t=0` });
await sleep(1500);
await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });

const times = snaps ?? Array.from({ length: Math.round(fps * seconds) }, (_, i) => i / fps);
const started = Date.now();
for (const [i, t] of times.entries()) {
  await send("Runtime.evaluate", {
    expression: `render(${t.toFixed(4)}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`,
    awaitPromise: true,
  });
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const name = snaps ? `t${t}.png` : `f${String(i).padStart(4, "0")}.png`;
  fs.writeFileSync(path.join(outDir, name), Buffer.from(shot.data, "base64"));
  if (!snaps && i % 150 === 0) console.log(`frame ${i}/${times.length} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
}
ws.close();
chrome.kill();
await new Promise((r) => chrome.once("exit", r));
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
console.log(`done: ${times.length} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
