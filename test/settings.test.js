import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOLEAN_KEYS,
  DEFAULTS,
  GROUPS,
  HINTS,
  LABELS,
  OPTIONS,
  RANGES,
  normalize,
  resetDefaults,
  storageKey,
  validatePatch,
} from "../lib/settings.js";

test("storage key is versioned and namespaced", () => {
  assert.equal(storageKey, "dsh-whale-tide:v1");
});

test("defaults cover every grouped control and nothing else", () => {
  const grouped = GROUPS.flatMap((group) => group.keys).sort();
  assert.deepEqual(Object.keys(DEFAULTS).sort(), grouped);
  assert.equal(new Set(grouped).size, grouped.length, "no control appears twice");
});

test("upstream-compatible defaults match dsh-ascii-whales 0.1.5", () => {
  assert.equal(DEFAULTS.count, 3);
  assert.equal(DEFAULTS.species, "humpback");
  assert.equal(DEFAULTS.size, 1.2);
  assert.equal(DEFAULTS.speed, 0.65);
  assert.equal(DEFAULTS.fishCount, 170);
  assert.equal(DEFAULTS.gridScale, 1);
  assert.equal(DEFAULTS.gridOpacity, 0.05);
  assert.equal(DEFAULTS.glass, true);
  assert.equal(DEFAULTS.blur, 14);
  assert.equal(DEFAULTS.glassOpacity, 0.45);
  assert.equal(DEFAULTS.color, "#4d6bfe");
});

test("tide defaults stay as shipped", () => {
  assert.equal(DEFAULTS.conversationOpacity, 0.16);
  assert.equal(DEFAULTS.conversationDensity, 0.3);
  assert.equal(DEFAULTS.followTheme, true);
});

test("normalize fills missing values and drops unknown fields", () => {
  const result = normalize({ density: 0.5, extra: "ignored" });
  assert.equal(result.density, 0.5);
  assert.equal(result.speed, DEFAULTS.speed);
  assert.equal(Object.hasOwn(result, "extra"), false);
});

test("normalize clamps every numeric control to its range", () => {
  const result = normalize({
    density: 9,
    speed: 99,
    opacity: -1,
    conversationOpacity: 1,
    conversationDensity: 7,
    count: 999,
    size: 0,
    wake: -4,
    fishCount: 5000,
    blur: 500,
    glassOpacity: 3,
  });
  assert.equal(result.density, 1);
  assert.equal(result.speed, 10);
  assert.equal(result.opacity, 0);
  assert.equal(result.conversationOpacity, 0.5);
  assert.equal(result.conversationDensity, 1);
  assert.equal(result.count, 20);
  assert.equal(result.size, 0.1);
  assert.equal(result.wake, 0);
  assert.equal(result.fishCount, 1000);
  assert.equal(result.blur, 64);
  assert.equal(result.glassOpacity, 1);
});

test("normalize rounds whale and fish counts", () => {
  const result = normalize({ count: 4.7, fishCount: 233 });
  assert.equal(result.count, 5);
  assert.equal(result.fishCount, 230);
  assert.equal(Number.isInteger(result.count), true);
});

test("normalize recovers from malformed numbers and colours", () => {
  const result = normalize({ density: "NaN", speed: null, color: "#12", enabled: "yes" });
  assert.equal(result.density, DEFAULTS.density);
  assert.equal(result.speed, DEFAULTS.speed);
  assert.equal(result.color, DEFAULTS.color);
  assert.equal(result.enabled, true);
});

test("normalize rejects unknown enum values", () => {
  const result = normalize({ species: "shark", eyeColor: "red", glyphMode: "klingon" });
  assert.equal(result.species, DEFAULTS.species);
  assert.equal(result.eyeColor, DEFAULTS.eyeColor);
  assert.equal(result.glyphMode, DEFAULTS.glyphMode);
});

test("normalize lowercases a valid colour", () => {
  assert.equal(normalize({ color: "#AABBCC" }).color, "#aabbcc");
});

test("validatePatch rejects malformed input", () => {
  assert.equal(validatePatch(null).ok, false);
  assert.equal(validatePatch({ density: "x" }).ok, false);
  assert.equal(validatePatch({ color: "blue" }).ok, false);
  assert.equal(validatePatch({ enabled: "true" }).ok, false);
  assert.equal(validatePatch({ species: "dolphin" }).ok, false);
});

test("validatePatch returns a normalized, clamped patch", () => {
  const result = validatePatch({ density: 3, color: "#123456", species: "orca" });
  assert.equal(result.ok, true);
  assert.equal(result.normalized.density, 1);
  assert.equal(result.normalized.color, "#123456");
  assert.equal(result.normalized.species, "orca");
});

test("resetDefaults returns a fresh mutable copy", () => {
  const first = resetDefaults();
  const second = resetDefaults();
  assert.deepEqual(first, DEFAULTS);
  assert.notEqual(first, second);
  first.count = 1;
  assert.equal(second.count, DEFAULTS.count);
});

test("every public control has a label and a hint", () => {
  for (const key of Object.keys(DEFAULTS)) {
    assert.equal(typeof LABELS[key], "string", key);
    assert.equal(typeof HINTS[key], "string", key);
    assert.ok(HINTS[key].length > 0, key);
  }
});

test("range table, enum table, booleans and the colour control cover every control", () => {
  const grouped = GROUPS.flatMap((group) => group.keys);
  const handled = new Set([...Object.keys(RANGES), ...Object.keys(OPTIONS), ...BOOLEAN_KEYS, "color"]);
  for (const key of grouped) assert.equal(handled.has(key), true, key);
});
