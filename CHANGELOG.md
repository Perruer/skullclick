# Changelog

## 2.0.0 — SkullClick

First release of SkullClick, a Manifest V3 rewrite of ekill 1.9.

**New**
- Manifest V3 builds for Chromium (Chrome, Edge, Brave, …) and Firefox from one code base.
- Undo the last removal: <kbd>Ctrl</kbd>+<kbd>Z</kbd> while picking, the *Undo* button in the
  notification, or an optional keyboard shortcut.
- <kbd>↑</kbd> / <kbd>↓</kbd> select the parent / child element; <kbd>Enter</kbd> removes the selection.
- <kbd>Shift</kbd>+click removes an element and keeps the picker on.
- Label with the element's tag, id, classes and size while picking; hint bar with keys.
- Hit list export/import (JSON), search, per-rule scope (this page / whole site).
- Removed iframes are unloaded and removed media is paused.
- English and Russian interface; dark theme for the options page.
- Welcome page on first install.

**Changed**
- No host permissions by default. "Access to all websites" is requested only when Grudge mode
  is turned on, and the content script is registered only then.
- Elements are hidden (`display: none`) instead of removed from the page.
- Remembered elements are hidden with a stylesheet as the page loads, instead of being searched
  for and deleted by a script.
- Default shortcut is <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd>.
- Options page rewritten without jQuery, Bootstrap and bootstrap-treeview.
- New icon, readable on light and dark toolbars.
- The "New" badge and changelog tab on updates were removed.

**Fixed**
- Invalid selectors for ids and classes with special characters (ekill #30, #34).
- Remembered selectors pointing at the wrong element after earlier siblings were removed (ekill #22).
- Picker not working on pages that intercept mouse events, such as Notion (ekill #35).
- Kill counter only updated after a reload (ekill #33).
- Deleting an entry from the hit list deleted and corrupted a different entry.
- `#foo` was treated as a parent of `#foobar > p` when collapsing hit list entries.
- The picker silently did nothing on tabs that were open before the extension was installed.

---

## ekill history (by René Hansen)

**1.9** Support for killing iframes.
**1.8** Default hot-key changed from Ctrl+K to Ctrl+Shift+K.
**1.7** Kill count badge on the extension icon.
**1.6** Grudge feature, options page, changelog notifications.
**1.5** Light icons for the Firefox dark theme.
**1.4** Firefox support.
**1.1–1.3** Toggle on/off, dismiss with Esc, *activeTab* permission only, targets `role=button`.
**1.0** Initial version.
