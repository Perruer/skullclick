import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const R = require("../../src/lib/rules.js");
const NOW = 42;

test("keyForUrl", () => {
  assert.deepEqual(R.keyForUrl("https://ex.com/a/b?q=1#x"), { host: "ex.com", path: "/a/b" });
  assert.deepEqual(R.keyForUrl("file:///C:/x.html"), { host: "file:", path: "/C:/x.html" });
});

// Ported from ekill's addHit tests
test("adds new rules", () => {
  const l = {};
  R.addRule(l, "ex.com", "/foo", "body > div#popup", NOW);
  assert.deepEqual(l, { "ex.com": { "/foo": [{ selector: "body > div#popup", lastUsed: NOW }] } });
});

test("appends on the same page only once", () => {
  const l = { "ex.com": { "/foo": [{ selector: "#a", lastUsed: 1 }] } };
  R.addRule(l, "ex.com", "/foo", "#b", NOW);
  R.addRule(l, "ex.com", "/foo", "#b", NOW);
  assert.deepEqual(l["ex.com"]["/foo"].map(e => e.selector), ["#a", "#b"]);
});

test("hoists the same selector on different pages to a wildcard", () => {
  const l = {};
  for (const p of ["/foo", "/bar", "/baz"]) R.addRule(l, "ex.com", p, "#popup", NOW);
  assert.deepEqual(l, { "ex.com": { "*": [{ selector: "#popup", lastUsed: NOW }] } });
});

test("collapses into a parent selector", () => {
  const l = {};
  R.addRule(l, "ex.com", "/", "#a > div > p", NOW);
  R.addRule(l, "ex.com", "/", "#a > div", NOW);
  assert.deepEqual(l["ex.com"]["/"].map(e => e.selector), ["#a > div"]);
});

test("does not treat a pseudo-class refinement as a parent", () => {
  const l = {};
  R.addRule(l, "ex.com", "/", "#a > p:nth-of-type(2)", NOW);
  R.addRule(l, "ex.com", "/", "#a > p", NOW);
  assert.equal(l["ex.com"]["/"].length, 2);
});

test("does not treat a longer id as a child (#foo vs #foobar)", () => {
  const l = {};
  R.addRule(l, "ex.com", "/", "#foobar > p", NOW);
  R.addRule(l, "ex.com", "/", "#foo", NOW);
  assert.deepEqual(l["ex.com"]["/"].map(e => e.selector), ["#foobar > p", "#foo"]);
});

test("removeRule removes the right entry (ekill removeHit bug)", () => {
  const l = { "ex.com": { "/": [{ selector: "#a", lastUsed: 1 }, { selector: "#b", lastUsed: 1 }] } };
  assert.equal(R.removeRule(l, "ex.com", "/", "#b"), true);
  assert.deepEqual(l["ex.com"]["/"], [{ selector: "#a", lastUsed: 1 }]);
  assert.equal(R.removeRule(l, "ex.com", "/", "#zzz"), false);
  R.removeRule(l, "ex.com", "/", "#a");
  assert.deepEqual(l, {});
});

test("moveRule changes scope", () => {
  const l = {};
  R.addRule(l, "ex.com", "/p", "#a", NOW);
  R.moveRule(l, "ex.com", "/p", "#a", "*", NOW);
  assert.deepEqual(R.selectorsFor(l, "ex.com", "/other"), ["#a"]);
  assert.equal(l["ex.com"]["/p"], undefined);
});

test("selectorsFor combines page and site rules", () => {
  const l = { "ex.com": { "/p": [{ selector: "#a" }], "*": [{ selector: "#b" }] } };
  assert.deepEqual(R.selectorsFor(l, "ex.com", "/p"), ["#a", "#b"]);
  assert.deepEqual(R.selectorsFor(l, "nope.com", "/p"), []);
});

test("isSafeSelector rejects CSS injection", () => {
  assert.equal(R.isSafeSelector("#a > .b\\{c"), true);
  assert.equal(R.isSafeSelector("#a} body{display:none"), false);
  assert.equal(R.isSafeSelector("a /* x"), false);
  assert.equal(R.isSafeSelector(""), false);
});

test("sanitize accepts exports and ekill-style string lists, drops junk", () => {
  const out = R.sanitize({
    app: "SkullClick",
    rules: {
      "ex.com": { "/": [{ selector: "#a", lastUsed: 5 }, "#b", { selector: "x}y{" }, 42] },
      "bad.com": "nope"
    }
  });
  assert.deepEqual(Object.keys(out), ["ex.com"]);
  assert.deepEqual(out["ex.com"]["/"].map(e => e.selector), ["#a", "#b"]);
  assert.equal(out["ex.com"]["/"][0].lastUsed, 5);
  assert.throws(() => R.sanitize([1, 2]));
  assert.throws(() => R.sanitize(null));
});

test("merge adds only new rules", () => {
  const l = {};
  R.addRule(l, "ex.com", "/", "#a", NOW);
  const added = R.merge(l, { "ex.com": { "/": [{ selector: "#a", lastUsed: 1 }, { selector: "#b", lastUsed: 1 }] } });
  assert.equal(added, 1);
  assert.equal(R.countRules(l), 2);
});
