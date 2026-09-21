import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const { generateSelector, cssEscape, describe } = require("../../src/lib/selector.js");

function dom(body) {
  return new JSDOM(`<!DOCTYPE html><html><body>${body}</body></html>`).window.document;
}

// Ported from ekill's browser test suite
test("uses a document-unique id as the root", () => {
  const d = dom(`<div id="a"><div id="b"><p data-t></p></div></div>`);
  const t = d.querySelector("[data-t]");
  const s = generateSelector(t);
  assert.match(s, /^#b/);
  assert.equal(d.querySelector(s), t);
});

test("uses an id that is only unique within its parent", () => {
  const d = dom(`<div id="p"><div id="dup" data-t></div></div><div id="dup"></div>`);
  assert.equal(generateSelector(d.querySelector("[data-t]")), "#p > #dup");
});

test("uses document-unique classes as the root", () => {
  const d = dom(`<div><section class="x y" data-t></section></div>`);
  assert.equal(generateSelector(d.querySelector("[data-t]")), ".x.y");
});

test("uses classes unique within the parent", () => {
  const d = dom(`<div id="p"><i class="c" data-t></i></div><i class="c"></i>`);
  assert.equal(generateSelector(d.querySelector("[data-t]")), "#p > .c");
});

test("falls back to nth-of-type", () => {
  const d = dom(`<div id="p"><div></div><div></div><div data-t></div></div>`);
  assert.equal(generateSelector(d.querySelector("[data-t]")), "#p > div:nth-of-type(3)");
});

test("uses a plain tag name without same-tag siblings", () => {
  const d = dom(`<div id="p"><p></p><div data-t></div></div>`);
  assert.equal(generateSelector(d.querySelector("[data-t]")), "#p > div");
});

test("counts nth-of-type among same-tag siblings only", () => {
  const d = dom(`<div id="p"><div></div><p data-t></p><p></p></div>`);
  assert.equal(generateSelector(d.querySelector("[data-t]")), "#p > p:nth-of-type(1)");
});

// ekill #34: '.toaster.u-width-100p.u-hidden@desktop-max' is not a valid selector
test("escapes special characters in classes (#34)", () => {
  const d = dom(`<div class="toaster u-width-100p u-hidden@desktop-max" data-t></div>`);
  const t = d.querySelector("[data-t]");
  const s = generateSelector(t);
  assert.equal(s, ".toaster.u-width-100p.u-hidden\\@desktop-max");
  assert.equal(d.querySelector(s), t);
});

// ekill #30: '.js-comp-ver-5.7' is not a valid selector
test("escapes dots in classes (#30)", () => {
  const d = dom(`<main class="home js-comp-ver-5.7 vc_responsive"><div data-t></div></main><main></main>`);
  const t = d.querySelector("[data-t]");
  assert.equal(d.querySelector(generateSelector(t)), t);
});

// ekill threw on invalid ids; now they are escaped
test("escapes ids starting with digits or containing colons", () => {
  const d = dom(`<div id="1st"><span id=":r1:" data-t></span></div>`);
  const t = d.querySelector("[data-t]");
  const s = generateSelector(t);
  assert.equal(s, "#\\:r1\\:");
  assert.equal(d.querySelector(s), t);
  assert.equal(generateSelector(d.getElementById("1st")), "#\\31 st");
});

// ekill #22: hidden (not removed) siblings keep indices stable
test("selectors stay stable when earlier siblings are hidden, not removed", () => {
  const d = dom(`<div><div></div><p data-first></p><p data-second></p></div>`);
  const first = d.querySelector("[data-first]");
  const s1 = generateSelector(first);
  first.style.setProperty("display", "none", "important");
  const second = d.querySelector("[data-second]");
  const s2 = generateSelector(second);
  assert.notEqual(s1, s2);
  assert.equal(d.querySelector(s2), second);
  assert.equal(d.querySelector(s1), first);
});

test("cssEscape fallback matches the spec", () => {
  assert.equal(cssEscape("a.b"), "a\\.b");
  assert.equal(cssEscape("-1a"), "-\\31 a");
  assert.equal(cssEscape("-"), "\\-");
  assert.equal(cssEscape("héllo"), "héllo");
  assert.equal(cssEscape("a b"), "a\\ b");
});

test("describe() gives a short label", () => {
  const d = dom(`<div id="chat" class="widget open extra"></div>`);
  assert.equal(describe(d.getElementById("chat")), "div#chat.widget.open");
});
