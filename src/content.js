/*
 * SkullClick — content script: element picker, undo, Grudge counting.
 *
 * Based on ekill by René Hansen (MIT), https://github.com/rhardih/ekill
 *
 * Differences from ekill:
 * - A full-page overlay inside a shadow root captures the pointer, so pages
 *   can't swallow events (ekill #35) and iframes are picked without per-iframe
 *   overlays. The page's DOM and classes are left untouched while picking.
 * - Elements are hidden (display:none !important) instead of removed. This
 *   keeps sibling indices stable for remembered selectors (ekill #22) and
 *   makes undo possible.
 * - Arrow keys widen / narrow the selection to the parent / child.
 */
(() => {
  "use strict";

  // Can be injected both by the registered Grudge script and on demand.
  if (globalThis.__skullclickLoaded) return;
  globalThis.__skullclickLoaded = true;

  const api = globalThis.browser || globalThis.chrome;
  const Selector = globalThis.SkullClickSelector;
  const t = (key, subs) => {
    try {
      return api.i18n.getMessage(key, subs) || key;
    } catch (e) {
      return key;
    }
  };
  const send = message => {
    try {
      return Promise.resolve(api.runtime.sendMessage({ ...message, url: location.href })).catch(() => undefined);
    } catch (e) {
      // Extension was reloaded/updated; this orphaned script can't talk anymore.
      return Promise.resolve(undefined);
    }
  };

  const SKULL_CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 30 30'%3E%3Cpath stroke='white' stroke-width='1.5' paint-order='stroke' d='M27.42 28.82a.96.96 0 0 1-.9.61.98.98 0 0 1-.35 0L15 24.73l-11.19 4.7a.96.96 0 0 1-1.25-.54v-.02a.96.96 0 0 1 .56-1.37l9.35-3.85-9.35-3.86a.96.96 0 1 1 .7-1.8L15 22.65 26.19 18a.96.96 0 1 1 .7 1.79l-9.38 3.86 9.35 3.85a.96.96 0 0 1 .56 1.32zM23.68 8.66v.87c0 .4-.14.8-.39 1.14A34.18 34.18 0 0 1 19.82 14v2.24c0 .4-.24.76-.61.9l-4.17 1.68h-.14l-4.18-1.67a.96.96 0 0 1-.54-.91V14a33.88 33.88 0 0 1-3.51-3.33 1.93 1.93 0 0 1-.35-1.14v-.87A8.87 8.87 0 0 1 14.25.5h1.44a8.85 8.85 0 0 1 7.99 8.16zm-11.57-.44a1.93 1.93 0 1 0-3.86 0 1.93 1.93 0 0 0 3.86 0zM14.04 14a.96.96 0 0 0-1.93 0v.97a.96.96 0 0 0 1.93 0zm3.85 0a.96.96 0 0 0-1.93 0v.97a.96.96 0 0 0 1.93 0zm3.86-5.78a1.93 1.93 0 1 0-3.86 0 1.93 1.93 0 0 0 3.86 0z'/%3E%3C/svg%3E\") 12 12, crosshair";

  const state = {
    grudge: false,
    ruleSelectors: [],
    active: false,
    base: null,        // element under the pointer
    current: null,     // selected element (base or one of its ancestors)
    childStack: [],    // for walking back down with ArrowDown
    mouse: { x: -1, y: -1 },
    undo: [],
    killed: new Set(),
    lastCount: -1,
    url: location.href
  };

  /* ---------------------------------------------------------------- UI -- */

  let ui = null;

  // All styling is inline (CSSOM), which page CSPs can't block.
  const style = (el, props) => {
    for (const [k, v] of Object.entries(props)) el.style.setProperty(k, v, "important");
    return el;
  };
  const make = (tag, props, parent) => {
    const el = style(document.createElement(tag), props);
    if (parent) parent.appendChild(el);
    return el;
  };

  const FONT = "13px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  function ensureUI() {
    if (ui && ui.host.isConnected) return ui;

    const host = make("skullclick-root", {
      all: "initial",
      position: "fixed",
      top: "0",
      left: "0",
      width: "0",
      height: "0",
      "z-index": "2147483647"
    });
    const root = host.attachShadow({ mode: "open" });

    const overlay = make("div", {
      position: "fixed",
      inset: "0",
      background: "transparent",
      cursor: SKULL_CURSOR,
      display: "none",
      outline: "none"
    }, root);
    overlay.tabIndex = -1;

    const box = make("div", {
      position: "fixed",
      display: "none",
      "pointer-events": "none",
      "box-sizing": "border-box",
      border: "2px solid #e53935",
      background: "rgba(229, 57, 53, 0.18)",
      "border-radius": "2px"
    }, root);

    const label = make("div", {
      position: "absolute",
      left: "-2px",
      "white-space": "nowrap",
      font: "12px/20px ui-monospace, SFMono-Regular, Consolas, monospace",
      color: "#fff",
      background: "#b71c1c",
      padding: "0 6px",
      "border-radius": "3px",
      "max-width": "80vw",
      overflow: "hidden",
      "text-overflow": "ellipsis"
    }, box);

    const hint = make("div", {
      position: "fixed",
      left: "50%",
      bottom: "16px",
      transform: "translateX(-50%)",
      display: "none",
      "pointer-events": "none",
      font: FONT,
      color: "#fff",
      background: "rgba(24, 24, 24, 0.92)",
      padding: "8px 14px",
      "border-radius": "8px",
      "box-shadow": "0 4px 16px rgba(0,0,0,.3)",
      "white-space": "nowrap"
    }, root);
    hint.textContent = t("pickerHint");

    const toast = make("div", {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      display: "none",
      "align-items": "center",
      gap: "12px",
      font: FONT,
      color: "#fff",
      background: "rgba(24, 24, 24, 0.95)",
      padding: "8px 8px 8px 14px",
      "border-radius": "8px",
      "box-shadow": "0 4px 16px rgba(0,0,0,.3)"
    }, root);
    const toastText = make("span", {}, toast);
    const toastButton = make("button", {
      font: FONT,
      "font-weight": "600",
      color: "#ff8a80",
      background: "transparent",
      border: "1px solid rgba(255,255,255,.25)",
      "border-radius": "6px",
      padding: "3px 10px",
      cursor: "pointer"
    }, toast);
    toastButton.type = "button";
    toastButton.textContent = t("undo");
    // Handled on window (capture) so pages that swallow clicks on document
    // can't break the button.
    for (const type of ["click", "mousedown", "mouseup", "pointerdown", "pointerup"]) {
      window.addEventListener(type, e => {
        if (!ui || !e.composedPath().includes(ui.toast)) return;
        e.stopImmediatePropagation();
        if (type === "click" && e.composedPath().includes(ui.toastButton)) {
          e.preventDefault();
          undo();
        }
      }, true);
    }

    document.documentElement.appendChild(host);
    ui = { host, overlay, box, label, hint, toast, toastText, toastButton, toastTimer: 0 };
    return ui;
  }

  function showToast(text, withUndo) {
    const u = ensureUI();
    u.toastText.textContent = text;
    style(u.toastButton, { display: withUndo ? "inline-block" : "none" });
    style(u.toast, { display: "flex" });
    clearTimeout(u.toastTimer);
    u.toastTimer = setTimeout(() => style(u.toast, { display: "none" }), 5000);
  }

  function highlight(el) {
    const u = ensureUI();
    if (!el) {
      style(u.box, { display: "none" });
      return;
    }
    const r = el.getBoundingClientRect();
    style(u.box, {
      display: "block",
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${Math.max(r.width, 2)}px`,
      height: `${Math.max(r.height, 2)}px`
    });
    u.label.textContent = `${Selector.describe(el)}  ${Math.round(r.width)}×${Math.round(r.height)}`;
    // Put the label inside the box when there's no room above it.
    style(u.label, r.top < 24 ? { top: "0", bottom: "auto" } : { top: "-22px", bottom: "auto" });
    // Keep the hint out of the way of the selection.
    const hintAtTop = state.mouse.y > window.innerHeight - 80;
    style(u.hint, hintAtTop ? { top: "16px", bottom: "auto" } : { top: "auto", bottom: "16px" });
  }

  /* ------------------------------------------------------------ picking -- */

  function isOurs(el) {
    return ui && (el === ui.host || ui.host.contains(el));
  }

  function elementAt(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (isOurs(el)) continue;
      if (el === document.documentElement || el === document.body) return null;
      return el;
    }
    return null;
  }

  function retarget() {
    if (!state.active || state.mouse.x < 0) return;
    const el = elementAt(state.mouse.x, state.mouse.y);
    if (el !== state.base) {
      state.base = el;
      state.current = el;
      state.childStack = [];
    }
    highlight(state.current);
  }

  // Pointer events are intercepted on window in the capture phase, i.e.
  // before any listener the page put on document or elements (ekill #35).
  const POINTER_EVENTS = {
    mousemove: e => onMouseMove(e),
    click: e => onClick(e),
    wheel: e => onWheel(e),
    mousedown: swallow,
    mouseup: swallow,
    pointerdown: swallow,
    pointerup: swallow,
    pointermove: swallow,
    mouseover: swallow,
    mouseout: swallow,
    dblclick: swallow,
    auxclick: swallow,
    contextmenu: swallow
  };

  function onPointerEvent(e) {
    if (!state.active || !ui) return;
    const path = e.composedPath();
    if (!path.includes(ui.overlay)) return;
    POINTER_EVENTS[e.type](e);
  }

  function onMouseMove(e) {
    state.mouse = { x: e.clientX, y: e.clientY };
    retarget();
    swallow(e);
  }

  function onClick(e) {
    swallow(e);
    if (e.button !== 0) return;
    state.mouse = { x: e.clientX, y: e.clientY };
    if (!state.current) retarget();
    if (state.current) kill(state.current, e.shiftKey);
  }

  function swallow(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  // The overlay covers the page, so forward wheel events to the scroll
  // container under the pointer. The main viewport scrolls natively.
  function onWheel(e) {
    e.stopImmediatePropagation();
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const dx = e.deltaX * scale;
    const dy = e.deltaY * scale;
    for (let el = state.base; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      const cs = getComputedStyle(el);
      const canY = /(auto|scroll|overlay)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight &&
        ((dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight) || (dy < 0 && el.scrollTop > 0));
      const canX = /(auto|scroll|overlay)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth &&
        ((dx > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth) || (dx < 0 && el.scrollLeft > 0));
      if (canY || canX) {
        e.preventDefault();
        el.scrollBy({ left: dx, top: dy, behavior: "instant" });
        return;
      }
    }
  }

  function selectParent() {
    const cur = state.current;
    if (!cur) return;
    const parent = cur.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) return;
    state.childStack.push(cur);
    state.current = parent;
    highlight(parent);
  }

  function selectChild() {
    if (state.childStack.length === 0) return;
    state.current = state.childStack.pop();
    highlight(state.current);
  }

  function onKeyDown(e) {
    if (!state.active) return;
    const key = e.key;
    if (key === "Escape") {
      deactivate();
    } else if (key === "ArrowUp" || key === "w" || key === "W") {
      selectParent();
    } else if (key === "ArrowDown" || key === "s" || key === "S") {
      selectChild();
    } else if (key === "Enter") {
      if (state.current) kill(state.current, e.shiftKey);
    } else if ((key === "z" || key === "Z") && (e.ctrlKey || e.metaKey)) {
      undo();
    } else {
      return;
    }
    swallow(e);
  }

  function onScrollOrResize() {
    retarget();
  }

  function activate() {
    const u = ensureUI();
    state.active = true;
    style(u.overlay, { display: "block" });
    style(u.hint, { display: "block" });
    // Take keyboard focus away from inputs and iframes.
    u.overlay.focus({ preventScroll: true });
    window.addEventListener("keydown", onKeyDown, true);
    for (const type of Object.keys(POINTER_EVENTS)) {
      window.addEventListener(type, onPointerEvent, { capture: true, passive: false });
    }
    window.addEventListener("scroll", onScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", onScrollOrResize, true);
    retarget();
  }

  function deactivate() {
    state.active = false;
    state.base = state.current = null;
    state.childStack = [];
    window.removeEventListener("keydown", onKeyDown, true);
    for (const type of Object.keys(POINTER_EVENTS)) {
      window.removeEventListener(type, onPointerEvent, { capture: true });
    }
    window.removeEventListener("scroll", onScrollOrResize, { capture: true });
    window.removeEventListener("resize", onScrollOrResize, true);
    if (ui) {
      style(ui.overlay, { display: "none" });
      style(ui.hint, { display: "none" });
      style(ui.box, { display: "none" });
      ui.overlay.blur();
    }
  }

  function toggle() {
    if (state.active) deactivate();
    else activate();
  }

  /* ------------------------------------------------------ kill & undo -- */

  // Hidden media keeps playing, so silence it. Iframes (embedded players,
  // chat widgets) are unloaded and restored on undo.
  function silence(el) {
    const media = [];
    const frames = [];
    const all = [el, ...el.querySelectorAll("video, audio, iframe")];
    for (const m of all) {
      if (m instanceof HTMLMediaElement && !m.paused) {
        m.pause();
        media.push(m);
      } else if (m instanceof HTMLIFrameElement && m.hasAttribute("src")) {
        frames.push({ frame: m, src: m.getAttribute("src") });
        m.setAttribute("src", "about:blank");
      }
    }
    return { media, frames };
  }

  function kill(el, keepActive) {
    let selector = null;
    if (state.grudge) {
      try {
        selector = Selector.generateSelector(el);
      } catch (e) {
        console.warn(e);
      }
    }

    const entry = {
      el,
      selector,
      display: el.style.getPropertyValue("display"),
      priority: el.style.getPropertyPriority("display"),
      silenced: silence(el)
    };
    el.style.setProperty("display", "none", "important");
    state.undo.push(entry);
    state.killed.add(el);

    if (selector) send({ type: "saveRule", selector });
    reportCount();
    showToast(t(selector ? "toastRemovedRemembered" : "toastRemoved"), true);

    if (keepActive) {
      state.base = null;
      retarget();
    } else {
      deactivate();
    }
  }

  function undo() {
    const entry = state.undo.pop();
    if (!entry) {
      showToast(t("toastNothingToUndo"), false);
      return;
    }
    const { el } = entry;
    if (entry.display) el.style.setProperty("display", entry.display, entry.priority);
    else el.style.removeProperty("display");
    for (const { frame, src } of entry.silenced.frames) frame.setAttribute("src", src);
    for (const m of entry.silenced.media) m.play().catch(() => {});
    state.killed.delete(el);

    if (entry.selector) send({ type: "forgetRule", selector: entry.selector });
    reportCount();
    showToast(t("toastRestored"), state.undo.length > 0);
    if (state.active) retarget();
  }

  /* ----------------------------------------------------- Grudge counter -- */

  function countHidden() {
    const hidden = new Set(state.killed);
    for (const s of state.ruleSelectors) {
      try {
        document.querySelectorAll(s).forEach(el => hidden.add(el));
      } catch (e) { /* invalid selector from an old import */ }
    }
    return hidden.size;
  }

  // Updates the toolbar badge as soon as something changes (ekill #33).
  function reportCount() {
    const n = countHidden();
    if (n !== state.lastCount) {
      state.lastCount = n;
      send({ type: "count", count: n });
    }
  }

  let observer = null;
  function watchForLateElements() {
    if (observer || state.ruleSelectors.length === 0) return;
    let timer = 0;
    observer = new MutationObserver(() => {
      if (!timer) timer = setTimeout(() => { timer = 0; reportCount(); }, 700);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // Counting is cosmetic; don't observe busy pages forever.
    setTimeout(() => { observer.disconnect(); observer = null; }, 120000);
  }

  async function hello(previousUrl) {
    const reply = await send({ type: "hello", previousUrl });
    if (!reply) return;
    state.grudge = !!reply.grudge;
    state.ruleSelectors = reply.selectors || [];
    const start = () => {
      reportCount();
      watchForLateElements();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }

  api.runtime.onMessage.addListener(message => {
    if (!message) return;
    if (message.type === "toggle") toggle();
    else if (message.type === "undo") undo();
  });

  hello();

  // Single-page apps change the path without reloading; re-apply
  // path-specific rules when that happens.
  setInterval(() => {
    if (state.grudge && location.href !== state.url) {
      const previous = state.url;
      state.url = location.href;
      state.lastCount = -1;
      hello(previous);
    }
  }, 1000);
})();
