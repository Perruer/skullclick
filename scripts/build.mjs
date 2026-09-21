// Builds dist/chrome and dist/firefox from src/.
// No bundling or minification: files are copied as-is, only the manifest is
// generated per browser and __REPO_URL__ is filled in from package.json.
//
//   node scripts/build.mjs          -> dist/chrome, dist/firefox
//   node scripts/build.mjs --e2e    -> dist-e2e/... with <all_urls> granted
//                                      up front (tests can't click prompts)
import { cp, mkdir, readFile, rm, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const e2e = process.argv.includes("--e2e");
const outRoot = path.join(root, e2e ? "dist-e2e" : "dist");

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const base = JSON.parse(await readFile(path.join(src, "manifest.json"), "utf8"));
const GECKO_ID = "{60ae131d-96b8-4296-bee4-56e286ea3686}";

const EXCLUDE = new Set(["manifest.json", "skull-original.svg"]);

const targets = {
  chrome: m => ({
    ...m,
    background: { service_worker: "background.js" },
    minimum_chrome_version: "116"
  }),
  firefox: m => ({
    ...m,
    background: { scripts: ["lib/rules.js", "background.js"] },
    browser_specific_settings: {
      gecko: {
        id: GECKO_ID,
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] }
      }
    }
  })
};

async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) await copyTree(a, b);
    else await cp(a, b);
  }
}

await rm(outRoot, { recursive: true, force: true });
for (const [name, patch] of Object.entries(targets)) {
  const out = path.join(outRoot, name);
  await copyTree(src, out);

  const manifest = patch({ ...base, version: pkg.version });
  if (e2e) manifest.host_permissions = ["<all_urls>"];
  await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const optionsJs = path.join(out, "options", "options.js");
  const code = await readFile(optionsJs, "utf8");
  await writeFile(optionsJs, code.replaceAll("__REPO_URL__", pkg.homepage));

  console.log(`built ${path.relative(root, out)} (v${pkg.version})`);
}
