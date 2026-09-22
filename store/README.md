# Release kit — SkullClick 2.0.0

Everything needed to publish a release. Regenerate the packages with `npm run package`.

| File | What |
|---|---|
| `../dist/skullclick-firefox-2.0.0.zip` | Package for addons.mozilla.org |
| `../dist/skullclick-chrome-2.0.0.zip` | Package for GitHub Releases (manual install in Chrome, Edge and other Chromium browsers) |
| `../dist/skullclick-source-2.0.0.zip` | Source code for the AMO review (with BUILD.md) |
| [amo.md](amo.md) | AMO listing: texts EN/RU, categories, screenshots, reviewer notes |
| [github-release-v2.0.0.md](github-release-v2.0.0.md) | GitHub Release text |
| `logo-300.png`, `promo-*.png` | Store images (`npm run icons`, `node scripts/promo.mjs`) |
| `../docs/screenshots/{en,ru}/` | Screenshots 1280×800 (`npm run screenshots`) |

## GitHub repository settings

- **Description:** Click to remove ads, pop-ups, cookie banners and any other annoying element from a web page. Firefox, Edge, Chrome. Fork of ekill.
- **Website:** https://addons.mozilla.org/firefox/addon/skullclick/ (after approval)
- **Topics:** `browser-extension`, `firefox-addon`, `chrome-extension`, `edge-extension`, `manifest-v3`, `element-hider`, `popup-blocker`, `cookie-banner`, `annoyances`, `webextension`
- **Sponsor button:** enabled automatically by `.github/FUNDING.yml`

## Checklist

1. [ ] `npm ci && npm test && npm run test:e2e && npm run test:release && npm run package`
2. [ ] Push `main` and tag `v2.0.0` to github.com/Perruer/skullclick; set description and topics
3. [ ] GitHub Release `v2.0.0` with `skullclick-chrome-2.0.0.zip`
4. [ ] Submit to AMO (amo.md), attach the source zip
5. [ ] After approval: update the store links in README.md and in the release notes; attach the AMO-signed `.xpi` to the GitHub Release
