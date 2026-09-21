/*
 * SkullClick — Hit List (remembered elements) data structure.
 *
 * Based on ekill by René Hansen (MIT), https://github.com/rhardih/ekill
 *
 * Shape:
 *   {
 *     "<hostname>": {
 *       "<pathname>" | "*": [{ selector: String, lastUsed: Number }]
 *     }
 *   }
 *
 * "*" holds selectors that apply to every page of the host.
 */
(function (root) {
  "use strict";

  const WILDCARD = "*";

  /**
   * Returns the { host, path } key used for storing rules for a URL.
   */
  function keyForUrl(url) {
    const u = new URL(url);
    return { host: u.hostname || u.protocol, path: u.pathname || "/" };
  }

  // `child` targets a descendant of the element targeted by `parent`.
  // (ekill used a bare startsWith, so "#foo" was treated as a parent of
  // "#foobar > p".)
  const isDescendantOf = (child, parent) => child.startsWith(parent + " > ");

  // Replaces entries that target descendants of `selector` with `selector`
  // itself. Returns true when the selector is now covered.
  function collapseInto(entries, selector, now) {
    let covered = false;
    for (let i = 0; i < entries.length; i++) {
      const existing = entries[i].selector;
      if (existing === selector) {
        covered = true;
      } else if (isDescendantOf(existing, selector)) {
        entries[i] = { selector, lastUsed: now };
        covered = true;
      }
    }
    return covered;
  }

  function cleanup(list, host) {
    const paths = list[host];
    if (!paths) return;
    for (const p of Object.keys(paths)) {
      // Remove duplicates that collapsing may have produced
      const seen = new Set();
      paths[p] = paths[p].filter(e => !seen.has(e.selector) && seen.add(e.selector));
      if (paths[p].length === 0) delete paths[p];
    }
    if (Object.keys(paths).length === 0) delete list[host];
  }

  /**
   * Adds a rule in place.
   *
   * - A selector for a parent of an already stored element replaces it.
   * - The same selector stored for two different paths is hoisted to "*".
   */
  function addRule(list, host, path, selector, now = Date.now()) {
    const paths = (list[host] = list[host] || {});

    if (paths[WILDCARD] && collapseInto(paths[WILDCARD], selector, now)) {
      cleanup(list, host);
      return;
    }
    if (path !== WILDCARD && paths[path] && collapseInto(paths[path], selector, now)) {
      cleanup(list, host);
      return;
    }

    let hoist = path === WILDCARD;
    if (!hoist) {
      for (const p of Object.keys(paths)) {
        if (p === WILDCARD || p === path) continue;
        const i = paths[p].findIndex(e => e.selector === selector);
        if (i !== -1) {
          paths[p].splice(i, 1);
          hoist = true;
        }
      }
    }

    const target = hoist ? WILDCARD : path;
    paths[target] = paths[target] || [];
    paths[target].push({ selector, lastUsed: now });

    if (hoist && paths[path] && path !== WILDCARD) {
      paths[path] = paths[path].filter(e => e.selector !== selector);
    }
    cleanup(list, host);
  }

  /**
   * Removes a rule in place. Returns true if something was removed.
   * (ekill's removeHit used `=` instead of `===` and always removed the
   * first entry while overwriting its selector.)
   */
  function removeRule(list, host, path, selector) {
    const entries = list[host] && list[host][path];
    if (!entries) return false;
    const i = entries.findIndex(e => e.selector === selector);
    if (i === -1) return false;
    entries.splice(i, 1);
    cleanup(list, host);
    return true;
  }

  /**
   * Moves a rule between a specific path and the site-wide wildcard.
   */
  function moveRule(list, host, fromPath, selector, toPath, now = Date.now()) {
    if (fromPath === toPath) return;
    if (removeRule(list, host, fromPath, selector)) {
      const paths = (list[host] = list[host] || {});
      paths[toPath] = paths[toPath] || [];
      if (!paths[toPath].some(e => e.selector === selector)) {
        paths[toPath].push({ selector, lastUsed: now });
      }
    }
  }

  /**
   * Selectors that apply to a given page.
   */
  function selectorsFor(list, host, path) {
    const paths = list[host];
    if (!paths) return [];
    return [...(paths[path] || []), ...(paths[WILDCARD] || [])].map(e => e.selector);
  }

  /**
   * Selectors are inserted into a stylesheet, so an unescaped brace could
   * inject arbitrary CSS (e.g. from a crafted import file).
   */
  function isSafeSelector(selector) {
    return typeof selector === "string" && selector.trim() !== "" &&
      selector.length <= 2000 && !/(^|[^\\])[{}]/.test(selector) &&
      !selector.includes("/*");
  }

  function countRules(list) {
    let n = 0;
    for (const host of Object.keys(list)) {
      for (const path of Object.keys(list[host])) n += list[host][path].length;
    }
    return n;
  }

  /**
   * Validates untrusted data (e.g. an imported file) and returns a clean list.
   * Accepts either a bare list or an export envelope { rules: list }.
   */
  function sanitize(data) {
    const src = data && typeof data === "object" && data.rules ? data.rules : data;
    if (!src || typeof src !== "object" || Array.isArray(src)) {
      throw new Error("Not a SkullClick hit list");
    }
    const out = {};
    for (const host of Object.keys(src)) {
      const paths = src[host];
      if (!paths || typeof paths !== "object" || Array.isArray(paths)) continue;
      for (const path of Object.keys(paths)) {
        if (!Array.isArray(paths[path])) continue;
        for (const e of paths[path]) {
          const selector = typeof e === "string" ? e : e && e.selector;
          if (!isSafeSelector(selector)) continue;
          const lastUsed = e && Number.isFinite(e.lastUsed) ? e.lastUsed : Date.now();
          out[host] = out[host] || {};
          out[host][path] = out[host][path] || [];
          if (!out[host][path].some(x => x.selector === selector)) {
            out[host][path].push({ selector, lastUsed });
          }
        }
      }
    }
    return out;
  }

  /**
   * Merges `source` into `target` in place. Returns number of rules added.
   */
  function merge(target, source) {
    const before = countRules(target);
    for (const host of Object.keys(source)) {
      for (const path of Object.keys(source[host])) {
        for (const e of source[host][path]) addRule(target, host, path, e.selector, e.lastUsed);
      }
    }
    return countRules(target) - before;
  }

  const api = {
    WILDCARD, keyForUrl, addRule, removeRule, moveRule, selectorsFor,
    isSafeSelector, countRules, sanitize, merge
  };
  root.SkullClickRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
