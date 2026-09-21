# Firefox Add-ons (addons.mozilla.org) — listing for SkullClick 2.0.0

Upload: `dist/skullclick-firefox-2.0.0.zip`
Distribution: **On this site** (listed)

---

## 1. Upload step

| Question | Answer |
|---|---|
| Compatible platforms | **Firefox** only (untick Firefox for Android) |
| Do you need to submit source code? (minified, concatenated, transpiled or machine-generated code) | **No.** The files are copied as-is. Optionally attach `dist/skullclick-source-2.0.0.zip` anyway; it contains BUILD.md |

## 2. Describe add-on — English (default locale)

**Name:** SkullClick  *(comes from the manifest)*

**Add-on URL (slug):** `skullclick`

**Summary** (max 250 characters; 198 used):

> Click to remove ads, pop-ups, cookie banners and any other annoying element from a web page. Undo, select the parent element with ↑, remove several at once, and optionally remember removed elements.

**Description:**

```
Like xkill, but for web pages: press Alt+Shift+K or click the skull icon, point at anything annoying and click. It's gone.

What you can remove
• newsletter and "subscribe" pop-ups, including the dimmed backdrop
• cookie banners and sticky headers/footers
• chat widgets and other iframes (they are unloaded, so they stop working in the background)
• autoplaying videos (they are paused), ads, overlays, anything you point at

Picking the right element
• The element under the pointer is highlighted and labelled with its tag, class and size
• ↑ selects the parent element, ↓ goes back to the child
• Enter removes the selection, Shift+click removes and keeps the picker on
• Ctrl+Z or the Undo button brings the last element back
• Esc stops picking

Grudge mode (optional)
Turn it on in the options and SkullClick remembers every element you remove. On your next visit it is hidden automatically, before you even see it. For each remembered element you choose whether it applies to that page only or to the whole site. The hit list can be searched, edited, exported and imported.

Private by design
• No data collection, no analytics, no network requests
• Needs no access to websites by default. Grudge mode asks for it only when you turn it on
• The hit list stays in your browser

Works on sites that fight back: pages that swallow mouse events or use a strict Content Security Policy.

SkullClick is open source (MIT) and based on ekill by René Hansen. It's free and has no ads. If it helps you, you can support development; the links are in the options page.

Source code, bug reports: https://github.com/Perruer/skullclick
```

**Categories:** Privacy & Security; Appearance

**Tags:** AMO offers a fixed drop-down list; pick up to 10 of the ones that exist there, for example **ad blocker**, **privacy**, **anti tracker**, **accessibility**.

**Support email:** leave empty (optional) or use a dedicated address
**Support website:** https://github.com/Perruer/skullclick/issues
**Homepage:** https://github.com/Perruer/skullclick
**License:** MIT License
**Does this add-on have a privacy policy?** Yes. Paste the text of [PRIVACY.md](../PRIVACY.md) (AMO wants the text itself, not a link).
**Contributions URL** (the "Support this developer" button, in *Manage listing → Additional details*): AMO accepts only
links to an allow-list of platforms (PayPal.me, Patreon, Liberapay, Ko-fi, GitHub Sponsors, Open Collective, Buy Me a Coffee).
Boosty is not on that list, so the field stays empty unless one of those accounts is created. The Boosty link and
wallets are still reachable from the description (GitHub link) and from the extension's options page.

## 3. Russian (Русский) localization of the listing

Add the locale in *Edit Product Page → Localize*.

**Название:** SkullClick

**Краткое описание** (до 250 символов, 197 занято):

> Убирайте рекламу, всплывающие окна, баннеры cookie и любые мешающие элементы страницы одним кликом. Отмена, выбор родителя стрелкой ↑, удаление нескольких элементов подряд и запоминание удалённого.

**Описание:**

