/**
 * Settings model for Whale Tide (dsh-quiet template).
 *
 * The browser bundle is hand-written and cannot require relative modules, so
 * `lib/client.js` carries an inlined copy. This file is the Node-side source
 * of truth used by the tests.
 */

export const storageKey = "dsh-whale-tide:v1";

export const DEFAULTS = Object.freeze({
  enabled: true,
  opacity: 1,
  conversationOpacity: 1,
  speed: 1,
  fishDensity: 1,
  whaleCount: 3,
  sidebarBlur: 6,
  composerGlass: true,
  streamBlur: 10,
});

export const RANGES = Object.freeze({
  opacity: [0, 1, 0.05],
  conversationOpacity: [0, 1, 0.05],
  speed: [0.2, 2, 0.1],
  fishDensity: [0.2, 2, 0.1],
  whaleCount: [1, 3, 1],
  sidebarBlur: [0, 20, 1],
  streamBlur: [0, 20, 1],
});

export const BOOLEAN_KEYS = Object.freeze(["enabled", "composerGlass"]);

export const GROUPS = Object.freeze([
  { id: "backdrop", keys: ["enabled", "opacity", "conversationOpacity"] },
  { id: "motion", keys: ["speed", "fishDensity", "whaleCount"] },
  { id: "surface", keys: ["sidebarBlur", "composerGlass", "streamBlur"] },
]);

export const LABELS = Object.freeze({
  enabled: "Show background",
  opacity: "Opacity",
  conversationOpacity: "Opacity in conversation",
  speed: "Swimming speed",
  fishDensity: "Fish density",
  whaleCount: "Whale count",
  sidebarBlur: "Sidebar blur",
  composerGlass: "Frosted composer",
  streamBlur: "Stream blur",
});

export const HINTS = Object.freeze({
  enabled: "Turn off to remove the backdrop and restore the native interface.",
  opacity: "Backdrop opacity in an empty conversation.",
  conversationOpacity: "Backdrop opacity while a conversation is active.",
  speed: "0.2x to 2x the base speed.",
  fishDensity: "0.2x to 2x; 1.0 is about 100 fish across five species.",
  whaleCount: "1 to 3 whales; the rest stay hidden.",
  sidebarBlur: "Backdrop blur behind the sidebar, in px.",
  composerGlass: "Frost the composer in empty and active conversations.",
  streamBlur: "Blur-to-clear strength for streaming replies.",
});

const NUMERIC_KEYS = Object.keys(RANGES);

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

export function normalize(value) {
  const out = { ...DEFAULTS };
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const key of BOOLEAN_KEYS) {
    if (typeof value[key] === "boolean") out[key] = value[key];
  }
  for (const key of NUMERIC_KEYS) {
    const raw = value[key];
    const n = raw === null || raw === "" || typeof raw === "boolean" ? NaN : Number(raw);
    out[key] = Number.isFinite(n) ? clamp(n, RANGES[key][0], RANGES[key][1]) : DEFAULTS[key];
  }
  out.whaleCount = Math.round(out.whaleCount);
  return out;
}

export function resetDefaults() {
  return { ...DEFAULTS };
}
