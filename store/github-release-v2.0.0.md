<!--
GitHub Release
  Tag:    v2.0.0 (on commit of main)
  Title:  SkullClick 2.0.0 — ekill reborn for Manifest V3
  Assets: dist/skullclick-chrome-2.0.0.zip
          (after AMO signs it: the signed skullclick-2.0.0.xpi from AMO)
  Mark as latest release.
Body below the line.
-->

**SkullClick** removes ads, pop-ups, cookie banners and any other annoying element from a web page with one click. This is the first release: a Manifest V3 rewrite of [ekill](https://github.com/rhardih/ekill) by René Hansen, which stopped working in Chrome after Manifest V2 was retired.

![SkullClick demo](https://raw.githubusercontent.com/Perruer/skullclick/main/docs/demo.gif)

## Install

- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/skullclick/)
- **Microsoft Edge:** Edge Add-ons (link will be added after the listing is approved)
- **Chrome, Brave, Vivaldi, Opera:** download **`skullclick-chrome-2.0.0.zip`** below, then:
  1. Unzip it into a folder you will keep.
  2. Open `chrome://extensions` and turn on **Developer mode** (top-right).
  3. Click **Load unpacked** and pick the unzipped folder (the one with `manifest.json`).
  4. Pin SkullClick from the puzzle 🧩 menu.

  To update later: replace the files in the same folder and press ↻ on the SkullClick card. Settings are kept.

## Highlights

- <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> or the toolbar icon → point → click: gone
- **Undo** with <kbd>Ctrl</kbd>+<kbd>Z</kbd> or the *Undo* button
- <kbd>↑</kbd> / <kbd>↓</kbd> select the parent / child element, <kbd>Shift</kbd>+click removes several elements
- **Grudge mode**: remembers removed elements and hides them on your next visits, per page or per site; hit list with search, export and import
- No access to websites unless you turn Grudge mode on; no data collection, no network requests
- Works on pages that swallow mouse events (e.g. Notion) and with strict CSP
- English and Russian interface, dark theme

## Fixed from ekill

- Invalid selectors for classes/ids with special characters (rhardih/ekill#30, rhardih/ekill#34)
- Remembered selectors hitting the wrong element (rhardih/ekill#22)
- Picker not working on Notion and similar sites (rhardih/ekill#35)
- Counter only updated after reload (rhardih/ekill#33)
- Deleting a hit list entry removed a different one

Full list: [CHANGELOG.md](https://github.com/Perruer/skullclick/blob/main/CHANGELOG.md)

> **Coming from ekill?** SkullClick is a separate extension, so settings and the hit list aren't carried over. The default shortcut is now <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> opens the Web Console in Firefox).

## Support the project

SkullClick is free and has no ads. If it saves you from pop-ups, you can support it on **[Boosty](https://boosty.to/mikio_kuroki/donate)** or with crypto (TRON, Ethereum/EVM, TON). The addresses are in the [README](https://github.com/Perruer/skullclick#support-the-project).
