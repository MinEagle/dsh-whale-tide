/*! Ocean engine adapted from dsh-ascii-whales 0.1.5 (MIT, (c) 2026 Chael-Chael);
    it vendors ascii-sharks (MIT, (c) 2026 drewdi, commit c521e24a...) and
    ascii-kanji-sharks. See THIRD_PARTY_NOTICES.md and vendor/. */
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
     * Ocean engine — extracted from dsh-ascii-whales 0.1.5 (MIT)
     *
     * dsh-ascii-whales vendors ascii-sharks (MIT, © 2026 drewdi) and
     * ascii-kanji-sharks (MIT, © 2026 michikusa404). This section keeps the
     * upstream full-window swimming, boids, whale spine/renderer and glyph
     * atlas; the adapter below only maps Whale Tide's settings and phase.
     * ===================================================================*/
// vendor/ascii-sharks/cells.ts
function cellSize(scale, square) {
  const cw = Math.max(1, Math.round(8 * scale));
  const ch = Math.round(cw * 1.45);
  const side = Math.max(4, Math.round(Math.sqrt(cw * ch)));
  return square ? [side, side] : [cw, ch];
}

// vendor/ascii-sharks/math.ts
var TAU = Math.PI * 2;
var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
var rand = (lo, hi) => lo + Math.random() * (hi - lo);
var randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
var K1 = 1 / 260;
var K2 = 1 / 310;
var K3 = 1 / 190;
var CURRENT_SCALE = 3400;
function current(x, y, t, out) {
  const a = x * K1 + t * 0.07;
  const b = y * K2 - t * 0.05;
  const c = (x + y) * K3 + t * 0.11;
  out.x = (-K2 * Math.sin(a) * Math.sin(b) + 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
  out.y = (-K1 * Math.cos(a) * Math.cos(b) - 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
  return out;
}

// vendor/ascii-sharks/species.ts
var SPECIES = [
  {
    name: "sardine",
    cruise: 36,
    maxSpeed: 64,
    minSpeed: 18,
    weight: 3,
    schoolSize: [18, 28],
    spacing: [1.8, 1.1],
    align: 1.6,
    cohesion: 1.6,
    jitter: 40,
    mill: 70,
    verticalDrag: 0.5
  },
  {
    name: "anchovy",
    cruise: 46,
    maxSpeed: 78,
    minSpeed: 22,
    weight: 3,
    schoolSize: [20, 32],
    spacing: [1.5, 1],
    align: 3.2,
    cohesion: 0.45,
    jitter: 30,
    mill: 0,
    verticalDrag: 1.4
  },
  {
    name: "silverside",
    cruise: 40,
    maxSpeed: 70,
    minSpeed: 20,
    weight: 3,
    schoolSize: [12, 20],
    spacing: [2, 1.1],
    align: 2.4,
    cohesion: 1.1,
    jitter: 35,
    mill: 0,
    verticalDrag: 1.6
  },
  {
    name: "mackerel",
    cruise: 32,
    maxSpeed: 60,
    minSpeed: 16,
    weight: 2,
    schoolSize: [5, 9],
    spacing: [2.6, 1.3],
    align: 2,
    cohesion: 0.9,
    jitter: 25,
    mill: 0,
    verticalDrag: 2
  },
  {
    name: "goby",
    cruise: 26,
    maxSpeed: 56,
    minSpeed: 10,
    weight: 1,
    schoolSize: [8, 12],
    spacing: [1.4, 1.1],
    align: 0.35,
    cohesion: 1.4,
    jitter: 110,
    mill: 0,
    verticalDrag: 0.3
  }
];
var TOTAL_WEIGHT = SPECIES.reduce((sum, s) => sum + s.weight, 0);
function pickSpecies() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < SPECIES.length; i++) {
    r -= SPECIES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

// vendor/ascii-sharks/world.ts
var SHARK_NODES = 20;
var DEFAULT_SHARKS = [
  { kind: "classic", size: 1 },
  { kind: "classic", size: 0.7 },
  { kind: "classic", size: 0.84 },
  { kind: "classic", size: 0.77 }
];
var FISH_SEPARATION_K = 420;
var FISH_ALIGN_K = 1.4;
var FISH_COHESION_K = 1;
var FISH_FLEE_K = 1100;
var BLIND_COS = -0.6;
var World = class {
  /** fishCount overrides the area-based population (the sidebar wants a single small school). */
  constructor(sharkSpecs = DEFAULT_SHARKS, fishCount) {
    this.sharkSpecs = sharkSpecs;
    this.fishCount = fishCount;
  }
  turnAgility = 1;
  tailFrequency = 1;
  width = 0;
  height = 0;
  time = 0;
  fish = [];
  sharks = [];
  events = [];
  pointer = { x: 0, y: 0, active: false };
  /** Fish neighbourhood radius; the spatial hash bucket size matches it. */
  perception = 60;
  /** Per-species personal space in px (x, y). */
  sepX = [];
  sepY = [];
  foreignSep = 40;
  bucketCols = 0;
  bucketRows = 0;
  bucketHead = new Int32Array(0);
  bucketCount = new Uint16Array(0);
  bucketNext = new Int32Array(0);
  lastSpawn = 0;
  tmp = { x: 0, y: 0 };
  resize(width, height, cellW, cellH) {
    const first = this.width === 0;
    this.width = width;
    this.height = height;
    this.sepX = SPECIES.map((sp) => sp.spacing[0] * cellW);
    this.sepY = SPECIES.map((sp) => sp.spacing[1] * cellH);
    this.perception = Math.max(cellH * 3, cellW * 5.5);
    this.foreignSep = cellW * 3;
    if (first || this.fish.length === 0) {
      this.seed();
      return;
    }
    for (const f of this.fish) {
      f.x = clamp(f.x, 0, width);
      f.y = clamp(f.y, 0, height);
    }
  }
  seed() {
    const { width: W, height: H } = this;
    const minSide = Math.min(W, H);
    const baseLength = clamp(minSide * 0.44, 170, 430);
    const sharkCount = this.sharkSpecs.length;
    this.sharks = [];
    for (let i = 0; i < sharkCount; i++) {
      const { kind, size } = this.sharkSpecs[i];
      const length = baseLength * size;
      const orbitRadius = minSide * rand(0.28, 0.4);
      const a = i / sharkCount * TAU + rand(-0.4, 0.4);
      const orbitDir = i % 2 === 0 ? 1 : -1;
      const x = W / 2 + Math.cos(a) * orbitRadius * (W / minSide) * 0.9;
      const y = H / 2 + Math.sin(a) * orbitRadius;
      const heading = a + orbitDir * Math.PI / 2;
      const nodes = new Float32Array(SHARK_NODES * 2);
      const seg = length / (SHARK_NODES - 1);
      for (let n = 0; n < SHARK_NODES; n++) {
        nodes[n * 2] = x - Math.cos(heading) * seg * n;
        nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
      }
      this.sharks.push({
        id: i + 1,
        kind,
        length,
        nodes,
        heading,
        speed: 30,
        phase: rand(0, TAU),
        turn: 0,
        hunger: rand(0.25, 0.75),
        wander: 0,
        orbitDir,
        orbitRadius,
        target: null,
        retargetAt: 0,
        depth: size
      });
    }
    this.sharks.sort((a, b) => a.length - b.length);
    const total = this.fishCount ?? clamp(Math.round(W * H / 4400), 85, 340);
    this.fish = [];
    while (this.fish.length < total) {
      const species = pickSpecies();
      const sp = SPECIES[species];
      const size = Math.min(randInt(sp.schoolSize[0], sp.schoolSize[1]), total - this.fish.length);
      const millDir = Math.random() < 0.5 ? 1 : -1;
      const cx = rand(W * 0.06, W * 0.94);
      const cy = rand(H * 0.08, H * 0.92);
      const dir = (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.5, 0.5);
      for (let k = 0; k < size; k++) {
        this.fish.push({
          x: cx + rand(-1, 1) * this.sepX[species] * Math.sqrt(size),
          y: cy + rand(-1, 1) * this.sepY[species] * Math.sqrt(size) * 0.6,
          vx: Math.cos(dir) * sp.cruise,
          vy: Math.sin(dir) * sp.cruise,
          species,
          alarm: 0,
          alive: true,
          respawnAt: 0,
          phase: rand(0, TAU),
          turn: 0,
          depth: rand(0.55, 1),
          millDir
        });
      }
    }
    this.bucketNext = new Int32Array(this.fish.length);
  }
  splash(x, y) {
    this.events.push({ kind: "splash", x, y });
    const r = 240;
    for (const f of this.fish) {
      if (!f.alive) continue;
      const dx = f.x - x;
      const dy = f.y - y;
      const d = Math.hypot(dx, dy);
      if (d > r || d < 1e-3) continue;
      const k = (1 - d / r) * 260;
      f.vx += dx / d * k;
      f.vy += dy / d * k;
      f.alarm = 1;
    }
  }
  step(dt, beatDt = dt) {
    this.time += dt;
    this.rebuildHash();
    this.stepFish(dt);
    this.stepSharks(dt, beatDt);
    this.respawn();
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
    if (this.bucketNext.length !== this.fish.length) {
      this.bucketNext = new Int32Array(this.fish.length);
    }
    for (let i = 0; i < this.fish.length; i++) {
      const f = this.fish[i];
      if (!f.alive) continue;
      const b = this.bucketOf(f.x, f.y);
      this.bucketNext[i] = this.bucketHead[b];
      this.bucketHead[b] = i;
      this.bucketCount[b]++;
    }
  }
  bucketOf(x, y) {
    const size = this.perception;
    const c = clamp(Math.floor(x / size) + 2, 0, this.bucketCols - 1);
    const r = clamp(Math.floor(y / size) + 2, 0, this.bucketRows - 1);
    return r * this.bucketCols + c;
  }
  stepFish(dt) {
    const { fish, sharks, pointer, width: W, height: H, time } = this;
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
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      if (!f.alive) continue;
      const sp = SPECIES[f.species];
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
      const bc = clamp(Math.floor(f.x / size) + 2, 0, cols - 1);
      const br = clamp(Math.floor(f.y / size) + 2, 0, rows - 1);
      for (let r = Math.max(0, br - 1); r <= Math.min(rows - 1, br + 1); r++) {
        for (let c = Math.max(0, bc - 1); c <= Math.min(cols - 1, bc + 1); c++) {
          let j = head[r * cols + c];
          while (j !== -1) {
            if (j !== i) {
              const o = fish[j];
              const dx = o.x - f.x;
              const dy = o.y - f.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < R2 && d2 > 1e-6) {
                const d = Math.sqrt(d2);
                if ((dx * hx + dy * hy) / d > BLIND_COS) {
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
                    const k = (1 - d / foreignSep) / d * 0.6;
                    sx -= dx * k;
                    sy -= dy * k;
                  }
                  if (o.alarm > neighbourAlarm) neighbourAlarm = o.alarm;
                }
              }
            }
            j = next[j];
          }
        }
      }
      ax += sx * FISH_SEPARATION_K;
      ay += sy * FISH_SEPARATION_K;
      if (n > 0) {
        const alignK = FISH_ALIGN_K * sp.align;
        const cohesionK = FISH_COHESION_K * sp.cohesion * (1 - 0.8 * f.alarm);
        ax += (avx / n - f.vx) * alignK + cx / n * cohesionK;
        ay += (avy / n - f.vy) * alignK + cy / n * cohesionK;
        if (sp.mill > 0) {
          const cl = Math.hypot(cx, cy) || 1;
          ax += -cy / cl * f.millDir * sp.mill * (1 - f.alarm);
          ay += cx / cl * f.millDir * sp.mill * (1 - f.alarm);
        }
      }
      let fear = 0;
      for (const sh of sharks) {
        const fearR = sh.length * 0.6 + 60;
        let best = Infinity;
        let bx = 0;
        let by = 0;
        for (let k = 0; k <= 12; k += 3) {
          const nx = sh.nodes[k * 2];
          const ny = sh.nodes[k * 2 + 1];
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
        const shx = Math.cos(sh.heading);
        const shy = Math.sin(sh.heading);
        const side = shx * (f.y - sh.nodes[1]) - shy * (f.x - sh.nodes[0]) >= 0 ? 1 : -1;
        ax += (awayX * 0.7 - shy * side * 0.9) * FISH_FLEE_K * w;
        ay += (awayY * 0.7 + shx * side * 0.9) * FISH_FLEE_K * w;
        fear = Math.max(fear, Math.sqrt(w));
      }
      if (pointer.active) {
        const pr = 130;
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < pr && d > 1e-3) {
          const w = (1 - d / pr) ** 2;
          ax += dx / d * FISH_FLEE_K * w;
          ay += dy / d * FISH_FLEE_K * w;
          fear = Math.max(fear, Math.sqrt(w) * 0.8);
        }
      }
      let alarm = Math.max(f.alarm * calmDecay, fear);
      const relayed = neighbourAlarm * 0.86;
      if (relayed > alarm) alarm += (relayed - alarm) * contagion;
      f.alarm = alarm;
      const m = 36;
      if (f.x < m) ax += (m - f.x) * 7;
      else if (f.x > W - m) ax -= (f.x - (W - m)) * 7;
      if (f.y < m) ay += (m - f.y) * 7;
      else if (f.y > H - m) ay -= (f.y - (H - m)) * 7;
      current(f.x, f.y, time, cur);
      ax += cur.x * 0.5 + (Math.random() - 0.5) * sp.jitter;
      ay += cur.y * 0.5 + (Math.random() - 0.5) * sp.jitter;
      ay -= f.vy * sp.verticalDrag * (1 - 0.7 * f.alarm);
      const preferred = sp.cruise * (1 + 1.3 * f.alarm);
      ax += (preferred - speed) * hx * 1.6;
      ay += (preferred - speed) * hy * 1.6;
      const before = Math.atan2(f.vy, f.vx);
      f.vx += ax * dt;
      f.vy += ay * dt;
      const maxSpeed = sp.maxSpeed * (1 + 1.8 * f.alarm);
      const s = Math.hypot(f.vx, f.vy);
      if (s > maxSpeed) {
        f.vx *= maxSpeed / s;
        f.vy *= maxSpeed / s;
      } else if (s < sp.minSpeed && s > 1e-3) {
        f.vx *= sp.minSpeed / s;
        f.vy *= sp.minSpeed / s;
      }
      f.turn += (angleDiff(before, Math.atan2(f.vy, f.vx)) / dt - f.turn) * Math.min(1, dt * 8);
      f.phase += dt * (7 + Math.hypot(f.vx, f.vy) * 0.12);
      f.x = clamp(f.x + f.vx * dt, -60, W + 60);
      f.y = clamp(f.y + f.vy * dt, -60, H + 60);
    }
  }
  stepSharks(dt, beatDt) {
    const { sharks, width: W, height: H, time } = this;
    const minSide = Math.min(W, H);
    const cxW = W / 2;
    const cyW = H / 2;
    for (const sh of sharks) {
      const L = sh.length;
      const nodes = sh.nodes;
      const hx = nodes[0];
      const hy = nodes[1];
      sh.hunger = Math.min(1, sh.hunger + dt * 0.03);
      let dx = Math.cos(sh.heading);
      let dy = Math.sin(sh.heading);
      sh.wander = clamp(sh.wander + (Math.random() - 0.5) * dt * 3.2, -1.1, 1.1);
      dx += Math.cos(sh.heading + sh.wander) * 0.45;
      dy += Math.sin(sh.heading + sh.wander) * 0.45;
      if (time >= sh.retargetAt) {
        sh.target = this.findPrey(sh);
        sh.retargetAt = time + 0.45;
      }
      const t = sh.target;
      let hunting = false;
      let closing = 0;
      if (t && t.alive && sh.hunger > 0.3) {
        const tx = t.x + t.vx * 0.35 - hx;
        const ty = t.y + t.vy * 0.35 - hy;
        const d = Math.hypot(tx, ty) || 1;
        const w = 1.4 + 2.6 * sh.hunger;
        dx += tx / d * w;
        dy += ty / d * w;
        hunting = true;
        closing = clamp(1 - d / (L * 0.9), 0, 1);
      } else {
        const rx = (hx - cxW) / (W / minSide);
        const ry = hy - cyW;
        const r = Math.hypot(rx, ry) || 1;
        const radius = sh.orbitRadius * (1 + 0.15 * Math.sin(time * 0.05 + sh.id));
        const radial = clamp((radius - r) / radius, -1, 1);
        dx += (-ry / r * sh.orbitDir + rx / r * radial * 0.9) * 0.55;
        dy += (rx / r * sh.orbitDir + ry / r * radial * 0.9) * 0.55;
      }
      for (const other of sharks) {
        if (other === sh) continue;
        for (let k = 0; k < SHARK_NODES; k += 4) {
          const ox = hx - other.nodes[k * 2];
          const oy = hy - other.nodes[k * 2 + 1];
          const d = Math.hypot(ox, oy);
          const range = (L + other.length) * 0.45;
          if (d < range && d > 1e-3) {
            const w = (1 - d / range) * 3;
            dx += ox / d * w;
            dy += oy / d * w;
          }
        }
      }
      const ex = (hx - cxW) / (W * 0.3);
      const ey = (hy - cyW) / (H * 0.16);
      const e2 = ex * ex + ey * ey;
      if (e2 < 1) {
        const e = Math.sqrt(e2) || 1e-3;
        const w = (1 - e) * (hunting ? 1 : 2.5);
        dx += ex / e * w;
        dy += ey / e * w;
      }
      const over = Math.max(-hx, hx - W, -hy, hy - H);
      if (over > -L * 0.05) {
        const w = clamp((over + L * 0.05) / (L * 0.35), 0, 1) * 3.5;
        const toX = cxW - hx;
        const toY = cyW - hy;
        const d = Math.hypot(toX, toY) || 1;
        dx += toX / d * w;
        dy += toY / d * w;
      }
      const desired = Math.atan2(dy, dx);
      const agility = Math.min(hunting ? 1.7 + closing : 0.8, sh.speed / (L * 0.22));
      const maxTurn = agility * this.turnAgility * dt;
      const turned = clamp(angleDiff(sh.heading, desired), -maxTurn, maxTurn);
      sh.heading += turned;
      sh.turn += (turned / dt - sh.turn) * Math.min(1, dt * 3);
      const cruise = 30 + L * 0.04;
      const targetSpeed = hunting ? cruise * (1.45 + closing * 1.5) : cruise;
      sh.speed += (targetSpeed - sh.speed) * Math.min(1, dt * 1.1);
      sh.phase += beatDt * this.tailFrequency * (2 + (30 + L * 0.04) / 24);
      nodes[0] += Math.cos(sh.heading) * sh.speed * dt;
      nodes[1] += Math.sin(sh.heading) * sh.speed * dt;
      const seg = L / (SHARK_NODES - 1);
      const maxBend = 0.16 * this.turnAgility;
      let prevAngle = sh.heading + Math.PI;
      for (let k = 1; k < SHARK_NODES; k++) {
        const px = nodes[(k - 1) * 2];
        const py = nodes[(k - 1) * 2 + 1];
        let angle = Math.atan2(nodes[k * 2 + 1] - py, nodes[k * 2] - px);
        angle = prevAngle + clamp(angleDiff(prevAngle, angle), -maxBend, maxBend);
        nodes[k * 2] = px + Math.cos(angle) * seg;
        nodes[k * 2 + 1] = py + Math.sin(angle) * seg;
        prevAngle = angle;
      }
      if (sh.hunger > 0.15) {
        const mouthR = L * 0.05 + 8;
        const mx = nodes[0];
        const my = nodes[1];
        for (const f of this.fish) {
          if (!f.alive) continue;
          if ((f.x - mx) ** 2 + (f.y - my) ** 2 < mouthR * mouthR) {
            f.alive = false;
            f.respawnAt = time + rand(3, 8);
            sh.hunger = Math.max(0, sh.hunger - 0.16);
            this.events.push({ kind: "eat", x: f.x, y: f.y });
          }
        }
      }
    }
  }
  /**
   * Pick prey in the shark's forward cone, preferring close fish in sparse
   * buckets (stragglers) over fish buried in a dense school.
   */
  findPrey(sh) {
    const range = sh.length * 0.9 + 160;
    const hx = sh.nodes[0];
    const hy = sh.nodes[1];
    const fx = Math.cos(sh.heading);
    const fy = Math.sin(sh.heading);
    let best = null;
    let bestScore = Infinity;
    let currentScore = Infinity;
    for (const f of this.fish) {
      if (!f.alive) continue;
      const dx = f.x - hx;
      const dy = f.y - hy;
      const d = Math.hypot(dx, dy);
      if (d > range || d < 1e-3) continue;
      const cos = (dx * fx + dy * fy) / d;
      if (cos < 0.2) continue;
      const crowd = this.bucketCount[this.bucketOf(f.x, f.y)];
      const score = d * (1 + (1 - cos) * 0.8) * (1 + crowd * 0.07);
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
      if (f === sh.target) currentScore = score;
    }
    if (sh.target && currentScore < bestScore * 1.3) return sh.target;
    return best;
  }
  respawn() {
    const { time, width: W, height: H } = this;
    const due = [];
    for (const f of this.fish) if (!f.alive && f.respawnAt <= time) due.push(f);
    if (due.length === 0) return;
    if (due.length < 6 && time - this.lastSpawn < 9) return;
    this.lastSpawn = time;
    const side = randInt(0, 3);
    const along = rand(0.15, 0.85);
    const x = side === 0 ? -20 : side === 1 ? W + 20 : along * W;
    const y = side === 2 ? -20 : side === 3 ? H + 20 : along * H;
    const inward = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.5, 0.5);
    const species = pickSpecies();
    const sp = SPECIES[species];
    const millDir = Math.random() < 0.5 ? 1 : -1;
    for (const f of due.slice(0, sp.schoolSize[1])) {
      f.alive = true;
      f.species = species;
      f.alarm = 0;
      f.turn = 0;
      f.millDir = millDir;
      f.x = x + rand(-1, 1) * this.perception;
      f.y = y + rand(-1, 1) * this.perception;
      f.vx = Math.cos(inward) * sp.cruise * 1.4;
      f.vy = Math.sin(inward) * sp.cruise * 1.4;
    }
  }
};

