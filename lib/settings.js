/**
 * Canonical settings model for dsh-whale-tide.
 *
 * The browser half is a single hand-written bundle and cannot `require` a
 * relative module (the Harness client module table only resolves package
 * ids), so `lib/client.js` carries an inlined copy of these constants. Keep
 * the two in sync; this file is the source of truth and is covered by
 * `test/settings.test.js`.
 */

export const storageKey = "dsh-whale-tide:v1";

export const DEFAULTS = Object.freeze({
  enabled: true,
  density: 0.65,
  speed: 1,
  opacity: 1,
  conversationOpacity: 0.16,
  conversationDensity: 0.3,
  color: "#4d6bfe",
  followTheme: true,
});

/** [min, max, step] for each numeric control, in UI order. */
export const RANGES = Object.freeze({
  density: [0, 1, 0.01],
  speed: [0.1, 3, 0.05],
  opacity: [0, 1, 0.01],
  conversationOpacity: [0, 0.5, 0.01],
  conversationDensity: [0, 1, 0.01],
});

export const LABELS = Object.freeze({
  enabled: "Show background",
  density: "Creature density",
  speed: "Swimming speed",
  opacity: "Opacity",
  conversationOpacity: "Opacity in conversation",
  conversationDensity: "Creature ratio in conversation",
  color: "Accent color",
  followTheme: "Follow light / dark",
});

export const HINTS = Object.freeze({
  enabled: "Turn off to remove the layer and restore the native interface.",
  density: "Fish population. At 0 only the whale remains.",
  speed: "0.1× to 3× the base swimming speed.",
  opacity: "Layer opacity in an empty conversation.",
  conversationOpacity: "Layer opacity while a conversation is active (default 0.16).",
  conversationDensity: "Share of fish kept while a conversation is active (default 0.3).",
  color: "Tints the whale, fish and wake.",
  followTheme: "On: follow the DSH theme. Off: pin the light/dark mode active when you switch it off.",
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

  out.enabled = value.enabled !== false;
  out.followTheme = value.followTheme !== false;
  for (const key of NUMERIC_KEYS) {
    out[key] = readNumber(value[key], DEFAULTS[key], RANGES[key][0], RANGES[key][1]);
  }
  if (typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color)) {
    out.color = value.color.toLowerCase();
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
  for (const key of ["enabled", "followTheme"]) {
    if (patch[key] !== undefined && typeof patch[key] !== "boolean") {
      return { ok: false, error: `${key} must be a boolean` };
    }
  }
  for (const key of NUMERIC_KEYS) {
    if (patch[key] !== undefined) {
      if (typeof patch[key] !== "number" || !Number.isFinite(patch[key])) {
        return { ok: false, error: `${key} must be a finite number` };
      }
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
