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
  fishCount: 100,
  fishColor: "#a9bde8",
  fishGlint: 1,
  whaleColor: "#c3c8d2",
  whaleCount: 3,
  sidebarFish: 6,
  sidebarBlur: 6,
  composerGlass: true,
  streamBlur: 10,
});

export const RANGES = Object.freeze({
  opacity: [0, 1, 0.05],
  conversationOpacity: [0, 1, 0.05],
  speed: [0.2, 2, 0.1],
  fishCount: [20, 200, 10],
  fishGlint: [0, 2, 0.1],
  whaleCount: [1, 3, 1],
  sidebarFish: [0, 12, 1],
  sidebarBlur: [0, 20, 1],
  streamBlur: [0, 20, 1],
});

export const BOOLEAN_KEYS = Object.freeze(["enabled", "composerGlass"]);

export const GROUPS = Object.freeze([
  { id: "backdrop", keys: ["enabled", "opacity", "conversationOpacity"] },
  { id: "motion", keys: ["speed", "fishCount", "fishGlint", "fishColor", "whaleColor", "whaleCount", "sidebarFish"] },
  { id: "surface", keys: ["sidebarBlur", "composerGlass", "streamBlur"] },
]);

export const LABELS = Object.freeze({
  enabled: "Show background",
  opacity: "Opacity",
  conversationOpacity: "Opacity in conversation",
  speed: "Swimming speed",
  fishCount: "Fish count",
  fishColor: "Fish color",
  fishGlint: "Fish glint",
  whaleColor: "Whale color",
  whaleCount: "Whale count",
  sidebarFish: "Sidebar fish",
  sidebarBlur: "Sidebar blur",
  composerGlass: "Frosted composer",
  streamBlur: "Stream blur",
});

export const HINTS = Object.freeze({
  enabled: "Turn off to remove the backdrop and restore the native interface.",
  opacity: "Backdrop opacity in an empty conversation.",
  conversationOpacity: "Backdrop opacity while a conversation is active.",
  speed: "0.2x to 2x the base speed.",
  fishCount: "20 to 200 fish across five species.",
  fishColor: "Color used for fish glyphs.",
  fishGlint: "Brightness glint when fish turn or panic.",
  whaleColor: "Color used for whale glyphs.",
  whaleCount: "1 to 3 whales; the rest stay hidden.",
  sidebarFish: "Fish kept in the sidebar during a conversation.",
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
  out.fishCount = Math.round(out.fishCount);
  out.sidebarFish = Math.round(out.sidebarFish);
  for (const key of ["fishColor", "whaleColor"]) {
    if (typeof value[key] === "string" && /^#[0-9a-f]{6}$/i.test(value[key])) out[key] = value[key].toLowerCase();
  }
  return out;
}

export function resetDefaults() {
  return { ...DEFAULTS };
}