// vendor/ascii-sharks/whales.ts
var humpback = {
  halfWidth: (s) => {
    if (s < 0.12) return 0.115 * Math.pow(Math.sin(s / 0.12 * Math.PI / 2), 0.45);
    if (s < 0.35) return 0.115 + 0.02 * Math.sin((s - 0.12) / 0.23 * Math.PI);
    if (s < 0.87) return 0.018 + 0.097 * Math.pow(1 - (s - 0.35) / 0.52, 1.1);
    return 0.018 * (1 - (s - 0.87) / 0.13);
  },
  pectoral: [0.25, 0.36, 0.41, 0.32],
  falcate: false,
  pelvic: [0, 0, 0, 0],
  caudal: 0.22,
  dorsal: [0.6, 0.65],
  secondDorsal: [0, 0],
  eye: [0.1, 0.13],
  gills: [0, 0],
  tint: [0.45, 0.65, 1.3]
};
var orca = {
  ...humpback,
  halfWidth: (s) => {
    if (s < 0.14) return 0.15 * Math.pow(Math.sin(s / 0.14 * Math.PI / 2), 0.35);
    if (s < 0.38) return 0.15 + 0.012 * Math.sin((s - 0.14) / 0.24 * Math.PI);
    if (s < 0.88) return 0.018 + 0.132 * Math.pow(1 - (s - 0.38) / 0.5, 1.3);
    return 0.018 * (1 - (s - 0.88) / 0.12);
  },
  pectoral: [0.25, 0.47, 0.43, 0.23],
  dorsal: [0.43, 0.55]
};
function orcaPatch(s, across) {
  return ((s - 0.205) / 0.067) ** 2 + ((across - 0.75) / 0.22) ** 2 < 1 || ((s - 0.68) / 0.12) ** 2 + ((across - 0.88) / 0.26) ** 2 < 1;
}
function orcaFlipper(s, distance, reach) {
  const t = distance / reach;
  return t >= 0 && t <= 1 && ((s - (0.31 + 0.1 * t)) / 0.085) ** 2 + ((t - 0.48) / 0.52) ** 2 <= 1;
}
function humpbackFlipper(s, distance, reach) {
  const t = distance / reach;
  if (t < 0 || t > 1) return false;
  const center = 0.29 + 0.12 * t - 0.04 * Math.sin(Math.PI * t);
  const root = 1 - 0.2 * Math.exp(-(((t - 0.43) / 0.14) ** 2));
  const width = 0.05 * (1 - 0.5 * t) * Math.sqrt(1 - t ** 6) * root;
  return Math.abs(s - center) <= width;
}
function whaleFlukes(s, across) {
  const t = across / 0.22;
  if (t < 0 || t > 1) return false;
  const front = 0.86 + 0.12 * t ** 1.7;
  const back = 0.945 + 0.035 * t + 0.028 * Math.sin(Math.PI * t);
  return s >= front && s <= back;
}

