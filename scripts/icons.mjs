// Renders src/icons/icon.svg to the PNG sizes browsers and stores need.
// Usage: npm run icons
import { readFile, mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const svg = await readFile(new URL("../src/icons/icon.svg", import.meta.url), "utf8");
const targets = [
  ...[16, 32, 48, 96, 128].map(size => ({ size, file: `src/icons/icon-${size}.png` })),
  { size: 300, file: "store/logo-300.png" }
];

await mkdir("store", { recursive: true });
const browser = await puppeteer.launch();
const page = await browser.newPage();
for (const { size, file } of targets) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/width="128" height="128"/, `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log("wrote", file);
}
await browser.close();
