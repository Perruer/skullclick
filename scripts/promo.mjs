// Renders promotional tiles (440×280, 1400×560) into store/.
//   node scripts/promo.mjs
import { readFile, mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const icon = await readFile(new URL("../src/icons/icon.svg", import.meta.url), "utf8");
const shot = (await readFile(new URL("../docs/screenshots/en/02-parent.png", import.meta.url))).toString("base64");

const tile = (w, h, big) => `<!DOCTYPE html><html><body style="margin:0">
<div style="width:${w}px;height:${h}px;box-sizing:border-box;overflow:hidden;position:relative;
  background:radial-gradient(circle at 20% 30%, #3a1214, #140607 70%);color:#fff;
  font-family:'Segoe UI',system-ui,sans-serif;display:flex;align-items:center;
  padding:0 ${big ? 90 : 34}px;gap:${big ? 44 : 20}px">
  <div style="width:${big ? 190 : 96}px;height:${big ? 190 : 96}px;flex:none">${icon.replace(/width="128" height="128"/, 'width="100%" height="100%"')}</div>
  <div style="flex:none;max-width:${big ? 470 : 250}px">
    <div style="font-size:${big ? 76 : 38}px;font-weight:700;letter-spacing:-1px;line-height:1">SkullClick</div>
    <div style="font-size:${big ? 28 : 17}px;line-height:1.3;margin-top:${big ? 18 : 10}px;color:#ffcdd2">Click. Gone.<br>Remove pop-ups, banners &amp; ads from any page.</div>
  </div>
  ${big ? `<img src="data:image/png;base64,${shot}" style="position:absolute;left:840px;top:74px;width:640px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6);transform:rotate(-3deg)">` : ""}
</div></body></html>`;

await mkdir("store", { recursive: true });
const browser = await puppeteer.launch();
const page = await browser.newPage();
for (const [w, h, name] of [[440, 280, "promo-small-440x280.png"], [1400, 560, "promo-large-1400x560.png"]]) {
  await page.setViewport({ width: w, height: h });
  await page.setContent(tile(w, h, w > 1000));
  await page.screenshot({ path: `store/${name}`, clip: { x: 0, y: 0, width: w, height: h } });
  console.log("wrote store/" + name);
}
await browser.close();