// vendor/ascii-sharks/renderer.ts
var ALPHA_LEVELS = 6;
var FISH_ALPHAS = [0.28, 0.42, 0.58, 0.74, 0.9];
var DOT_RGB = [
  [77, 107, 254],
  [65, 91, 218],
  [110, 148, 255],
  [160, 186, 255],
  [88, 141, 255]
];
var DOT_BASE_ALPHA = [1, 1, 1, 1, 1];
var WAKE = DOT_RGB.length - 1;
var COLORFUL_ACCENTS = ["#e0892c", "#e03a32", "#b44ae0", "#33c8cc", "#3cb54a", "#3150e8", "#d9c14a"];
var GLYPHS = {
  ascii: { skin: ":;t%SX8#@", fin: "%;tS:", ridge: "@8%", edgeHeavy: ":;", edgeLight: ".',`", mark: "#%@", eye: "o", fish: "-" },
  hanzi: { skin: "\u6C34\u5DDD\u6C50\u6C99\u6D6A\u6D77\u6F6E\u9CB8\u6DF1", fin: "\u9CCD", ridge: "\u9CCD", edgeHeavy: "\u4E3F\u4E28", edgeLight: "\u4E36\u4E00", mark: "\u9CB8\u6D77\u6F6E", eye: "\u76EE", fish: "\u9C7C\u9CA4\u9CAD\u9CB1" }
};
var FLAG_BODY = 1;
var FLAG_EDGE = 2;
var FLAG_FIN = 3;
var FLAG_RIDGE = 4;
var FLAG_EYE = 5;
var FLAG_MARK = 6;
var FLAG_WHITE = 7;
var SUBSAMPLES = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];
function classicHalfWidth(s) {
  if (s < 0.13) return 0.09 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.95);
  if (s < 0.3) return 0.09 + 0.016 * smoothstep(0.13, 0.3, s);
  if (s < 0.84) return 0.019 + 0.087 * Math.pow(1 - (s - 0.3) / 0.54, 1.25);
  const k = (s - 0.84) / 0.16;
  return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
}
var SHAPES = {
  // DSH adaptation: rounded whale head, broad back, long flippers and paired tail flukes.
  whale: humpback,
  orca,
  classic: {
    halfWidth: classicHalfWidth,
    pectoral: [0.15, 0.43, 0.55, 0.26],
    falcate: true,
    pelvic: [0.57, 0.65, 0.69, 0.085],
    caudal: 0.085,
    dorsal: [0.33, 0.47],
    secondDorsal: [0.71, 0.76],
    eye: [0.1, 0.14],
    gills: [0.19, 0.29],
    tint: [0.92, 0.97, 1.05]
  },
  // Slim neck under a wide, swept-back cephalofoil (drawn in sampleShark),
  // tall first dorsal, long upper tail lobe. Bronze-olive grey.
  hammerhead: {
    halfWidth: (s) => {
      if (s < 0.06) return 0.045;
      if (s < 0.3) return 0.045 + 0.061 * smoothstep(0.06, 0.3, s);
      return classicHalfWidth(s) * 0.92;
    },
    head: { span: 0.17, sweep: 0.035, depth: 0.09, notch: 0 },
    pectoral: [0.17, 0.4, 0.5, 0.22],
    falcate: true,
    pelvic: [0.56, 0.63, 0.67, 0.075],
    caudal: 0.11,
    dorsal: [0.28, 0.44],
    secondDorsal: [0.7, 0.74],
    eye: null,
    gills: [0.16, 0.26],
    tint: [0.96, 0.98, 0.9]
  },
  // Blunt, square snout on a heavy body; barred back. Warm grey-brown.
  tiger: {
    halfWidth: (s) => {
      if (s < 0.13) return 0.1 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.45);
      if (s < 0.3) return 0.1 + 0.014 * smoothstep(0.13, 0.3, s);
      if (s < 0.84) return 0.019 + 0.095 * Math.pow(1 - (s - 0.3) / 0.54, 1.2);
      const k = (s - 0.84) / 0.16;
      return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
    },
    pectoral: [0.15, 0.42, 0.53, 0.25],
    falcate: true,
    pelvic: [0.57, 0.65, 0.69, 0.085],
    caudal: 0.095,
    dorsal: [0.33, 0.46],
    secondDorsal: [0.71, 0.75],
    eye: [0.08, 0.12],
    gills: [0.19, 0.28],
    tint: [1.02, 0.95, 0.84]
  },
  // Short rounded head, body done by half-length, then a long ribbon of a
  // tail fin. Broad rounded pectorals, spotted sandy skin.
  zebra: {
    halfWidth: (s) => {
      if (s < 0.1) return 0.075 * Math.pow(Math.sin(s / 0.1 * Math.PI / 2), 0.7);
      if (s < 0.28) return 0.075 + 0.025 * smoothstep(0.1, 0.28, s);
      if (s < 0.55) return 0.022 + 0.078 * Math.pow(1 - (s - 0.28) / 0.27, 1.1);
      const k = (s - 0.55) / 0.45;
      return 0.022 * (1 - k * k) + 0.012 * Math.sin(k * Math.PI);
    },
    pectoral: [0.12, 0.3, 0.36, 0.19],
    falcate: false,
    pelvic: [0.42, 0.48, 0.51, 0.065],
    caudal: 0,
    dorsal: [0.36, 0.44],
    secondDorsal: [0.49, 0.53],
    eye: [0.06, 0.09],
    gills: [0.13, 0.2],
    tint: [1.08, 0.97, 0.74]
  },
  // Great hammerhead: a broader, nearly straight-edged cephalofoil with a notch at the centre,
  // a towering sickle first dorsal (drawn long and bright from above), and a cooler slate skin.
  greathammer: {
    halfWidth: (s) => {
      if (s < 0.05) return 0.04;
      if (s < 0.3) return 0.04 + 0.07 * smoothstep(0.05, 0.3, s);
      return classicHalfWidth(s) * 0.95;
    },
    head: { span: 0.21, sweep: 6e-3, depth: 0.085, notch: 0.014 },
    pectoral: [0.16, 0.38, 0.49, 0.24],
    falcate: true,
    pelvic: [0.55, 0.62, 0.67, 0.085],
    caudal: 0.13,
    dorsal: [0.24, 0.45],
    secondDorsal: [0.68, 0.74],
    eye: null,
    gills: [0.15, 0.25],
    tint: [0.86, 0.93, 1.02]
  },
  // Shortfin mako: a long conical snout, a torpedo body that narrows hard to the tail stalk,
  // and a tall crescent tail. Metallic indigo back.
  mako: {
    halfWidth: (s) => {
      if (s < 0.17) return 0.088 * Math.pow(Math.sin(s / 0.17 * Math.PI / 2), 1.5);
      if (s < 0.32) return 0.088 + 0.012 * smoothstep(0.17, 0.32, s);
      if (s < 0.86) return 0.014 + 0.086 * Math.pow(1 - (s - 0.32) / 0.54, 1.45);
      const k = (s - 0.86) / 0.14;
      return 0.014 * (1 - k) + 0.01 * Math.sin(k * Math.PI);
    },
    pectoral: [0.18, 0.4, 0.5, 0.21],
    falcate: true,
    pelvic: [0.58, 0.64, 0.68, 0.06],
    caudal: 0.13,
    dorsal: [0.34, 0.45],
    secondDorsal: [0.76, 0.79],
    eye: [0.11, 0.15],
    gills: [0.2, 0.3],
    tint: [0.78, 0.9, 1.2]
  },
  // Thresher: a compact body over the front half, then the upper tail lobe as a long whip
  // that's as long as the shark itself. Big eyes, long sickle pectorals, bronze-violet skin.
  thresher: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.07 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.75);
      if (s < 0.2) return 0.07 + 0.02 * smoothstep(0.08, 0.2, s);
      if (s < 0.48) return 0.012 + 0.078 * Math.pow(1 - (s - 0.2) / 0.28, 1.3);
      const k = (s - 0.48) / 0.52;
      return 0.012 * (1 - k) + 6e-3 * Math.sin(k * Math.PI * 0.9) + 2e-3;
    },
    pectoral: [0.12, 0.27, 0.36, 0.2],
    falcate: true,
    pelvic: [0.37, 0.41, 0.44, 0.045],
    caudal: 0,
    dorsal: [0.24, 0.32],
    secondDorsal: [0.45, 0.47],
    eye: [0.05, 0.1],
    gills: [0.11, 0.18],
    tint: [1, 0.9, 1.08]
  },
  // Nurse shark: a blunt, broad head, a heavy flattened body with both dorsals set far back,
  // rounded paddle pectorals, and a long low tail with no lower lobe. Tawny brown.
  nurse: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.085 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.4);
      if (s < 0.3) return 0.085 + 0.02 * smoothstep(0.08, 0.3, s);
      if (s < 0.72) return 0.022 + 0.083 * Math.pow(1 - (s - 0.3) / 0.42, 1.1);
      const k = (s - 0.72) / 0.28;
      return 0.022 * (1 - k * k) + 0.014 * Math.sin(k * Math.PI);
    },
    pectoral: [0.16, 0.34, 0.4, 0.17],
    falcate: false,
    pelvic: [0.45, 0.52, 0.55, 0.075],
    caudal: 0,
    dorsal: [0.5, 0.58],
    secondDorsal: [0.63, 0.69],
    eye: [0.05, 0.075],
    gills: [0.14, 0.22],
    tint: [1.1, 0.96, 0.76]
  }
};
var KINDS = Object.keys(SHAPES);
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
function paintGrid(g, W, H, cw, ch, dpr, dark = true, opacity = 0.05) {
  if (opacity === 0) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = dark ? `rgba(140,165,255,${opacity})` : `rgba(77,107,254,${opacity})`;
  g.lineWidth = 1;
  g.beginPath();
  for (let c = 0; c <= Math.ceil(W / cw); c++) {
    const x = Math.round(c * cw * dpr) + 0.5;
    g.moveTo(x, 0);
    g.lineTo(x, H * dpr);
  }
  for (let r = 0; r <= Math.ceil(H / ch); r++) {
    const y = Math.round(r * ch * dpr) + 0.5;
    g.moveTo(0, y);
    g.lineTo(W * dpr, y);
  }
  g.stroke();
}
var AsciiRenderer = class {
  constructor(canvas, dark = false, gridScale = 1, gridOpacity = 0.05, wake = 1, glyphMode = "ascii") {
    this.canvas = canvas;
    this.dark = dark;
    this.gridScale = gridScale;
    this.gridOpacity = gridOpacity;
    this.wake = wake;
    this.glyphMode = glyphMode;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.bg = document.createElement("canvas");
    this.setTheme(dark);
  }
  bodySwing = 1;
  fishRatio = 1;
  fishOrder = null;
  ctx;
  bg;
  dpr = 1;
  width = 0;
  height = 0;
  cw = 12;
  ch = 18;
  cols = 0;
  rows = 0;
  fontFamily = "ui-monospace, Menlo, monospace";
  rgb = [77, 107, 254];
  eyeColor = "";
  accents = [];
  dotKind = new Uint8Array(0);
  // 0 none, 1 blue, 2 green, 3 red, 4 pale
  dotPhase = new Float32Array(0);
  dotFreq = new Float32Array(0);
  energy = new Float32Array(0);
  energyTmp = new Float32Array(0);
  heat = new Float32Array(0);
  bucketOf = new Uint8Array(0);
  bucketOrder = new Int32Array(0);
  bucketCounts = new Int32Array(DOT_RGB.length * ALPHA_LEVELS + 1);
  dotStyles = [];
  sharkFlag = new Uint8Array(0);
  sharkShade = new Float32Array(0);
  sharkKey = new Uint32Array(0);
  sharkDepth = new Float32Array(0);
  sharkKind = new Uint8Array(0);
  sharkGlyph = new Uint16Array(0);
  /** Cells darkened by a shark's shadow on the seabed. */
  sharkShadow = new Uint8Array(0);
  spine = new Float32Array(SHARK_NODES * 2);
  arc = new Float32Array(SHARK_NODES);
  arcTotal = 1;
  shape = SHAPES.classic;
  sharkId = 0;
  finTipLeft = 0;
  finTipRight = 0;
  // Scratch outputs of sampleShark(), to avoid allocating per sample.
  hitFlag = 0;
  hitShade = 0;
  hitS = 0;
  hitV = 0;
  hitDist = 0;
  /** Cells holding a fish this frame (frame stamp); dots skip them. */
  fishStamp = new Uint32Array(0);
  frameId = 0;
  /** Conversation mode: 3 edge samples instead of 5. */
  lowDetail = false;
  /** Conversation mode refreshes the whale mask every other frame. */
  maskTick = 0;
  /** Fish cells bucketed by brightness, so each bucket is one fillStyle. */
  fishBuckets = FISH_ALPHAS.map(() => []);
  fishStyles = FISH_ALPHAS.map((a) => `rgba(230,238,255,${a})`);
  get cellWidth() {
    return this.cw;
  }
  get cellHeight() {
    return this.ch;
  }
  setFontFamily(family) {
    if (family) this.fontFamily = family;
  }
  setTheme(dark, gridOpacity = this.gridOpacity, wake = this.wake, color, colorfulShimmer = false, eyeColor = "primary") {
    this.dark = dark;
    this.gridOpacity = gridOpacity;
    this.wake = wake;
    if (color) this.rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    this.eyeColor = eyeColor === "primary" ? "" : eyeColor === "black" ? "#000000" : "#ffffff";
    const fish = this.rgb.map((c) => Math.round(dark ? c * 0.6 + 102 : c * 0.7));
    this.fishStyles = FISH_ALPHAS.map((a) => `rgba(${fish.join(",")},${a})`);
    this.accents = colorfulShimmer ? COLORFUL_ACCENTS : [0, 0.2, 0.6, -0.1, 0.35, -0.2, 0.5].map((lift) => `rgb(${this.rgb.map((c) => Math.round(lift >= 0 ? c + (255 - c) * lift : c * (1 + lift))).join(",")})`);
    this.dotStyles = [];
    for (let c = 0; c < DOT_RGB.length; c++) for (let l = 0; l < ALPHA_LEVELS; l++) {
      const a = DOT_BASE_ALPHA[c] * (l + 1) / ALPHA_LEVELS;
      this.dotStyles.push(`rgba(${fish.join(",")},${a.toFixed(3)})`);
    }
    this.paintBackground();
  }
  bodyColor(level) {
    const light = clamp((level - 120) / (level < 120 ? 120 : 135), -1, 1);
    return `rgb(${this.rgb.map((c) => Math.round(light < 0 ? c * (1 + light) : c + (255 - c) * light)).join(",")})`;
  }
  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    [this.cw, this.ch] = cellSize(this.gridScale, this.glyphMode === "hanzi");
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    const n = this.cols * this.rows;
    this.dotKind = new Uint8Array(n);
    this.dotPhase = new Float32Array(n);
    this.dotFreq = new Float32Array(n);
    this.energy = new Float32Array(n);
    this.energyTmp = new Float32Array(n);
    this.heat = new Float32Array(n);
    this.bucketOf = new Uint8Array(n);
    this.bucketOrder = new Int32Array(n);
    this.sharkFlag = new Uint8Array(n);
    this.sharkShade = new Float32Array(n);
    this.sharkKey = new Uint32Array(n);
    this.sharkDepth = new Float32Array(n);
    this.sharkKind = new Uint8Array(n);
    this.sharkGlyph = new Uint16Array(n);
    this.sharkShadow = new Uint8Array(n);
    this.fishStamp = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      const col = i % this.cols;
      const row = i / this.cols | 0;
      this.dotKind[i] = 0;
      this.dotPhase[i] = hash3(col, row, 23) * Math.PI * 2;
      this.dotFreq[i] = 0.3 + hash3(col, row, 37) * 1.1;
    }
    this.paintBackground();
  }
  paintBackground() {
    const g = this.bg.getContext("2d");
    if (!g) return;
    const { width: W, height: H, dpr, cw, ch } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    paintGrid(g, W, H, cw, ch, dpr, this.dark, this.gridOpacity);
  }
  render(world, dt) {
    const { ctx, dpr, cols, ch } = this;
    if (cols === 0) return;
    const t = world.time;
    this.consumeEvents(world);
    if (!this.lowDetail || (this.maskTick++ & 1) === 0) this.rasterizeSharks(world.sharks, t);
    this.depositWake(world);
    this.diffuse(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.markFish(world);
    this.drawDots(t);
    ctx.font = `${this.glyphMode === "hanzi" ? 400 : 600} ${Math.round(ch * 0.74)}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    this.drawHeat();
    this.drawFish();
    this.drawSharks(t);
  }
  // ── simulation → field ──────────────────────────────────────────────
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
  consumeEvents(world) {
    for (const e of world.events) {
      if (e.kind === "eat") {
        this.stamp(this.heat, e.x, e.y, 2, 1);
        this.stamp(this.energy, e.x, e.y, 3, 0.9);
      } else {
        this.stamp(this.energy, e.x, e.y, 6, 1.4);
      }
    }
    world.events.length = 0;
  }
  depositWake(world) {
    const { energy } = this;
    for (const f of world.fish) {
      if (!f.alive) continue;
      const i = this.cellIndex(f.x, f.y);
      if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.012 + f.alarm * 0.03);
    }
    for (const sh of world.sharks) {
      for (let k = SHARK_NODES - 6; k < SHARK_NODES; k++) {
        const i = this.cellIndex(sh.nodes[k * 2], sh.nodes[k * 2 + 1]);
        if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.05 + sh.speed * 12e-4);
      }
    }
    if (world.pointer.active) {
      this.stamp(energy, world.pointer.x, world.pointer.y, 1, 0.08);
    }
  }
  /** Blur + decay so wakes spread out like ripples and fade. */
  diffuse(dt) {
    const { cols, rows, energy, energyTmp: tmp, heat } = this;
    const decay = Math.exp(-dt * 1.5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const l = c > 0 ? energy[i - 1] : energy[i];
        const rt = c < cols - 1 ? energy[i + 1] : energy[i];
        const u = r > 0 ? energy[i - cols] : energy[i];
        const d = r < rows - 1 ? energy[i + cols] : energy[i];
        tmp[i] = (energy[i] * 4 + l + rt + u + d) * 0.125 * decay;
      }
    }
    this.energy = tmp;
    this.energyTmp = energy;
    const heatDecay = Math.exp(-dt * 2.2);
    for (let i = 0; i < heat.length; i++) heat[i] *= heatDecay;
  }
  // ── sharks ──────────────────────────────────────────────────────────
  /**
   * Classify one point against the current shark (spine/arc already built).
   * Body coordinates: s along the spine (0 snout → 1 tail), v across it.
   * Writes hit* fields and returns whether the point is on the shark.
   */
  sampleShark(px, py, L) {
    const { spine, arc } = this;
    const N = SHARK_NODES;
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
      const u2 = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const qx = ax + sx * u2;
      const qy = ay + sy * u2;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        best = d2;
        const len = Math.sqrt(len2);
        bestS = (arc[k] + u2 * len) / this.arcTotal;
        bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        bestNx = -sy / len * bestSign;
        bestNy = sx / len * bestSign;
      }
    }
    const a = Math.sqrt(best);
    const s = bestS;
    const u = s * L;
    const shape = this.shape;
    const w = shape.halfWidth(s) * L;
    this.hitDist = a;
    this.hitS = s;
    this.hitV = a * bestSign;
    const head = this.shape.head;
    if (head && u < L * (head.sweep + head.depth + head.notch)) {
      const span = L * head.span;
      const r = a / span;
      const front = L * head.sweep * r * r + L * head.notch * Math.max(0, 1 - r / 0.14);
      const depth = L * head.depth * (1 - 0.2 * r * r * r * r);
      if (r <= 1 && u >= front && u <= front + depth) {
        this.hitFlag = r > 0.84 ? FLAG_EYE : FLAG_BODY;
        this.hitShade = r > 0.84 ? 0 : 0.62 - 0.2 * r + (u < front + L * 0.012 ? 0.1 : 0);
        return true;
      }
    }
    if (a <= w && (shape !== humpback && shape !== orca || s <= 0.945)) {
      const across = a / (w || 1);
      const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
      let shade = 0.58 - across * across * 0.42 + facing * 0.26;
      let flag = FLAG_BODY;
      if (s > shape.dorsal[0] && s < shape.dorsal[1] && across < 0.3) {
        flag = FLAG_RIDGE;
        shade = 1;
      } else if (s > shape.secondDorsal[0] && s < shape.secondDorsal[1] && across < 0.4) {
        shade = Math.max(shade, 0.82);
      } else if (shape.eye && s > shape.eye[0] && s < shape.eye[1] && across > 0.6) {
        flag = FLAG_EYE;
        shade = 0;
      } else if (shape === orca && orcaPatch(s, across)) {
        flag = FLAG_WHITE;
      } else if (s > shape.gills[0] && s < shape.gills[1] && across > 0.58) {
        if (Math.floor((s - shape.gills[0]) / (shape.gills[1] - shape.gills[0]) * 5) % 2 === 0) shade *= 0.45;
      } else if (s < 0.05) {
        shade = Math.max(shade, 0.7);
      } else if (shape === SHAPES.zebra && s > 0.08 && s < 0.55 && (across < 0.1 || Math.abs(across - 0.6) < 0.08)) {
        shade = Math.max(shade, 0.8);
      } else if (this.marked(s, a * bestSign, L, across)) {
        flag = FLAG_MARK;
      }
      this.hitFlag = flag;
      this.hitShade = shade;
      return true;
    }
    const tip = bestSign > 0 ? this.finTipRight : this.finTipLeft;
    const [p0, p1, p2] = shape.pectoral;
    if ((shape === humpback ? humpbackFlipper(s, a, tip) : shape === orca ? orcaFlipper(s, a, tip) : inTriangle(u, a, L * p0, 0, L * p1, 0, L * p2, tip)) && // Falcate (sickle) fins get a concave trailing edge.
    !(shape.falcate && inTriangle(u, a, L * p1, 0, L * (p1 + (p2 - p1) * 0.33), tip * 0.55, L * p2, tip))) {
      this.hitFlag = this.marked(s, a * bestSign, L, 0) ? FLAG_MARK : FLAG_FIN;
      this.hitShade = 0.38 + 0.22 * (1 - clamp(a / tip, 0, 1));
      return true;
    }
    const [v0, v1, v2, vr] = shape.pelvic;
    if (vr > 0 && inTriangle(u, a, L * v0, 0, L * v1, 0, L * v2, L * vr) || // Forked caudal fin.
    (shape === humpback || shape === orca ? whaleFlukes(s, a / L) : shape.caudal > 0 && inTriangle(u, a, L * 0.86, 0, L * 0.95, 0, L, L * shape.caudal))) {
      this.hitFlag = FLAG_FIN;
      this.hitShade = 0.36;
      return true;
    }
    return false;
  }
  /** Whether a body point (s along, v across) falls on a dark marking. */
  marked(s, v, L, across) {
    if (this.shape === SHAPES.tiger) {
      if (s < 0.2 || s > 0.9 || across > 0.85) return false;
      const wobble = 0.35 * Math.sin(v / L * 25 + s * 5);
      const bar = Math.sin(s * Math.PI * 2 * 9 + wobble);
      return bar > 0.65 - 0.5 * smoothstep(0.2, 0.42, s) + 0.4 * smoothstep(0.8, 0.9, s);
    }
    if (this.shape === SHAPES.zebra) {
      if (s < 0.07) return false;
      const gu = s * L / (L * 0.06);
      const gv = v / (L * 0.045);
      const cu = Math.floor(gu);
      const cv = Math.floor(gv);
      const jx = hash3(cu, cv, this.sharkId) * 0.5 + 0.25;
      const jy = hash3(cu, cv, this.sharkId + 11) * 0.5 + 0.25;
      return (gu - cu - jx) ** 2 + (gv - cv - jy) ** 2 < 0.08;
    }
    return false;
  }
  /**
   * Build a smooth, undulating render spine from the sim spine, then
   * supersample every cell in the shark's bounding box against the shape.
   * Fully covered cells become solid skin; partial cells become edge glyphs.
   */
  rasterizeSharks(sharks, t) {
    const { sharkFlag, sharkShade, sharkKey, sharkDepth, sharkKind, sharkShadow, spine, arc, cw, ch, cols, rows } = this;
    sharkFlag.fill(0);
    sharkShadow.fill(0);
    this.sharkGlyph.fill(0);
    for (const sh of sharks) {
      const L = sh.length;
      const N = SHARK_NODES;
      const n = sh.nodes;
      const swim = clamp(sh.speed / 60, 0.4, 1.4);
      this.shape = SHAPES[sh.kind];
      this.sharkId = sh.id;
      const kindIndex = KINDS.indexOf(sh.kind);
      const secretCells = this.glyphMode === "hanzi" && (sh.kind === "whale" || sh.kind === "orca") && sh.id === 1 ? [-1, -1, -1, -1] : null;
      const secretDistances = [Infinity, Infinity, Infinity, Infinity];
      for (let k = 0; k < N; k++) {
        const s = k / (N - 1);
        const a = Math.max(0, k - 1);
        const b = Math.min(N - 1, k + 1);
        let tx = n[a * 2] - n[b * 2];
        let ty = n[a * 2 + 1] - n[b * 2 + 1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const amp = L * 0.05 * (0.1 + 0.9 * Math.pow(s, 1.8)) * swim * this.bodySwing;
        const off = amp * Math.sin(sh.phase - s * 5.2);
        spine[k * 2] = n[k * 2] - ty * off;
        spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
      }
      arc[0] = 0;
      for (let k = 1; k < N; k++) {
        arc[k] = arc[k - 1] + Math.hypot(spine[k * 2] - spine[(k - 1) * 2], spine[k * 2 + 1] - spine[(k - 1) * 2 + 1]);
      }
      this.arcTotal = arc[N - 1] || 1;
      const bank = clamp(sh.turn * 0.45, -0.35, 0.35);
      const flex = 1 + 0.06 * Math.sin(sh.phase * 0.5);
      const reachFin = this.shape.pectoral[3];
      this.finTipRight = L * reachFin * flex * (1 - bank);
      this.finTipLeft = L * reachFin * flex * (1 + bank);
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
      const reach = Math.max(L * 0.36, this.finTipLeft, this.finTipRight);
      const c0 = Math.max(0, Math.floor((minX - reach) / cw));
      const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw));
      const r0 = Math.max(0, Math.floor((minY - reach) / ch));
      const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
      if (c0 > c1 || r0 > r1) continue;
      const skipBeyond = reach + Math.hypot(cw, ch);
      const shadowDc = Math.round(L * 0.035 / cw) + 1;
      const shadowDr = Math.round(L * 0.02 / ch) + 1;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * cw;
          const y = r * ch;
          const centerHit = this.sampleShark(x + cw / 2, y + ch / 2, L);
          if (!centerHit && this.hitDist > skipBeyond) continue;
          const flag = this.hitFlag;
          const shade = this.hitShade;
          const s = this.hitS;
          const v = this.hitV;
          const subs = this.lowDetail ? SUBSAMPLES_LOW : SUBSAMPLES;
          let hits = centerHit ? 1 : 0;
          for (let k = 0; k < subs.length; k += 2) {
            if (this.sampleShark(x + subs[k] * cw, y + subs[k + 1] * ch, L)) hits++;
          }
          if (hits === 0) continue;
          const coverage = hits / (subs.length / 2 + 1);
          const i = r * cols + c;
          const key = hash3(Math.round(s * 52), Math.round(v / (cw * 0.9)), sh.id) * 4294967295 >>> 0;
          sharkKey[i] = key;
          sharkDepth[i] = sh.depth;
          sharkKind[i] = kindIndex;
          if (centerHit && coverage >= 0.6) {
            sharkFlag[i] = flag;
            if (this.glyphMode === "hanzi" && (sh.kind === "whale" || sh.kind === "orca")) {
              const glyph = flag === FLAG_EYE ? "\u76EE" : flag === FLAG_FIN ? s >= 0.84 ? "\u5C3E" : "\u9CCD" : flag === FLAG_RIDGE ? "\u9CCD" : s < 0.1 ? "\u543B" : s < 0.6 && Math.abs(v) < this.shape.halfWidth(s) * L * 0.32 ? "\u80CC" : "";
              this.sharkGlyph[i] = glyph ? glyph.charCodeAt(0) : 0;
              if (secretCells && !glyph && flag === FLAG_BODY && v > 0 && s >= 0.28 && s < 0.64) {
                const slot = Math.min(3, Math.floor((s - 0.28) / 0.09));
                const distance = ((s - (0.325 + slot * 0.09)) * L) ** 2 + (v - this.shape.halfWidth(s) * L * 0.6) ** 2;
                if (distance < secretDistances[slot]) {
                  secretDistances[slot] = distance;
                  secretCells[slot] = i;
                }
              }
            } else this.sharkGlyph[i] = 0;
            const flicker = (hash3(c, r, Math.floor(t * 6)) - 0.5) * 0.06;
            sharkShade[i] = clamp(shade + flicker, 0, 1);
            const sc = c + shadowDc;
            const sr = r + shadowDr;
            if (sc < cols && sr < rows) sharkShadow[sr * cols + sc] = 1;
          } else {
            sharkFlag[i] = FLAG_EDGE;
            this.sharkGlyph[i] = 0;
            sharkShade[i] = coverage;
          }
        }
      }
      if (secretCells?.every((i) => i >= 0)) {
        for (let k = 0; k < 4; k++) this.sharkGlyph[secretCells[k]] = "\u6DF1\u5EA6\u6C42\u7D22".charCodeAt(k);
      }
    }
  }
  drawSharks(t) {
    const { ctx, cols, rows, cw, ch, sharkFlag, sharkShade, sharkKey, sharkDepth, sharkKind } = this;
    const glyphs = GLYPHS[this.glyphMode];
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const flag = sharkFlag[i];
      if (!flag) continue;
      const col = i % cols;
      const row = i / cols | 0;
      const x = col * cw;
      const y = row * ch;
      const key = sharkKey[i];
      const shade = sharkShade[i];
      const dim = 0.7 + 0.3 * sharkDepth[i];
      const [tr, tg, tb] = SHAPES[KINDS[sharkKind[i]]].tint;
      const tick = Math.floor(t * 2.4 + key % 997 / 97);
      const roll = hash3(key, tick, 7);
      if (flag === FLAG_EDGE) {
        const set = shade >= 0.5 ? glyphs.edgeHeavy : glyphs.edgeLight;
        const g = (70 + shade * 80) * dim;
        ctx.fillStyle = roll < 0.07 ? this.accents[key % this.accents.length] : this.bodyColor(g);
        ctx.fillText(set[(key >>> 8) % set.length], x + cw / 2, y + ch / 2 + 1, Math.max(1, cw - 1));
        continue;
      }
      let level;
      let glyph;
      if (flag === FLAG_RIDGE) {
        level = 226;
        glyph = glyphs.ridge[(key >>> 8) % glyphs.ridge.length];
      } else if (flag === FLAG_EYE) {
        level = 46 + shade * 160;
        glyph = glyphs.eye;
      } else if (flag === FLAG_MARK) {
        level = 24 + shade * 22;
        glyph = glyphs.mark[(key >>> 8) % glyphs.mark.length];
      } else if (flag === FLAG_FIN) {
        level = 40 + shade * 120;
        glyph = glyphs.fin[(key >>> 8) % glyphs.fin.length];
      } else {
        level = 46 + shade * 160;
        const jitter = (key >>> 4) % 3 - 1;
        glyph = glyphs.skin[clamp(Math.floor((1 - shade) * (glyphs.skin.length - 0.01)) + jitter, 0, glyphs.skin.length - 1)];
      }
      level *= dim;
      if (this.sharkGlyph[i]) glyph = String.fromCharCode(this.sharkGlyph[i]);
      ctx.fillStyle = flag === FLAG_WHITE ? "#f5f5f0" : flag === FLAG_EYE && this.eyeColor ? this.eyeColor : this.bodyColor(level);
      ctx.fillRect(x + 1, y + 1, cw - 1, ch - 1);
      let color;
      if (flag === FLAG_WHITE) color = "#181818";
      else if (flag === FLAG_EYE && this.eyeColor) color = this.eyeColor === "#000000" ? "#ffffff" : "#181818";
      else if (flag === FLAG_EYE) color = shade > 0.55 ? "#181818" : "#eeeeee";
      else if (flag === FLAG_MARK) color = `rgb(${Math.round(70 * tr)},${Math.round(70 * tg)},${Math.round(70 * tb)})`;
      else if (roll < 0.09) color = this.accents[key % this.accents.length];
      else if (roll < 0.13) color = "#ffffff";
      else color = shade > 0.55 ? "#181818" : "#eeeeee";
      ctx.fillStyle = color;
      ctx.fillText(glyph, x + cw / 2, y + ch / 2 + 1, Math.max(1, cw - 1));
    }
  }
  // ── fish, dots, heat ────────────────────────────────────────────────
  /**
   * Snap each fish to a cell and bucket it by brightness: far fish are dim,
   * near fish brighter, and turning or panicking fish glint. Nearer fish
   * claim a cell first when two land in the same one.
   */
  markFish(world) {
    const { fishStamp, fishBuckets, sharkFlag } = this;
    const frame = ++this.frameId;
    const total = world.fish.length;
    if (!this.fishOrder || this.fishOrder.length !== total) {
      this.fishOrder = Array.from({ length: total }, (_, i) => i).sort(
        (a, b) => hash3(a, 11, 29) - hash3(b, 11, 29)
      );
    }
    const ratio = clamp(this.fishRatio === undefined ? 1 : this.fishRatio, 0, 1);
    const maxVisible = Math.ceil(total * ratio);
    for (const bucket of fishBuckets) bucket.length = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < maxVisible; k++) {
        const f = world.fish[this.fishOrder[k]];
        if (!f || !f.alive || (f.depth > 0.78 ? 0 : 1) !== pass) continue;
        const i = this.cellIndex(f.x, f.y);
        if (i < 0 || fishStamp[i] === frame || sharkFlag[i]) continue;
        fishStamp[i] = frame;
        const glint = clamp(Math.abs(f.turn) / 3.5, 0, 1);
        const v = 0.3 + 0.4 * (f.depth - 0.55) / 0.45 + 0.3 * Math.max(glint, f.alarm);
        fishBuckets[clamp(Math.floor(v * FISH_ALPHAS.length), 0, FISH_ALPHAS.length - 1)].push(i);
      }
    }
  }
  drawFish() {
    const { ctx, cw, ch, cols, fishBuckets } = this;
    const glyphs = GLYPHS[this.glyphMode].fish;
    for (let b = 0; b < fishBuckets.length; b++) {
      const bucket = fishBuckets[b];
      if (!bucket.length) continue;
      ctx.fillStyle = this.fishStyles[b];
      for (const i of bucket) {
        ctx.fillText(glyphs[i % glyphs.length], i % cols * cw + cw / 2, (i / cols | 0) * ch + ch / 2 + 1, Math.max(1, cw - 1));
      }
    }
  }
  drawHeat() {
    const { ctx, heat, cols, cw, ch } = this;
    for (let i = 0; i < heat.length; i++) {
      const h = heat[i];
      if (h < 0.08) continue;
      const col = i % cols;
      const row = i / cols | 0;
      ctx.fillStyle = `rgba(${this.rgb.join(",")},${Math.min(1, h * 1.6).toFixed(2)})`;
      ctx.fillText(h > 0.6 ? "*" : "\xB7", col * cw + cw / 2, row * ch + ch / 2 + 1, Math.max(1, cw - 1));
    }
  }
  /**
   * Every cell's dot twinkles on its own clock, is modulated by slow
   * caustic light bands, and flares cyan where the wake field is strong.
   * Dots are bucketed by colour/alpha so each bucket is one fillStyle.
   */
  drawDots(t) {
    const { ctx, cols, rows, cw, ch, dotKind, dotPhase, dotFreq, energy, sharkFlag, sharkShadow, fishStamp, frameId } = this;
    const { bucketOf, bucketOrder, bucketCounts } = this;
    const n = cols * rows;
    const SKIP = bucketCounts.length - 1;
    bucketCounts.fill(0);
    for (let i = 0; i < n; i++) {
      const e = energy[i] * this.wake;
      const kind = dotKind[i];
      if (sharkFlag[i] || fishStamp[i] === frameId || kind === 0 && e < 0.45) {
        bucketOf[i] = SKIP;
        continue;
      }
      let bucket;
      if (e > 0.45) {
        const level = clamp(Math.floor((e - 0.45) * 5), 0, ALPHA_LEVELS - 1);
        bucket = WAKE * ALPHA_LEVELS + level;
      } else {
        const col = i % cols;
        const row = i / cols | 0;
        const twinkle = 0.5 + 0.5 * Math.sin(t * dotFreq[i] + dotPhase[i]);
        const caustic = 0.85 + 0.15 * Math.sin(col * 0.11 + t * 0.35) * Math.sin(row * 0.17 - t * 0.27);
        let v = clamp((0.55 + 0.45 * twinkle) * caustic + e * 2, 0, 1);
        if (sharkShadow[i]) v *= 0.2;
        bucket = (kind - 1) * ALPHA_LEVELS + clamp(Math.floor(v * ALPHA_LEVELS), 0, ALPHA_LEVELS - 1);
      }
      bucketOf[i] = bucket;
      bucketCounts[bucket]++;
    }
    const starts = new Int32Array(bucketCounts.length);
    for (let b = 1; b < bucketCounts.length; b++) starts[b] = starts[b - 1] + bucketCounts[b - 1];
    const cursor = starts.slice();
    for (let i = 0; i < n; i++) {
      const b = bucketOf[i];
      if (b !== SKIP) bucketOrder[cursor[b]++] = i;
    }
    const small = Math.max(2, Math.round(cw * 0.19));
    const large = small + 1;
    for (let b = 0; b < SKIP; b++) {
      const count = bucketCounts[b];
      if (!count) continue;
      ctx.fillStyle = this.dotStyles[b];
      const size = b >= WAKE * ALPHA_LEVELS ? large : small;
      const start = starts[b];
      for (let k = start; k < start + count; k++) {
        const i = bucketOrder[k];
        const col = i % cols;
        const row = i / cols | 0;
        ctx.fillRect(Math.round(col * cw + cw * 0.66 - size / 2), Math.round(row * ch + ch * 0.64 - size / 2), size, size);
      }
    }
  }
};

// vendor/ascii-kanji-sharks/glyphs.js
var SKIN_POOL = "\u4E36\u30CE\u4E00\u4E8C\u5C0F\u5DDD\u6C34\u6C37\u6C38\u6C50\u6CF3\u6CE2\u6D77\u6D6A\u6F6E\u6FE4\u9BE8";
var PART = {
  eye: "\u76EE",
  fin: "\u9C2D",
  tail: "\u5C3E",
  scale: "\u9C57",
  name: "\u9BE8"
};
var STROKE = { flat: "\u4E00", upright: "\u4E28", down: "\u4E36", up: "\u30CE" };
var WAKE2 = ["\u3001", "\u301C", "\u6C35"];
var EAT = "\u55B0";
var SPARK = "\u4E36";
var SFX = { chomp: "\u30AC\u30D6\u30C3", splash: "\u30B6\u30D0\u30C3" };
var fontCss = (px, family) => `400 ${px}px ${family}`;
function measureInk(chars, family) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.font = fontCss(size * 0.9, family);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fff";
  return [...chars].map((ch) => {
    g.clearRect(0, 0, size, size);
    g.fillText(ch, size / 2, size / 2);
    const data = g.getImageData(0, 0, size, size).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    return { ch, ink: sum / (255 * size * size) };
  });
}
var InkRamp = class {
  constructor(family, chars = SKIN_POOL) {
    const measured = measureInk(chars, family).sort((a, b) => a.ink - b.ink);
    const lo = measured[0].ink;
    const hi = measured[measured.length - 1].ink || 1;
    this.entries = measured.map((m) => ({ ch: m.ch, tone: (m.ink - lo) / (hi - lo || 1) }));
    this.table = [];
    const steps = 64;
    for (let i = 0; i < steps; i++) {
      const tone = i / (steps - 1);
      let best = this.entries[0];
      for (const e of this.entries) if (Math.abs(e.tone - tone) < Math.abs(best.tone - tone)) best = e;
      this.table.push(best.ch);
    }
  }
  pick(tone) {
    const i = Math.round(Math.min(1, Math.max(0, tone)) * (this.table.length - 1));
    return this.table[i];
  }
};
var GlyphAtlas = class {
  constructor(family) {
    this.family = family;
    this.tiles = /* @__PURE__ */ new Map();
    this.px = 0;
  }
  setCell(cellPx) {
    if (cellPx === this.px) return;
    this.px = cellPx;
    this.tiles.clear();
    const g = document.createElement("canvas").getContext("2d");
    g.font = fontCss(Math.round(cellPx * 0.86), this.family);
    const m = g.measureText("\u56FD");
    this.baseline = cellPx / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  }
  get(glyph, color) {
    const key = glyph + color;
    let tile = this.tiles.get(key);
    if (tile) return tile;
    if (this.tiles.size > 6e3) this.tiles.clear();
    const px = this.px;
    tile = document.createElement("canvas");
    tile.width = tile.height = px;
    const g = tile.getContext("2d");
    g.font = fontCss(Math.round(px * 0.86), this.family);
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillStyle = color;
    g.fillText(glyph, px / 2, this.baseline);
    this.tiles.set(key, tile);
    return tile;
  }
};

// vendor/ascii-kanji-sharks/util.js
var TAU2 = Math.PI * 2;
var clamp2 = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
function hash(x, y, z) {
  let h = Math.imul(x | 0, 668265261) ^ Math.imul(y | 0, 374761393) ^ Math.imul(z | 0, 2654435761);
  h = Math.imul(h ^ h >>> 15, 2246822507);
  h = Math.imul(h ^ h >>> 13, 3266489909);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}

// vendor/ascii-kanji-sharks/painter.js
var FISH_GLYPHS = ["\u9C2F", "\u9C0A", "\u9BF5", "\u9BD6", "\u9C2F"];
function palette(from, to, steps) {
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const c = from.map((v, k) => Math.round(v + (to[k] - v) * t));
    out.push(`rgb(${c[0]},${c[1]},${c[2]})`);
  }
  return out;
}
var THEMES = {
  night: {
    bg: "#03070d",
    vignette: "rgba(0,0,0,0.6)",
    grid: "rgba(120,160,220,0.05)",
    skin: palette([34, 48, 70], [230, 240, 252], 16),
    fill: palette([12, 20, 33], [40, 56, 80], 8),
    fish: palette([48, 64, 88], [176, 196, 222], 8),
    wake: palette([16, 52, 78], [110, 216, 250], 8),
    red: "#ff5b3a",
    eye: "#ffc861",
    glint: "#ffffff"
  },
  paper: {
    bg: "#f1e9d6",
    vignette: "rgba(110,80,40,0.2)",
    grid: "rgba(196,72,52,0.14)",
    skin: palette([196, 188, 172], [16, 15, 14], 16),
    fill: palette([228, 219, 200], [200, 189, 169], 8),
    fish: palette([176, 168, 152], [48, 45, 42], 8),
    wake: palette([206, 206, 196], [64, 100, 140], 8),
    red: "#c4302a",
    eye: "#c4302a",
    glint: "#2f4a8a"
  }
};
var NONE = 0;
var BODY = 1;
var DORSAL = 4;
var PECTORAL = 5;
var TAIL = 7;
var LAYER_WAKE = 1;
var LAYER_FISH = 2;
var LAYER_SHARK = 3;
var SUBSAMPLES2 = [-0.28, -0.28, 0.28, -0.28, -0.28, 0.28, 0.28, 0.28];
var LIGHT_X = -0.6;
var LIGHT_Y = -0.8;
var at = (list, tone) => list[Math.round(clamp2(tone, 0, 1) * (list.length - 1))];
var Painter = class {
  constructor(canvas, gridScale = 1) {
    this.shape = humpback;
    this.gridScale = gridScale;
    this.bodySwing = 1;
    this.cell = cellSize(gridScale, true)[0];
    this.wake = 1;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    this.bg = document.createElement("canvas");
    this.setFontFamily(getComputedStyle(canvas).fontFamily);
    this.theme = THEMES.paper;
    this.cols = 0;
    this.rows = 0;
    this.frame = 0;
    this.touched = [];
    this.fx = [];
    this.spine = new Float32Array(SHARK_NODES * 2);
    this.arc = new Float32Array(SHARK_NODES);
    this.arcTotal = 1;
    this.finLeft = 0;
    this.finRight = 0;
    this.hitS = 0;
    this.hitD = 0;
    this.hitSide = 1;
    this.hitTx = 1;
    this.hitTy = 0;
  }
  setFontFamily(family) {
    this.atlas = new GlyphAtlas(family);
    this.ramp = new InkRamp(family);
    if (this.dpr) this.atlas.setCell(Math.round(this.cell * this.dpr));
  }
  get cellWidth() {
    return this.cell;
  }
  get cellHeight() {
    return this.cell;
  }
  setTheme(dark, gridOpacity = 0.05, wake = 1, color = "#4d6bfe", eyeColor = "primary") {
    this.wake = wake;
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    this.theme = {
      ...THEMES[dark ? "night" : "paper"],
      grid: `rgba(128,128,128,${gridOpacity})`,
      eye: eyeColor === "primary" ? color : eyeColor === "black" ? "#ffffff" : "#181818",
      eyeFill: eyeColor === "primary" ? null : eyeColor === "black" ? "#000000" : "#ffffff",
      skin: palette(rgb.map((v) => v * 0.45), rgb.map((v) => v + (255 - v) * 0.35), 16),
      fill: Array(8).fill(null),
      fish: palette(rgb.map((v) => v * 0.6), rgb, 8),
      wake: palette(rgb.map((v) => v * 0.6), rgb, 8)
    };
    this.paintBackground();
  }
  resize(width, height, dpr) {
    const cell = cellSize(this.gridScale, true)[0];
    this.width = width;
    this.height = height;
    this.cell = cell;
    this.dpr = dpr;
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    this.atlas.setCell(Math.round(cell * dpr));
    const n = this.cols * this.rows;
    this.layer = new Uint8Array(n);
    this.depth = new Float32Array(n);
    this.stamp = new Uint32Array(n);
    this.glyph = new Array(n).fill("");
    this.color = new Array(n).fill("");
    this.fill = new Array(n).fill(null);
    this.alpha = new Float32Array(n);
    this.energy = new Float32Array(n);
    this.energyNext = new Float32Array(n);
    this.touched.length = 0;
    this.fx.length = 0;
    this.paintBackground();
  }
  paintBackground() {
    const g = this.bg.getContext("2d");
    if (!g || !this.cols) return;
    const { theme, cell, dpr } = this;
    const W = this.bg.width;
    const H = this.bg.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = theme.grid;
    g.lineWidth = 1;
    g.beginPath();
    for (let c = 0; c <= this.cols; c++) {
      const x = Math.round(c * cell * dpr) + 0.5;
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    for (let r = 0; r <= this.rows; r++) {
      const y = Math.round(r * cell * dpr) + 0.5;
      g.moveTo(0, y);
      g.lineTo(W, y);
    }
    g.stroke();
  }
  render(ocean, dt) {
    if (!this.cols) return;
    this.frame++;
    this.touched.length = 0;
    this.consumeEvents(ocean);
    this.depositWake(ocean, dt);
    for (const sh of ocean.sharks) this.rasterShark(sh, ocean.time);
    this.placeFish(ocean);
    this.placeWake();
    this.draw(ocean.time, dt);
  }
  // ── cells ───────────────────────────────────────────────────────────
  cellAt(x, y) {
    const c = Math.floor(x / this.cell);
    const r = Math.floor(y / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }
  /** Claim a cell; higher layers win, and within a layer the nearer thing wins. */
  put(i, layer, depth, glyph, color, fill = null) {
    if (this.stamp[i] !== this.frame) {
      this.stamp[i] = this.frame;
      this.layer[i] = 0;
      this.touched.push(i);
    } else if (layer < this.layer[i] || layer === this.layer[i] && depth < this.depth[i]) {
      return;
    }
    this.layer[i] = layer;
    this.depth[i] = depth;
    this.glyph[i] = glyph;
    this.color[i] = color;
    this.fill[i] = fill;
  }
  // ── sharks ──────────────────────────────────────────────────────────
  /** Which part of the current shark (if any) the point lands on. */
  classify(px, py, L) {
    const { spine, arc } = this;
    let best = Infinity;
    let bestS = 0;
    for (let k = 0; k < SHARK_NODES - 1; k++) {
      const ax = spine[k * 2];
      const ay = spine[k * 2 + 1];
      const sx = spine[k * 2 + 2] - ax;
      const sy = spine[k * 2 + 3] - ay;
      const len2 = sx * sx + sy * sy || 1;
      const t = clamp2(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const d2 = (px - ax - sx * t) ** 2 + (py - ay - sy * t) ** 2;
      if (d2 < best) {
        best = d2;
        const len = Math.sqrt(len2);
        bestS = (arc[k] + t * len) / this.arcTotal;
        this.hitSide = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        this.hitTx = sx / len;
        this.hitTy = sy / len;
      }
    }
    const d = Math.sqrt(best);
    const s = bestS;
    const w = this.shape.halfWidth(s) * L;
    this.hitS = s;
    this.hitD = d;
    if (d <= w && s <= 0.945) {
      const across = d / (w || 1);
      if (s > this.shape.dorsal[0] && s < this.shape.dorsal[1] && across < 0.3) return DORSAL;
      return BODY;
    }
    const reach = this.hitSide > 0 ? this.finRight : this.finLeft;
    if (this.shape === orca ? orcaFlipper(s, d, reach) : humpbackFlipper(s, d, reach)) return PECTORAL;
    if (whaleFlukes(s, d / L)) return TAIL;
    return NONE;
  }
  /** The render spine: the sim spine plus a travelling wave that grows toward the tail. */
  buildSpine(sh) {
    this.shape = sh.kind === "orca" ? orca : humpback;
    const { spine, arc } = this;
    const n = sh.nodes;
    const L = sh.length;
    const beat = clamp2(sh.speed / 60, 0.4, 1.4);
    for (let k = 0; k < SHARK_NODES; k++) {
      const s = k / (SHARK_NODES - 1);
      const a = Math.max(0, k - 1);
      const b = Math.min(SHARK_NODES - 1, k + 1);
      let tx = n[a * 2] - n[b * 2];
      let ty = n[a * 2 + 1] - n[b * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const off = L * 0.05 * (0.1 + 0.9 * Math.pow(s, 1.8)) * beat * this.bodySwing * Math.sin(sh.phase - s * 5.2);
      spine[k * 2] = n[k * 2] - ty * off;
      spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
    }
    arc[0] = 0;
    for (let k = 1; k < SHARK_NODES; k++) {
      arc[k] = arc[k - 1] + Math.hypot(spine[k * 2] - spine[k * 2 - 2], spine[k * 2 + 1] - spine[k * 2 - 1]);
    }
    this.arcTotal = arc[SHARK_NODES - 1] || 1;
    const bank = clamp2(sh.turn * 0.45, -0.35, 0.35);
    const flex = 1 + 0.06 * Math.sin(sh.phase * 0.5);
    this.finRight = L * this.shape.pectoral[3] * flex * (1 - bank);
    this.finLeft = L * this.shape.pectoral[3] * flex * (1 + bank);
  }
  /** One eye per side, each exactly one cell, set on the head after the body is drawn. */
  placeEyes(sh) {
    const { spine, arc } = this;
    const s = 0.1;
    const target = s * this.arcTotal;
    let k = 0;
    while (k < SHARK_NODES - 2 && arc[k + 1] < target) k++;
    const seg = arc[k + 1] - arc[k] || 1;
    const t = (target - arc[k]) / seg;
    const tx = (spine[k * 2 + 2] - spine[k * 2]) / seg;
    const ty = (spine[k * 2 + 3] - spine[k * 2 + 1]) / seg;
    const x = spine[k * 2] + (spine[k * 2 + 2] - spine[k * 2]) * t;
    const y = spine[k * 2 + 1] + (spine[k * 2 + 3] - spine[k * 2 + 1]) * t;
    const off = this.shape.halfWidth(s) * sh.length * 0.62;
    for (const side of [-1, 1]) {
      const i = this.cellAt(x - ty * off * side, y + tx * off * side);
      if (i >= 0 && this.stamp[i] === this.frame && this.layer[i] === LAYER_SHARK) {
        this.put(i, LAYER_SHARK, sh.depth, PART.eye, this.theme.eye, this.theme.eyeFill ?? this.fill[i]);
      }
    }
  }
  rasterShark(sh, time) {
    const { cell, cols, rows, spine, theme, ramp } = this;
    const L = sh.length;
    this.buildSpine(sh);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < SHARK_NODES; k++) {
      minX = Math.min(minX, spine[k * 2]);
      maxX = Math.max(maxX, spine[k * 2]);
      minY = Math.min(minY, spine[k * 2 + 1]);
      maxY = Math.max(maxY, spine[k * 2 + 1]);
    }
    const reach = Math.max(L * 0.3, this.finLeft, this.finRight);
    const c0 = Math.max(0, Math.floor((minX - reach) / cell));
    const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cell));
    const r0 = Math.max(0, Math.floor((minY - reach) / cell));
    const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / cell));
    const skip = reach + cell;
    const dim = 0.6 + 0.4 * sh.depth;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = (c + 0.5) * cell;
        const y = (r + 0.5) * cell;
        const part = this.classify(x, y, L);
        if (part === NONE && this.hitD > skip) continue;
        const s = this.hitS;
        const d = this.hitD;
        const side = this.hitSide;
        const tx = this.hitTx;
        const ty = this.hitTy;
        let hits = part === NONE ? 0 : 1;
        for (let k = 0; k < SUBSAMPLES2.length; k += 2) {
          if (this.classify(x + SUBSAMPLES2[k] * cell, y + SUBSAMPLES2[k + 1] * cell, L) !== NONE) hits++;
        }
        if (hits === 0) continue;
        const coverage = hits / 5;
        const i = r * cols + c;
        const key = Math.floor(hash(Math.round(s * L / cell), Math.round(side * d / cell), sh.id) * 1e9);
        if (part === NONE || coverage < 0.6) {
          this.put(i, LAYER_SHARK, sh.depth, this.stroke(tx, ty), at(theme.skin, (0.2 + 0.3 * coverage) * dim));
          continue;
        }
        let glyph;
        let tone;
        let color = null;
        if (part === BODY) {
          const across = d / (this.shape.halfWidth(s) * L || 1);
          const facing = (-ty * side * LIGHT_X + tx * side * LIGHT_Y) * across;
          tone = 1 - 0.95 * Math.pow(across, 1.6) + 0.18 * facing + (key % 7 - 3) * 0.02;
          glyph = ramp.pick(tone);
          if (tone > 0.55 && key % 23 === 0) glyph = PART.name;
          if (tone > 0.45 && hash(key, Math.floor(time * 2.5), 3) < 0.025) color = theme.glint;
        } else if (part === DORSAL) {
          glyph = PART.fin;
          tone = 1;
        } else if (part === PECTORAL) {
          glyph = PART.fin;
          const finReach = side > 0 ? this.finRight : this.finLeft;
          tone = 0.42 + 0.25 * (1 - clamp2(d / finReach, 0, 1));
        } else {
          glyph = PART.tail;
          tone = 0.55;
        }
        color ??= at(theme.skin, tone * dim);
        const patch = this.shape === orca && part === BODY && orcaPatch(s, d / (this.shape.halfWidth(s) * L || 1));
        this.put(i, LAYER_SHARK, sh.depth, glyph, patch ? "#181818" : color, patch ? "#f5f5f0" : at(theme.fill, tone * dim));
      }
    }
    this.placeEyes(sh);
  }
  /** One brush stroke along the outline's on-screen direction. */
  stroke(tx, ty) {
    let a = Math.atan2(ty, tx);
    if (a < 0) a += Math.PI;
    const deg = a * 180 / Math.PI;
    if (deg < 22.5 || deg >= 157.5) return STROKE.flat;
    if (deg < 67.5) return STROKE.down;
    if (deg < 112.5) return STROKE.upright;
    return STROKE.up;
  }
  // ── fish & water ────────────────────────────────────────────────────
  placeFish(ocean) {
    const { theme } = this;
    for (const f of ocean.fish) {
      if (!f.alive) continue;
      const i = this.cellAt(f.x, f.y);
      if (i < 0) continue;
      const tone = 0.2 + 0.6 * ((f.depth - 0.5) / 0.5) + 0.35 * f.alarm;
      this.put(i, LAYER_FISH, f.depth, FISH_GLYPHS[f.species], at(theme.fish, tone));
    }
  }
  depositWake(ocean, dt) {
    const { energy } = this;
    const u = this.cell;
    for (const f of ocean.fish) {
      if (!f.alive) continue;
      const i = this.cellAt(f.x, f.y);
      if (i >= 0) energy[i] = Math.min(1.5, energy[i] + 8e-3 + f.alarm * 0.025);
    }
    for (const sh of ocean.sharks) {
      for (let k = SHARK_NODES - 5; k < SHARK_NODES; k++) {
        const i = this.cellAt(sh.nodes[k * 2], sh.nodes[k * 2 + 1]);
        if (i >= 0) energy[i] = Math.min(1.5, energy[i] + 0.05 + sh.speed / u * 4e-3);
      }
    }
    if (ocean.pointer.active) this.splashEnergy(ocean.pointer.x, ocean.pointer.y, 1, 0.06);
    const { cols, rows, energyNext: next } = this;
    const fade = Math.exp(-dt * 1.4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const e = energy[i];
        const l = c > 0 ? energy[i - 1] : e;
        const rt = c < cols - 1 ? energy[i + 1] : e;
        const up = r > 0 ? energy[i - cols] : e;
        const dn = r < rows - 1 ? energy[i + cols] : e;
        next[i] = (e * 4 + l + rt + up + dn) * 0.125 * fade;
      }
    }
    this.energyNext = energy;
    this.energy = next;
  }
  splashEnergy(x, y, radius, amount) {
    const c0 = Math.floor(x / this.cell);
    const r0 = Math.floor(y / this.cell);
    for (let r = r0 - radius; r <= r0 + radius; r++) {
      for (let c = c0 - radius; c <= c0 + radius; c++) {
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
        const d = Math.hypot(c - c0, r - r0);
        if (d > radius + 0.5) continue;
        const i = r * this.cols + c;
        this.energy[i] = Math.min(1.5, this.energy[i] + amount * (1 - d / (radius + 1)));
      }
    }
  }
  placeWake() {
    const { energy, theme } = this;
    for (let i = 0; i < energy.length; i++) {
      const e = energy[i] * this.wake;
      if (e < 0.3) continue;
      if (this.stamp[i] === this.frame) continue;
      const glyph = e > 0.95 ? WAKE2[2] : e > 0.6 ? WAKE2[1] : WAKE2[0];
      this.put(i, LAYER_WAKE, 0, glyph, at(theme.wake, (e - 0.3) / 0.9));
    }
  }
  // ── effects ─────────────────────────────────────────────────────────
  consumeEvents(ocean) {
    const { cell } = this;
    const cols = Math.floor(this.width / cell);
    const rows = Math.floor(this.height / cell);
    for (const e of ocean.events) {
      const col = Math.floor(e.x / cell);
      const row = Math.floor(e.y / cell);
      if (e.kind === "eat") {
        this.addFx(col, row, EAT, 0, 0.9);
        for (const [dc, dr] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.addFx(col + dc, row + dr, SPARK, 0.04, 0.45);
        this.splashEnergy(e.x, e.y, 2, 0.8);
        const text = [...SFX.chomp];
        const start = clamp2(col + 1, 0, cols - text.length);
        const r = clamp2(row - 1, 0, rows - 1);
        text.forEach((ch, k) => this.addFx(start + k, r, ch, k * 0.06, 1.2));
      } else if (e.kind === "splash") {
        const text = [...SFX.splash];
        const start = clamp2(col - 1, 0, cols - text.length);
        const r = clamp2(row - 2, 0, rows - 1);
        text.forEach((ch, k) => this.addFx(start + k, r, ch, k * 0.06, 1));
        this.splashEnergy(e.x, e.y, 5, 1.4);
      }
    }
    ocean.events.length = 0;
  }
  addFx(col, row, glyph, delay, life) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    this.fx.push({ col, row, glyph, age: -delay, life });
  }
  // ── output ──────────────────────────────────────────────────────────
  draw(time, dt) {
    const { ctx, atlas, cell, dpr, cols, touched } = this;
    const px = atlas.px;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.bg, 0, 0);
    for (const i of touched) {
      const x = Math.round(i % cols * cell * dpr);
      const y = Math.round((i / cols | 0) * cell * dpr);
      const fill = this.fill[i];
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(x + 1, y + 1, px - 1, px - 1);
      }
      ctx.drawImage(atlas.get(this.glyph[i], this.color[i]), x, y);
    }
    const red = this.theme.red;
    let live = 0;
    for (const f of this.fx) {
      f.age += dt;
      if (f.age >= f.life) continue;
      this.fx[live++] = f;
      if (f.age < 0) continue;
      const x = Math.round(f.col * cell * dpr);
      const y = Math.round(f.row * cell * dpr);
      ctx.globalAlpha = 1 - (f.age / f.life) ** 2;
      ctx.clearRect(x, y, px, px);
      ctx.drawImage(atlas.get(f.glyph, red), x, y);
    }
    this.fx.length = live;
    ctx.globalAlpha = 1;
  }
};

// vendor/ascii-sharks/engine.ts
var STEP = 1 / 60;
var MAX_STEPS = 4;
/** Rendering cost is dominated by fillText per cell; 1.5 keeps glyphs sharp
    enough while cutting the pixel count to ~56% of a 2x canvas. */
var MAX_DPR = 1.5;
var ACTIVE_DPR = 1.0;
var HERO_FPS = 30;
var ACTIVE_FPS = 18;
/** Coarser edge sampling while a conversation is active; the whale is at
    0.2 opacity there, so the extra 4 sub-samples are invisible. */
var SUBSAMPLES_LOW = [0.28, 0.28, 0.72, 0.72];
var OceanEngine = class {
  constructor(canvas, sharks, speed = 1, dark = false, gridScale = 1, gridOpacity = 0.05, fishCount, wake = 1, color = "#4d6bfe", glyphMode = "ascii", colorfulShimmer = false, eyeColor = "primary", bodySwing = 1, turnAgility = 1, tailFrequency = 1) {
    this.canvas = canvas;
    this.speed = speed;
    this.world = new World(sharks, fishCount);
    this.renderer = glyphMode === "kanji" ? new Painter(canvas, gridScale) : new AsciiRenderer(canvas, dark, gridScale, gridOpacity, wake, glyphMode);
    if (this.renderer instanceof AsciiRenderer) this.renderer.setTheme(dark, gridOpacity, wake, color, colorfulShimmer, eyeColor);
    else this.renderer.setTheme(dark, gridOpacity, wake, color, eyeColor);
    this.renderer.bodySwing = bodySwing;
    this.world.turnAgility = turnAgility;
    this.world.tailFrequency = tailFrequency;
    this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);
    this.reducedMotion.addEventListener("change", this.onMotionPreference);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("blur", this.onPointerLeave);
    window.addEventListener("blur", this.onWindowBlur);
    window.addEventListener("focus", this.onWindowFocus);
    document.addEventListener("visibilitychange", this.scheduleVisibility);
    this.resize();
    document.fonts?.load(`${glyphMode !== "ascii" ? 400 : 600} 16px ${getComputedStyle(canvas).fontFamily}`, glyphMode !== "ascii" ? "\u9CB8\u76EE\u9CCD\u5C3E\u9BAB\u9C13\u9C2D\u9C2F\u9C0A\u9BF5\u9BD6" : "S8@").then(() => {
      if (this.disposed) return;
      this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
      if (this.reducedMotion.matches) this.drawStill();
    }).catch(() => {
    });
    this.schedule();
  }
  world;
  renderer;
  raf = 0;
  last = 0;
  lastTick = 0;
  maxFps = HERO_FPS;
  maxDpr = MAX_DPR;
  lowDetail = false;
  focused = true;
  acc = 0;
  visible = true;
  reducedMotion;
  resizeObserver;
  intersectionObserver;
  disposed = false;
  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.reducedMotion.removeEventListener("change", this.onMotionPreference);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("blur", this.onPointerLeave);
    window.removeEventListener("blur", this.onWindowBlur);
    window.removeEventListener("focus", this.onWindowFocus);
    document.removeEventListener("visibilitychange", this.scheduleVisibility);
  }
  setMaxDpr(dpr) {
    const next = Math.max(1, Math.min(2, Number(dpr) || MAX_DPR));
    if (next === this.maxDpr) return;
    this.maxDpr = next;
    this.resize();
  }
  setDetail(low) {
    if (this.renderer) this.renderer.lowDetail = !!low;
  }
  setMaxFps(fps) {
    const next = Math.max(1, Math.min(120, Number(fps) || HERO_FPS));
    if (next === this.maxFps) return;
    this.maxFps = next;
    this.lastTick = 0;
  }
  setAppearance(speed, dark, gridOpacity = 0.05, wake = 1, color = "#4d6bfe", colorfulShimmer = false, eyeColor = "primary", bodySwing = 1, turnAgility = 1, tailFrequency = 1) {
    this.speed = speed;
    this.renderer.bodySwing = bodySwing;
    this.world.turnAgility = turnAgility;
    this.world.tailFrequency = tailFrequency;
    if (this.renderer instanceof AsciiRenderer) this.renderer.setTheme(dark, gridOpacity, wake, color, colorfulShimmer, eyeColor);
    else this.renderer.setTheme(dark, gridOpacity, wake, color, eyeColor);
    if (this.reducedMotion.matches) this.drawStill();
  }
  scheduleVisibility = () => this.schedule();
  onWindowBlur = () => {
    this.focused = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  };
  onWindowFocus = () => {
    this.focused = true;
    this.schedule();
  };
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr || MAX_DPR);
    this.renderer.resize(rect.width, rect.height, dpr);
    this.world.resize(rect.width, rect.height, this.renderer.cellWidth, this.renderer.cellHeight);
    if (this.reducedMotion.matches) this.drawStill();
  }
  schedule() {
    cancelAnimationFrame(this.raf);
    if (this.disposed || !this.visible || !this.focused || document.hidden || this.reducedMotion.matches) return;
    this.last = performance.now();
    this.lastTick = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  frame = (now) => {
    // Frame cap: rendering 17k glyphs at 60fps is the dominant CPU cost.
    // 30fps in hero and 24fps in conversation are visually sufficient.
    if (this.lastTick && now - this.lastTick < 1000 / this.maxFps - 1.5) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const dt = Math.min(0.1, (now - this.last) / 1e3);
    this.last = now;
    this.lastTick = now;
    this.acc += dt * this.speed;
    let steps = 0;
    const maxSteps = Math.ceil(MAX_STEPS * Math.max(1, this.speed));
    while (this.acc >= STEP && steps < maxSteps) {
      this.world.step(STEP, STEP * 0.65 / this.speed);
      this.acc -= STEP;
      steps++;
    }
    if (steps === maxSteps) this.acc = 0;
    this.render(dt * this.speed);
    this.raf = requestAnimationFrame(this.frame);
  };
  render(dt) {
    this.renderer.render(this.world, dt);
  }
  /** Reduced motion: let the ecosystem settle, then show a single frame. */
  drawStill() {
    if (this.world.time < 4) {
      for (let i = 0; i < 240; i++) this.world.step(STEP, STEP * 0.65 / this.speed);
    }
    this.render(STEP);
  }
  onMotionPreference = () => {
    if (this.reducedMotion.matches) {
      cancelAnimationFrame(this.raf);
      this.drawStill();
    } else {
      this.schedule();
    }
  };
  toLocal(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    return { x, y, inside };
  }
  onPointerMove = (e) => {
    const { x, y, inside } = this.toLocal(e);
    const p = this.world.pointer;
    p.x = x;
    p.y = y;
    p.active = inside && e.pointerType !== "touch";
  };
  onPointerDown = (e) => {
    const { x, y, inside } = this.toLocal(e);
    if (inside && !this.reducedMotion.matches) this.world.splash(x, y);
  };
  onPointerLeave = () => {
    this.world.pointer.active = false;
  };
};



    /* =====================================================================
     * Settings model (upstream dsh-ascii-whales options + tide controls)
     * ===================================================================*/
    const NS = "whale-tide";
    const STORAGE_KEY = "dsh-whale-tide:v1";
    const SCHEME_KEY = "dsh-whale-tide:scheme";
    const SCHEMA_KEY = "dsh-whale-tide:schema";
    const SCHEMA_VERSION = "2";

    const DEFAULTS = {
      // ── tide (this plugin) ────────────────────────────────────────────
      enabled: true,
      density: 0.65,
      opacity: 1,
      conversationOpacity: 0.20,
      conversationDensity: 0.3,
      followTheme: true,
      // ── whale ─────────────────────────────────────────────────────────
      count: 3,
      species: "humpback",
      size: 1.2,
      bodySwing: 0.8,
      turnAgility: 0.7,
      tailFrequency: 0.8,
      // ── ocean ─────────────────────────────────────────────────────────
      speed: 0.65,
      color: "#4d6bfe",
      colorfulShimmer: false,
      eyeColor: "primary",
      wake: 1,
      gridScale: 1,
      gridOpacity: 0.05,
      fishCount: 170,
      glyphMode: "ascii",
      // ── frosted composer ──────────────────────────────────────────────
      glass: true,
      blur: 14,
      glassOpacity: 0.45,
    };

    /** [min, max, step] — upstream ranges, plus this plugin's tide ratios. */
    const RANGES = {
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
    };

    const OPTIONS = {
      species: ["humpback", "orca"],
      eyeColor: ["primary", "black", "white"],
      glyphMode: ["ascii", "hanzi"],
    };

    const BOOLEAN_KEYS = ["enabled", "followTheme", "colorfulShimmer", "glass"];
    const NUMERIC_KEYS = Object.keys(RANGES);

    /** Changing these needs a fresh engine; everything else applies live. */
    const REBUILD_KEYS = ["count", "species", "size", "fishCount"];

    const GROUPS = [
      { id: "tide", keys: ["enabled", "opacity", "density", "conversationOpacity", "conversationDensity", "followTheme"] },
      { id: "whale", keys: ["count", "species", "size", "bodySwing", "turnAgility", "tailFrequency"] },
      { id: "ocean", keys: ["speed", "color", "colorfulShimmer", "eyeColor", "wake", "gridScale", "gridOpacity", "fishCount", "glyphMode"] },
      { id: "glass", keys: ["glass", "blur", "glassOpacity"] },
    ];

    function clampSetting(value, lo, hi) {
      return value < lo ? lo : value > hi ? hi : value;
    }

    function toNumber(value, fallback, min, max) {
      const raw = value;
      if (raw === null || raw === "" || typeof raw === "boolean") return fallback;
      const n = Number(raw);
      if (!Number.isFinite(n)) return fallback;
      return clampSetting(n, min, max);
    }

    function normalizeSettings(value) {
      const out = { ...DEFAULTS };
      if (!value || typeof value !== "object" || Array.isArray(value)) return out;
      for (const key of BOOLEAN_KEYS) {
        if (typeof value[key] === "boolean") out[key] = value[key];
      }
      for (const key of NUMERIC_KEYS) {
        out[key] = toNumber(value[key], DEFAULTS[key], RANGES[key][0], RANGES[key][1]);
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

    /**
     * 0.4.1: 0.10 turned out to be nearly invisible on real displays (blue at
     * 10% over white is ~#eef0ff). 0.20 keeps the whales visible without any
     * halo. Migrate both old defaults once, keyed by a schema marker, so a
     * value the user chose afterwards is never rewritten.
     */
    function migrateSettings(value, schemaOld) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      const out = { ...value };
      if (schemaOld && (out.conversationOpacity === 0.16 || out.conversationOpacity === 0.10)) {
        out.conversationOpacity = 0.20;
      }
      return out;
    }

    function loadSettings() {
      try {
        const schemaOld = window.localStorage.getItem(SCHEMA_KEY) !== SCHEMA_VERSION;
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          try {
            window.localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
          } catch (error) {
            /* optional */
          }
          return { ...DEFAULTS };
        }
        const parsed = JSON.parse(raw);
        const migrated = migrateSettings(parsed, schemaOld);
        if (migrated !== parsed || schemaOld) {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            window.localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
          } catch (error) {
            /* keep the in-memory migration */
          }
        }
        return normalizeSettings(migrated);
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
            /* a broken panel must not break the backdrop */
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
     * Ocean adapter — upstream engine + this plugin's tide ratios
     * ===================================================================*/
    const WHALE_SIZE_STEPS = [1, 0.7, 0.84, 0.77, 0.65, 0.9];

    function createOcean(canvas, options) {
      const opts = options || {};
      const settings = normalizeSettings(opts.settings);
      let dark = opts.theme === "dark";
      let phase = opts.phase === "active" ? "active" : "hero";
      let engine = null;
      let disposed = false;
      const onStats = typeof opts.onStats === "function" ? opts.onStats : null;
      const stats = { frames: 0, last: performance.now(), fps: 0 };

      function ratio() {
        const hero = clampSetting(settings.density, 0, 1);
        const ebb = clampSetting(settings.conversationDensity, 0, 1);
        return phase === "active" ? hero * ebb : hero;
      }

      function whaleSpecs() {
        const count = clampSetting(Math.round(settings.count), 1, 20);
        const kind = settings.species === "orca" ? "orca" : "whale";
        return Array.from({ length: count }, (_, i) => ({
          kind,
          size: settings.size * WHALE_SIZE_STEPS[i % WHALE_SIZE_STEPS.length],
        }));
      }

      function applyFont() {
        if (!engine) return;
        try {
          engine.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
        } catch (error) {
          /* keep the previous family */
        }
      }

      function build() {
        if (disposed) return;
        if (engine) {
          try {
            engine.destroy();
          } catch (error) {
            /* already gone */
          }
          engine = null;
        }
        engine = new OceanEngine(
          canvas,
          whaleSpecs(),
          settings.speed,
          dark,
          settings.gridScale,
          settings.gridOpacity,
          settings.fishCount,
          settings.wake,
          settings.color,
          settings.glyphMode,
          settings.colorfulShimmer,
          settings.eyeColor,
          settings.bodySwing,
          settings.turnAgility,
          settings.tailFrequency,
        );
        engine.renderer.fishRatio = ratio();
        if (typeof engine.setDetail === "function") engine.setDetail(phase === "active");
        if (typeof engine.setMaxDpr === "function") engine.setMaxDpr(phase === "active" ? ACTIVE_DPR : MAX_DPR);
        if (typeof engine.setMaxFps === "function") engine.setMaxFps(phase === "active" ? ACTIVE_FPS : HERO_FPS);
        const baseRender = engine.render.bind(engine);
        engine.render = (dt) => {
          baseRender(dt);
          stats.frames++;
        };
        applyFont();
        if (opts.reducedMotion) {
          engine.reducedMotion = { matches: true, addEventListener() {}, removeEventListener() {} };
          cancelAnimationFrame(engine.raf);
          engine.raf = 0;
          engine.drawStill();
        }
      }

      function apply() {
        if (!engine || disposed) return;
        engine.setAppearance(
          settings.speed,
          dark,
          settings.gridOpacity,
          settings.wake,
          settings.color,
          settings.colorfulShimmer,
          settings.eyeColor,
          settings.bodySwing,
          settings.turnAgility,
          settings.tailFrequency,
        );
        engine.renderer.fishRatio = ratio();
        if (engine.renderer.glyphMode !== settings.glyphMode) {
          engine.renderer.glyphMode = settings.glyphMode;
          applyFont();
          engine.resize();
        }
        if (Math.abs(engine.renderer.gridScale - settings.gridScale) > 1e-6) {
          engine.renderer.gridScale = settings.gridScale;
          engine.resize();
        }
      }

      build();

      const statsTimer = window.setInterval(() => {
        if (!onStats || disposed) return;
        const now = performance.now();
        stats.fps = Math.round((stats.frames * 1000) / Math.max(1, now - stats.last));
        stats.frames = 0;
        stats.last = now;
        const world = engine && engine.world;
        const total = world && world.fish ? world.fish.length : 0;
        onStats({
          fps: stats.fps,
          fish: Math.ceil(total * ratio()),
          targetFish: total,
          whales: world && world.sharks ? world.sharks.length : 0,
          cells: engine && engine.renderer ? engine.renderer.cols * engine.renderer.rows : 0,
          active: phase === "active",
          reducedMotion: !!(engine && engine.reducedMotion && engine.reducedMotion.matches),
        });
      }, 500);

      return {
        ready: Promise.resolve(),
        rebuild: build,
        setSettings(next) {
          const before = { ...settings };
          Object.assign(settings, normalizeSettings({ ...settings, ...(next || {}) }));
          if (REBUILD_KEYS.some((key) => before[key] !== settings[key])) {
            build();
          } else {
            apply();
          }
        },
        setTheme(theme) {
          dark = theme === "dark";
          apply();
        },
        setPhase(next) {
          phase = next === "active" ? "active" : "hero";
          if (engine) {
            engine.renderer.fishRatio = ratio();
            if (typeof engine.setDetail === "function") engine.setDetail(phase === "active");
            if (typeof engine.setMaxDpr === "function") engine.setMaxDpr(phase === "active" ? ACTIVE_DPR : MAX_DPR);
            if (typeof engine.setMaxFps === "function") engine.setMaxFps(phase === "active" ? ACTIVE_FPS : HERO_FPS);
          }
        },
        destroy() {
          disposed = true;
          window.clearInterval(statsTimer);
          if (engine) {
            try {
              engine.destroy();
            } catch (error) {
              /* already gone */
            }
            engine = null;
          }
        },
      };
    }

    /* =====================================================================
     * Locale
     * ===================================================================*/
    const ZH = {
      title: "鲸汐",
      description: "让鲸群与鱼群在界面背后游动，进入对话时自动退潮。",
      sectionDescription: "游动、鲸鱼、鱼群、配色与磨砂输入框，全部取自 dsh-ascii-whales；退潮节奏来自 dsh-quiet。",
      groupTide: "潮汐与显示",
      groupWhale: "鲸鱼",
      groupOcean: "海洋与鱼群",
      groupGlass: "输入框磨砂",
      enabled: "显示背景",
      density: "生物密度",
      opacity: "整体透明度",
      conversationOpacity: "对话中透明度",
      conversationDensity: "对话中生物比例",
      followTheme: "深/浅色跟随",
      count: "鲸鱼数量",
      species: "鲸鱼种类",
      humpback: "座头鲸",
      orca: "虎鲸",
      size: "鲸鱼大小",
      bodySwing: "身体摆动幅度",
      turnAgility: "转弯灵活度",
      tailFrequency: "摆尾频率",
      speed: "游动速度",
      color: "主色",
      colorfulShimmer: "彩色闪烁",
      eyeColor: "眼睛底色",
      eyePrimary: "跟随主色",
      eyeBlack: "黑色",
      eyeWhite: "白色",
      wake: "尾迹强度",
      gridScale: "字符栅格",
      gridOpacity: "底纹网格透明度",
      fishCount: "鱼群数量",
      glyphMode: "字符风格",
      glyphAscii: "ASCII",
      glyphHanzi: "汉字",
      glass: "毛玻璃输入框",
      blur: "玻璃模糊",
      glassOpacity: "玻璃不透明度",
      hintEnabled: "关闭后移除背景层，界面恢复原生样式",
      hintDensity: "空会话中显示的鱼群比例",
      hintOpacity: "空会话中的背景不透明度",
      hintConversationOpacity: "进入对话后的背景不透明度（默认 0.20）",
      hintConversationDensity: "进入对话后保留的鱼群比例（默认 0.3）",
      hintFollowTheme: "开启时跟随 DSH 深浅色；关闭时固定为关闭时的深浅色",
      hintCount: "同时游动的鲸鱼数量",
      hintSpecies: "座头鲸更宽，虎鲸更修长",
      hintSize: "鲸鱼长度倍率",
      hintBodySwing: "身体行波幅度",
      hintTurnAgility: "转向跟随速度",
      hintTailFrequency: "摆尾节奏",
      hintSpeed: "0.1–10 倍速",
      hintColor: "鲸鱼、鱼群与尾迹的主色",
      hintColorfulShimmer: "在身体上叠加原版七色闪光",
      hintEyeColor: "眼睛深色底",
      hintWake: "尾迹与涟漪强度",
      hintGridScale: "字符格大小倍率",
      hintGridOpacity: "背景网格透明度",
      hintFishCount: "模拟的鱼群总数",
      hintGlyphMode: "ASCII 用等宽字符，汉字用衬线汉字",
      hintGlass: "空会话与对话中给输入框加磨砂",
      hintBlur: "磨砂模糊半径",
      hintGlassOpacity: "磨砂底色不透明度",
      reset: "恢复默认",
      saved: "已保存",
      saveError: "无法写入本地存储，本次修改仅在当前页面生效",
      resetDone: "已恢复默认",
    };

    const EN = {
      title: "Whale Tide",
      description: "A whale and fish schools drift behind the interface, ebbing in conversation.",
      sectionDescription: "Swimming, whales, fish, palette and frosted composer come from dsh-ascii-whales; the ebb rhythm comes from dsh-quiet.",
      groupTide: "Tide and display",
      groupWhale: "Whales",
      groupOcean: "Ocean and fish",
      groupGlass: "Composer glass",
      enabled: "Show background",
      density: "Creature density",
      opacity: "Opacity",
      conversationOpacity: "Opacity in conversation",
      conversationDensity: "Creature ratio in conversation",
      followTheme: "Follow light / dark",
      count: "Whale count",
      species: "Whale species",
      humpback: "Humpback",
      orca: "Orca",
      size: "Whale size",
      bodySwing: "Body swing",
      turnAgility: "Turn agility",
      tailFrequency: "Tail frequency",
      speed: "Swimming speed",
      color: "Accent color",
      colorfulShimmer: "Colorful shimmer",
      eyeColor: "Eye background",
      eyePrimary: "Follow accent",
      eyeBlack: "Black",
      eyeWhite: "White",
      wake: "Wake intensity",
      gridScale: "Cell size",
      gridOpacity: "Grid opacity",
      fishCount: "Fish count",
      glyphMode: "Character style",
      glyphAscii: "ASCII",
      glyphHanzi: "Hanzi",
      glass: "Frosted composer",
      blur: "Glass blur",
      glassOpacity: "Glass opacity",
      hintEnabled: "Turn off to remove the layer and restore the native interface.",
      hintDensity: "Share of the school shown in an empty conversation.",
      hintOpacity: "Layer opacity in an empty conversation.",
      hintConversationOpacity: "Layer opacity while a conversation is active (default 0.20).",
      hintConversationDensity: "Share of fish kept while a conversation is active (default 0.3).",
      hintFollowTheme: "On: follow DSH. Off: pin the mode active when switched off.",
      hintCount: "How many whales swim at once.",
      hintSpecies: "Humpback is broader; orca is longer and slimmer.",
      hintSize: "Whale length multiplier.",
      hintBodySwing: "Amplitude of the body wave.",
      hintTurnAgility: "How fast a whale follows a new heading.",
      hintTailFrequency: "Tail-beat rhythm.",
      hintSpeed: "0.1× to 10× the base speed.",
      hintColor: "Tints whale, fish and wake.",
      hintColorfulShimmer: "Adds the original seven-colour glints on the body.",
      hintEyeColor: "Dark backing behind each eye.",
      hintWake: "Strength of the wake and ripples.",
      hintGridScale: "Character cell size multiplier.",
      hintGridOpacity: "Background grid opacity.",
      hintFishCount: "Total simulated fish.",
      hintGlyphMode: "ASCII uses monospace; Hanzi uses a serif CJK face.",
      hintGlass: "Frost the composer in both the empty and conversation states.",
      hintBlur: "Backdrop blur radius.",
      hintGlassOpacity: "Tint opacity behind the composer.",
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
        /* the fallback dictionary keeps the panel readable */
      }
    }

    /* =====================================================================
     * Styles
     * ===================================================================*/
    const CSS_ID = "dsh-whale-tide/client.css";

    /**
     * Surface tokens used while the tide is in. Same set as dsh-quiet 0.3.0:
     * the conversation base goes transparent, cards become lightly frosted,
     * and menus stay opaque for readability.
     */
    const TOKENS = {
      "--dsw-alias-bg-base": { light: "transparent", dark: "transparent" },
      "--dsw-alias-bg-layer-1": { light: "rgba(255,255,255,0.84)", dark: "rgba(23,24,28,0.88)" },
      "--dsw-alias-bg-layer-2": { light: "#f7f8f9", dark: "#1b1d21" },
      "--dsw-alias-bg-layer-3": { light: "#ffffff", dark: "#202226" },
      "--dsw-specific-sidebar-fill": { light: "rgba(255,255,255,0.55)", dark: "rgba(20,21,24,0.60)" },
      "--dsw-specific-bubble": { light: "rgba(237,243,254,0.92)", dark: "rgba(44,44,46,0.90)" },
      "--dsw-alias-label-primary": { light: "#1f2329", dark: "#e6e7ea" },
      "--dsw-alias-label-secondary": { light: "#5b6472", dark: "#a6acb6" },
      "--dsw-alias-label-tertiary": { light: "#7c8593", dark: "#878d97" },
      "--dsw-alias-label-caption": { light: "#98a0ac", dark: "#71767f" },
      "--dsw-alias-border-l1": { light: "rgba(31,35,41,0.08)", dark: "rgba(230,231,234,0.08)" },
      "--dsw-alias-border-l2": { light: "rgba(31,35,41,0.12)", dark: "rgba(230,231,234,0.12)" },
      "--dsw-alias-border-l3": { light: "rgba(31,35,41,0.18)", dark: "rgba(230,231,234,0.16)" },
      "--dsw-alias-interactive-bg-hover": { light: "rgba(31,35,41,0.05)", dark: "rgba(230,231,234,0.06)" },
    };

    function installTokens(ctx) {
      try {
        const theme = ctx && typeof ctx.get === "function" ? ctx.get("theme") : null;
        if (theme && typeof theme.overrideTokens === "function" && typeof ctx.effect === "function") {
          ctx.effect(() => theme.overrideTokens("dsh-whale-tide", TOKENS), "dsh-whale-tide: palette");
        }
      } catch (error) {
        console.warn("[dsh-whale-tide] token override unavailable; CSS fallback in use");
      }
    }
    const CSS = `
/* ── the fixed ocean layer ───────────────────────────────────────────── */
.dsh-whale-tide-backdrop{
  position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  opacity:0;background:#fff;
  transition:opacity .6s cubic-bezier(.22,1,.36,1);
  --dshwt-blur:14px;
  --dshwt-glass-opacity:.45;
}
body[data-dsh-whale-tide="on"]{background:#fff}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-scheme="dark"]{background:#151517}
body[data-dsh-whale-tide-scheme="dark"] .dsh-whale-tide-backdrop{background:#151517}
.dsh-whale-tide-backdrop canvas{
  display:block;width:100%;height:100%;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}
.dsh-whale-tide-backdrop[data-glyph="hanzi"] canvas{
  font-family:"Songti SC","Noto Serif SC","Source Han Serif SC","Source Han Serif",serif;
}
@media (prefers-reduced-motion:reduce){.dsh-whale-tide-backdrop{transition:none}}

/* The conversation surface is normally opaque. Make only that surface
   transparent while this plugin is on, and keep the sidebar as soft glass,
   so the fixed ocean layer is actually visible. */
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
  --dsw-specific-sidebar-fill:rgba(21,21,23,.62)!important;
}
body[data-dsh-whale-tide="on"]:has([data-conversation-content]) div:has(> [data-slot="sidebar"]){
  -webkit-backdrop-filter:blur(10px);
  backdrop-filter:blur(10px);
}

/* ── frosted composer (hero only) ────────────────────────────────────── */
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="hero"][data-dsh-whale-tide-glass="on"] [data-composer-card]{
  isolation:isolate;background:transparent;
  --dsw-specific-input-major:transparent;
  border-color:rgba(128,128,128,.20);
  box-shadow:0 12px 36px #0000000d,inset 0 1px 0 #ffffff80;
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="hero"][data-dsh-whale-tide-glass="on"] [data-composer-card]::before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;
  background:rgba(255,255,255,var(--dshwt-glass-opacity,.45));
  -webkit-backdrop-filter:blur(var(--dshwt-blur,14px)) saturate(1.12);
  backdrop-filter:blur(var(--dshwt-blur,14px)) saturate(1.12);
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="hero"][data-dsh-whale-tide-glass="on"] [data-composer-card]{
  border-color:#ffffff2e;
  box-shadow:0 12px 36px #0003,inset 0 1px 0 #ffffff12;
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="hero"][data-dsh-whale-tide-glass="on"] [data-composer-card]::before{
  background:rgba(24,24,26,var(--dshwt-glass-opacity,.45));
}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="hero"][data-dsh-whale-tide-glass="on"] [data-composer-card]::before{background:rgba(255,255,255,.92)}
  body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="hero"][data-dsh-whale-tide-glass="on"] [data-composer-card]::before{background:rgba(24,24,26,.94)}
}

