// Screenshot a live page the way a phone shows it (real mobile emulation, so the page lays
// itself out at phone width), after letting it load its data for a few seconds.
// Usage: node snap-url.mjs <url> <out.png> [width=430] [height=932] [scale=3] [waitMs=3500]
// Pages that keep refreshing (the cloud pages poll every 4 s) never "finish" loading, which is
// why this waits a fixed time instead of waiting for the page to settle.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const [url, out] = process.argv.slice(2, 4);
const W = Number(process.argv[4] ?? 430), H = Number(process.argv[5] ?? 932);
const SCALE = Number(process.argv[6] ?? 3), WAIT = Number(process.argv[7] ?? 3500);
if (!url || !out) { console.error("usage: node snap-url.mjs <url> <out.png> [width] [height] [scale] [waitMs]"); process.exit(1); }

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "tw-snap-"));
// Port 0: Chrome picks a free port (read back from DevToolsActivePort), so this can never
// attach to another capture's browser.
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const cleanup = () => { try { chrome.kill("SIGKILL"); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on("exit", cleanup);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let port, target;
for (let i = 0; i < 75 && !target; i++) {
  await sleep(200);
  try {
    port ??= Number(fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]) || undefined;
    if (!port) continue;
    target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
  } catch {}
}
if (!target) throw new Error("Chrome did not start");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
// every call has a deadline, so a stuck page fails the run instead of hanging it
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method}: no reply in 30 s`)); }, 30000);
  pending.set(id, (m) => { clearTimeout(timer); m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result); });
  ws.send(JSON.stringify({ id, method, params }));
});

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: true });
await send("Emulation.setUserAgentOverride", {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
await send("Page.navigate", { url });
await sleep(WAIT);
const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
console.log(`wrote ${out} (${W * SCALE}x${H * SCALE})`);
ws.close();
process.exit(0);
