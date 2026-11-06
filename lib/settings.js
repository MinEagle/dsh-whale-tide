/**
 * Canonical settings model for dsh-whale-tide.
 *
 * The browser half is a single hand-written bundle and cannot `require` a
 * relative module (the Harness client module table only resolves package
 * ids), so `lib/client.js` carries an inlined copy of these constants. Keep
 * the two in sync; this file is the source of truth and is covered by
 * `test/settings.test.js`.
 *
 * The ocean/whale/fish/glass keys mirror dsh-ascii-whales 0.1.5 (MIT) so the
 * settings panel exposes the same controls as the upstream plugin.
 */

export const storageKey = "dsh-whale-tide:v1";

export const DEFAULTS = Object.freeze({
  // tide (this plugin)
  enabled: true,
  density: 0.65,
  opacity: 1,
  conversationOpacity: 0.20,
  conversationDensity: 0.3,
  followTheme: true,
  // whales (upstream)
  count: 3,
  species: "humpback",
  size: 1.2,
  bodySwing: 0.8,
  turnAgility: 0.7,
  tailFrequency: 0.8,
  // ocean (upstream)
  speed: 0.65,
  color: "#4d6bfe",
  colorfulShimmer: false,
  eyeColor: "primary",
  wake: 1,
  gridScale: 1,
  gridOpacity: 0.05,
  fishCount: 170,
  glyphMode: "ascii",
  // frosted composer (upstream)
  glass: true,
  blur: 14,
  glassOpacity: 0.45,
});

/** [min, max, step] for each numeric control. */
export const RANGES = Object.freeze({
  density: [0, 1, 0.01],
  opacity: [0, 1, 0.05],
  conversationOpacity: [0, 0.5, 0.01],
  conversationDensity: [0, 1, 0.01],
  count: [1, 20, 1],
  size: [0.1, 10, 0.1],
  bodySwing: [0, 3, 0.1],
  turnAgility: [0.1, 3, 0.1],
  tailFrequency: [0.1, 5, 0.1],
  speed: [0.1, 10, 0.1],
  wake: [0, 10, 0.1],
  gridScale: [0.1, 10, 0.1],
  gridOpacity: [0, 1, 0.01],
  fishCount: [0, 1000, 10],
  blur: [0, 64, 1],
  glassOpacity: [0, 1, 0.05],
});

export const OPTIONS = Object.freeze({
  species: ["humpback", "orca"],
  eyeColor: ["primary", "black", "white"],
  glyphMode: ["ascii", "hanzi"],
});

export const BOOLEAN_KEYS = Object.freeze(["enabled", "followTheme", "colorfulShimmer", "glass"]);

export const GROUPS = Object.freeze([
  { id: "tide", keys: ["enabled", "opacity", "density", "conversationOpacity", "conversationDensity", "followTheme"] },
  { id: "whale", keys: ["count", "species", "size", "bodySwing", "turnAgility", "tailFrequency"] },
  { id: "ocean", keys: ["speed", "color", "colorfulShimmer", "eyeColor", "wake", "gridScale", "gridOpacity", "fishCount", "glyphMode"] },
  { id: "glass", keys: ["glass", "blur", "glassOpacity"] },
]);

export const LABELS = Object.freeze({
  enabled: "Show background",
  density: "Creature density",
  opacity: "Opacity",
  conversationOpacity: "Opacity in conversation",
  conversationDensity: "Creature ratio in conversation",
  followTheme: "Follow light / dark",
  count: "Whale count",
  species: "Whale species",
  size: "Whale size",
  bodySwing: "Body swing",
  turnAgility: "Turn agility",
  tailFrequency: "Tail frequency",
  speed: "Swimming speed",
  color: "Accent color",
  colorfulShimmer: "Colorful shimmer",
  eyeColor: "Eye background",
  wake: "Wake intensity",
  gridScale: "Cell size",
  gridOpacity: "Grid opacity",
  fishCount: "Fish count",
  glyphMode: "Character style",
  glass: "Frosted composer",
  blur: "Glass blur",
  glassOpacity: "Glass opacity",
});

