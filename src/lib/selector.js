/*
 * SkullClick — selector generation.
 *
 * Based on ekill by René Hansen (MIT), https://github.com/rhardih/ekill
 * Changes: identifiers are now escaped, so ids/classes such as
 * "u-hidden@desktop-max" or "ver-5.7" no longer produce invalid selectors
 * (ekill issues #30, #34).
 */
(function (root) {
  "use strict";

  /**
   * Serializes an identifier per the CSSOM spec. Uses the native CSS.escape
   * when available and falls back to an equivalent implementation (jsdom).
   */
  function cssEscape(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }

    const string = String(value);
    let result = "";
    for (let i = 0; i < string.length; i++) {
      const ch = string.charCodeAt(i);
      if (ch === 0) {
        result += "�";
      } else if ((ch >= 0x1 && ch <= 0x1f) || ch === 0x7f ||
          (i === 0 && ch >= 0x30 && ch <= 0x39) ||
          (i === 1 && ch >= 0x30 && ch <= 0x39 && string.charCodeAt(0) === 0x2d)) {
        result += "\\" + ch.toString(16) + " ";
      } else if (i === 0 && string.length === 1 && ch === 0x2d) {
        result += "\\" + string.charAt(i);
      } else if (ch >= 0x80 || ch === 0x2d || ch === 0x5f ||
          (ch >= 0x30 && ch <= 0x39) ||
          (ch >= 0x41 && ch <= 0x5a) ||
          (ch >= 0x61 && ch <= 0x7a)) {
        result += string.charAt(i);
      } else {
        result += "\\" + string.charAt(i);
      }
    }
    return result;
  }

  const count = (scope, selector) => {
    try {
      return scope.querySelectorAll(selector).length;
    } catch (e) {
      return -1;
    }
  };

  /**
   * Returns the chain of elements from <body> down to `element`.
   */
  function ancestry(element) {
    const chain = [];
    let el = element;
    while (el && el.localName !== "html" && el.nodeType === 1) {
      chain.unshift(el);
      el = el.parentElement;
    }
    return chain;
  }

  /**
   * Generates a selector which uniquely matches `element` via querySelector.
   *
   * Each element on the path from the first uniquely identifiable ancestor
   * down to `element` is referenced. For every step the precedence is:
   *
   *   1. id       (unique in document → restart the selector from here)
   *   2. classes  (same rule)
   *   3. tag name, with :nth-of-type() when it has same-tag siblings
   *
   * @param {Element} element
   * @returns {String} selector
   */
  function generateSelector(element) {
    const doc = element.ownerDocument;
    let parts = [];
    let parent = doc;

    for (const el of ancestry(element)) {
      let part = "";

      if (el.id) {
        const idSelector = "#" + cssEscape(el.id);
        if (count(doc, idSelector) === 1) {
          parts = [];
          part = idSelector;
        } else if (count(parent, idSelector) === 1) {
          part = idSelector;
        }
      }

      if (!part && el.classList.length > 0) {
        const classSelector = Array.from(el.classList)
          .map(c => "." + cssEscape(c)).join("");
        if (count(doc, classSelector) === 1) {
          parts = [];
          part = classSelector;
        } else if (count(parent, classSelector) === 1) {
          part = classSelector;
        }
      }

      if (!part) {
        const tag = cssEscape(el.localName);
        const siblings = el.parentElement
          ? Array.from(el.parentElement.children).filter(c => c.localName === el.localName)
          : [el];
        part = siblings.length > 1
          ? `${tag}:nth-of-type(${siblings.indexOf(el) + 1})`
          : tag;
      }

      parts.push(part);
      parent = el;
    }

    const selector = parts.join(" > ");

    // Final sanity check: must be valid and must hit exactly our element.
    let hit = null;
    try {
      hit = doc.querySelector(selector);
    } catch (e) {
      throw new Error(`SkullClick: generated invalid selector "${selector}"`);
    }
    if (hit !== element) {
      throw new Error(`SkullClick: selector "${selector}" does not match element`);
    }
    return selector;
  }

  /**
   * Short human-readable description of an element, e.g. "div#chat.widget".
   */
  function describe(el) {
    let s = el.localName;
    if (el.id) s += "#" + el.id;
    const classes = Array.from(el.classList).slice(0, 2);
    if (classes.length) s += "." + classes.join(".");
    return s.length > 60 ? s.slice(0, 57) + "…" : s;
  }

  const api = { cssEscape, generateSelector, describe };
  root.SkullClickSelector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
