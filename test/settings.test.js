import test from "node:test";
import assert from "node:assert/strict";
import { BOOLEAN_KEYS, DEFAULTS, GROUPS, HINTS, LABELS, RANGES, normalize, resetDefaults, storageKey } from "../lib/settings.js";

test("storage key", () => assert.equal(storageKey, "dsh-whale-tide:v1"));
test("defaults cover grouped controls", () => {
  const grouped = GROUPS.flatMap((g) => g.keys).sort();
  assert.deepEqual(Object.keys(DEFAULTS).sort(), grouped);
  assert.equal(new Set(grouped).size, grouped.length);
});
test("defaults match the dsh-quiet template", () => {
  assert.equal(DEFAULTS.enabled, true);
  assert.equal(DEFAULTS.opacity, 1);
  assert.equal(DEFAULTS.conversationOpacity, 1);
  assert.equal(DEFAULTS.speed, 1);
  assert.equal(DEFAULTS.fishDensity, 1);
  assert.equal(DEFAULTS.whaleCount, 3);
  assert.equal(DEFAULTS.sidebarBlur, 6);
  assert.equal(DEFAULTS.composerGlass, true);
  assert.equal(DEFAULTS.streamBlur, 10);
});
test("normalize clamps and fills", () => {
  const n = normalize({ speed: 9, fishDensity: 0, whaleCount: 9, sidebarBlur: -1, streamBlur: 99, opacity: 2 });
  assert.equal(n.speed, 2);
  assert.equal(n.fishDensity, 0.2);
  assert.equal(n.whaleCount, 3);
  assert.equal(n.sidebarBlur, 0);
  assert.equal(n.streamBlur, 20);
  assert.equal(n.opacity, 1);
  assert.equal(n.composerGlass, true);
});
test("normalize rejects malformed input", () => {
  const n = normalize({ speed: "x", enabled: "yes", whaleCount: null });
  assert.equal(n.speed, 1);
  assert.equal(n.enabled, true);
  assert.equal(n.whaleCount, 3);
});
test("resetDefaults returns a fresh copy", () => {
  const a = resetDefaults(); const b = resetDefaults();
  assert.deepEqual(a, DEFAULTS); assert.notEqual(a, b); a.speed = 2; assert.equal(b.speed, 1);
});
test("every control has label and hint", () => {
  for (const key of Object.keys(DEFAULTS)) { assert.equal(typeof LABELS[key], "string", key); assert.equal(typeof HINTS[key], "string", key); }
});
test("booleans and ranges cover grouped controls", () => {
  const handled = new Set([...Object.keys(RANGES), ...BOOLEAN_KEYS]);
  for (const key of GROUPS.flatMap((g) => g.keys)) assert.equal(handled.has(key), true, key);
});
