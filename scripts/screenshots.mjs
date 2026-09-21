// Takes README / store screenshots (1280x800) of SkullClick on a fictional
// demo page, in English and Russian.
//
//   node scripts/build.mjs --e2e && node scripts/screenshots.mjs
import http from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "test/fixtures");
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer(async (req, res) => {
  const name = path.basename(new URL(req.url, "http://x").pathname);
  try {
    const body = await readFile(path.join(fixtures, name));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const DEMO = `http://127.0.0.1:${server.address().port}/demo.html`;

const SAMPLE_RULES = {
  "news.example.com": {
    "*": [
      { selector: "#cookie-banner", lastUsed: 1 },
      { selector: "#newsletter", lastUsed: 1 }
    ],
    "/2026/09/park-bench": [{ selector: "aside > .ad", lastUsed: 1 }]
  },
  "video.example.org": {
    "/watch": [{ selector: "#player-overlay > div:nth-of-type(2)", lastUsed: 1 }]
  },
  "shop.example.net": {
    "*": [{ selector: ".chat-widget", lastUsed: 1 }]
  }
};

const t0 = Date.now();
const log = msg => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${msg}`);

async function shoot(lang) {
  const out = path.join(root, "docs/screenshots", lang);
  await mkdir(out, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    pipe: true,
    enableExtensions: [path.join(root, "dist-e2e/chrome")],
    args: [`--lang=${lang}`, "--hide-scrollbars", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"],
    protocolTimeout: 60000,
    env: { ...process.env, LANGUAGE: lang }
  });
  const sw = await browser.waitForTarget(t => t.type() === "service_worker");
  const worker = await sw.worker();
  const extBase = sw.url().split("/").slice(0, 3).join("/");

  // The welcome tab opened on install would leave our tab in the
  // background, where it isn't rendered and screenshots stall.
  await sleep(500);
  for (const p of await browser.pages()) if (p.url().includes("#welcome")) await p.close();

  const page = await browser.newPage();
  await page.bringToFront();
  await page.setViewport({ width: 1280, height: 800 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.goto(DEMO, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(out, "00-before.png"), captureBeyondViewport: false, optimizeForSpeed: true }); log("00-before.png");

  const tabId = await worker.evaluate(async url =>
    (await chrome.tabs.query({})).find(t => (t.url || "").startsWith(url)).id, DEMO);
  const toggle = () => worker.evaluate(id => runInTab({ id }, "toggle"), tabId);

  // 1. Hover a paragraph of the newsletter dialog
  await toggle();
  await sleep(200);
  await page.mouse.move(560, 368);
  await sleep(200);
  await page.screenshot({ path: path.join(out, "01-pick.png"), captureBeyondViewport: false, optimizeForSpeed: true }); log("01-pick.png");

  // 2. Widen the selection to the whole dialog
  await page.keyboard.press("ArrowUp");
  await sleep(150);
  await page.screenshot({ path: path.join(out, "02-parent.png"), captureBeyondViewport: false, optimizeForSpeed: true }); log("02-parent.png");

  // 3. Remove the dimmed backdrop (dialog's parent), the cookie banner and
  //    the chat widget, keeping the picker on with Shift
  await page.keyboard.press("ArrowUp");
  await page.keyboard.down("Shift");
  await page.keyboard.press("Enter");
  await sleep(150);
  await page.mouse.move(1000, 792);
  await sleep(100);
  await page.mouse.click(1000, 792);
  await page.keyboard.up("Shift");
  await sleep(150);
  await page.mouse.move(1130, 600);
  await sleep(100);
  await page.mouse.click(1130, 600);
  await sleep(300);
  await page.mouse.move(640, 300);
  await page.screenshot({ path: path.join(out, "03-after.png"), captureBeyondViewport: false, optimizeForSpeed: true }); log("03-after.png");

  // 4. Options page with Grudge mode on and a few remembered elements
  await worker.evaluate(async rules => {
    await chrome.storage.sync.set({ settings: { grudge: true } });
    await chrome.storage.local.set({ hitList: rules });
  }, SAMPLE_RULES);
  const opts = await browser.newPage();
  await opts.bringToFront();
  await opts.setViewport({ width: 1280, height: 800 });
  await opts.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await opts.goto(`${extBase}/options/options.html`, { waitUntil: "networkidle0" });
  await opts.screenshot({ path: path.join(out, "04-options.png"), captureBeyondViewport: false, optimizeForSpeed: true }); log("04-options.png");

  await opts.evaluate(() => {
    document.querySelectorAll("details.site").forEach(d => { d.open = true; });
    document.getElementById("hitlist-card").scrollIntoView({ block: "start" });
    window.scrollBy(0, -16);
  });
  await sleep(100);
  await opts.screenshot({ path: path.join(out, "05-hitlist.png"), captureBeyondViewport: false, optimizeForSpeed: true }); log("05-hitlist.png");

  await opts.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await opts.evaluate(() => document.getElementById("support").scrollIntoView({ block: "center" }));
  await sleep(100);
  await opts.screenshot({ path: path.join(out, "06-support-dark.png"), captureBeyondViewport: false, optimizeForSpeed: true }); log("06-support-dark.png");

  await browser.close();
  console.log("screenshots:", path.relative(root, out));
}

for (const lang of ["en", "ru"]) await shoot(lang);
server.close();
