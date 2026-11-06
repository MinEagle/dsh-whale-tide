import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  HINTS,
  RANGES,
  normalize,
  resetDefaults,
  storageKey,
  validatePatch,
} from "../lib/settings.js";

test("storage key is versioned and namespaced", () => {
  assert.equal(storageKey, "dsh-whale-tide:v1");
});

test("defaults are complete and the eight public settings are present", () => {
  assert.deepEqual(Object.keys(DEFAULTS).sort(), [
    "color",
    "conversationDensity",
    "conversationOpacity",
    "density",
    "enabled",
    "followTheme",
    "opacity",
    "speed",
  ]);
  assert.equal(DEFAULTS.enabled, true);
  assert.equal(DEFAULTS.conversationOpacity, 0.16);
  assert.equal(DEFAULTS.conversationDensity, 0.3);
  assert.equal(DEFAULTS.color, "#4d6bfe");
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
    speed: 0,
    opacity: -1,
    conversationOpacity: 1,
    conversationDensity: 2,
  });
  assert.equal(result.density, 1);
  assert.equal(result.speed, RANGES.speed[0]);
  assert.equal(result.opacity, 0);
  assert.equal(result.conversationOpacity, 0.5);
  assert.equal(result.conversationDensity, 1);
});

test("normalize recovers from malformed numbers and colours", () => {
  const result = normalize({ density: "NaN", speed: null, color: "#12", enabled: "yes" });
  assert.equal(result.density, DEFAULTS.density);
  assert.equal(result.speed, DEFAULTS.speed);
  assert.equal(result.color, DEFAULTS.color);
  assert.equal(result.enabled, true);
});

test("normalize lowercases a valid colour", () => {
  assert.equal(normalize({ color: "#AABBCC" }).color, "#aabbcc");
});

test("validatePatch rejects malformed input", () => {
  assert.equal(validatePatch(null).ok, false);
  assert.equal(validatePatch({ density: "x" }).ok, false);
  assert.equal(validatePatch({ color: "blue" }).ok, false);
  assert.equal(validatePatch({ enabled: "true" }).ok, false);
});

test("validatePatch returns a normalized, clamped patch", () => {
  const result = validatePatch({ density: 3, color: "#123456" });
  assert.equal(result.ok, true);
  assert.equal(result.normalized.density, 1);
  assert.equal(result.normalized.color, "#123456");
});

test("resetDefaults returns a fresh mutable copy", () => {
  const first = resetDefaults();
  const second = resetDefaults();
  assert.deepEqual(first, DEFAULTS);
  assert.notEqual(first, second);
  first.density = 0;
  assert.equal(second.density, DEFAULTS.density);
});

test("every public control has a hint", () => {
  for (const key of Object.keys(DEFAULTS)) {
    assert.equal(typeof HINTS[key], "string", key);
    assert.ok(HINTS[key].length > 0, key);
  }
});
