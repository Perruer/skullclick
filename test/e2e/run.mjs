// End-to-end test: loads the built extension into real Chrome (for Testing)
// and Firefox via Puppeteer and drives the picker on a hostile test page.
//
//   npm run test:e2e              both browsers
//   npm run test:e2e -- chrome    one browser
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtures = path.join(root, "test/fixtures");
const GECKO_ID = "{60ae131d-96b8-4296-bee4-56e286ea3686}";
const FIREFOX_UUID = "7d3b8f1e-5c4a-4e2b-9f6d-0a1b2c3d4e5f";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const headless = !process.argv.includes("--headful");
const only = process.argv.slice(2).filter(a => !a.startsWith("--"));

/* ------------------------------------------------------------ server -- */

const server = http.createServer(async (req, res) => {
  const name = path.basename(new URL(req.url, "http://x").pathname) || "page.html";
  try {
    const body = await readFile(path.join(fixtures, name.endsWith(".html") ? name : "page.html"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const PAGE = `http://127.0.0.1:${server.address().port}/page.html`;

/* ----------------------------------------------------------- helpers -- */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch(kind) {
  const dir = path.join(root, "dist-e2e", kind === "edge" ? "chrome" : kind);
  if (kind === "chrome" || kind === "edge") {
    const browser = await puppeteer.launch({
      browser: "chrome",
      executablePath: kind === "edge" ? EDGE : undefined,
      headless,
      pipe: true,
      enableExtensions: [dir],
      args: ["--no-first-run"]
    });
    const target = await browser.waitForTarget(t => t.type() === "service_worker" && t.url().startsWith("chrome-extension://"));
    // new URL(...).origin is "null" for chrome-extension: URLs in Node
    const base = target.url().split("/").slice(0, 3).join("/");
    return { browser, base };
  }
  const browser = await puppeteer.launch({
    browser: "firefox",
    headless,
    extraPrefsFirefox: {
      "extensions.webextensions.uuids": JSON.stringify({ [GECKO_ID]: FIREFOX_UUID }),
      "xpinstall.signatures.required": false
    }
  });
  await browser.installExtension(dir);
  return { browser, base: `moz-extension://${FIREFOX_UUID}` };
}

// Runs `fn(args)` inside an extension page, where the WebExtension API is available.
async function ext(ctx, fn, ...args) {
  return ctx.extPage.evaluate(`(${fn})(globalThis.browser || globalThis.chrome, ...${JSON.stringify(args)})`);
}

// Same as clicking the toolbar button: inject if needed, then toggle.
async function toolbarClick(ctx, type = "toggle") {
  await ext(ctx, async (api, url, type) => {
    const tab = (await api.tabs.query({})).find(t => t.url && t.url.startsWith(url));
    try {
      await api.tabs.sendMessage(tab.id, { type }, { frameId: 0 });
    } catch (e) {
      await api.scripting.executeScript({ target: { tabId: tab.id }, files: ["/lib/selector.js", "/content.js"] });
      await api.tabs.sendMessage(tab.id, { type }, { frameId: 0 });
    }
  }, PAGE, type);
  await sleep(150);
}

async function badge(ctx) {
  return ext(ctx, async (api, url) => {
    const tab = (await api.tabs.query({})).find(t => t.url && t.url.startsWith(url));
    return api.action.getBadgeText({ tabId: tab.id });
  }, PAGE);
}

const center = (page, sel) => page.evaluate(s => {
  const r = document.querySelector(s).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel);

const hidden = (page, sel) => page.evaluate(s => getComputedStyle(document.querySelector(s)).display === "none", sel);

const ui = (page, expr) => page.evaluate(`(() => {
  const root = document.querySelector("skullclick-root");
  if (!root || !root.shadowRoot) return null;
  const [overlay, box, hint, toast] = root.shadowRoot.children;
  return (${expr});
})()`);

async function clickOn(page, sel, opts = {}) {
  const { x, y } = await center(page, sel);
  await page.mouse.move(x, y);
  await sleep(50);
  if (opts.shift) await page.keyboard.down("Shift");
  await page.mouse.click(x, y);
  if (opts.shift) await page.keyboard.up("Shift");
  await sleep(150);
}

// Firefox moves moz-extension: pages to another process and Puppeteer loses
// track of the navigation, so navigate without waiting and find the page by
// evaluating location.
async function openExtPage(browser, url) {
  const page = await browser.newPage();
  page.goto(url).catch(() => {});
  for (let i = 0; i < 50; i++) {
    await sleep(100);
    for (const p of await browser.pages()) {
      const href = await p.evaluate(() => location.href).catch(() => "");
      if (href === url) return p;
    }
  }
  throw new Error("could not open " + url);
}

async function reloadExt(page) {
  await page.evaluate(() => location.reload()).catch(() => {});
  await sleep(600);
}

/* ------------------------------------------------------------- tests -- */

async function run(kind) {
  const results = [];
  const ctx = await launch(kind);
  const { browser } = ctx;
  const step = async (name, fn) => {
    try {
      await fn();
      results.push(["ok", name]);
      console.log(`  ✓ ${name}`);
    } catch (e) {
      results.push(["FAIL", name, e]);
      console.log(`  ✗ ${name}\n    ${e.message.split("\n").join("\n    ")}`);
    }
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(PAGE);

    ctx.extPage = await openExtPage(browser, `${ctx.base}/options/options.html`);
    await page.bringToFront();

    await step("picker highlights the element under the pointer", async () => {
      await toolbarClick(ctx);
      const { x, y } = await center(page, ".toaster");
      await page.mouse.move(x, y);
      await sleep(100);
      assert.equal(await ui(page, `box.style.display`), "block");
      const label = await ui(page, `box.firstChild.textContent`);
      assert.match(label, /^div.toaster/);
      assert.equal(await ui(page, `hint.style.display`), "block");
    });

    await step("click removes the element; hostile page never sees the click (#35)", async () => {
      await clickOn(page, ".toaster");
      assert.equal(await hidden(page, ".toaster"), true);
      assert.equal(await page.evaluate(() => window.pageClicks), 0);
      assert.equal(await ui(page, `overlay.style.display`), "none", "picker should stop after one kill");
      assert.equal(await ui(page, `toast.style.display`), "flex");
    });

    await step("badge counts removed elements right away (#33)", async () => {
      assert.equal(await badge(ctx), "1");
    });

    await step("Ctrl+Z undoes the removal", async () => {
      await toolbarClick(ctx);
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyZ");
      await page.keyboard.up("Control");
      await sleep(100);
      assert.equal(await hidden(page, ".toaster"), false);
      await page.keyboard.press("Escape");
      await sleep(50);
      assert.equal(await ui(page, `overlay.style.display`), "none");
      assert.equal(await badge(ctx), "");
    });

    await step("ArrowUp selects the parent element", async () => {
      await toolbarClick(ctx);
      const { x, y } = await center(page, "#inner");
      await page.mouse.move(x, y);
      await sleep(50);
      assert.match(await ui(page, `box.firstChild.textContent`), /^span#inner/);
      await page.keyboard.press("ArrowUp");
      assert.match(await ui(page, `box.firstChild.textContent`), /^div#nested/);
      await page.keyboard.press("ArrowDown");
      assert.match(await ui(page, `box.firstChild.textContent`), /^span#inner/);
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Enter");
      await sleep(100);
      assert.equal(await hidden(page, "#nested"), true);
    });

    await step("toast Undo button restores the element", async () => {
      const r = await ui(page, `(() => { const b = toast.querySelector("button").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
      await page.mouse.click(r.x, r.y);
      await sleep(100);
      assert.equal(await hidden(page, "#nested"), false);
    });

    await step("iframes can be removed and are unloaded", async () => {
      await toolbarClick(ctx);
      await clickOn(page, "#frame");
      assert.equal(await hidden(page, "#frame"), true);
      assert.equal(await page.evaluate(() => document.querySelector("#frame").getAttribute("src")), "about:blank");
    });

    await step("Shift+click keeps picking", async () => {
      await toolbarClick(ctx);
      await clickOn(page, "#lower", { shift: true });
      assert.equal(await hidden(page, "#lower"), true);
      assert.equal(await ui(page, `overlay.style.display`), "block");
      await page.keyboard.press("Escape");
    });

    await step("elements come back after reload without Grudge", async () => {
      await page.reload();
      await sleep(200);
      assert.equal(await hidden(page, "#lower"), false);
      assert.equal(await hidden(page, "#frame"), false);
    });

    await step("enabling Grudge in options registers the content script", async () => {
      await ctx.extPage.bringToFront();
      await reloadExt(ctx.extPage);
      // A real click: permissions.request() needs a user gesture.
      const r = await ctx.extPage.evaluate(() => {
        const b = document.querySelector(".switch .slider").getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      });
      await ctx.extPage.mouse.click(r.x, r.y);
      await sleep(300);
      const scripts = await ext(ctx, api => api.scripting.getRegisteredContentScripts());
      assert.equal(scripts.length, 1);
      assert.equal(await ctx.extPage.evaluate(() => { const e = document.querySelector("#grudge-toggle"); return e.checked; }), true);
      await page.bringToFront();
    });

    await step("Grudge remembers elements across reloads, with stable selectors (#22, #34)", async () => {
      await page.reload();
      await sleep(300);
      await toolbarClick(ctx);
      await clickOn(page, ".toaster");
      await toolbarClick(ctx);
      await clickOn(page, '[data-p="first"]');
      await sleep(300);
      await page.reload();
      await sleep(500);
      assert.equal(await hidden(page, ".toaster"), true);
      assert.equal(await hidden(page, '[data-p="first"]'), true);
      assert.equal(await hidden(page, '[data-p="second"]'), false);

      await toolbarClick(ctx);
      await clickOn(page, '[data-p="second"]');
      await sleep(300);
      await page.reload();
      await sleep(500);
      assert.equal(await hidden(page, '[data-p="first"]'), true);
      assert.equal(await hidden(page, '[data-p="second"]'), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#list > div")).display), "block");
      assert.equal(await badge(ctx), "3");
    });

    await step("undo in Grudge mode forgets the rule", async () => {
      await toolbarClick(ctx);
      await clickOn(page, "#lower");
      await sleep(200);
      let list = await ext(ctx, async api => (await api.storage.local.get("hitList")).hitList);
      const host = Object.keys(list)[0];
      assert.equal(list[host]["/page.html"].length, 4);
      await toolbarClick(ctx, "undo");
      await sleep(300);
      list = await ext(ctx, async api => (await api.storage.local.get("hitList")).hitList);
      assert.equal(list[host]["/page.html"].length, 3);
      assert.equal(await hidden(page, "#lower"), false);
    });

    await step("options page lists rules and deletes one", async () => {
      await ctx.extPage.bringToFront();
      await reloadExt(ctx.extPage);
      await sleep(300);
      assert.equal(await ctx.extPage.evaluate(() => { const e = document.querySelector("#rule-count"); return e.textContent; }), "3");
      await ctx.extPage.evaluate(() => document.querySelector("details.site > summary").click());
      const selectors = await ctx.extPage.evaluate(() => { const els = [...document.querySelectorAll(".rule code")]; return els.map(e => e.textContent); });
      assert.ok(selectors.includes(".toaster.u-width-100p.u-hidden\\@desktop-max"), selectors.join(" | "));
      await ctx.extPage.evaluate(() => document.querySelector(".rule button.danger").click());
      await sleep(200);
      assert.equal(await ctx.extPage.evaluate(() => { const e = document.querySelector("#rule-count"); return e.textContent; }), "2");
    });

    await step("import merges a file into the hit list", async () => {
      const json = JSON.stringify({ app: "SkullClick", rules: { "example.org": { "*": [{ selector: "#ad", lastUsed: 1 }] } } });
      await ctx.extPage.evaluate(json => {
        const dt = new DataTransfer();
        dt.items.add(new File([json], "import.json", { type: "application/json" }));
        const input = document.getElementById("import-file");
        input.files = dt.files;
        input.dispatchEvent(new Event("change"));
      }, json);
      await sleep(400);
      assert.equal(await ctx.extPage.evaluate(() => { const e = document.querySelector("#rule-count"); return e.textContent; }), "3");
      assert.match(await ctx.extPage.evaluate(() => { const e = document.querySelector("#status"); return e.textContent; }), /1/);
    });

    await step("options page is localized and has the support link", async () => {
      const info = await ctx.extPage.evaluate(() => ({
        boosty: document.querySelector("#boosty-link").href,
        wallets: [...document.querySelectorAll(".wallet code")].map(e => e.textContent),
        repo: document.querySelector("#repo-link").href
      }));
      assert.equal(info.boosty, "https://boosty.to/mikio_kuroki/donate");
      assert.equal(info.wallets.length, 3);
      assert.equal(info.repo, "https://github.com/Perruer/skullclick");
      assert.ok(await ctx.extPage.evaluate(() => { const e = document.querySelector("footer"); return e.textContent.includes("René Hansen"); }));
    });

    await step("screenshot of the options page", async () => {
      await ctx.extPage.setViewport({ width: 1000, height: 1100 });
      await ctx.extPage.screenshot({ path: path.join(root, "dist-e2e", `options-${kind}.png`), fullPage: true });
    });
  } finally {
    await browser.close();
  }
  return results;
}

let failed = 0;
// Edge runs only when asked for explicitly (needs a local installation).
for (const kind of ["chrome", "firefox", "edge"]) {
  if (only.length ? !only.includes(kind) : kind === "edge") continue;
  console.log(`\n${kind}`);
  try {
    const results = await run(kind);
    failed += results.filter(r => r[0] === "FAIL").length;
  } catch (e) {
    failed++;
    console.log(`  ✗ could not run: ${e.stack}`);
  }
}
server.close();
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
