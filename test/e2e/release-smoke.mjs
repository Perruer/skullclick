// Smoke test of the *release* Chromium build (dist/chrome, no host
// permissions): the real toolbar button path via activeTab.
//
//   npm run build && node test/e2e/release-smoke.mjs [edge]
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer(async (req, res) => {
  try {
    const body = await readFile(path.join(root, "test/fixtures", path.basename(new URL(req.url, "http://x").pathname)));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const PAGE = `http://127.0.0.1:${server.address().port}/page.html`;

const browser = await puppeteer.launch({
  headless: true,
  pipe: true,
  executablePath: process.argv.includes("edge") ? EDGE : undefined,
  enableExtensions: [path.join(root, "dist/chrome")]
});
let failed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n    ${e.message}`);
  }
};

try {
  await browser.waitForTarget(t => t.type() === "service_worker");
  const [extension] = (await browser.extensions()).values();

  let welcome;
  await check("welcome page opens on install", async () => {
    for (let i = 0; i < 80 && !welcome; i++) {
      await sleep(100);
      welcome = (await browser.pages()).find(p => p.url().endsWith("options/options.html#welcome"));
    }
    assert.ok(welcome, "no welcome tab");
    assert.equal(await welcome.evaluate(() => document.getElementById("welcome").hidden), false);
    await welcome.close();
  });

  const page = await browser.newPage();
  await page.bringToFront();
  await page.setViewport({ width: 1100, height: 800 });
  await page.goto(PAGE);

  await check("no host permissions until Grudge mode is enabled", async () => {
    const worker = (await extension.workers())[0];
    assert.equal(await worker.evaluate(() => chrome.permissions.contains({ origins: ["<all_urls>"] })), false);
    assert.equal((await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts())).length, 0);
  });

  await check("toolbar button starts the picker via activeTab", async () => {
    await extension.triggerAction(page);
    await sleep(300);
    const r = await page.evaluate(() => {
      const t = document.querySelector(".toaster").getBoundingClientRect();
      return { x: t.left + t.width / 2, y: t.top + t.height / 2 };
    });
    await page.mouse.move(r.x, r.y);
    await sleep(100);
    await page.mouse.click(r.x, r.y);
    await sleep(200);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".toaster")).display), "none");
  });

  await check("toolbar button again + Esc leaves the page alone", async () => {
    await extension.triggerAction(page);
    await sleep(200);
    await page.keyboard.press("Escape");
    await sleep(100);
    const overlay = await page.evaluate(() => document.querySelector("skullclick-root").shadowRoot.children[0].style.display);
    assert.equal(overlay, "none");
  });

} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `${failed} failed` : "release smoke passed");
process.exit(failed ? 1 : 0);
