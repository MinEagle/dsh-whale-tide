/**
 * dsh-whale-tide — browser half.
 *
 * Plain JavaScript, no build step. The factory registers under the exact
 * package name ("dsh-whale-tide") so the Harness client module loader can
 * match the package row; a mismatch produces the "loaded without registering"
 * activation failure.
 *
 * Everything the plugin adds is created inside apply() and removed by its
 * ctx.effect cleanup: the fixed backdrop layer, the canvas engine, the
 * stylesheet, the theme/phase observers, the settings store subscription and
 * the settings section.
 */

window.__ModuleLoader__.load({
  id: "dsh-whale-tide",
  factory(require) {
    "use strict";

    const React = require("react");
    const h = React.createElement;

    /* =====================================================================
     * Engine (inlined from the standalone preview source)
     * ===================================================================*/
/**
 * Whale Tide — ocean core.
 *
 * A glyph-rendered whale and fish schools, adapted from ascii-sharks
 * (https://github.com/stackedlol/ascii-sharks, commit c521e24a787e6d4cc460d4cf2b9815f25e4fe453,
 * MIT, Copyright (c) 2026 drewdi).
 *
 * Kept here as the single engine source for both tools/preview.html and
 * lib/client.js. It is plain browser JavaScript: no imports, no build step.
 *
 * Engine pieces carried over from upstream:
 *   - fixed-step accumulator (STEP = 1/60, MAX_STEPS = 4)
 *   - boids with a spatial hash built from Int32Array head/next links
 *   - follow-the-leader ridge creature with a per-joint maxBend
 *   - continuous-space sampling into floor(x / cellW) grid cells with
 *     separate flag and shade buffers
 *   - shade-based glyph ramps plus per-part glyph sets
 *   - wake energy diffusion
 * Adapted here: humpback whale geometry, tide phases, population that enters
 * and leaves through the screen edges, an ink-measured ramp, a GlyphAtlas,
 * dirty-cell repainting, and a softer daylight palette.
 */

const WT_STEP = 1 / 60;
const WT_MAX_STEPS = 4;
const WT_SPINE = 18;
const WT_TAU = Math.PI * 2;

const WT_FLAG = {
  BODY: 1,
  EDGE: 2,
  FIN: 3,
  RIDGE: 4,
  EYE: 5,
  FLUKE: 6,
  MARK: 7,
  WAKE: 8,
};

const WT_GLYPHS = {
  skin: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  fin: [";", "%", "t", "S", ":"],
  fluke: ["~", "s", "S", "%", "8"],
  ridge: ["=", "+", "*", "8", "%"],
  edgeHeavy: [":", ";", "s"],
  edgeLight: [".", "'", "`", ","],
  mark: ["#", "%", "@", "&"],
  eye: ["o", "O", "0"],
  wake: [".", "~", "=", "*"],
  fish: ["-", "~", ",", "'", ">", "<", "=", "»", "«"],
};

/** Species are upstream's school archetypes, trimmed to three readable sizes. */
const WT_SPECIES = [
  {
    name: "sardine",
    cruise: 34, maxSpeed: 62, minSpeed: 17, weight: 3,
    schoolSize: [18, 28], spacing: [1.8, 1.1],
    align: 1.7, cohesion: 1.5, jitter: 38, mill: 55, verticalDrag: 0.5,
  },
  {
    name: "anchovy",
    cruise: 44, maxSpeed: 76, minSpeed: 21, weight: 3,
    schoolSize: [18, 30], spacing: [1.5, 1],
    align: 3.1, cohesion: 0.5, jitter: 30, mill: 0, verticalDrag: 1.4,
  },
  {
    name: "silverside",
    cruise: 38, maxSpeed: 68, minSpeed: 19, weight: 2,
    schoolSize: [10, 18], spacing: [2, 1.1],
    align: 2.3, cohesion: 1.1, jitter: 34, mill: 0, verticalDrag: 1.6,
  },
];
const WT_SPECIES_WEIGHT = WT_SPECIES.reduce((sum, s) => sum + s.weight, 0);

function wtPickSpecies() {
  let r = Math.random() * WT_SPECIES_WEIGHT;
  for (let i = 0; i < WT_SPECIES.length; i++) {
    r -= WT_SPECIES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

/* ── tiny math helpers (upstream math.ts) ─────────────────────────────── */

const wtClamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const wtRand = (lo, hi) => lo + Math.random() * (hi - lo);
const wtRandInt = (lo, hi) => Math.floor(wtRand(lo, hi + 1));

function wtSmoothstep(e0, e1, x) {
  const t = wtClamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function wtAngleDiff(a, b) {
  let d = (b - a) % WT_TAU;
  if (d > Math.PI) d -= WT_TAU;
  if (d < -Math.PI) d += WT_TAU;
  return d;
}

/** Cheap deterministic hash → [0, 1). Keeps skin texture anchored to the body. */
function wtHash(x, y, z) {
  let h =
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263) ^
    Math.imul(z | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const WT_K1 = 1 / 260;
const WT_K2 = 1 / 310;
const WT_K3 = 1 / 190;
const WT_CURRENT_SCALE = 3400;
const wtCurrentOut = { x: 0, y: 0 };

/** Divergence-free current: the curl of a slowly drifting stream function. */
function wtCurrent(x, y, t, out) {
  const a = x * WT_K1 + t * 0.07;
  const b = y * WT_K2 - t * 0.05;
  const c = (x + y) * WT_K3 + t * 0.11;
  out.x = (-WT_K2 * Math.sin(a) * Math.sin(b) + 0.5 * WT_K3 * Math.cos(c)) * WT_CURRENT_SCALE;
  out.y = (-WT_K1 * Math.cos(a) * Math.cos(b) - 0.5 * WT_K3 * Math.cos(c)) * WT_CURRENT_SCALE;
  return out;
}

/* ── humpback whale geometry (adapted from dsh-ascii-whales, MIT) ─────── */

const WT_WHALE = {
  halfWidth(s) {
    if (s < 0.14) return 0.135 * Math.pow(Math.sin((s / 0.14) * Math.PI / 2), 0.4);
    if (s < 0.34) return 0.135 + 0.018 * Math.sin(((s - 0.14) / 0.2) * Math.PI);
    if (s < 0.87) return 0.018 + 0.117 * Math.pow(1 - (s - 0.34) / 0.53, 1.08);
    return 0.018 * (1 - (s - 0.87) / 0.13);
  },
  pectoral: [0.25, 0.36, 0.38, 0.30],
  dorsal: [0.58, 0.66],
  eye: [0.075, 0.115],
  gills: [0, 0],
};

/** Curved, narrow humpback flipper; distance is measured across the body. */
function wtHumpbackFlipper(s, distance, reach) {
  const t = distance / reach;
  if (t < 0 || t > 1) return false;
  const center = 0.22 + 0.34 * t - 0.05 * Math.sin(Math.PI * t);
  const root = 1 - 0.18 * Math.exp(-Math.pow((t - 0.4) / 0.14, 2));
  const width = 0.06 * (1 - 0.55 * t) * Math.sqrt(1 - Math.pow(t, 5)) * root;
  return Math.abs(s - center) <= width;
}

/** Two curved lobes sweep behind the tail stock; a notch separates them. */
function wtWhaleFlukes(s, across) {
  const t = across / 0.18;
  if (t < 0 || t > 1) return false;
  // Two swept lobes leave a deep V notch in the middle, so the tail reads
  // as a fluke rather than a paddle.
  const gap = t < 0.15 ? 0.95 : 0.87 + 0.1 * t;
  return s >= gap && s <= 0.998;
}

/* ── ink ramp ─────────────────────────────────────────────────────────── */

/**
 * InkRamp: each candidate glyph is drawn once at startup, its alpha coverage
 * measured, and the sorted result sampled into 64 tones. The same class works
 * for ASCII or Hanzi — the pool is the only difference.
 */
class WTInkRamp {
  constructor(family) {
    this.family = family;
    this.entries = [];
    this.table = null;
  }

  build(pool) {
    const chars = [...pool];
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g) {
      this.entries = chars.map((ch, i) => ({ ch, ink: i / Math.max(1, chars.length - 1) }));
      this.makeTable();
      return;
    }
    g.font = `600 ${Math.round(size * 0.82)}px ${this.family}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#fff";
    const measured = [];
    for (const ch of chars) {
      g.clearRect(0, 0, size, size);
      g.fillText(ch, size / 2, size / 2);
      const data = g.getImageData(0, 0, size, size).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) sum += data[i];
      measured.push({ ch, ink: sum / (255 * size * size) });
    }
    measured.sort((a, b) => a.ink - b.ink);
    const lo = measured[0] ? measured[0].ink : 0;
    const hi = measured[measured.length - 1] ? measured[measured.length - 1].ink : 1;
    this.entries = measured.map((m) => ({ ch: m.ch, tone: (m.ink - lo) / (hi - lo || 1) }));
    this.makeTable();
  }

  makeTable() {
    const steps = 64;
    this.table = [];
    if (!this.entries.length) return;
    for (let i = 0; i < steps; i++) {
      const tone = i / (steps - 1);
      let best = this.entries[0];
      for (const e of this.entries) {
        if (Math.abs(e.tone - tone) < Math.abs(best.tone - tone)) best = e;
      }
      this.table.push(best.ch);
    }
  }

  pick(tone) {
    if (!this.table) return "-";
    const i = Math.round(wtClamp(tone, 0, 1) * (this.table.length - 1));
    return this.table[i];
  }
}

/* ── glyph atlas ──────────────────────────────────────────────────────── */

/**
 * GlyphAtlas: one small offscreen canvas per glyph+colour pair, blitted with
 * drawImage. Colours are quantised so the cache stays bounded; 6000 tiles is
 * the hard ceiling (clear, then rebuild the few visible ones).
 */
class WTGlyphAtlas {
  constructor(family) {
    this.family = family;
    this.tiles = new Map();
    this.px = 0;
    this.limit = 6000;
  }

  setCell(px, family) {
    if (family) this.family = family;
    px = Math.max(6, Math.round(px));
    if (px === this.px) return;
    this.px = px;
    this.tiles.clear();
  }

  get(glyph, color) {
    const key = glyph + "\u0000" + color;
    let tile = this.tiles.get(key);
    if (tile !== undefined) return tile;
    if (this.tiles.size >= this.limit) this.tiles.clear();
    const px = this.px || 12;
    tile = document.createElement("canvas");
    tile.width = tile.height = px;
    const g = tile.getContext("2d");
    if (g) {
      g.clearRect(0, 0, px, px);
      g.font = `600 ${Math.max(6, Math.round(px * 0.86))}px ${this.family}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = color;
      g.fillText(glyph, px / 2, px / 2 + px * 0.015);
    }
    this.tiles.set(key, tile);
    return tile;
  }
}

/* ── colour helpers ───────────────────────────────────────────────────── */

function wtHexRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  const n = m ? parseInt(m[1], 16) : 0x4d6bfe;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function wtMix(a, b, t) {
  const k = wtClamp(t, 0, 1);
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

function wtRgb(c) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function wtRgba(c, a) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function wtPalette(theme, accentHex) {
  const accent = wtHexRgb(accentHex);
  const dark = theme === "dark";
  const base = dark ? [20, 21, 24] : [255, 255, 255];
  const deep = dark ? wtMix([34, 68, 190], accent, 0.34) : wtMix([45, 76, 190], accent, 0.30);
  const bright = dark ? wtMix([134, 186, 255], accent, 0.28) : wtMix([122, 160, 255], accent, 0.26);
  const whale = [];
  const whaleFill = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const c = wtMix(deep, bright, t * 0.92);
    whale.push(wtRgb(c));
    whaleFill.push(wtRgba(c, dark ? 0.88 + 0.08 * t : 0.9 + 0.04 * t));
  }
  const edge = [];
  const edgeFill = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const c = wtMix(bright, dark ? [230, 244, 255] : [255, 255, 255], 0.18 + 0.45 * t);
    edge.push(wtRgb(c));
    edgeFill.push(wtRgba(c, 0.72 + 0.22 * t));
  }
  const fishInk = dark ? wtMix([120, 220, 255], accent, 0.38) : wtMix([28, 98, 130], accent, 0.34);
  const fish = [];
  for (let i = 0; i < 6; i++) {
    fish.push(wtRgb(dark ? wtMix(base, fishInk, 0.3 + 0.7 * (i / 5)) : wtMix(base, fishInk, 0.96 - 0.55 * (i / 5))));
  }
  const wakeInk = dark ? wtMix([150, 240, 255], accent, 0.3) : wtMix([64, 126, 190], accent, 0.35);
  const wake = [];
  for (let i = 0; i < 5; i++) {
    wake.push(wtRgb(dark ? wtMix(base, wakeInk, 0.22 + 0.55 * (i / 4)) : wtMix(base, wakeInk, 0.30 + 0.46 * (i / 4))));
  }
  const glyph = dark ? "#edf4ff" : "#f7faff";
  return {
    base,
    ink: deep,
    whale,
    whaleFill,
    edge,
    edgeFill,
    fish,
    wake,
    glyph,
    edgeGlyph: dark ? "#0c1428" : "#15224a",
    ridge: wtRgb(wtMix(bright, [255, 255, 255], dark ? 0.35 : 0.2)),
    ridgeGlyph: dark ? "#111a30" : "#1a2850",
    eye: wtRgb([245, 249, 255]),
    eyeGlyph: "#101a34",
    mark: wtRgb(wtMix(deep, [8, 16, 38], 0.55)),
    fill: dark ? "rgba(180,220,255,0.06)" : "rgba(40,70,130,0.05)",
    dot: dark ? "rgba(176,205,255,0.075)" : "rgba(48,68,110,0.065)",
    dotAlt: dark ? "rgba(176,205,255,0.035)" : "rgba(48,68,110,0.032)",
  };
}

/* ── world ────────────────────────────────────────────────────────────── */

const WT_FISH_SEPARATION_K = 420;
const WT_FISH_ALIGN_K = 1.4;
const WT_FISH_COHESION_K = 1;
const WT_FISH_FLEE_K = 1100;
const WT_BLIND_COS = -0.6;

class WTWorld {
  constructor(settings, active) {
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.fish = [];
    this.whales = [];
    this.pointer = { x: 0, y: 0, active: false };
    this.settings = settings;
    this.active = !!active;
    this.baseFish = 120;
    this.maxFish = 120;
    this.targetFish = 120;
    this.popTimer = 0;
    this.perception = 60;
    this.sepX = [];
    this.sepY = [];
    this.foreignSep = 40;
    this.bucketCols = 0;
    this.bucketRows = 0;
    this.bucketHead = new Int32Array(0);
    this.bucketCount = new Uint16Array(0);
    this.bucketNext = new Int32Array(0);
    this.tmp = { x: 0, y: 0 };
    this.lastSpawn = 0;
    this.enterCount = 0;
  }

  resize(width, height, cellW, cellH) {
    const first = this.width === 0;
    const oldBase = this.baseFish;
    this.width = width;
    this.height = height;
    this.sepX = WT_SPECIES.map((sp) => sp.spacing[0] * cellW);
    this.sepY = WT_SPECIES.map((sp) => sp.spacing[1] * cellH);
    this.perception = Math.max(cellH * 3, cellW * 5.5);
    this.foreignSep = cellW * 3;
    const base = wtClamp(Math.round((width * height) / 4200), 80, 300);
    this.baseFish = base;
    this.maxFish = base;
    if (first || this.fish.length === 0 || Math.abs(base - oldBase) > 24) {
      this.seed();
    } else {
      for (const f of this.fish) {
        if (f.state === 2) continue;
        f.x = wtClamp(f.x, -40, width + 40);
        f.y = wtClamp(f.y, -40, height + 40);
      }
      this.targetFish = this.desiredFish();
    }
  }

  seed() {
    const W = this.width;
    const H = this.height;
    const minSide = Math.min(W, H);
    this.whales = [];
    const adult = wtClamp(minSide * 0.50, 240, 440);
    const calf = adult * 0.52;
    const specs = [
      { length: adult, x: W * 0.5, y: H * 0.77, heading: -0.02, depth: 1, orbit: 1, dir: 1, cx: W * 0.5, cy: H * 0.77, patrolX: W * 0.17, patrolY: H * 0.016 },
    ];
    for (let i = 0; i < specs.length; i++) {
      const sp = specs[i];
      const nodes = new Float32Array(WT_SPINE * 2);
      const seg = sp.length / (WT_SPINE - 1);
      for (let n = 0; n < WT_SPINE; n++) {
        nodes[n * 2] = sp.x - Math.cos(sp.heading) * seg * n;
        nodes[n * 2 + 1] = sp.y - Math.sin(sp.heading) * seg * n;
      }
      this.whales.push({
        id: i + 1,
        length: sp.length,
        nodes,
        heading: sp.heading,
        speed: 28,
        phase: wtRand(0, WT_TAU),
        turn: 0,
        depth: sp.depth,
        orbitRadius: sp.orbit,
        orbitDir: sp.dir,
        cx: sp.cx,
        cy: sp.cy,
        patrolX: sp.patrolX,
        patrolY: sp.patrolY,
        wander: 0,
      });
    }
    this.seedFish();
    this.targetFish = this.desiredFish();
  }

  seedFish() {
    const W = this.width;
    const H = this.height;
    const total = this.maxFish;
    this.fish = [];
    const target = this.desiredFish();
    let made = 0;
    while (made < total) {
      const species = wtPickSpecies();
      const sp = WT_SPECIES[species];
      const size = Math.min(wtRandInt(sp.schoolSize[0], sp.schoolSize[1]), total - made);
      const millDir = Math.random() < 0.5 ? 1 : -1;
      const cx = wtRand(W * 0.08, W * 0.92);
      const cy = wtRand(H * 0.1, H * 0.9);
      const dir = (Math.random() < 0.5 ? 0 : Math.PI) + wtRand(-0.5, 0.5);
      for (let k = 0; k < size; k++) {
        const active = made < target;
        this.fish.push({
          x: active ? cx + wtRand(-1, 1) * this.sepX[species] * Math.sqrt(size) : -200,
          y: active ? cy + wtRand(-1, 1) * this.sepY[species] * Math.sqrt(size) * 0.6 : -200,
          vx: Math.cos(dir) * sp.cruise,
          vy: Math.sin(dir) * sp.cruise,
          species,
          alarm: 0,
          phase: wtRand(0, WT_TAU),
          turn: 0,
          depth: wtRand(0.55, 1),
          millDir,
          state: active ? 0 : 2,
          exitDir: 0,
        });
        made++;
      }
    }
    this.bucketNext = new Int32Array(this.fish.length);
  }

  desiredFish() {
    const s = this.settings;
    const factor = this.active ? wtClamp(s.conversationDensity, 0, 1) : 1;
    return Math.round(this.baseFish * wtClamp(s.density, 0, 1) * factor);
  }

  setSettings(settings) {
    this.settings = settings;
    this.targetFish = this.desiredFish();
  }

  setTide(active) {
    this.active = !!active;
    this.targetFish = this.desiredFish();
  }

  syncPopulation(dt) {
    this.popTimer -= dt;
    if (this.popTimer > 0) return;
    this.popTimer = 0.16;
    let visible = 0;
    for (const f of this.fish) if (f.state !== 2) visible++;
    if (visible < this.targetFish) {
      let need = Math.min(6, this.targetFish - visible);
      for (const f of this.fish) {
        if (need <= 0) break;
        if (f.state === 2) {
          this.revive(f);
          need--;
        }
      }
    } else if (visible > this.targetFish + 1) {
      let need = Math.min(4, visible - this.targetFish);
      const list = this.fish.filter((f) => f.state === 0);
      const cx = this.width / 2;
      const cy = this.height / 2;
      list.sort((a, b) => {
        const da = (a.x - cx) ** 2 + (a.y - cy) ** 2;
        const db = (b.x - cx) ** 2 + (b.y - cy) ** 2;
        return db - da;
      });
      for (const f of list) {
        if (need <= 0) break;
        f.state = 1;
        const left = f.x;
        const right = this.width - f.x;
        const top = f.y;
        const bottom = this.height - f.y;
        const min = Math.min(left, right, top, bottom);
        f.exitDir = min === left ? Math.PI : min === right ? 0 : min === top ? -Math.PI / 2 : Math.PI / 2;
        need--;
      }
    }
  }

  revive(f) {
    const W = this.width;
    const H = this.height;
    const side = wtRandInt(0, 3);
    const along = wtRand(0.15, 0.85);
    if (side === 0) {
      f.x = -24 - wtRand(0, 30); f.y = along * H; f.vx = 60; f.vy = 0;
    } else if (side === 1) {
      f.x = W + 24 + wtRand(0, 30); f.y = along * H; f.vx = -60; f.vy = 0;
    } else if (side === 2) {
      f.x = along * W; f.y = -24 - wtRand(0, 30); f.vx = 0; f.vy = 60;
    } else {
      f.x = along * W; f.y = H + 24 + wtRand(0, 30); f.vx = 0; f.vy = -60;
    }
    f.state = 3;
    f.alarm = 0;
    f.turn = 0;
    f.phase = wtRand(0, WT_TAU);
    this.enterCount++;
  }

  step(dt) {
    this.time += dt;
    this.syncPopulation(dt);
    this.rebuildHash();
    this.stepFish(dt);
    this.stepWhales(dt);
  }

  rebuildHash() {
    const size = this.perception;
    const pad = 2;
    this.bucketCols = Math.ceil(this.width / size) + pad * 2;
    this.bucketRows = Math.ceil(this.height / size) + pad * 2;
    const n = this.bucketCols * this.bucketRows;
    if (this.bucketHead.length !== n) {
      this.bucketHead = new Int32Array(n);
      this.bucketCount = new Uint16Array(n);
    }
    this.bucketHead.fill(-1);
    this.bucketCount.fill(0);
    if (this.bucketNext.length !== this.fish.length) this.bucketNext = new Int32Array(this.fish.length);
    for (let i = 0; i < this.fish.length; i++) {
      const f = this.fish[i];
      if (f.state === 2) continue;
      const b = this.bucketOf(f.x, f.y);
      this.bucketNext[i] = this.bucketHead[b];
      this.bucketHead[b] = i;
      this.bucketCount[b]++;
    }
  }

  bucketOf(x, y) {
    const size = this.perception;
    const c = wtClamp(Math.floor(x / size) + 2, 0, this.bucketCols - 1);
    const r = wtClamp(Math.floor(y / size) + 2, 0, this.bucketRows - 1);
    return r * this.bucketCols + c;
  }

  stepFish(dt) {
    const fish = this.fish;
    const sharks = this.whales;
    const pointer = this.pointer;
    const W = this.width;
    const H = this.height;
    const time = this.time;
    const R = this.perception;
    const R2 = R * R;
    const foreignSep = this.foreignSep;
    const size = this.perception;
    const cols = this.bucketCols;
    const rows = this.bucketRows;
    const head = this.bucketHead;
    const next = this.bucketNext;
    const cur = this.tmp;
    const calmDecay = Math.exp(-dt * 0.7);
    const contagion = Math.min(1, dt * 6);
    const speedScale = this.settings.speed;

    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      if (f.state === 2) continue;
      const sp = WT_SPECIES[f.species];
      const spread = 1 + 1.8 * f.alarm;
      const sepX = this.sepX[f.species] * spread;
      const sepY = this.sepY[f.species] * spread;
      const speed = Math.hypot(f.vx, f.vy) || 1;
      const hx = f.vx / speed;
      const hy = f.vy / speed;

      let ax = 0;
      let ay = 0;
      let sx = 0;
      let sy = 0;
      let avx = 0;
      let avy = 0;
      let cx = 0;
      let cy = 0;
      let n = 0;
      let neighbourAlarm = 0;

      const bc = wtClamp(Math.floor(f.x / size) + 2, 0, cols - 1);
      const br = wtClamp(Math.floor(f.y / size) + 2, 0, rows - 1);
      for (let r = Math.max(0, br - 1); r <= Math.min(rows - 1, br + 1); r++) {
        for (let c = Math.max(0, bc - 1); c <= Math.min(cols - 1, bc + 1); c++) {
          let j = head[r * cols + c];
          while (j !== -1) {
            if (j !== i) {
              const o = fish[j];
              if (o.state !== 2) {
                const dx = o.x - f.x;
                const dy = o.y - f.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < R2 && d2 > 1e-6) {
                  const d = Math.sqrt(d2);
                  if ((dx * hx + dy * hy) / d > WT_BLIND_COS) {
                    const qx = dx / sepX;
                    const qy = dy / sepY;
                    const q2 = qx * qx + qy * qy;
                    if (q2 < 1) {
                      const q = Math.sqrt(q2) || 1e-3;
                      const k = (1 - q) / q;
                      sx -= qx * k;
                      sy -= qy * k;
                    }
                    if (o.species === f.species) {
                      avx += o.vx;
                      avy += o.vy;
                      cx += dx;
                      cy += dy;
                      n++;
                    } else if (d < foreignSep) {
                      const k = ((1 - d / foreignSep) / d) * 0.6;
                      sx -= dx * k;
                      sy -= dy * k;
                    }
                    if (o.alarm > neighbourAlarm) neighbourAlarm = o.alarm;
                  }
                }
              }
            }
            j = next[j];
          }
        }
      }

      ax += sx * WT_FISH_SEPARATION_K;
      ay += sy * WT_FISH_SEPARATION_K;
      if (n > 0) {
        const alignK = WT_FISH_ALIGN_K * sp.align;
        const cohesionK = WT_FISH_COHESION_K * sp.cohesion * (1 - 0.8 * f.alarm);
        ax += (avx / n - f.vx) * alignK + (cx / n) * cohesionK;
        ay += (avy / n - f.vy) * alignK + (cy / n) * cohesionK;
        if (sp.mill > 0) {
          const cl = Math.hypot(cx, cy) || 1;
          ax += (-cy / cl) * f.millDir * sp.mill * (1 - f.alarm);
          ay += (cx / cl) * f.millDir * sp.mill * (1 - f.alarm);
        }
      }

      let fear = 0;
      for (const wh of sharks) {
        const fearR = wh.length * 0.55 + 46;
        let best = Infinity;
        let bx = 0;
        let by = 0;
        for (let k = 0; k <= 12; k += 2) {
          const nx = wh.nodes[k * 2];
          const ny = wh.nodes[k * 2 + 1];
          const d2 = (f.x - nx) ** 2 + (f.y - ny) ** 2;
          if (d2 < best) {
            best = d2;
            bx = nx;
            by = ny;
          }
        }
        const d = Math.sqrt(best);
        if (d >= fearR || d < 1e-3) continue;
        let w = 1 - d / fearR;
        w *= w;
        const awayX = (f.x - bx) / d;
        const awayY = (f.y - by) / d;
        const shx = Math.cos(wh.heading);
        const shy = Math.sin(wh.heading);
        const side = shx * (f.y - wh.nodes[1]) - shy * (f.x - wh.nodes[0]) >= 0 ? 1 : -1;
        ax += (awayX * 0.7 - shy * side * 0.9) * WT_FISH_FLEE_K * w;
        ay += (awayY * 0.7 + shx * side * 0.9) * WT_FISH_FLEE_K * w;
        fear = Math.max(fear, Math.sqrt(w));
      }

      if (pointer.active) {
        const pr = 120;
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < pr && d > 1e-3) {
          const w = (1 - d / pr) ** 2;
          ax += (dx / d) * WT_FISH_FLEE_K * w * 0.6;
          ay += (dy / d) * WT_FISH_FLEE_K * w * 0.6;
          fear = Math.max(fear, Math.sqrt(w) * 0.7);
        }
      }

      let alarm = Math.max(f.alarm * calmDecay, fear);
      const relayed = neighbourAlarm * 0.86;
      if (relayed > alarm) alarm += (relayed - alarm) * contagion;
      f.alarm = alarm;

      if (f.state === 1) {
        ax += Math.cos(f.exitDir) * 230;
        ay += Math.sin(f.exitDir) * 230;
        if (f.x < -30 || f.x > W + 30 || f.y < -30 || f.y > H + 30) {
          f.state = 2;
          f.x = -400;
          f.y = -400;
        }
      } else if (f.state === 3) {
        const tx = W * 0.5 - f.x;
        const ty = H * 0.5 - f.y;
        const d = Math.hypot(tx, ty) || 1;
        ax += (tx / d) * 26;
        ay += (ty / d) * 26;
        if (f.x > W * 0.12 && f.x < W * 0.88 && f.y > H * 0.14 && f.y < H * 0.86) f.state = 0;
      }

      const m = 36;
      if (f.x < m) ax += (m - f.x) * 7;
      else if (f.x > W - m) ax -= (f.x - (W - m)) * 7;
      if (f.y < m) ay += (m - f.y) * 7;
      else if (f.y > H - m) ay -= (f.y - (H - m)) * 7;

      wtCurrent(f.x, f.y, time, cur);
      ax += cur.x * 0.5 * speedScale + (Math.random() - 0.5) * sp.jitter * speedScale;
      ay += cur.y * 0.5 * speedScale + (Math.random() - 0.5) * sp.jitter * speedScale;
      ay -= f.vy * sp.verticalDrag * (1 - 0.7 * f.alarm);

      const preferred = sp.cruise * (1 + 1.3 * f.alarm) * speedScale;
      ax += (preferred - speed) * hx * 1.6;
      ay += (preferred - speed) * hy * 1.6;

      const before = Math.atan2(f.vy, f.vx);
      f.vx += ax * dt;
      f.vy += ay * dt;
      const maxSpeed = sp.maxSpeed * (1 + 1.8 * f.alarm) * speedScale;
      const minSpeed = sp.minSpeed * speedScale;
      const s = Math.hypot(f.vx, f.vy);
      if (s > maxSpeed) {
        f.vx *= maxSpeed / s;
        f.vy *= maxSpeed / s;
      } else if (s < minSpeed && s > 1e-3) {
        f.vx *= minSpeed / s;
        f.vy *= minSpeed / s;
      }
      f.turn += (wtAngleDiff(before, Math.atan2(f.vy, f.vx)) / dt - f.turn) * Math.min(1, dt * 8);
      f.phase += dt * (7 + Math.hypot(f.vx, f.vy) * 0.12);
      f.x = wtClamp(f.x + f.vx * dt, -80, W + 80);
      f.y = wtClamp(f.y + f.vy * dt, -80, H + 80);
    }
  }

  stepWhales(dt) {
    const W = this.width;
    const H = this.height;
    const time = this.time;
    const speedScale = this.settings.speed;
    for (const wh of this.whales) {
      const L = wh.length;
      const nodes = wh.nodes;
      const hx = nodes[0];
      const hy = nodes[1];
      // A long horizontal patrol with a shallow vertical breathe. Steering
      // toward a moving point keeps the body broadside to the viewer instead
      // of diving into the bottom edge, which makes the silhouette legible.
      const phase = time * 0.19 * wh.orbitDir + wh.id * 2.1;
      const tx = wh.cx + Math.sin(phase) * wh.patrolX;
      const ty = wh.cy + Math.sin(phase * 0.5 + 1.2) * wh.patrolY;
      const desired = Math.atan2(ty - hy, tx - hx);
      const turnStep = wtClamp(wtAngleDiff(wh.heading, desired), -0.065, 0.065);
      wh.heading += turnStep;
      wh.turn += (turnStep / dt - wh.turn) * Math.min(1, dt * 3);

      const cruise = (24 + L * 0.04) * speedScale;
      wh.speed += (cruise - wh.speed) * Math.min(1, dt * 0.8);
      wh.phase += dt * (1.6 + wh.speed / 34) * (0.7 + 0.3 * speedScale);
      nodes[0] += Math.cos(wh.heading) * wh.speed * dt;
      nodes[1] += Math.sin(wh.heading) * wh.speed * dt;

      const seg = L / (WT_SPINE - 1);
      const maxBend = 0.1;
      let prevAngle = wh.heading + Math.PI;
      for (let k = 1; k < WT_SPINE; k++) {
        const px = nodes[(k - 1) * 2];
        const py = nodes[(k - 1) * 2 + 1];
        let angle = Math.atan2(nodes[k * 2 + 1] - py, nodes[k * 2] - px);
        angle = prevAngle + wtClamp(wtAngleDiff(prevAngle, angle), -maxBend, maxBend);
        nodes[k * 2] = px + Math.cos(angle) * seg;
        nodes[k * 2 + 1] = py + Math.sin(angle) * seg;
        prevAngle = angle;
      }
    }
    void W;
    void H;
  }

}

/* ── renderer ─────────────────────────────────────────────────────────── */

class WTRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.bg = document.createElement("canvas");
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.cw = 12;
    this.ch = 18;
    this.cols = 0;
    this.rows = 0;
    this.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    this.theme = "light";
    this.accent = "#4d6bfe";
    this.pal = wtPalette(this.theme, this.accent);
    this.atlas = new WTGlyphAtlas(this.fontFamily);
    this.ramp = new WTInkRamp(this.fontFamily);
    this.rampBuilt = false;
    this.flag = new Uint8Array(0);
    this.shade = new Float32Array(0);
    this.glyph = [];
    this.color = [];
    this.fill = [];
    this.touched = [];
    this.prev = [];
    this.touchedStamp = new Uint32Array(0);
    this.dirtyStamp = new Uint32Array(0);
    this.dirty = [];
    this.frame = 0;
    this.full = true;
    this.energy = new Float32Array(0);
    this.energyNext = new Float32Array(0);
    this.fishStamp = new Uint32Array(0);
    this.fishFrame = 0;
    this.fishBuckets = [[], [], [], [], [], []];
    this.spine = new Float32Array(WT_SPINE * 2);
    this.arc = new Float32Array(WT_SPINE);
    this.arcTotal = 1;
    this.whaleId = 0;
    this.finLeft = 0;
    this.finRight = 0;
    this.hitFlag = 0;
    this.hitShade = 0;
    this.hitS = 0;
    this.hitV = 0;
    this.hitDist = 0;
  }

  setFontFamily(family) {
    if (family && family !== this.fontFamily) {
      this.fontFamily = family;
      this.atlas = new WTGlyphAtlas(family);
      this.ramp = new WTInkRamp(family);
      this.rampBuilt = false;
    }
  }

  setPalette(theme, accent) {
    this.theme = theme === "dark" ? "dark" : "light";
    this.accent = accent || this.accent;
    this.pal = wtPalette(this.theme, this.accent);
    if (this.width > 0) {
      this.paintBackground();
      this.full = true;
    }
  }

  setCell(px) {
    this.atlas.setCell(px, this.fontFamily);
  }

  resize(width, height, dpr) {
    if (width < 1 || height < 1) return false;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.cw = wtClamp(Math.round(width / 180), 6, 9);
    this.ch = Math.round(this.cw * 1.45);
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    const n = this.cols * this.rows;
    this.flag = new Uint8Array(n);
    this.shade = new Float32Array(n);
    this.glyph = new Array(n);
    this.color = new Array(n);
    this.fill = new Array(n);
    this.touchedStamp = new Uint32Array(n);
    this.dirtyStamp = new Uint32Array(n);
    this.energy = new Float32Array(n);
    this.energyNext = new Float32Array(n);
    this.fishStamp = new Uint32Array(n);
    this.touched = [];
    this.prev = [];
    this.dirty = [];
    this.frame = 0;
    this.full = true;
    this.setCell(Math.round(this.cw * dpr));
    this.paintBackground();
    return true;
  }

  buildRamp() {
    if (this.rampBuilt) return;
    this.ramp = new WTInkRamp(this.fontFamily);
    this.ramp.build(WT_GLYPHS.skin);
    this.rampBuilt = true;
  }

  paintBackground() {
    const g = this.bg.getContext("2d");
    if (!g) return;
    const W = this.width;
    const H = this.height;
    const dpr = this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.bg.width, this.bg.height);
    g.fillStyle = wtRgb(this.pal.base);
    g.fillRect(0, 0, this.bg.width, this.bg.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dotSize = this.dpr >= 2 ? 1.4 : 1;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        g.fillStyle = (c + r) % 3 === 0 ? this.pal.dot : this.pal.dotAlt;
        g.fillRect(c * this.cw + this.cw * 0.72, r * this.ch + this.ch * 0.7, dotSize, dotSize);
      }
    }
    const minSide = Math.min(W, H);
    const grad = g.createRadialGradient(W * 0.52, H * 0.42, minSide * 0.18, W * 0.52, H * 0.42, Math.max(W, H) * 0.78);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, this.theme === "dark" ? "rgba(0,0,0,0.30)" : "rgba(35,52,92,0.055)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }

  markTouched(i) {
    const stamp = this.touchedStamp;
    if (stamp[i] === this.frame + 1) return;
    stamp[i] = this.frame + 1;
    this.touched.push(i);
  }

  markDirty(i) {
    const stamp = this.dirtyStamp;
    if (stamp[i] === this.frame + 1) return;
    stamp[i] = this.frame + 1;
    this.dirty.push(i);
  }

  cellIndex(x, y) {
    const c = Math.floor(x / this.cw);
    const r = Math.floor(y / this.ch);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  stamp(field, x, y, radius, amount) {
    const c0 = Math.floor(x / this.cw);
    const r0 = Math.floor(y / this.ch);
    for (let r = r0 - radius; r <= r0 + radius; r++) {
      for (let c = c0 - radius; c <= c0 + radius; c++) {
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
        const d = Math.hypot(c - c0, (r - r0) * 1.4);
        if (d > radius + 0.5) continue;
        const i = r * this.cols + c;
        field[i] = Math.min(1.6, field[i] + amount * (1 - d / (radius + 1)));
      }
    }
  }

  put(i, flag, shade, glyph, color, fill) {
    if (this.flag[i] !== 0) return;
    this.flag[i] = flag;
    this.shade[i] = shade;
    this.glyph[i] = glyph;
    this.color[i] = color;
    this.fill[i] = fill || null;
    this.markTouched(i);
  }

  sampleWhale(px, py, L) {
    const spine = this.spine;
    const arc = this.arc;
    const N = WT_SPINE;
    let best = Infinity;
    let bestS = 0;
    let bestSign = 1;
    let bestNx = 0;
    let bestNy = 0;
    for (let k = 0; k < N - 1; k++) {
      const ax = spine[k * 2];
      const ay = spine[k * 2 + 1];
      const sx = spine[(k + 1) * 2] - ax;
      const sy = spine[(k + 1) * 2 + 1] - ay;
      const len2 = sx * sx + sy * sy || 1;
      const u = wtClamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const qx = ax + sx * u;
      const qy = ay + sy * u;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        best = d2;
        const len = Math.sqrt(len2);
        bestS = (arc[k] + u * len) / this.arcTotal;
        bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        bestNx = (-sy / len) * bestSign;
        bestNy = (sx / len) * bestSign;
      }
    }
    const a = Math.sqrt(best);
    const s = bestS;
    const w = WT_WHALE.halfWidth(s) * L;
    this.hitDist = a;
    this.hitS = s;
    this.hitV = a * bestSign;

    if (a <= w && s <= 0.945) {
      const across = a / (w || 1);
      const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
      let shade = 0.58 - across * across * 0.42 + facing * 0.26;
      if (across < 0.18 && s > 0.12 && s < 0.72) shade = Math.min(1, shade + 0.2);
      let flag = WT_FLAG.BODY;
      if (s > WT_WHALE.dorsal[0] && s < WT_WHALE.dorsal[1] && across < 0.48) {
        flag = WT_FLAG.RIDGE;
        shade = 1;
      } else if (s > WT_WHALE.eye[0] && s < WT_WHALE.eye[1] && across > 0.46) {
        flag = WT_FLAG.EYE;
        shade = 0;
      } else if (s < 0.055) {
        shade = Math.max(shade, 0.86);
      } else if (s > 0.12 && s < 0.32 && across > 0.58 &&
        Math.floor(((s - 0.12) / 0.026)) % 2 === 0) {
        shade *= 0.55;
      } else if (this.whaleMarked(s, a * bestSign, L, across)) {
        flag = WT_FLAG.MARK;
      }
      this.hitFlag = flag;
      this.hitShade = shade;
      return true;
    }

    const tip = bestSign > 0 ? this.finRight : this.finLeft;
    if (wtHumpbackFlipper(s, a, tip)) {
      this.hitFlag = WT_FLAG.FIN;
      this.hitShade = 0.34 + 0.24 * (1 - wtClamp(a / (tip || 1), 0, 1));
      return true;
    }
    if (wtWhaleFlukes(s, a / L)) {
      this.hitFlag = WT_FLAG.FLUKE;
      this.hitShade = 0.46 + 0.18 * (1 - wtClamp(a / (L * 0.22), 0, 1));
      return true;
    }
    return false;
  }

  whaleMarked(s, v, L, across) {
    if (s > 0.34 || across < 0.18) return false;
    const gu = Math.round((s * L) / (this.cw * 1.4));
    const gv = Math.round(v / (this.cw * 0.9));
    const r = wtHash(gu, gv, this.whaleId + 7);
    if (s < 0.2 && r < 0.07) return true;
    if (r < 0.018) return true;
    return false;
  }

  rasterizeWhales(whales, t) {
    const cw = this.cw;
    const ch = this.ch;
    const cols = this.cols;
    const rows = this.rows;
    const spine = this.spine;
    const arc = this.arc;
    const samples = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];
    for (const wh of whales) {
      const L = wh.length;
      const N = WT_SPINE;
      const n = wh.nodes;
      const swim = wtClamp(wh.speed / 52, 0.4, 1.4);
      this.whaleId = wh.id;
      const turnBank = wtClamp(wh.turn * 0.45, -0.35, 0.35);
      const flex = 1 + 0.06 * Math.sin(wh.phase * 0.5);
      const reach = L * (WT_WHALE.pectoral[3] + 0.03) * flex;
      this.finRight = reach * (1 - turnBank);
      this.finLeft = reach * (1 + turnBank);

      for (let k = 0; k < N; k++) {
        const s = k / (N - 1);
        const a = Math.max(0, k - 1);
        const b = Math.min(N - 1, k + 1);
        let tx = n[a * 2] - n[b * 2];
        let ty = n[a * 2 + 1] - n[b * 2 + 1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const amp = L * 0.045 * (0.1 + 0.9 * Math.pow(s, 1.8)) * swim;
        const off = amp * Math.sin(wh.phase - s * 5.2);
        spine[k * 2] = n[k * 2] - ty * off;
        spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
      }
      arc[0] = 0;
      for (let k = 1; k < N; k++) {
        arc[k] = arc[k - 1] + Math.hypot(spine[k * 2] - spine[(k - 1) * 2], spine[k * 2 + 1] - spine[(k - 1) * 2 + 1]);
      }
      this.arcTotal = arc[N - 1] || 1;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let k = 0; k < N; k++) {
        minX = Math.min(minX, spine[k * 2]);
        maxX = Math.max(maxX, spine[k * 2]);
        minY = Math.min(minY, spine[k * 2 + 1]);
        maxY = Math.max(maxY, spine[k * 2 + 1]);
      }
      const margin = L * 0.38 + cw;
      const c0 = Math.max(0, Math.floor((minX - margin) / cw));
      const c1 = Math.min(cols - 1, Math.floor((maxX + margin) / cw));
      const r0 = Math.max(0, Math.floor((minY - margin) / ch));
      const r1 = Math.min(rows - 1, Math.floor((maxY + margin) / ch));
      if (c0 > c1 || r0 > r1) continue;
      const skip = margin + Math.hypot(cw, ch);

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * cw;
          const y = r * ch;
          const centerHit = this.sampleWhale(x + cw / 2, y + ch / 2, L);
          if (!centerHit && this.hitDist > skip) continue;
          const flag = this.hitFlag;
          const shade = this.hitShade;
          const s = this.hitS;
          const v = this.hitV;
          let hits = centerHit ? 1 : 0;
          for (let k = 0; k < samples.length; k += 2) {
            if (this.sampleWhale(x + samples[k] * cw, y + samples[k + 1] * ch, L)) hits++;
          }
          if (hits === 0) continue;
          const coverage = hits / 5;
          const i = r * cols + c;
          const key = Math.floor(wtHash(Math.round((s * L) / cw), Math.round(v / cw), wh.id) * 1e9);
          const dim = 0.72 + 0.28 * wh.depth;

          if (!centerHit || coverage < 0.6) {
            const set = coverage >= 0.5 ? WT_GLYPHS.edgeHeavy : WT_GLYPHS.edgeLight;
            const ci = wtClamp(Math.floor(coverage * 5), 0, 5);
            this.put(i, WT_FLAG.EDGE, coverage, set[(key >>> 7) % set.length], this.pal.edgeGlyph, this.pal.edgeFill[ci]);
            continue;
          }

          if (flag === WT_FLAG.RIDGE) {
            this.put(i, flag, shade, WT_GLYPHS.ridge[(key >>> 8) % WT_GLYPHS.ridge.length], this.pal.ridgeGlyph, this.pal.ridge);
          } else if (flag === WT_FLAG.EYE) {
            this.put(i, flag, shade, WT_GLYPHS.eye[(key >>> 6) % WT_GLYPHS.eye.length], this.pal.eyeGlyph, this.pal.eye);
          } else if (flag === WT_FLAG.MARK) {
            this.put(i, flag, shade, WT_GLYPHS.mark[(key >>> 9) % WT_GLYPHS.mark.length], this.pal.glyph, this.pal.mark);
          } else if (flag === WT_FLAG.FIN) {
            const ci = wtClamp(Math.floor((0.25 + shade * 0.4) * 8), 0, 11);
            this.put(i, flag, shade, WT_GLYPHS.fin[(key >>> 5) % WT_GLYPHS.fin.length], this.pal.glyph, this.pal.whaleFill[ci]);
          } else if (flag === WT_FLAG.FLUKE) {
            const ci = wtClamp(Math.floor((0.3 + shade * 0.42) * 8), 0, 11);
            this.put(i, flag, shade, WT_GLYPHS.fluke[(key >>> 5) % WT_GLYPHS.fluke.length], this.pal.glyph, this.pal.whaleFill[ci]);
          } else {
            const jitter = ((key >>> 4) % 3) - 1;
            const tone = wtClamp(1 - shade * 0.92 + jitter * 0.025, 0.08, 1);
            const glyph = this.ramp.pick(tone) || "-";
            const ci = wtClamp(Math.floor(shade * 11), 0, 11);
            this.put(i, WT_FLAG.BODY, shade, glyph, this.pal.glyph, this.pal.whaleFill[ci]);
          }
        }
      }
    }
    void t;
  }

  depositWake(world, dt) {
    const energy = this.energy;
    for (const f of world.fish) {
      if (f.state === 2) continue;
      const i = this.cellIndex(f.x, f.y);
      if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.0035 + f.alarm * 0.014);
    }
    for (const wh of world.whales) {
      for (let k = WT_SPINE - 5; k < WT_SPINE; k++) {
        const i = this.cellIndex(wh.nodes[k * 2], wh.nodes[k * 2 + 1]);
        if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.035 + (wh.speed / this.cw) * 0.003);
      }
    }
    if (world.pointer.active) {
      const i = this.cellIndex(world.pointer.x, world.pointer.y);
      if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.018);
    }
    const next = this.energyNext;
    const cols = this.cols;
    const rows = this.rows;
    const decay = Math.exp(-dt * 1.75);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const e = energy[i];
        const l = c > 0 ? energy[i - 1] : e;
        const rt = c < cols - 1 ? energy[i + 1] : e;
        const u = r > 0 ? energy[i - cols] : e;
        const d = r < rows - 1 ? energy[i + cols] : e;
        next[i] = (e * 4 + l + rt + u + d) * 0.125 * decay;
      }
    }
    this.energy = next;
    this.energyNext = energy;
  }

  placeWake(world) {
    const energy = this.energy;
    const n = this.cols * this.rows;
    const wake = this.pal.wake;
    for (let i = 0; i < n; i++) {
      if (this.flag[i] !== 0) continue;
      const e = energy[i];
      if (e < 0.5) continue;
      const level = wtClamp(Math.floor((e - 0.5) * 7), 0, 4);
      const glyph = WT_GLYPHS.wake[wtClamp(Math.floor(e * 3), 0, 3)];
      this.put(i, WT_FLAG.WAKE, e, glyph, wake[level]);
    }
    void world;
  }

  markFish(world) {
    const fish = world.fish;
    const frame = ++this.fishFrame;
    for (const bucket of this.fishBuckets) bucket.length = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (const f of fish) {
        if (f.state === 2) continue;
        if ((f.depth > 0.78 ? 0 : 1) !== pass) continue;
        const i = this.cellIndex(f.x, f.y);
        if (i < 0 || this.fishStamp[i] === frame || this.flag[i] !== 0) continue;
        this.fishStamp[i] = frame;
        const glint = wtClamp(Math.abs(f.turn) / 3.5, 0, 1);
        const v = 0.3 + (0.4 * (f.depth - 0.55)) / 0.45 + 0.3 * Math.max(glint, f.alarm);
        const bucket = wtClamp(Math.floor(v * 6), 0, 5);
        let glyph;
        if (Math.abs(f.turn) > 2.2 || f.alarm > 0.55) glyph = f.vx >= 0 ? ">" : "<";
        else if (Math.abs(f.vy) > Math.abs(f.vx) * 0.7) glyph = f.vy > 0 ? "," : "'";
        else glyph = f.state === 1 ? (f.vx >= 0 ? "-" : "-") : "-";
        this.fishBuckets[bucket].push(i, glyph);
      }
    }
    for (let b = 0; b < this.fishBuckets.length; b++) {
      const bucket = this.fishBuckets[b];
      for (let k = 0; k < bucket.length; k += 2) {
        this.put(bucket[k], WT_FLAG.BODY, 0.5, bucket[k + 1], this.pal.fish[b]);
      }
    }
  }

  drawCell(i) {
    const ctx = this.ctx;
    const c = i % this.cols;
    const r = (i / this.cols) | 0;
    const x = c * this.cw;
    const y = r * this.ch;
    const dpr = this.dpr;
    ctx.drawImage(
      this.bg,
      Math.round(x * dpr), Math.round(y * dpr), Math.round(this.cw * dpr), Math.round(this.ch * dpr),
      x, y, this.cw, this.ch
    );
    const fill = this.fill[i];
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, this.cw, this.ch);
    }
    const glyph = this.glyph[i];
    if (glyph) {
      const tile = this.atlas.get(glyph, this.color[i] || this.pal.ink);
      ctx.drawImage(tile, x, y, this.cw, this.ch);
    }
  }

  render(world, dt) {
    if (this.cols === 0) return;
    this.frame++;
    this.touched = [];
    this.dirty = [];
    for (const i of this.prev) {
      this.markDirty(i);
      this.flag[i] = 0;
      this.glyph[i] = null;
      this.color[i] = null;
      this.fill[i] = null;
    }
    const ctx = this.ctx;
    const dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.full) {
      ctx.drawImage(this.bg, 0, 0);
      this.full = false;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.rasterizeWhales(world.whales, world.time);
    this.depositWake(world, dt);
    this.placeWake(world);
    this.markFish(world);

    for (const i of this.touched) this.markDirty(i);
    for (const i of this.dirty) this.drawCell(i);
    this.prev = this.touched;
  }

  renderStill(world) {
    this.render(world, WT_STEP);
  }
}

