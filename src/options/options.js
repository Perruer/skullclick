/*
 * SkullClick — options page.
 * Replaces ekill's jQuery/Bootstrap page. Based on ekill by René Hansen (MIT).
 */
"use strict";

(() => {
  const api = globalThis.browser || globalThis.chrome;
  const Rules = globalThis.SkullClickRules;
  const ALL_URLS = { origins: ["<all_urls>"] };

  // Replaced at build time from package.json ("homepage").
  const REPO_URL = "__REPO_URL__";
  const SUPPORT_URL = REPO_URL + "#support-the-project";

  const $ = id => document.getElementById(id);
  const t = (key, subs) => api.i18n.getMessage(key, subs) || key;
  const isFirefox = api.runtime.getURL("").startsWith("moz-extension:");

  let hitList = {};

  /* ------------------------------------------------------------ i18n -- */

  function localize() {
    document.documentElement.lang = api.i18n.getUILanguage().split("-")[0];
    for (const el of document.querySelectorAll("[data-i18n]")) {
      const msg = api.i18n.getMessage(el.dataset.i18n);
      if (msg) el.textContent = msg;
    }
    for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
      const msg = api.i18n.getMessage(el.dataset.i18nPlaceholder);
      if (msg) el.placeholder = msg;
    }
  }

  function status(text) {
    $("status").textContent = text;
    clearTimeout(status.timer);
    status.timer = setTimeout(() => { $("status").textContent = ""; }, 5000);
  }

  /* -------------------------------------------------------- settings -- */

  async function getSettings() {
    const { settings } = await api.storage.sync.get({ settings: { grudge: false } });
    return settings;
  }

  async function setGrudge(enabled) {
    const settings = await getSettings();
    settings.grudge = enabled;
    await api.storage.sync.set({ settings });
    await api.runtime.sendMessage({ type: "settingsChanged" }).catch(() => {});
  }

  async function refreshPermissionWarning() {
    const settings = await getSettings();
    const permitted = await api.permissions.contains(ALL_URLS);
    $("grudge-toggle").checked = !!settings.grudge;
    $("permission-warning").hidden = !(settings.grudge && !permitted);
  }

  async function onGrudgeToggle(e) {
    const enabled = e.target.checked;
    if (enabled) {
      // Must be called directly from the user gesture.
      let granted = false;
      try {
        granted = await api.permissions.request(ALL_URLS);
      } catch (err) {
        console.error(err);
      }
      if (!granted) {
        e.target.checked = false;
        status(t("permissionDenied"));
        return;
      }
    }
    await setGrudge(enabled);
    await refreshPermissionWarning();
  }

  async function onGrant() {
    const granted = await api.permissions.request(ALL_URLS).catch(() => false);
    if (granted) await api.runtime.sendMessage({ type: "settingsChanged" }).catch(() => {});
    await refreshPermissionWarning();
  }

  /* ------------------------------------------------------- shortcuts -- */

  async function showShortcut() {
    try {
      const commands = await api.commands.getAll();
      const cmd = commands.find(c => c.name === "_execute_action");
      $("shortcut-toggle").textContent = (cmd && cmd.shortcut) || t("shortcutNotSet");
    } catch (e) { /* keep default text */ }
  }

  async function openShortcuts() {
    if (isFirefox) {
      if (api.commands.openShortcutSettings) {
        await api.commands.openShortcutSettings();
      } else {
        $("shortcuts-help").hidden = false;
      }
      return;
    }
    const edge = navigator.userAgent.includes("Edg/");
    await api.tabs.create({ url: edge ? "edge://extensions/shortcuts" : "chrome://extensions/shortcuts" });
  }

  /* -------------------------------------------------------- hit list -- */

  async function loadHitList() {
    ({ hitList } = await api.storage.local.get({ hitList: {} }));
    render();
  }

  async function saveHitList() {
    await api.storage.local.set({ hitList });
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c) node.append(c);
    return node;
  }

  function render() {
    const query = $("search").value.trim().toLowerCase();
    const container = $("hitlist");
    const openHosts = new Set([...container.querySelectorAll("details[open]")].map(d => d.dataset.host));
    container.textContent = "";

    const total = Rules.countRules(hitList);
    $("rule-count").textContent = String(total);
    $("hitlist-empty").hidden = total > 0;
    $("clear-button").disabled = total === 0;
    $("export-button").disabled = total === 0;

    for (const host of Object.keys(hitList).sort()) {
      const rows = [];
      for (const path of Object.keys(hitList[host]).sort()) {
        for (const entry of hitList[host][path]) {
          const haystack = `${host} ${path} ${entry.selector}`.toLowerCase();
          if (query && !haystack.includes(query)) continue;
          rows.push(renderRule(host, path, entry.selector));
        }
      }
      if (rows.length === 0) continue;

      const details = el("details", { class: "site", "data-host": host },
        el("summary", {}, el("span", { text: host }),
          el("span", { class: "muted", text: t("rulesCount", [String(rows.length)]) })));
      if (query || openHosts.has(host)) details.open = true;
      details.append(...rows);
      container.append(details);
    }
  }

  function renderRule(host, path, selector) {
    const scope = el("select", {
      title: t("scopeTitle"),
      onchange: async e => {
        Rules.moveRule(hitList, host, path, selector, e.target.value);
        await saveHitList();
        render();
      }
    });
    if (path !== Rules.WILDCARD) {
      scope.append(el("option", { value: path, text: t("scopePage", [path]) }));
    }
    scope.append(el("option", { value: Rules.WILDCARD, text: t("scopeSite") }));
    scope.value = path;

    const remove = el("button", {
      type: "button",
      class: "danger",
      text: t("delete"),
      onclick: async () => {
        Rules.removeRule(hitList, host, path, selector);
        await saveHitList();
        render();
        status(t("ruleDeleted"));
      }
    });

    return el("div", { class: "rule" }, el("code", { text: selector }), scope, remove);
  }

  async function clearAll() {
    if (!window.confirm(t("confirmDeleteAll"))) return;
    hitList = {};
    await saveHitList();
    render();
  }

  function exportList() {
    const data = {
      app: "SkullClick",
      format: 1,
      exported: new Date().toISOString(),
      rules: hitList
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `skullclick-hitlist-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importList(file) {
    try {
      const data = Rules.sanitize(JSON.parse(await file.text()));
      const added = Rules.merge(hitList, data);
      await saveHitList();
      render();
      status(t("importDone", [String(added)]));
    } catch (e) {
      console.error(e);
      status(t("importFailed"));
    }
  }

  /* ------------------------------------------------------------ init -- */

  function init() {
    localize();
    $("version").textContent = "v" + api.runtime.getManifest().version;
    $("welcome").hidden = location.hash !== "#welcome";

    for (const [id, url] of [["support-link", SUPPORT_URL], ["support-footer-link", SUPPORT_URL], ["repo-link", REPO_URL]]) {
      $(id).href = url;
    }

    $("grudge-toggle").addEventListener("change", onGrudgeToggle);
    $("grant-button").addEventListener("click", onGrant);
    $("shortcuts-button").addEventListener("click", openShortcuts);
    $("search").addEventListener("input", render);
    $("clear-button").addEventListener("click", clearAll);
    $("export-button").addEventListener("click", exportList);
    $("import-button").addEventListener("click", () => $("import-file").click());
    $("import-file").addEventListener("change", e => {
      const [file] = e.target.files;
      if (file) importList(file);
      e.target.value = "";
    });

    // Rules added from pages while this tab is open.
    api.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.hitList) {
        hitList = changes.hitList.newValue || {};
        render();
      }
      if (area === "sync" && changes.settings) refreshPermissionWarning();
    });
    api.permissions.onAdded.addListener(refreshPermissionWarning);
    api.permissions.onRemoved.addListener(refreshPermissionWarning);

    refreshPermissionWarning();
    showShortcut();
    loadHitList();
  }

  init();
})();
