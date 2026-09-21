// Records docs/demo.gif: frames are captured with Puppeteer and stitched
// with ffmpeg (must be on PATH).
//
//   node scripts/build.mjs --e2e && node scripts/demo-gif.mjs
import http from "node:http";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "test/fixtures");
const tmp = path.join(root, "dist-e2e/gif-frames");
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer(async (req, res) => {
  try {
    const body = await readFile(path.join(fixtures, path.basename(new URL(req.url, "http://x").pathname)));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const DEMO = `http://127.0.0.1:${server.address().port}/demo.html`;

await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  pipe: true,
  enableExtensions: [path.join(root, "dist-e2e/chrome")],
  args: ["--lang=en", "--hide-scrollbars"]
});
const sw = await browser.waitForTarget(t => t.type() === "service_worker");
const worker = await sw.worker();
await sleep(500);
for (const p of await browser.pages()) if (p.url().includes("#welcome")) await p.close();

const page = await browser.newPage();
await page.bringToFront();
await page.setViewport({ width: 1280, height: 800 });
await page.goto(DEMO, { waitUntil: "networkidle0" });
const tabId = await worker.evaluate(async url =>
  (await chrome.tabs.query({})).find(t => (t.url || "").startsWith(url)).id, DEMO);

// Screenshots don't include the OS cursor: draw one on top of everything.
const skull = (await readFile(path.join(root, "src/icons/skull-original.svg"), "utf8"))
  .replace("<path ", '<path stroke="white" stroke-width="1.6" paint-order="stroke" ');
await page.evaluate(svg => {
  const c = document.createElement("div");
  c.id = "fake-cursor";
  c.innerHTML = svg;
  Object.assign(c.style, {
    position: "fixed", left: "0", top: "0", width: "30px", height: "30px",
    zIndex: "2147483647", pointerEvents: "none", display: "none",
    transform: "translate(-15px, -15px)"
  });
  document.documentElement.appendChild(c);
}, skull);

let mouse = { x: 640, y: 120 };
const frames = [];
async function frame(duration) {
  const file = path.join(tmp, `f${String(frames.length).padStart(3, "0")}.png`);
  await page.screenshot({ path: file, captureBeyondViewport: false, optimizeForSpeed: true });
  frames.push({ file, duration });
}
async function showCursor(on) {
  await page.evaluate(on => {
    // Keep the fake cursor above the extension's UI host.
    const c = document.getElementById("fake-cursor");
    document.documentElement.appendChild(c);
    c.style.display = on ? "block" : "none";
  }, on);
}
async function moveTo(x, y, steps = 6) {
  const from = { ...mouse };
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + (x - from.x) * i / steps, y: from.y + (y - from.y) * i / steps };
    await page.mouse.move(p.x, p.y);
    await page.evaluate(p => {
      const c = document.getElementById("fake-cursor");
      c.style.left = `${p.x}px`;
      c.style.top = `${p.y}px`;
    }, p);
    await sleep(30);
    await frame(0.06);
  }
  mouse = { x, y };
}
async function key(k, hold = 0.9) {
  await page.keyboard.press(k);
  await sleep(120);
  await frame(hold);
}

await frame(1.4);
await worker.evaluate(id => runInTab({ id }, "toggle"), tabId);
await sleep(200);
await showCursor(true);
await moveTo(560, 368, 10);
await frame(0.9);
await key("ArrowUp");
await key("ArrowUp");
await page.keyboard.down("Shift");
await key("Enter", 0.7);
await moveTo(1000, 792, 8);
await frame(0.5);
await page.mouse.click(1000, 792);
await page.keyboard.up("Shift");
await sleep(150);
await frame(0.6);
await moveTo(1130, 600, 6);
await frame(0.5);
await page.mouse.click(1130, 600);
await sleep(200);
await showCursor(false);
await frame(2.5);

await browser.close();
server.close();

// ffmpeg concat list with per-frame durations
const list = frames.map(f => `file '${f.file.replaceAll("\\", "/")}'\nduration ${f.duration}`).join("\n") +
  `\nfile '${frames.at(-1).file.replaceAll("\\", "/")}'\n`;
const listFile = path.join(tmp, "frames.txt");
await writeFile(listFile, list);
const out = path.join(root, "docs/demo.gif");
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile,
  "-vf", "scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
  "-loop", "0", out
]);
console.log(`wrote ${path.relative(root, out)} from ${frames.length} frames`);