/* ── engine ───────────────────────────────────────────────────────────── */

function wtDefaultSettings() {
  return {
    enabled: true,
    density: 0.65,
    speed: 1,
    opacity: 1,
    conversationOpacity: 0.16,
    conversationDensity: 0.3,
    color: "#4d6bfe",
    followTheme: true,
  };
}

function wtMergeSettings(base, patch) {
  const out = { ...wtDefaultSettings(), ...(base || {}) };
  if (!patch || typeof patch !== "object") return out;
  for (const key of Object.keys(wtDefaultSettings())) {
    if (patch[key] !== undefined) out[key] = patch[key];
  }
  out.density = wtClamp(Number(out.density) || 0, 0, 1);
  out.speed = wtClamp(Number(out.speed) || 0.1, 0.1, 3);
  out.opacity = wtClamp(Number(out.opacity) || 0, 0, 1);
  out.conversationOpacity = wtClamp(Number(out.conversationOpacity) || 0, 0, 0.5);
  out.conversationDensity = wtClamp(Number(out.conversationDensity) || 0, 0, 1);
  out.enabled = out.enabled !== false;
  out.followTheme = out.followTheme !== false;
  if (!/^#[0-9a-f]{6}$/i.test(String(out.color))) out.color = "#4d6bfe";
  return out;
}

class WTEngine {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.options = options || {};
    this.settings = wtMergeSettings(wtDefaultSettings(), this.options.settings);
    this.theme = this.options.theme === "dark" ? "dark" : "light";
    this.active = this.options.phase === "active";
    this.reducedMotion = this.options.reducedMotion !== undefined
      ? !!this.options.reducedMotion
      : typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.onStats = typeof this.options.onStats === "function" ? this.options.onStats : null;
    this.pointerEnabled = this.options.pointer !== false;
    this.world = new WTWorld(this.settings, this.active);
    this.renderer = new WTRenderer(canvas);
    this.raf = 0;
    this.last = 0;
    this.acc = 0;
    this.visible = !document.hidden;
    this.destroyed = false;
    this.frames = 0;
    this.fpsAt = 0;
    this.fps = 0;
    this.started = false;
    this.ready = this.bootstrap();
  }

  async bootstrap() {
    const family = (typeof getComputedStyle === "function" && getComputedStyle(this.canvas).fontFamily) ||
      this.renderer.fontFamily;
    this.renderer.setFontFamily(family);
    try {
      if (document.fonts && document.fonts.load) await document.fonts.load(`600 16px ${family}`);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch (error) {
      /* A missing font is not fatal: the atlas and ramp use the fallback. */
    }
    if (this.destroyed) return;
    this.renderer.buildRamp();
    this.renderer.setPalette(this.theme, this.settings.color);
    this.resize();
    this.attach();
    this.start();
  }

  attach() {
    this.onResize = () => {
      if (this.destroyed) return;
      this.resize();
      if (this.reducedMotion) this.drawStill();
      else this.schedule();
    };
    this.onVisibility = () => {
      if (this.destroyed) return;
      this.visible = !document.hidden;
      if (this.visible) {
        this.last = performance.now();
        this.acc = 0;
        this.schedule();
      } else {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      }
    };
    this.onMotion = () => {
      if (this.destroyed) return;
      this.reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.reducedMotion) this.drawStill();
      else {
        this.started = false;
        this.start();
      }
    };
    this.onPointerMove = (event) => {
      if (this.destroyed) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const p = this.world.pointer;
      p.x = x;
      p.y = y;
      p.active = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height && event.pointerType !== "touch";
    };
    this.onPointerLeave = () => { this.world.pointer.active = false; };

    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener("resize", this.onResize);
    }
    document.addEventListener("visibilitychange", this.onVisibility);
    if (typeof matchMedia === "function") {
      this.motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
      if (this.motionQuery.addEventListener) this.motionQuery.addEventListener("change", this.onMotion);
      else if (this.motionQuery.addListener) this.motionQuery.addListener(this.onMotion);
    }
    if (this.pointerEnabled) {
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
      window.addEventListener("blur", this.onPointerLeave);
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ok = this.renderer.resize(rect.width, rect.height, dpr);
    if (!ok) return false;
    this.world.resize(rect.width, rect.height, this.renderer.cw, this.renderer.ch);
    this.renderer.setPalette(this.theme, this.settings.color);
    this.renderer.render(this.world, WT_STEP);
    return true;
  }

  start() {
    if (this.destroyed || this.started) return;
    this.started = true;
    if (this.reducedMotion) {
      this.drawStill();
      return;
    }
    this.last = performance.now();
    this.acc = 0;
    this.schedule();
  }

  schedule() {
    if (this.destroyed || !this.visible || this.reducedMotion) return;
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  frame = (now) => {
    if (this.destroyed) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= WT_STEP && steps < WT_MAX_STEPS) {
      this.world.step(WT_STEP);
      this.acc -= WT_STEP;
      steps++;
    }
    if (steps === WT_MAX_STEPS) this.acc = 0;
    this.renderer.render(this.world, dt);
    this.frames++;
    if (now - this.fpsAt >= 500) {
      this.fps = Math.round((this.frames * 1000) / Math.max(1, now - this.fpsAt));
      this.frames = 0;
      this.fpsAt = now;
      if (this.onStats) {
        this.onStats({
          fps: this.fps,
          fish: this.world.fish.reduce((n, f) => n + (f.state !== 2 ? 1 : 0), 0),
          targetFish: this.world.targetFish,
          whales: this.world.whales.length,
          cells: this.renderer.cols * this.renderer.rows,
          active: this.active,
          reducedMotion: this.reducedMotion,
        });
      }
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  drawStill() {
    if (this.destroyed) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (!this.renderer.width) this.resize();
    const steps = this.world.time < 4 ? 240 : 90;
    for (let i = 0; i < steps; i++) this.world.step(WT_STEP);
    this.renderer.render(this.world, WT_STEP);
  }

  setTheme(theme) {
    this.theme = theme === "dark" ? "dark" : "light";
    this.renderer.setPalette(this.theme, this.settings.color);
    if (this.reducedMotion) this.drawStill();
    else this.schedule();
  }

  setSettings(patch) {
    const next = wtMergeSettings(this.settings, patch);
    const colorChanged = next.color !== this.settings.color;
    this.settings = next;
    this.world.setSettings(next);
    if (colorChanged) this.renderer.setPalette(this.theme, next.color);
    if (this.reducedMotion) this.drawStill();
    else this.schedule();
  }

  setPhase(phase) {
    const active = phase === "active";
    if (active === this.active) return;
    this.active = active;
    this.world.setTide(active);
    if (this.reducedMotion) this.drawStill();
    else this.schedule();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.resizeObserver) this.resizeObserver.disconnect();
    else window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (this.motionQuery) {
      if (this.motionQuery.removeEventListener) this.motionQuery.removeEventListener("change", this.onMotion);
      else if (this.motionQuery.removeListener) this.motionQuery.removeListener(this.onMotion);
    }
    if (this.pointerEnabled) {
      window.removeEventListener("pointermove", this.onPointerMove);
      document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
      window.removeEventListener("blur", this.onPointerLeave);
    }
    this.ready = null;
  }
}

function createOcean(canvas, options) {
  const engine = new WTEngine(canvas, options);
  return {
    ready: engine.ready,
    destroy: () => engine.destroy(),
    setTheme: (theme) => engine.setTheme(theme),
    setSettings: (patch) => engine.setSettings(patch),
    setPhase: (phase) => engine.setPhase(phase),
    resize: () => engine.resize(),
    drawStill: () => engine.drawStill(),
    get engine() { return engine; },
  };
}


    /* =====================================================================
     * Settings model + persistence
     * ===================================================================*/
    const NS = "whale-tide";
    const STORAGE_KEY = "dsh-whale-tide:v1";
    const SCHEME_KEY = "dsh-whale-tide:scheme";

    const DEFAULTS = {
      enabled: true,
      density: 0.65,
      speed: 1,
      opacity: 1,
      conversationOpacity: 0.16,
      conversationDensity: 0.3,
      color: "#4d6bfe",
      followTheme: true,
    };

    const RANGES = {
      density: [0, 1, 0.01],
      speed: [0.1, 3, 0.05],
      opacity: [0, 1, 0.01],
      conversationOpacity: [0, 0.5, 0.01],
      conversationDensity: [0, 1, 0.01],
    };

    const CONTROL_KEYS = ["density", "speed", "opacity", "conversationOpacity", "conversationDensity"];

    function clamp(value, lo, hi) {
      return value < lo ? lo : value > hi ? hi : value;
    }

    function normalizeSettings(value) {
      const out = { ...DEFAULTS };
      if (!value || typeof value !== "object" || Array.isArray(value)) return out;
      out.enabled = value.enabled !== false;
      out.followTheme = value.followTheme !== false;
      for (const key of CONTROL_KEYS) {
        const raw = value[key];
        const n = raw === null || raw === "" || typeof raw === "boolean" ? NaN : Number(raw);
        out[key] = Number.isFinite(n) ? clamp(n, RANGES[key][0], RANGES[key][1]) : DEFAULTS[key];
      }
      if (typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color)) {
        out.color = value.color.toLowerCase();
      }
      return out;
    }

    function readPinnedScheme() {
      try {
        const value = window.localStorage.getItem(SCHEME_KEY);
        return value === "dark" || value === "light" ? value : null;
      } catch (error) {
        return null;
      }
    }

    function writePinnedScheme(value) {
      try {
        window.localStorage.setItem(SCHEME_KEY, value === "dark" ? "dark" : "light");
      } catch (error) {
        /* optional */
      }
    }

    function loadSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULTS };
      } catch (error) {
        return { ...DEFAULTS };
      }
    }

    function createStore() {
      let current = loadSettings();
      let storageError = false;
      const listeners = new Set();
      const notify = () => {
        for (const listener of listeners) {
          try {
            listener(current);
          } catch (error) {
            /* A broken settings panel must not break the backdrop. */
          }
        }
      };
      const persist = () => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          storageError = false;
        } catch (error) {
          storageError = true;
        }
      };
      return {
        get: () => current,
        set(patch) {
          current = normalizeSettings({ ...current, ...(patch || {}) });
          persist();
          notify();
          return current;
        },
        reset() {
          current = { ...DEFAULTS };
          persist();
          notify();
          return current;
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        get storageError() {
          return storageError;
        },
      };
    }

    /* =====================================================================
     * Locale
     * ===================================================================*/
    const ZH = {
      title: "鲸汐",
      description: "让鲸群与鱼群在界面背后游动，进入对话时自动退潮。",
      sectionDescription: "调整鲸群与鱼群的密度、速度、透明度与配色。偏好保存在当前浏览器。",
      enabled: "显示背景",
      density: "生物密度",
      speed: "游动速度",
      opacity: "整体透明度",
      conversationOpacity: "对话中透明度",
      conversationDensity: "对话中生物比例",
      color: "主色",
      followTheme: "深/浅色跟随",
      hintEnabled: "关闭后移除背景层，界面恢复原生样式",
      hintDensity: "鱼群数量；设为 0 只保留鲸鱼",
      hintSpeed: "0.1–3 倍速",
      hintOpacity: "空会话中的背景不透明度",
      hintConversationOpacity: "进入对话后的背景不透明度（默认 0.16）",
      hintConversationDensity: "进入对话后保留的鱼群比例（默认 0.3）",
      hintColor: "鲸鱼、鱼群与尾迹的主色",
      hintFollowTheme: "开启时跟随 DSH 深浅色；关闭时固定为关闭时的深浅色",
      reset: "恢复默认",
      saved: "已保存",
      saveError: "无法写入本地存储，本次修改仅在当前页面生效",
      resetDone: "已恢复默认",
    };

    const EN = {
      title: "Whale Tide",
      description: "A whale and fish schools drift behind the interface, ebbing in conversation.",
      sectionDescription: "Tune density, speed, opacity and colour. Preferences stay in this browser.",
      enabled: "Show background",
      density: "Creature density",
      speed: "Swimming speed",
      opacity: "Opacity",
      conversationOpacity: "Opacity in conversation",
      conversationDensity: "Creature ratio in conversation",
      color: "Accent color",
      followTheme: "Follow light / dark",
      hintEnabled: "Turn off to remove the layer and restore the native interface.",
      hintDensity: "Fish population. At 0 only the whale remains.",
      hintSpeed: "0.1× to 3× the base swimming speed.",
      hintOpacity: "Layer opacity in an empty conversation.",
      hintConversationOpacity: "Layer opacity while a conversation is active (default 0.16).",
      hintConversationDensity: "Share of fish kept while a conversation is active (default 0.3).",
      hintColor: "Tints the whale, fish and wake.",
      hintFollowTheme: "On: follow the DSH theme. Off: pin the light/dark mode active when you switch it off.",
      reset: "Restore defaults",
      saved: "Saved",
      saveError: "Local storage is unavailable; changes apply only until this page closes.",
      resetDone: "Defaults restored",
    };

    function detectLanguage() {
      try {
        const language = String((navigator && navigator.language) || "en").toLowerCase();
        return language.startsWith("zh") ? "zh" : "en";
      } catch (error) {
        return "en";
      }
    }

    let translate = (key) => {
      const dict = detectLanguage() === "zh" ? ZH : EN;
      return dict[key] || EN[key] || key;
    };

    function t(key) {
      let value;
      try {
        value = translate(key);
      } catch (error) {
        value = key;
      }
      if (typeof value === "string" && value !== "" && value !== key) return value;
      const dict = detectLanguage() === "zh" ? ZH : EN;
      return dict[key] || EN[key] || key;
    }

    function installLocale(ctx) {
      try {
        if (!ctx.locale || typeof ctx.locale.register !== "function") return;
        ctx.effect(
          () => ctx.locale.register(NS, { zh: ZH, en: EN }),
          "dsh-whale-tide: locale",
        );
        if (typeof ctx.locale.bind === "function") {
          const bound = ctx.locale.bind(NS);
          if (typeof bound === "function") translate = bound;
        }
      } catch (error) {
        /* The fallback dictionary still keeps the settings panel readable. */
      }
    }

    /* =====================================================================
     * Styles
     * ===================================================================*/
    const CSS_ID = "dsh-whale-tide/client.css";
    const CSS = `
/* ── base / backdrop ─────────────────────────────────────────────────── */
body[data-dsh-whale-tide="on"]{background:#fff}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-scheme="dark"]{background:#141518}
.dsh-whale-tide-backdrop{
  position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  opacity:0;background:#fff;
  transition:opacity .6s cubic-bezier(.22,1,.36,1);
}
body[data-dsh-whale-tide-scheme="dark"] .dsh-whale-tide-backdrop{background:#141518}
.dsh-whale-tide-backdrop canvas{display:block;width:100%;height:100%}
/* The conversation surface is normally opaque. Make only that surface
   transparent while this plugin is on, and keep the sidebar as a soft glass
   column, so the fixed ocean layer is actually visible. */
body[data-dsh-whale-tide="on"]:has([data-conversation-content]){
  --dsw-alias-bg-base:transparent!important;
}
body[data-dsh-whale-tide="on"]:has([data-conversation-content]) [data-conversation-scroll],
body[data-dsh-whale-tide="on"]:has([data-conversation-content]) [data-conversation-content]{
  background-color:transparent!important;
}
body[data-dsh-whale-tide="on"]:has([data-conversation-content])[data-dsh-whale-tide-ui="light"]{
  --dsw-specific-sidebar-fill:rgba(255,255,255,.55)!important;
}
body[data-dsh-whale-tide="on"]:has([data-conversation-content])[data-dsh-whale-tide-ui="dark"]{
  --dsw-specific-sidebar-fill:rgba(20,21,24,.58)!important;
}
body[data-dsh-whale-tide="on"]:has([data-conversation-content]) div:has(> [data-slot="sidebar"]){
  -webkit-backdrop-filter:blur(10px);
  backdrop-filter:blur(10px);
}
@media (prefers-reduced-motion:reduce){.dsh-whale-tide-backdrop{transition:none}}

/* Frosted composer only at full tide (hero). The filter lives on a
   pseudo-element so fixed-position menus keep their viewport anchor. */
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="hero"] [data-composer-card]{
  isolation:isolate;background:transparent;
  --dsw-specific-input-major:transparent;
  border-color:rgba(128,128,128,.20);
  box-shadow:0 12px 36px #0000000d,inset 0 1px 0 #ffffff80;
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="hero"] [data-composer-card]::before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;
  background:rgba(255,255,255,.55);
  -webkit-backdrop-filter:blur(14px) saturate(1.12);
  backdrop-filter:blur(14px) saturate(1.12);
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="hero"] [data-composer-card]{
  border-color:#ffffff30;
  box-shadow:0 12px 36px #0003,inset 0 1px 0 #ffffff12;
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="hero"] [data-composer-card]::before{
  background:rgba(24,25,30,.58);
}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="hero"] [data-composer-card]::before{background:rgba(255,255,255,.92)}
  body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="hero"] [data-composer-card]::before{background:rgba(24,25,30,.94)}
}

/* A soft halo on conversation text while the tide is out. The backdrop is
   already at 16% here; this keeps long-form text crisp on top of it without
   replacing any native message background. */
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="active"] [data-conversation-content][data-conversation-region="chat"],
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="active"] [data-conversation-content] [data-conversation-region="chat"]{
  text-shadow:0 0 1px rgba(255,255,255,.92),0 0 10px rgba(255,255,255,.78),0 0 26px rgba(255,255,255,.38);
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="active"] [data-conversation-content][data-conversation-region="chat"],
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="active"] [data-conversation-content] [data-conversation-region="chat"]{
  text-shadow:0 0 1px rgba(20,21,24,.92),0 0 10px rgba(20,21,24,.8),0 0 26px rgba(20,21,24,.45);
}

/* ── settings section ───────────────────────────────────────────────── */
.dshwt-settings{display:grid;gap:20px;max-width:680px;width:100%;color:var(--dsw-alias-label-primary,inherit);font-size:14px;line-height:1.6}
.dshwt-head h2{margin:0 0 6px;font-size:20px;line-height:1.3;font-weight:650}
.dshwt-head p{margin:0;color:var(--dsw-alias-label-secondary,#5b6472);font-size:13.5px}
.dshwt-card{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.18));border-radius:14px;background:var(--dsw-alias-bg-layer-1,transparent);padding:2px 18px}
.dshwt-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 0;border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.14))}
.dshwt-row:first-child{border-top:0}
.dshwt-label{display:flex;flex-direction:column;gap:3px;min-width:0}
.dshwt-name{font-weight:500}
.dshwt-hint{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-control{flex:none;display:flex;align-items:center;justify-content:flex-end;min-width:0}
.dshwt-switch{position:relative;width:40px;height:23px;border-radius:999px;border:0;background:var(--dsw-alias-border-l2,rgba(128,128,128,.3));cursor:pointer;flex:none;padding:0;transition:background .18s ease}
.dshwt-switch::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .18s ease}
.dshwt-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary,#4d6bfe)}
.dshwt-switch[aria-checked="true"]::after{transform:translateX(17px)}
.dshwt-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:2px}
.dshwt-range{display:flex;align-items:center;gap:10px}
.dshwt-range input[type="range"]{width:168px;max-width:44vw;accent-color:var(--dsw-alias-brand-primary,#4d6bfe);height:20px;cursor:pointer}
.dshwt-value{min-width:42px;text-align:right;font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-color{display:flex;align-items:center;gap:9px}
.dshwt-color input[type="color"]{width:32px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));border-radius:7px;background:transparent;cursor:pointer}
.dshwt-color code{font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dshwt-button{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary,inherit);border-radius:9px;padding:8px 14px;cursor:pointer;font:inherit;font-size:13px}
.dshwt-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08))}
.dshwt-button.primary{background:var(--dsw-alias-brand-primary,#4d6bfe);border-color:var(--dsw-alias-brand-primary,#4d6bfe);color:#fff}
.dshwt-status{font-size:12px;color:var(--dsw-alias-label-tertiary,#7c8593);min-height:1.4em}
.dshwt-status[data-error]{color:var(--dsw-alias-state-error-primary,#d33)}
@media (max-width:620px){
  .dshwt-row{align-items:flex-start}
  .dshwt-range input[type="range"]{width:120px}
}
`;

    function installStyles(ctx) {
      if (document.querySelector('style[data-plugin-css="' + CSS_ID + '"]')) return;
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-whale-tide";
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
      if (ctx && typeof ctx.effect === "function") {
        ctx.effect(() => () => tag.remove(), "dsh-whale-tide: styles");
      }
    }

    /* =====================================================================
     * Theme + phase helpers
     * ===================================================================*/
    function prefersReducedMotion() {
      try {
        return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (error) {
        return false;
      }
    }

    function parseRgb(color) {
      const match = /rgba?\(([^)]+)\)/i.exec(String(color || ""));
      if (!match) return null;
      const parts = match[1].split(",").map((value) => parseFloat(value));
      if (parts.length < 3 || parts.some((value) => !Number.isFinite(value))) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    }

    function bodyLooksDark() {
      try {
        const rgb = parseRgb(getComputedStyle(document.body).backgroundColor);
        if (!rgb || rgb.a < 0.4) return null;
        const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        return luminance < 0.45 ? "dark" : "light";
      } catch (error) {
        return null;
      }
    }

    function findChatNode() {
      try {
        // DSH versions differ: some nest the chat region inside a
        // data-conversation-content element, some put both attributes on the
        // same node. Accept both, preferring the same-node form.
        const selectors = [
          '[data-conversation-content][data-conversation-region="chat"]',
          '[data-conversation-content] [data-conversation-region="chat"]',
          '[data-conversation-content]',
        ];
        let fallback = null;
        for (const selector of selectors) {
          for (const node of document.querySelectorAll(selector)) {
            if (!fallback) fallback = node;
            const rect = node.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return node;
          }
        }
        return fallback;
      } catch (error) {
        return null;
      }
    }

    function readPhaseFromDom() {
      const chat = findChatNode();
      const phase = chat && chat.getAttribute("data-content-phase");
      return phase === "active" ? "active" : "hero";
    }

    /* =====================================================================
     * Backdrop lifecycle
     * ===================================================================*/
    function mountBackdrop(ctx, store) {
      const layer = document.createElement("div");
      layer.className = "dsh-whale-tide-backdrop";
      layer.setAttribute("aria-hidden", "true");
      const canvas = document.createElement("canvas");
      layer.appendChild(canvas);
      document.body.prepend(layer);

      let disposed = false;
      let ocean = null;
      let ready = false;
      let phase = readPhaseFromDom();
      let scheme = "light";
      let uiScheme = "light";
      let raf = 0;
      let interval = 0;
      let phaseObserver = null;
      let themeObserver = null;
      let offTheme = null;
      let motionQuery = null;
      let unsubscribe = null;
      let lastSettings = store.get();

      const themeService = (() => {
        try {
          return ctx && typeof ctx.get === "function" ? ctx.get("theme") : null;
        } catch (error) {
          return null;
        }
      })();

      function readDshScheme() {
        try {
          const snapshot = themeService && typeof themeService.getTheme === "function" ? themeService.getTheme() : null;
          const active = snapshot && snapshot.active;
          if (active && (active.colorScheme === "dark" || active.colorScheme === "light")) {
            return active.colorScheme;
          }
        } catch (error) {
          /* fall through */
        }
        try {
          const root = document.documentElement;
          const attr = String(root.getAttribute("data-theme") || root.getAttribute("data-color-scheme") || "");
          if (/dark/i.test(attr)) return "dark";
          if (/light/i.test(attr)) return "light";
          if (root.classList.contains("dark")) return "dark";
          const computed = getComputedStyle(root).colorScheme || "";
          if (computed.includes("dark") && !computed.includes("light")) return "dark";
          if (computed.includes("light") && !computed.includes("dark")) return "light";
        } catch (error) {
          /* fall through */
        }
        const body = bodyLooksDark();
        if (body) return body;
        try {
          return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        } catch (error) {
          return "light";
        }
      }

      function effectiveScheme() {
        const ui = readDshScheme();
        if (store.get().followTheme) return ui;
        return readPinnedScheme() || ui;
      }

      function applyOpacity() {
        const settings = store.get();
        if (!settings.enabled || disposed) {
          layer.style.opacity = "0";
          return;
        }
        const base = phase === "active" ? settings.conversationOpacity : 1;
        layer.style.opacity = String(Math.max(0, Math.min(1, base * settings.opacity)));
      }

      function applyScheme() {
        const nextUi = readDshScheme();
        const nextOcean = effectiveScheme();
        const changed = nextOcean !== scheme;
        scheme = nextOcean;
        uiScheme = nextUi;
        const settings = store.get();
        if (settings.enabled && !disposed) {
          document.body.dataset.dshWhaleTideScheme = scheme;
          document.body.dataset.dshWhaleTideUi = uiScheme;
        } else {
          delete document.body.dataset.dshWhaleTideScheme;
          delete document.body.dataset.dshWhaleTideUi;
        }
        if (ocean && changed) ocean.setTheme(scheme);
      }

      function applyPhase() {
        if (disposed) return;
        const next = readPhaseFromDom();
        if (next !== phase) {
          phase = next;
          if (ocean) ocean.setPhase(phase);
        }
        const settings = store.get();
        if (settings.enabled) document.body.dataset.dshWhaleTidePhase = phase;
        else delete document.body.dataset.dshWhaleTidePhase;
        applyOpacity();
      }

      function ensureOcean() {
        if (disposed || ocean || !store.get().enabled) return;
        ocean = createOcean(canvas, {
          settings: store.get(),
          theme: effectiveScheme(),
          phase,
          reducedMotion: prefersReducedMotion(),
          pointer: true,
        });
        const own = ocean;
        own.ready.then(() => {
          if (disposed || ocean !== own) return;
          ready = true;
          layer.dataset.ready = "";
          applyOpacity();
        });
      }

      function destroyOcean() {
        ready = false;
        layer.removeAttribute("data-ready");
        if (ocean) {
          try {
            ocean.destroy();
          } catch (error) {
            /* already gone */
          }
          ocean = null;
        }
      }

      function syncEnabled() {
        const settings = store.get();
        if (disposed) return;
        if (settings.enabled) {
          document.body.dataset.dshWhaleTide = "on";
          layer.style.display = "block";
          applyScheme();
          applyPhase();
          ensureOcean();
        } else {
          destroyOcean();
          layer.style.display = "none";
          delete document.body.dataset.dshWhaleTide;
          delete document.body.dataset.dshWhaleTideScheme;
          delete document.body.dataset.dshWhaleTideUi;
          delete document.body.dataset.dshWhaleTidePhase;
        }
        applyOpacity();
      }

      function onStoreChange() {
        if (disposed) return;
        const settings = store.get();
        if (lastSettings.followTheme && !settings.followTheme) {
          writePinnedScheme(readDshScheme());
        }
        lastSettings = settings;
        if (!settings.enabled) {
          syncEnabled();
          return;
        }
        syncEnabled();
        if (ocean) ocean.setSettings(settings);
        applyScheme();
        applyPhase();
      }

      function schedulePhase() {
        if (disposed) return;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          applyPhase();
        });
      }

      // Initial state.
      syncEnabled();
      applyScheme();
      applyPhase();

      try {
        phaseObserver = new MutationObserver(schedulePhase);
        phaseObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-content-phase"],
        });
      } catch (error) {
        /* no MutationObserver: the interval below still works */
      }
      interval = window.setInterval(applyPhase, 500);

      try {
        themeObserver = new MutationObserver(() => {
          applyScheme();
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "style", "data-theme", "data-color-scheme", "data-ds-theme-source"],
        });
      } catch (error) {
        /* optional */
      }

      try {
        motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
        motionQuery.addEventListener("change", applyPhase);
      } catch (error) {
        motionQuery = null;
      }

      try {
        const theme = themeService;
        if (theme && typeof ctx.on === "function") {
          offTheme = ctx.on("theme/change", () => {
            applyScheme();
          });
        }
      } catch (error) {
        offTheme = null;
      }

      unsubscribe = store.subscribe(onStoreChange);

      return function dispose() {
        disposed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (interval) window.clearInterval(interval);
        interval = 0;
        if (phaseObserver) phaseObserver.disconnect();
        if (themeObserver) themeObserver.disconnect();
        if (offTheme && typeof offTheme === "function") {
          try {
            offTheme();
          } catch (error) {
            /* ignore */
          }
        }
        if (motionQuery) {
          try {
            motionQuery.removeEventListener("change", applyPhase);
          } catch (error) {
            /* ignore */
          }
        }
        if (unsubscribe) unsubscribe();
        destroyOcean();
        layer.remove();
        delete document.body.dataset.dshWhaleTide;
        delete document.body.dataset.dshWhaleTideScheme;
        delete document.body.dataset.dshWhaleTideUi;
        delete document.body.dataset.dshWhaleTidePhase;
      };
    }

    /* =====================================================================
     * Settings section
     * ===================================================================*/
    function formatValue(key, value) {
      if (key === "speed") return Number(value).toFixed(2) + "×";
      return Number(value).toFixed(2);
    }

    function SettingsPanel(props) {
      const store = props.store;
      const [value, setValue] = React.useState(store.get());
      const [status, setStatus] = React.useState("");

      React.useEffect(() => store.subscribe((next) => setValue(next)), [store]);

      function save(patch) {
        const next = store.set(patch);
        setValue(next);
        setStatus(store.storageError ? "saveError" : "saved");
      }

      function reset() {
        setValue(store.reset());
        setStatus("resetDone");
      }

      function row(key, control) {
        return h(
          "div",
          { className: "dshwt-row", key },
          h(
            "div",
            { className: "dshwt-label" },
            h("span", { className: "dshwt-name" }, t(key)),
            h("span", { className: "dshwt-hint" }, t("hint" + key.charAt(0).toUpperCase() + key.slice(1))),
          ),
          h("div", { className: "dshwt-control" }, control),
        );
      }

      function switchControl(key) {
        return h("button", {
          type: "button",
          role: "switch",
          "aria-checked": value[key] ? "true" : "false",
          "aria-label": t(key),
          className: "dshwt-switch",
          onClick: () => save({ [key]: !value[key] }),
        });
      }

      function rangeControl(key) {
        const range = RANGES[key];
        return h(
          "div",
          { className: "dshwt-range" },
          h("input", {
            type: "range",
            min: range[0],
            max: range[1],
            step: range[2],
            value: value[key],
            "aria-label": t(key),
            onChange: (event) => {
              const number = Number(event.target.value);
              if (Number.isFinite(number)) save({ [key]: number });
            },
          }),
          h("span", { className: "dshwt-value" }, formatValue(key, value[key])),
        );
      }

      const statusText = status ? t(status) : "";
      const error = status === "saveError";

      return h(
        "div",
        { className: "dshwt-settings" },
        h(
          "div",
          { className: "dshwt-head" },
          h("h2", null, t("title")),
          h("p", null, t("sectionDescription")),
        ),
        h(
          "div",
          { className: "dshwt-card" },
          row("enabled", switchControl("enabled")),
          row("density", rangeControl("density")),
          row("speed", rangeControl("speed")),
          row("opacity", rangeControl("opacity")),
          row("conversationOpacity", rangeControl("conversationOpacity")),
          row("conversationDensity", rangeControl("conversationDensity")),
          row(
            "color",
            h(
              "div",
              { className: "dshwt-color" },
              h("input", {
                type: "color",
                value: value.color,
                "aria-label": t("color"),
                onChange: (event) => save({ color: event.target.value }),
              }),
              h("code", null, value.color),
            ),
          ),
          row("followTheme", switchControl("followTheme")),
        ),
        h(
          "div",
          { className: "dshwt-actions" },
          h("button", { type: "button", className: "dshwt-button", onClick: reset }, t("reset")),
          h("span", { className: "dshwt-status", "aria-live": "polite", "data-error": error ? "" : undefined }, statusText),
        ),
      );
    }

    function registerSettings(ctx, store) {
      try {
        if (!ctx.slots || typeof ctx.slots.inject !== "function" || typeof ctx.slots.register !== "function") {
          console.warn("[dsh-whale-tide] settings slot unavailable; background still active");
          return;
        }
        ctx.effect(
          () =>
            ctx.slots.inject("settings.section", () =>
              ctx.slots.register(
                {
                  name: "settings.section",
                  id: "dsh-whale-tide",
                  order: 57,
                  locale: NS,
                  label: () => t("title"),
                },
                (props) => h(SettingsPanel, { ...props, store }),
              ),
            ),
          "dsh-whale-tide: settings section",
        );
      } catch (error) {
        console.error("[dsh-whale-tide] failed to register settings section", error);
      }
    }

    /* =====================================================================
     * Registration
     * ===================================================================*/
    const inject = ["slots", "locale"];

    function apply(ctx) {
      installStyles(ctx);
      installLocale(ctx);

      const store = createStore();

      try {
        ctx.effect(() => mountBackdrop(ctx, store), "dsh-whale-tide: backdrop");
      } catch (error) {
        console.error("[dsh-whale-tide] backdrop failed to mount", error, error && error.stack);
      }

      registerSettings(ctx, store);
    }

    const module = { exports: {} };
    module.exports = { inject, apply };
    return module.exports;
  },
});