```
Как xkill, только для веб-страниц: нажмите Alt+Shift+K или значок с черепом, наведите на то, что мешает, и кликните. Готово.

Что можно убрать
• окна «Подпишитесь на рассылку» вместе с затемнённым фоном
• баннеры cookie и прилипающие шапки и подвалы
• чаты поддержки и другие iframe (они выгружаются и перестают работать в фоне)
• автоматически запускающиеся видео (ставятся на паузу), рекламу, оверлеи — всё, на что наведёте

Точный выбор элемента
• Элемент под курсором подсвечивается, рядом видны тег, класс и размер
• ↑ выбирает родительский элемент, ↓ возвращает к дочернему
• Enter удаляет выбранное, Shift+клик удаляет и оставляет режим выбора включённым
• Ctrl+Z или кнопка «Отменить» возвращают последний элемент
• Esc выключает режим выбора

Злопамятность (по желанию)
Включите её в настройках, и SkullClick будет запоминать каждый удалённый элемент. При следующем посещении он скроется автоматически, вы его даже не увидите. Для каждого элемента можно выбрать: скрывать только на этой странице или на всём сайте. Список можно искать, редактировать, экспортировать и импортировать.

Приватность
• Никакого сбора данных, аналитики и сетевых запросов
• По умолчанию не требует доступа к сайтам; злопамятность запрашивает его только при включении
• Список хранится только в вашем браузере

Работает даже на сайтах, которые перехватывают клики мыши или используют строгую политику безопасности контента (CSP).

SkullClick — открытый проект (MIT), основан на ekill от René Hansen. Бесплатный и без рекламы. Если он вам полезен, разработку можно поддержать — ссылки есть в настройках.

Исходный код и сообщения об ошибках: https://github.com/Perruer/skullclick
```

## 4. Screenshots

Upload in this order, from `docs/screenshots/en/` (English listing) and
`docs/screenshots/ru/` (Russian listing). AMO accepts any size; 1280×800 looks best.

| File | Caption EN | Подпись RU |
|---|---|---|
| `01-pick.png` | Point at anything: the element under the cursor is highlighted | Наведите на что угодно — элемент под курсором подсвечивается |
| `02-parent.png` | Press ↑ to select the parent — here, the whole pop-up | Стрелка ↑ выбирает родителя — здесь всё всплывающее окно |
| `03-after.png` | Pop-up, cookie banner and chat gone. Undo is one click away | Окно, баннер cookie и чат убраны. Отмена — в один клик |
| `05-hitlist.png` | Grudge mode remembers removed elements, per page or per site | Злопамятность запоминает удалённое — для страницы или всего сайта |
| `04-options.png` | Simple options with a list of keyboard shortcuts | Простые настройки со списком горячих клавиш |
| `06-support-dark.png` | Dark theme | Тёмная тема |

## 5. Notes to reviewer

```
SkullClick 2.0.0 is a Manifest V3 rewrite of "ekill" (https://addons.mozilla.org/firefox/addon/ekill/, MIT, unmaintained since 2019) under a new name and add-on ID.

No minified/bundled/transpiled code: scripts/build.mjs only copies src/ and writes manifest.json (see BUILD.md in the attached source zip). No remote code, no network requests, no third-party libraries in the package.

Permissions:
- activeTab + scripting: the toolbar button / Alt+Shift+K injects lib/selector.js and content.js into the current tab (scripting.executeScript) to show the element picker.
- storage: settings (storage.sync) and the hit list of remembered selectors (storage.local).
- optional_host_permissions <all_urls>: requested from the options page only when the user enables "Grudge mode". Then background.js registers content.js with scripting.registerContentScripts so remembered elements can be hidden on page load (scripting.insertCSS with display:none rules). It is unregistered when the mode is turned off or the permission is revoked.

How to test:
1. Open any page, e.g. https://en.wikipedia.org/wiki/Special:Random
2. Click the SkullClick toolbar button (or Alt+Shift+K), move the mouse over an element, click it: it disappears. Ctrl+Z brings it back. ↑/↓ change the selection to parent/child. Esc exits.
3. Options page → turn on "Grudge mode" → allow access → remove an element → reload the page: the element stays hidden. It appears in the Hit List in the options page, where it can be deleted.
```

## 6. After approval

- Check the final listing URL and update README (`https://addons.mozilla.org/firefox/addon/skullclick/`).
- If a Ko-fi / GitHub Sponsors / Liberapay account exists by then, set it as the Contributions URL.