export const HINTS = Object.freeze({
  enabled: "Turn off to remove the layer and restore the native interface.",
  density: "Share of the school shown in an empty conversation.",
  opacity: "Layer opacity in an empty conversation.",
  conversationOpacity: "Layer opacity while a conversation is active (default 0.20).",
  conversationDensity: "Share of fish kept while a conversation is active (default 0.3).",
  followTheme: "On: follow DSH. Off: pin the mode active when switched off.",
  count: "How many whales swim at once.",
  species: "Humpback is broader; orca is longer and slimmer.",
  size: "Whale length multiplier.",
  bodySwing: "Amplitude of the body wave.",
  turnAgility: "How fast a whale follows a new heading.",
  tailFrequency: "Tail-beat rhythm.",
  speed: "0.1× to 10× the base speed.",
  color: "Tints whale, fish and wake.",
  colorfulShimmer: "Adds the original seven-colour glints on the body.",
  eyeColor: "Dark backing behind each eye.",
  wake: "Strength of the wake and ripples.",
  gridScale: "Character cell size multiplier.",
  gridOpacity: "Background grid opacity.",
  fishCount: "Total simulated fish.",
  glyphMode: "ASCII uses monospace; Hanzi uses a serif CJK face.",
  glass: "Frost the composer in both the empty and conversation states.",
  blur: "Backdrop blur radius.",
  glassOpacity: "Tint opacity behind the composer.",
});

const NUMERIC_KEYS = Object.keys(RANGES);

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function readNumber(value, fallback, min, max) {
  if (value === null || value === "" || typeof value === "boolean") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

/** Return a complete, valid settings object. Unknown fields are dropped. */
export function normalize(value) {
  const out = { ...DEFAULTS };
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;

  for (const key of BOOLEAN_KEYS) {
    if (typeof value[key] === "boolean") out[key] = value[key];
  }
  for (const key of NUMERIC_KEYS) {
    out[key] = readNumber(value[key], DEFAULTS[key], RANGES[key][0], RANGES[key][1]);
  }
  out.count = Math.round(out.count);
  out.fishCount = Math.round(out.fishCount / 10) * 10;
  for (const key of Object.keys(OPTIONS)) {
    if (OPTIONS[key].includes(value[key])) out[key] = value[key];
  }
  if (typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color)) {
    out.color = value.color.toLowerCase();
  }
  return out;
}

/**
 * 0.4.0 migration: the old default conversation opacity was 0.16; the halo
 * removal lowered it to 0.10. Only the old default is migrated.
 */
export function migrate(value, schemaOld = true) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const out = { ...value };
  if (schemaOld && (out.conversationOpacity === 0.16 || out.conversationOpacity === 0.10)) {
    out.conversationOpacity = 0.20;
  }
  return out;
}

/**
 * Validate a patch from the settings UI.
 * @returns {{ok: boolean, error?: string, normalized?: object}}
 */
export function validatePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { ok: false, error: "patch must be an object" };
  }
  for (const key of BOOLEAN_KEYS) {
    if (patch[key] !== undefined && typeof patch[key] !== "boolean") {
      return { ok: false, error: `${key} must be a boolean` };
    }
  }
  for (const key of NUMERIC_KEYS) {
    if (patch[key] !== undefined && (typeof patch[key] !== "number" || !Number.isFinite(patch[key]))) {
      return { ok: false, error: `${key} must be a finite number` };
    }
  }
  for (const key of Object.keys(OPTIONS)) {
    if (patch[key] !== undefined && !OPTIONS[key].includes(patch[key])) {
      return { ok: false, error: `${key} must be one of ${OPTIONS[key].join(", ")}` };
    }
  }
  if (patch.color !== undefined && !/^#[0-9a-f]{6}$/i.test(String(patch.color))) {
    return { ok: false, error: "color must be a #rrggbb value" };
  }
  return { ok: true, normalized: normalize({ ...DEFAULTS, ...patch }) };
}

/** A fresh mutable copy, for the "restore defaults" action. */
export function resetDefaults() {
  return { ...DEFAULTS };
}

export default DEFAULTS;
