# Building SkullClick from source

These are the instructions for reproducing the published packages (also for
addons.mozilla.org reviewers).

The extension code is **not** transpiled, bundled or minified. The build
script only copies `src/` to `dist/<browser>/`, writes a browser-specific
`manifest.json` and replaces the `__REPO_URL__` placeholder in
`options/options.js` with the `homepage` from `package.json`.

## Requirements

- Node.js 20 or newer (tested with 20.20), npm 10
- Any OS (tested on Windows 11; the build uses only Node.js APIs)

## Steps

```bash
npm ci
npm run build
```

Output:

- `dist/firefox/` — the Firefox add-on (identical to the submitted package)
- `dist/chrome/` — the Chromium (Chrome / Edge) extension

To produce the zip files as well:

```bash
npm run package
# dist/skullclick-firefox-<version>.zip
# dist/skullclick-chrome-<version>.zip
# dist/skullclick-source-<version>.zip
```

Only `web-ext` (to zip and lint), `jsdom` and `puppeteer` (tests) are
installed from npm; none of them end up in the extension.

## Tests

```bash
npm test          # unit tests (node:test + jsdom)
npm run lint      # web-ext lint of dist/firefox
npm run test:e2e  # end-to-end tests in Chrome for Testing and Firefox (downloads browsers)
```

## Files

| Path | Purpose |
|---|---|
| `src/manifest.json` | Shared manifest; `scripts/build.mjs` adds `background` and `browser_specific_settings` per browser |
| `src/background.js` | Toolbar button / shortcut handling, Grudge rules, badge |
| `src/content.js` | Element picker, undo, applying remembered rules (injected on demand or registered when Grudge mode is on) |
| `src/lib/selector.js` | Unique CSS selector generation |
| `src/lib/rules.js` | Hit list data structure |
| `src/options/` | Options page |
| `src/_locales/` | English and Russian strings |
