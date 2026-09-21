/*
 * SkullClick — background script.
 * Runs as a service worker in Chromium and as an event page in Firefox,
 * so no state is kept in memory: everything lives in storage.
 *
 * Based on ekill by René Hansen (MIT), https://github.com/rhardih/ekill
 */
"use strict";

if (typeof importScripts === "function" && typeof SkullClickRules === "undefined") {
  importScripts("lib/rules.js");
}

const api = globalThis.browser || globalThis.chrome;
const Rules = globalThis.SkullClickRules;

// Absolute: Firefox resolves relative paths against the calling page.
const CONTENT_FILES = ["/lib/selector.js", "/content.js"];
const ALL_URLS = { origins: ["<all_urls>"] };
const GRUDGE_SCRIPT_ID = "skullclick-grudge";
const DEFAULT_SETTINGS = { grudge: false };

async function getSettings() {
  const { settings } = await api.storage.sync.get({ settings: DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function getHitList() {
  const { hitList } = await api.storage.local.get({ hitList: {} });
  return hitList;
}

// Serialize read-modify-write cycles on the hit list.
let hitListQueue = Promise.resolve();
function updateHitList(mutate) {
  const run = hitListQueue.then(async () => {
    const hitList = await getHitList();
    const result = mutate(hitList);
    await api.storage.local.set({ hitList });
    return result;
  });
  hitListQueue = run.catch(() => {});
  return run;
}

/*
 * Grudge mode needs a content script on every page. It is registered
 * dynamically so the extension needs no host permissions unless the user
 * opts in.
 */
async function syncContentScripts() {
  const settings = await getSettings();
  const permitted = await api.permissions.contains(ALL_URLS);
  const registered = await api.scripting.getRegisteredContentScripts({ ids: [GRUDGE_SCRIPT_ID] });
  const want = settings.grudge && permitted;

  if (want && registered.length === 0) {
    await api.scripting.registerContentScripts([{
      id: GRUDGE_SCRIPT_ID,
      matches: ["<all_urls>"],
      js: CONTENT_FILES,
      runAt: "document_start",
      allFrames: false,
      persistAcrossSessions: false
    }]);
  } else if (!want && registered.length > 0) {
    await api.scripting.unregisterContentScripts({ ids: [GRUDGE_SCRIPT_ID] });
  }
}

function syncSafely() {
  syncContentScripts().catch(e => console.error("SkullClick: sync failed", e));
}

// One rule per selector, so a single bad selector can't disable the others.
function rulesToCss(selectors) {
  return selectors.filter(Rules.isSafeSelector)
    .map(s => `${s} { display: none !important; }`).join("\n");
}

async function flashError(tabId) {
  try {
    await api.action.setBadgeBackgroundColor({ tabId, color: "#9e9e9e" });
    await api.action.setBadgeText({ tabId, text: "✕" });
    setTimeout(() => api.action.setBadgeText({ tabId, text: "" }).catch(() => {}), 1500);
  } catch (e) { /* tab gone */ }
}

/**
 * Sends a message to the page, injecting the content script first if the
 * page was opened before the extension was installed / enabled.
 */
async function sendToTab(tabId, message) {
  try {
    return await api.tabs.sendMessage(tabId, message, { frameId: 0 });
  } catch (e) {
    await api.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
    return await api.tabs.sendMessage(tabId, message, { frameId: 0 });
  }
}

async function runInTab(tab, type) {
  if (!tab || tab.id === undefined) return;
  try {
    await sendToTab(tab.id, { type });
  } catch (e) {
    // Browser-internal pages (chrome://, about:, the web stores) can't be scripted.
    console.warn("SkullClick: cannot run on this page", e);
    await flashError(tab.id);
  }
}

async function setCount(tabId, n) {
  await api.action.setBadgeBackgroundColor({ tabId, color: "#b71c1c" });
  if (api.action.setBadgeTextColor) {
    await api.action.setBadgeTextColor({ tabId, color: "#ffffff" }).catch(() => {});
  }
  await api.action.setBadgeText({ tabId, text: n > 0 ? String(n) : "" });
}

// The page URL as the content script sees it (after pushState navigations),
// trusted only when it's on the same origin as the sending frame.
function pageUrl(message, sender) {
  if (!sender.url) return null;
  try {
    if (message.url && new URL(message.url).origin === new URL(sender.url).origin) return message.url;
  } catch (e) { /* fall through */ }
  return sender.url;
}

async function handleMessage(message, sender) {
  const tabId = sender.tab && sender.tab.id;
  const url = pageUrl(message || {}, sender);

  switch (message && message.type) {
    // A content script started on a page: apply remembered rules.
    case "hello": {
      const settings = await getSettings();
      if (!settings.grudge || !url) return { grudge: false, selectors: [] };
      const hitList = await getHitList();
      const target = { tabId, frameIds: [sender.frameId || 0] };
      // Single-page app navigated: drop the previous page's path rules.
      if (message.previousUrl && tabId !== undefined) {
        const prev = Rules.keyForUrl(message.previousUrl);
        const css = rulesToCss(Rules.selectorsFor(hitList, prev.host, prev.path));
        if (css) await api.scripting.removeCSS({ target, css }).catch(() => {});
      }
      const { host, path } = Rules.keyForUrl(url);
      const selectors = Rules.selectorsFor(hitList, host, path).filter(Rules.isSafeSelector);
      const css = rulesToCss(selectors);
      if (css && tabId !== undefined) {
        // insertCSS isn't subject to the page's CSP and also hides elements
        // that appear later, without polling.
        await api.scripting.insertCSS({ target, css })
          .catch(e => console.warn("SkullClick: insertCSS failed", e));
      }
      return { grudge: true, selectors };
    }

    case "saveRule": {
      if (!url) return false;
      const { host, path } = Rules.keyForUrl(url);
      await updateHitList(list => Rules.addRule(list, host, path, message.selector));
      return true;
    }

    case "forgetRule": {
      if (!url) return false;
      const { host, path } = Rules.keyForUrl(url);
      return updateHitList(list =>
        Rules.removeRule(list, host, path, message.selector) ||
        Rules.removeRule(list, host, Rules.WILDCARD, message.selector));
    }

    case "count":
      if (tabId !== undefined) await setCount(tabId, message.count);
      return true;

    case "openOptions":
      await api.runtime.openOptionsPage();
      return true;

    // From the options page.
    case "settingsChanged":
      await syncContentScripts();
      return true;
  }
  return undefined;
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse, e => {
    console.error("SkullClick:", e);
    sendResponse(undefined);
  });
  return true; // keep the channel open for the async response
});

api.action.onClicked.addListener(tab => runInTab(tab, "toggle"));

api.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "undo-last") return;
  if (!tab) [tab] = await api.tabs.query({ active: true, currentWindow: true });
  await runInTab(tab, "undo");
});

api.runtime.onInstalled.addListener(details => {
  syncSafely();
  if (details.reason === "install") {
    api.tabs.create({ url: api.runtime.getURL("options/options.html#welcome") });
  }
});

api.runtime.onStartup.addListener(syncSafely);
// Per-tab badge counts belong to the page that set them.
api.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") api.action.setBadgeText({ tabId, text: "" }).catch(() => {});
});
api.permissions.onAdded.addListener(syncSafely);
api.permissions.onRemoved.addListener(syncSafely);
api.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.settings) syncSafely();
});