/* A soft halo keeps the hero copy readable where a whale passes under it;
   the active state uses a stronger version. */
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="hero"] [data-conversation-content]{
  text-shadow:0 0 2px rgba(255,255,255,.62),0 0 14px rgba(255,255,255,.42);
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="hero"] [data-conversation-content]{
  text-shadow:0 0 2px rgba(12,12,15,.82),0 0 16px rgba(12,12,15,.62);
}

/* ── composer and popovers while a conversation is active ──────────────
   dsh-quiet keeps a light frosted composer in conversation instead of
   handing it back to the native opaque surface. */
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-phase="active"][data-dsh-whale-tide-glass="on"] [data-composer-card]{
  background:rgba(255,255,255,.74);
  -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"][data-dsh-whale-tide-phase="active"][data-dsh-whale-tide-glass="on"] [data-composer-card]{
  background:rgba(27,28,32,.78);
}
/* The "+" and command popover share this menu; it must stay opaque. */
body[data-dsh-whale-tide="on"] [data-trigger-menu]{
  --dsw-specific-menu:#fff;background-color:#fff;
}
body[data-dsh-whale-tide="on"][data-dsh-whale-tide-ui="dark"] [data-trigger-menu]{
  --dsw-specific-menu:#1b1c20;background-color:#1b1c20;
}
/* 0.5px is one physical pixel at DPR>=2 (1px renders as two). */
@media (-webkit-min-device-pixel-ratio:2),(min-resolution:2dppx){
  body[data-dsh-whale-tide="on"] [data-composer-card],
  body[data-dsh-whale-tide="on"] [data-trigger-menu]{border-width:.5px}
}

