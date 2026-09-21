# Microsoft Edge Add-ons (Partner Center) — listing for SkullClick 2.0.0

Upload: `dist/skullclick-chrome-2.0.0.zip` (the Chromium build is used for Edge)

---

## 1. Availability

- Visibility: **Public**
- Markets: **all markets**

## 2. Properties

| Field | Value |
|---|---|
| Category | **Productivity** |
| Does the extension access, collect or transmit personal information? | **No** |
| Privacy policy URL | https://github.com/Perruer/skullclick/blob/main/PRIVACY.md |
| Website URL | https://github.com/Perruer/skullclick |
| Support contact | https://github.com/Perruer/skullclick/issues |
| Mature content | No |

## 3. Store listing — English (en-US)

**Description** (Edge requires 250–10,000 characters):

```
Like xkill, but for web pages: press Alt+Shift+K or click the skull icon, point at anything annoying and click. It's gone.

WHAT YOU CAN REMOVE
• Newsletter and "subscribe" pop-ups, including the dimmed backdrop
• Cookie banners and sticky headers/footers
• Chat widgets and other iframes (they are unloaded, so they stop working in the background)
• Autoplaying videos (they are paused), ads, overlays, anything you point at

PICKING THE RIGHT ELEMENT
• The element under the pointer is highlighted and labelled with its tag, class and size
• ↑ selects the parent element, ↓ goes back to the child
• Enter removes the selection, Shift+click removes and keeps the picker on
• Ctrl+Z or the Undo button brings the last element back
• Esc stops picking

GRUDGE MODE (OPTIONAL)
Turn it on in the options and SkullClick remembers every element you remove. On your next visit it is hidden automatically. For each remembered element you choose whether it applies to that page only or to the whole site. The hit list can be searched, edited, exported and imported.

PRIVATE BY DESIGN
• No data collection, no analytics, no network requests
• Needs no access to websites by default. Grudge mode asks for it only when you turn it on
• The hit list stays in your browser

Works on sites that fight back: pages that swallow mouse events or use a strict Content Security Policy.

SkullClick is free, open source (MIT) and based on ekill by René Hansen.
Source code and bug reports: https://github.com/Perruer/skullclick
```

**Short description:** taken from the manifest (126 chars):
> Click to remove ads, pop-ups, banners and any other annoying element from a web page. Undo, parent selection, optional memory.

**Search terms** (max 7 terms, 30 chars each, 21 words in total — 13 used):

1. `remove element`
2. `element hider`
3. `popup blocker`
4. `cookie banner`
5. `zap element`
6. `clean page`
7. `xkill`

## 4. Store listing — Russian (ru)

Add the language in *Store listings → Manage additional languages → Russian*.

**Описание:**

```
Как xkill, только для веб-страниц: нажмите Alt+Shift+K или значок с черепом, наведите на то, что мешает, и кликните. Готово.

ЧТО МОЖНО УБРАТЬ
• Окна «Подпишитесь на рассылку» вместе с затемнённым фоном
• Баннеры cookie и прилипающие шапки и подвалы
• Чаты поддержки и другие iframe (они выгружаются и перестают работать в фоне)
• Автоматически запускающиеся видео (ставятся на паузу), рекламу, оверлеи — всё, на что наведёте

ТОЧНЫЙ ВЫБОР ЭЛЕМЕНТА
• Элемент под курсором подсвечивается, рядом видны тег, класс и размер
• ↑ выбирает родительский элемент, ↓ возвращает к дочернему
• Enter удаляет выбранное, Shift+клик удаляет и оставляет режим выбора включённым
• Ctrl+Z или кнопка «Отменить» возвращают последний элемент
• Esc выключает режим выбора

ЗЛОПАМЯТНОСТЬ (ПО ЖЕЛАНИЮ)
Включите её в настройках, и SkullClick будет запоминать каждый удалённый элемент. При следующем посещении он скроется автоматически. Для каждого элемента можно выбрать: скрывать только на этой странице или на всём сайте. Список можно искать, редактировать, экспортировать и импортировать.

ПРИВАТНОСТЬ
• Никакого сбора данных, аналитики и сетевых запросов
• По умолчанию не требует доступа к сайтам; злопамятность запрашивает его только при включении
• Список хранится только в вашем браузере

Работает даже на сайтах, которые перехватывают клики мыши или используют строгую политику безопасности контента (CSP).

SkullClick — бесплатный открытый проект (MIT), основан на ekill от René Hansen.
Исходный код и сообщения об ошибках: https://github.com/Perruer/skullclick
```

**Краткое описание:** берётся из манифеста (129 символов):
> Убирайте рекламу, всплывающие окна, баннеры и любые мешающие элементы страницы одним кликом. Отмена, выбор родителя, запоминание.

**Поисковые запросы** (до 7):

1. `удалить элемент`
2. `скрыть элемент`
3. `блокировщик окон`
4. `баннер cookie`
5. `убрать рекламу`
6. `чистая страница`
7. `skullclick`

## 5. Images (same files for both languages, screenshots per language)

| Asset | Required | File |
|---|---|---|
| Store logo 300×300 | yes | `store/logo-300.png` |
| Small promotional tile 440×280 | optional | `store/promo-small-440x280.png` |
| Large promotional tile 1400×560 | optional (needed for featuring) | `store/promo-large-1400x560.png` |
| Screenshots 1280×800 (up to 10) | recommended | `docs/screenshots/en/*.png` for English, `docs/screenshots/ru/*.png` for Russian |

Screenshot order and captions — same as in [amo.md](amo.md#4-screenshots):
`01-pick`, `02-parent`, `03-after`, `05-hitlist`, `04-options`, `06-support-dark`.

## 6. Notes for certification

```
SkullClick removes page elements the user clicks on. No account or setup needed.

How to test:
1. Open any website, e.g. https://en.wikipedia.org/wiki/Special:Random
2. Click the SkullClick toolbar button (or press Alt+Shift+K). Move the mouse over an element: it gets a red outline. Click: the element disappears.
3. Ctrl+Z brings it back. Arrow Up / Down change the selection to the parent / child element. Esc exits.
4. Optional "Grudge mode": open the extension options, turn on the switch, allow access to websites when asked, remove an element on a page and reload it: the element stays hidden. It is listed in the options page ("Hit List") and can be deleted there.

Permissions: activeTab + scripting (inject the picker into the current tab on click), storage (settings and remembered elements), optional host permission <all_urls> (requested only when Grudge mode is turned on; used to hide remembered elements when pages load).
No remote code, no network requests, no data collection. Source: https://github.com/Perruer/skullclick
```