/* ── settings section ───────────────────────────────────────────────── */
.dshwt-settings{display:grid;gap:18px;max-width:720px;width:100%;color:var(--dsw-alias-label-primary,inherit);font-size:14px;line-height:1.6}
.dshwt-head h2{margin:0 0 6px;font-size:20px;line-height:1.3;font-weight:650}
.dshwt-head p{margin:0;color:var(--dsw-alias-label-secondary,#5b6472);font-size:13.5px}
.dshwt-group{display:grid;gap:2px}
.dshwt-group-title{margin:2px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-card{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.18));border-radius:14px;background:var(--dsw-alias-bg-layer-1,transparent);padding:2px 18px}
.dshwt-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 0;border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.14))}
.dshwt-row:first-child{border-top:0}
.dshwt-label{display:flex;flex-direction:column;gap:2px;min-width:0}
.dshwt-name{font-weight:500}
.dshwt-hint{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-control{flex:none;display:flex;align-items:center;justify-content:flex-end;min-width:0;gap:8px}
.dshwt-switch{position:relative;width:40px;height:23px;border-radius:999px;border:0;background:var(--dsw-alias-border-l2,rgba(128,128,128,.3));cursor:pointer;flex:none;padding:0;transition:background .18s ease}
.dshwt-switch::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .18s ease}
.dshwt-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary,#4d6bfe)}
.dshwt-switch[aria-checked="true"]::after{transform:translateX(17px)}
.dshwt-switch:focus-visible,.dshwt-select:focus-visible,.dshwt-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:2px}
.dshwt-range{display:flex;align-items:center;gap:10px}
.dshwt-range input[type="range"]{width:158px;max-width:40vw;accent-color:var(--dsw-alias-brand-primary,#4d6bfe);height:20px;cursor:pointer}
.dshwt-value{min-width:46px;text-align:right;font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-select{font:inherit;font-size:13px;padding:5px 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary,inherit);cursor:pointer;max-width:180px}
.dshwt-color{display:flex;align-items:center;gap:9px}
.dshwt-color input[type="color"]{width:32px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));border-radius:7px;background:transparent;cursor:pointer}
.dshwt-color code{font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dshwt-button{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary,inherit);border-radius:9px;padding:8px 14px;cursor:pointer;font:inherit;font-size:13px}
.dshwt-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08))}
.dshwt-status{font-size:12px;color:var(--dsw-alias-label-tertiary,#7c8593);min-height:1.4em}
.dshwt-status[data-error]{color:var(--dsw-alias-state-error-primary,#d33)}
@media (max-width:640px){
  .dshwt-row{align-items:flex-start}
  .dshwt-range input[type="range"]{width:110px}
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

    function findChatNode() {
      try {
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

    function readPhase() {
      const chat = findChatNode();
      return chat && chat.getAttribute("data-content-phase") === "active" ? "active" : "hero";
    }

    /**
     * Resolve the host colour scheme from what DSH actually exposes.
     * `data-ds-theme-source` and `body[data-ds-dark-theme]` are the reliable
     * signals in 0.2.x; body background is NOT used because this plugin
     * overrides it.
     */
    function readHostScheme(themeService) {
      try {
        const snapshot = themeService && typeof themeService.getTheme === "function" ? themeService.getTheme() : null;
        const active = snapshot && snapshot.active;
        const scheme = active && (active.colorScheme || active.scheme);
        if (scheme === "dark" || scheme === "light") return scheme;
        const id = active && String(active.id || active.name || "");
        if (/dark/i.test(id)) return "dark";
        if (/light/i.test(id)) return "light";
      } catch (error) {
        /* fall through */
      }
      try {
        const root = document.documentElement;
        const body = document.body;
        const source = String(root.getAttribute("data-ds-theme-source") || "");
        if (/dark/i.test(source)) return "dark";
        if (/light/i.test(source)) return "light";
        if (body && body.hasAttribute("data-ds-dark-theme")) return "dark";
        const attr = String(root.getAttribute("data-theme") || root.getAttribute("data-color-scheme") || "");
        if (/dark/i.test(attr)) return "dark";
        if (/light/i.test(attr)) return "light";
        if (root.classList.contains("dark") || (body && body.classList.contains("dark"))) return "dark";
        const computed = getComputedStyle(root).colorScheme || "";
        if (computed.includes("dark") && !computed.includes("light")) return "dark";
        if (computed.includes("light") && !computed.includes("dark")) return "light";
      } catch (error) {
        /* fall through */
      }
      try {
        return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } catch (error) {
        return "light";
      }
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
      let phase = readPhase();
      let uiScheme = "light";
      let oceanScheme = "light";
      let raf = 0;
      let interval = 0;
      let phaseObserver = null;
      let themeObserver = null;
      let bodyObserver = null;
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

      function resolveOceanScheme() {
        return store.get().followTheme ? uiScheme : readPinnedScheme() || uiScheme;
      }

      function applyCssVars() {
        const settings = store.get();
        // The composer lives inside #root, so the variables must sit on body
        // to reach it; names are plugin-scoped and removed on dispose.
        const body = document.body;
        body.style.setProperty("--dshwt-blur", String(settings.blur) + "px");
        body.style.setProperty("--dshwt-glass-opacity", String(settings.glassOpacity));
        if (settings.glyphMode === "hanzi") layer.dataset.glyph = "hanzi";
        else delete layer.dataset.glyph;
      }

      function applyAttrs() {
        const settings = store.get();
        const body = document.body;
        if (!settings.enabled || disposed) {
          delete body.dataset.dshWhaleTide;
          delete body.dataset.dshWhaleTideScheme;
          delete body.dataset.dshWhaleTideUi;
          delete body.dataset.dshWhaleTidePhase;
          delete body.dataset.dshWhaleTideGlass;
          return;
        }
        body.dataset.dshWhaleTide = "on";
        body.dataset.dshWhaleTideScheme = oceanScheme;
        body.dataset.dshWhaleTideUi = uiScheme;
        body.dataset.dshWhaleTidePhase = phase;
        if (settings.glass) body.dataset.dshWhaleTideGlass = "on";
        else delete body.dataset.dshWhaleTideGlass;
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
        const nextUi = readHostScheme(themeService);
        const nextOcean = store.get().followTheme ? nextUi : readPinnedScheme() || nextUi;
        const changed = nextOcean !== oceanScheme;
        uiScheme = nextUi;
        oceanScheme = nextOcean;
        if (ocean && changed) ocean.setTheme(oceanScheme);
        applyAttrs();
      }

      function ensureOcean() {
        if (disposed || ocean || !store.get().enabled) return;
        ocean = createOcean(canvas, {
          settings: store.get(),
          theme: oceanScheme,
          phase,
          reducedMotion: prefersReducedMotion(),
          onStats: null,
        });
      }

      function destroyOcean() {
        if (!ocean) return;
        try {
          ocean.destroy();
        } catch (error) {
          /* already gone */
        }
        ocean = null;
      }

      function syncAll() {
        if (disposed) return;
        const settings = store.get();
        if (!settings.enabled) {
          destroyOcean();
          layer.style.display = "none";
          applyAttrs();
          applyOpacity();
          return;
        }
        layer.style.display = "block";
        applyScheme();
        applyCssVars();
        applyAttrs();
        applyOpacity();
        ensureOcean();
        if (ocean) ocean.setSettings(settings);
        if (ocean) ocean.setPhase(phase);
        if (ocean) ocean.setTheme(oceanScheme);
      }

      function applyPhase() {
        if (disposed) return;
        const next = readPhase();
        if (next !== phase) {
          phase = next;
          if (ocean) ocean.setPhase(phase);
          applyAttrs();
        }
        applyOpacity();
      }

      function onStoreChange() {
        if (disposed) return;
        const settings = store.get();
        if (lastSettings.followTheme && !settings.followTheme) {
          writePinnedScheme(readHostScheme(themeService));
        }
        lastSettings = settings;
        syncAll();
      }

      function schedulePhase() {
        if (disposed || raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          applyPhase();
        });
      }

      syncAll();

      try {
        phaseObserver = new MutationObserver(schedulePhase);
        phaseObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-content-phase"],
        });
      } catch (error) {
        /* the interval still covers phase changes */
      }

      try {
        themeObserver = new MutationObserver(() => {
          applyScheme();
          if (ocean) ocean.setTheme(oceanScheme);
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "style", "data-theme", "data-color-scheme", "data-ds-theme-source"],
        });
      } catch (error) {
        /* optional */
      }

      try {
        bodyObserver = new MutationObserver(() => {
          applyScheme();
          if (ocean) ocean.setTheme(oceanScheme);
        });
        bodyObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ["class", "data-ds-dark-theme"],
        });
      } catch (error) {
        /* optional */
      }

      interval = window.setInterval(applyPhase, 500);

      try {
        motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
        motionQuery.addEventListener("change", applyPhase);
      } catch (error) {
        motionQuery = null;
      }

      try {
        if (themeService && typeof ctx.on === "function") {
          offTheme = ctx.on("theme/change", () => {
            applyScheme();
            if (ocean) ocean.setTheme(oceanScheme);
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
        if (bodyObserver) bodyObserver.disconnect();
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
        const body = document.body;
        body.style.removeProperty("--dshwt-blur");
        body.style.removeProperty("--dshwt-glass-opacity");
        delete body.dataset.dshWhaleTide;
        delete body.dataset.dshWhaleTideScheme;
        delete body.dataset.dshWhaleTideUi;
        delete body.dataset.dshWhaleTidePhase;
        delete body.dataset.dshWhaleTideGlass;
      };
    }

    /* =====================================================================
     * Settings section
     * ===================================================================*/
    function formatValue(key, value) {
      if (key === "speed") return Number(value).toFixed(2) + "×";
      if (key === "blur") return Math.round(value) + "px";
      if (["count", "fishCount"].includes(key)) return String(Math.round(value));
      if (key === "size" || key === "gridScale") return Number(value).toFixed(1) + "×";
      return Number(value).toFixed(2);
    }

    function optionLabel(key, value) {
      if (key === "species") return value === "orca" ? t("orca") : t("humpback");
      if (key === "eyeColor") return value === "black" ? t("eyeBlack") : value === "white" ? t("eyeWhite") : t("eyePrimary");
      if (key === "glyphMode") return value === "hanzi" ? t("glyphHanzi") : t("glyphAscii");
      return value;
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

      function hintKey(key) {
        return "hint" + key.charAt(0).toUpperCase() + key.slice(1);
      }

      function row(key, control) {
        return h(
          "div",
          { className: "dshwt-row", key },
          h(
            "div",
            { className: "dshwt-label" },
            h("span", { className: "dshwt-name" }, t(key)),
            h("span", { className: "dshwt-hint" }, t(hintKey(key))),
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

      function selectControl(key) {
        return h(
          "select",
          {
            className: "dshwt-select",
            value: value[key],
            "aria-label": t(key),
            onChange: (event) => save({ [key]: event.target.value }),
          },
          OPTIONS[key].map((option) => h("option", { key: option, value: option }, optionLabel(key, option))),
        );
      }

      function control(key) {
        if (BOOLEAN_KEYS.includes(key)) return switchControl(key);
        if (OPTIONS[key]) return selectControl(key);
        if (key === "color") {
          return h(
            "div",
            { className: "dshwt-color" },
            h("input", {
              type: "color",
              value: value.color,
              "aria-label": t("color"),
              onChange: (event) => save({ color: event.target.value }),
            }),
            h("code", null, value.color),
          );
        }
        return rangeControl(key);
      }

      const statusText = status ? t(status) : "";

      return h(
        "div",
        { className: "dshwt-settings" },
        h(
          "div",
          { className: "dshwt-head" },
          h("h2", null, t("title")),
          h("p", null, t("sectionDescription")),
        ),
        GROUPS.map((group) =>
          h(
            "div",
            { className: "dshwt-group", key: group.id },
            h("div", { className: "dshwt-group-title" }, t("group" + group.id.charAt(0).toUpperCase() + group.id.slice(1))),
            h("div", { className: "dshwt-card" }, group.keys.map((key) => row(key, control(key)))),
          ),
        ),
        h(
          "div",
          { className: "dshwt-actions" },
          h("button", { type: "button", className: "dshwt-button", onClick: reset }, t("reset")),
          h(
            "span",
            { className: "dshwt-status", "aria-live": "polite", "data-error": status === "saveError" ? "" : undefined },
            statusText,
          ),
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
      installTokens(ctx);

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
