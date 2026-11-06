window.__ModuleLoader__.load({
  id: "dsh-whale-tide",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";

    const React = require("react");
    const P = require("@deepseek-ai/dsh-client-ui-primitives");
    const h = React.createElement;

    /* =====================================================================
     * 样式
     * ===================================================================*/
    const CSS = `
:root{
  /* dsh-quiet 自带动效词汇表（前缀 dsq-，不与核心 --ds-* / --dsw-* 抢名） */
  --dsq-dur-1:90ms;    /* 按压、悬停 */
  --dsq-dur-2:120ms;   /* 颜色、背景、边框 */
  --dsq-dur-3:180ms;   /* 位移、尺寸 */
  --dsq-dur-4:400ms;   /* 面板、主题切换 */
  --dsq-dur-5:600ms;   /* 背景淡入 */
  --dsq-dur-reveal:680ms;      /* 逐字浮现：透明度＋颜色 */
  --dsq-dur-reveal-blur:860ms; /* 逐字浮现：模糊消解 */
  --dsq-ease-out:cubic-bezier(.22,1,.36,1);
  --dsq-ease-in:cubic-bezier(.4,0,1,1);
  --dsq-ease-inout:cubic-bezier(.65,0,.35,1);
  /* 弹簧：二阶阻尼振子解出的 linear() 采样，零 JS；落位用 spring，微弹用 spring-pop */
  --dsq-spring-dur:460ms;
  --dsq-spring:linear(0,.1019,.3085,.5246,.7061,.8396,.9278,.98,1.0068,1.0175,1.0191,1.0164,1.0122,1.0082,1.0049,1.0026,1.0011);
  --dsq-spring-pop-dur:420ms;
  --dsq-spring-pop:linear(0,.1577,.4639,.752,.9517,1.0557,1.0873,1.0773,1.0512,1.0251,1.0063,.996,.9925,.9929,.9951,.9975,.9992);
}
.dshr_root{display:flex;flex-direction:column;font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-primary)}
.dshr_text{position:relative;isolation:isolate;min-width:0}
.dshr_text::before{content:"";position:absolute;inset:-7px -12px;z-index:-1;border-radius:14px;background:rgba(255,255,255,.70);box-shadow:0 0 22px 12px rgba(255,255,255,.62);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);pointer-events:none}
body[data-dshr-scheme="dark"] .dshr_text::before{background:rgba(20,21,24,.72);box-shadow:0 0 22px 12px rgba(20,21,24,.64)}
.dshr_body{display:flex;flex-direction:column;gap:16px;min-width:0}
.dshr_reveal{min-width:0}
.dshr_body>[data-turn-process-inline][hidden]{margin-bottom:-16px}
.dshr_stopped{border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);align-self:flex-start;padding:0 6px;font-size:11px;line-height:18px;animation:dsqPop var(--dsq-spring-pop-dur) var(--dsq-spring-pop) both}
@keyframes dsqPop{from{opacity:0;transform:scale(.94)}}

/* 逐字浮现：透明度 + 颜色 / 模糊，两段动画，不加 transform */
.dshr_tk{animation:dshrFade var(--dsq-dur-reveal) var(--dsq-ease-out) both,dshrBlur var(--dsq-dur-reveal-blur) var(--dsq-ease-out) both}
@keyframes dshrFade{from{opacity:0;color:var(--dshr-from,#c3c8d2)}}
@keyframes dshrBlur{from{filter:blur(var(--dshr-blur,10px))}}
@media (prefers-reduced-motion:reduce){
  :root{--dsq-dur-3:1ms;--dsq-dur-4:1ms;--dsq-dur-5:1ms;--dsq-spring-dur:1ms;--dsq-spring-pop-dur:1ms;--dsq-dur-reveal:1ms;--dsq-dur-reveal-blur:1ms}
  .dshr_root .dshr_tk,.dshr_root .dshr_li{animation:none}
  .dshr_stopped,.dshr_p,.dshr_h1,.dshr_h2,.dshr_h3,.dshr_ul{animation:none}
  .dshr-backdrop{transition:none}
}

/* 流式期间的结构（Markdown 子集） */
.dshr_p{margin:0 0 14px;min-width:0;animation:dsqBlockIn var(--dsq-spring-dur) var(--dsq-spring) both}
.dshr_p:last-child{margin-bottom:0}
.dshr_h1,.dshr_h2,.dshr_h3{margin:18px 0 8px;font-weight:600;line-height:22px;animation:dsqBlockIn var(--dsq-spring-dur) var(--dsq-spring) both}
.dshr_h1{font-size:16px}.dshr_h2{font-size:15px}.dshr_h3{font-size:14px}
.dshr_ul{margin:0 0 14px;padding-left:20px;animation:dsqBlockIn var(--dsq-spring-dur) var(--dsq-spring) both}
@keyframes dsqBlockIn{from{opacity:0;transform:translateY(3px)}}
.dshr_li{margin:2px 0;animation:dsqBlockIn var(--dsq-spring-dur) var(--dsq-spring) both}
.dshr_strong{font-weight:600}
.dshr_code{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12.5px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));border-radius:4px;padding:1px 4px}


/* —— 背景层 —— */
body[data-dshr="on"]{background:#fff}
body[data-dshr-scheme="dark"]{background:#141518}
.dshr-backdrop{position:fixed;z-index:0;pointer-events:none;overflow:hidden;opacity:0;transition:opacity var(--dsq-dur-5) var(--dsq-ease-out);background:#fff}
body[data-dshr-scheme="dark"] .dshr-backdrop{background:#141518}
.dshr-backdrop[data-ready]{opacity:1}
.dshr-backdrop canvas{display:block;width:100%;height:100%}
/* 局部磨砂：文字和控件本身保持清晰，海洋仍可在底下隐约透出。 */
body[data-dshr="on"] [data-conversation-content][data-conversation-region="chat"] [data-composer-card]{background:rgba(255,255,255,.74);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
body[data-dshr-scheme="dark"] [data-conversation-content][data-conversation-region="chat"] [data-composer-card]{background:rgba(27,28,32,.78)}
/* 输入框的“+”和命令候选共用此菜单；菜单本体需要遮住后方海洋。 */
body[data-dshr="on"] [data-trigger-menu]{--dsw-specific-menu:#fff;background-color:#fff}
body[data-dshr="on"][data-dshr-scheme="dark"] [data-trigger-menu]{--dsw-specific-menu:#1b1c20;background-color:#1b1c20}
/* 发丝边框：DPR≥2 时 1px 会渲染成 2 物理像素，改用 0.5px 得到 1 物理像素的细线。
   只作用于本插件已接管的输入框卡片与触发菜单，避免影响其它组件。 */
@media (-webkit-min-device-pixel-ratio:2),(min-resolution:2dppx){
  body[data-dshr="on"] [data-composer-card],
  body[data-dshr="on"] [data-trigger-menu]{border-width:.5px}
}
/* 整条侧栏共用一层模糊，不加底色：侧栏本身仍是一整块颜色，鲸鱼只在背后成为柔影。 */
.dshr-sidebar-glass{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;background:none;-webkit-backdrop-filter:blur(var(--dshr-sidebar-blur,6px));backdrop-filter:blur(var(--dshr-sidebar-blur,6px))}
body[data-dshr="on"][data-dshr-glass="off"] [data-composer-card]{background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
/* 主题切换时给界面 400ms 的过渡（只在这 450ms 内开启，避免平时 hover 变慢） */
body[data-dshr-switching] *{transition:background-color var(--dsq-dur-4) var(--dsq-ease-inout),color var(--dsq-dur-4) var(--dsq-ease-inout),border-color var(--dsq-dur-4) var(--dsq-ease-inout),fill var(--dsq-dur-4) var(--dsq-ease-inout)!important}

/* 思考行：贴近原生 ReasoningRow 的观感 */
.dshr_reason{display:flex;flex-direction:column}
.dshr_reason:not([data-expanded]){contain:size layout;height:calc(24px + var(--dsh-content-font-delta,0px))}
.dshr_reasonBody{padding:4px 0 4px calc(22px + var(--dsh-content-font-delta,0px));min-width:0}
.dshr_sep{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}
.dshr_summary{min-width:0;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));white-space:nowrap;flex:auto;overflow:hidden}
.dshr_summaryText{text-overflow:ellipsis;display:block;overflow:hidden}
.dshr_summary[data-streaming]{mask-image:linear-gradient(90deg,#000 calc(100% - 48px),#0000)}
.dshr_summary[data-streaming] .dshr_summaryText{text-overflow:clip;overflow:visible}
.dshr_reason:not([data-preview]) .dshr_sep,.dshr_reason:not([data-preview]) .dshr_summary{display:none}

/* Whale Tide settings section */
.dshwt-settings{display:grid;gap:18px;max-width:720px;width:100%;font-size:14px;line-height:1.6;color:var(--dsw-alias-label-primary)}
.dshwt-head h2{margin:0 0 6px;font-size:20px;line-height:1.3;font-weight:650}
.dshwt-head p{margin:0;color:var(--dsw-alias-label-secondary,#5b6472);font-size:13.5px}
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
.dshwt-range{display:flex;align-items:center;gap:10px}
.dshwt-range input[type="range"]{width:158px;max-width:40vw;accent-color:var(--dsw-alias-brand-primary,#4d6bfe);height:20px;cursor:pointer}
.dshwt-color{display:flex;align-items:center;gap:9px}
.dshwt-color input[type="color"]{width:32px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));border-radius:7px;background:transparent;cursor:pointer}
.dshwt-color code{font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-value{min-width:46px;text-align:right;font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;color:var(--dsw-alias-label-tertiary,#7c8593)}
.dshwt-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dshwt-button{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary,inherit);border-radius:9px;padding:8px 14px;cursor:pointer;font:inherit;font-size:13px}
.dshwt-status{font-size:12px;color:var(--dsw-alias-label-tertiary,#7c8593);min-height:1.4em}
.dshwt-status[data-error]{color:var(--dsw-alias-state-error-primary,#d33)}
@media (max-width:640px){.dshwt-row{align-items:flex-start}.dshwt-range input[type="range"]{width:110px}}
`;

    const CSS_ID = "dsh-whale-tide/index.css";
    function installStyles() {
      if (typeof document === "undefined") return;
      if (document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") !== null) return;
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-whale-tide";
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /* =====================================================================
     * 深/浅色下的「起始灰」：量一下页面底色，决定从哪个灰起步
     * ===================================================================*/
    function syncTone() {
      try {
        const bg = getComputedStyle(document.body).backgroundColor || "";
        const m = bg.match(/rgba?\(([^)]+)\)/);
        let dark = false;
        if (m) {
          const [r, g, b, a = "1"] = m[1].split(",").map((v) => parseFloat(v));
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          dark = Number(a) > 0.5 && lum < 0.45;
        } else {
          dark = matchMedia("(prefers-color-scheme: dark)").matches;
        }
        document.documentElement.style.setProperty("--dshr-from", dark ? "#566070" : "#c3c8d2");
        document.documentElement.style.setProperty("--dshr-blur", "10px");
      } catch (error) {
        /* 量不到就用默认值 */
      }
    }

    /* =====================================================================
     * 流式 Markdown 分块器（拉取式）
     * 时钟每放一个字，才从这里取一个字 —— 结构与字符永远同序。
     * ===================================================================*/
    const MARKERS = [
      ["### ", "h3", "dshr_h3"],
      ["## ", "h2", "dshr_h2"],
      ["# ", "h1", "dshr_h1"],
      ["- ", "li", "dshr_li"],
    ];

    function createMarkdownStream(root) {
      let raw = [];
      let block = null;
      let list = null;
      let inline = null;
      let inlineKind = null;
      let lineStart = true;
      let strict = true;

      const make = (tag, className) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        return node;
      };
      const closeInline = () => {
        inline = null;
        inlineKind = null;
      };
      const closeBlock = () => {
        closeInline();
        block = null;
      };
      const closeList = () => {
        closeBlock();
        list = null;
      };
      const openBlock = (tag, className) => {
        closeBlock();
        const node = make(tag, className);
        (list ?? root).appendChild(node);
        block = node;
      };
      const openItem = () => {
        closeBlock();
        if (!list) {
          list = make("ul", "dshr_ul");
          root.appendChild(list);
        }
        const li = make("li", "dshr_li");
        list.appendChild(li);
        block = li;
      };
      const lineMarker = () => {
        const head = raw.join("");
        for (const [marker, tag, cls] of MARKERS) {
          if (head.startsWith(marker)) {
            raw.splice(0, marker.length);
            if (tag === "li") openItem();
            else openBlock(tag, cls);
            lineStart = false;
            return "skip";
          }
          if (strict && head.length > 0 && head.length < marker.length && marker.startsWith(head)) return "hold";
        }
        return false;
      };

      return {
        feed(text) {
          for (const ch of text) raw.push(ch);
        },
        take() {
          if (raw.length === 0) return null;
          if (lineStart) {
            const marker = lineMarker();
            if (marker === "hold") return "hold";
            if (marker === "skip") return "skip";
            if (raw[0] === "\n") {
              raw.shift();
              closeList();
              return "skip";
            }
            if (block === null) openBlock("p", "dshr_p");
            lineStart = false;
          }

          const c = raw.shift();

          if (c === "\n") {
            lineStart = true;
            closeInline();
            return { ch: "\n", el: block ?? root };
          }
          if (c === "`") {
            if (inlineKind === "code") closeInline();
            else {
              closeInline();
              inline = make("code", "dshr_code");
              (block ?? root).appendChild(inline);
              inlineKind = "code";
            }
            return "skip";
          }
          if (c === "*") {
            if (raw[0] === "*") {
              raw.shift();
              if (inlineKind === "strong") closeInline();
              else {
                closeInline();
                inline = make("strong", "dshr_strong");
                (block ?? root).appendChild(inline);
                inlineKind = "strong";
              }
              return "skip";
            }
            if (strict && raw.length === 0) {
              raw.unshift("*");
              return "hold";
            }
          }
          return { ch: c, el: inline ?? block ?? root };
        },
        get pending() {
          return raw.length;
        },
        finish() {
          strict = false;
        },
      };
    }

    /* =====================================================================
     * 逐字浮现内核
     * ===================================================================*/
    const smoothstep = (e) => e * e * (3 - 2 * e);

    function createRevealer(el, options) {
      const rate = options.rate ?? 40;
      const rampMs = options.rampMs ?? 700;
      // 队列积压时允许提速：迟钝的模型看不出来，快的模型不会「回复早结束了字幕还在爬」
      const maxBoost = options.maxBoost ?? 6;
      const decoder = options.decoder ?? null;
      const onFrame = options.onFrame;

      const queue = [];
      let acc = 0;
      let t0 = null;
      let last = null;
      let ended = false;
      let raf = 0;
      let disposed = false;
      let active = 0;
      let revealed = 0;
      const dirty = new Set();

      const pending = () => (decoder ? decoder.pending : queue.length);

      const put = (item, delayMs) => {
        const host = item.el ?? el;
        if (item.ch === " " || item.ch === "\n" || item.ch === "\t") {
          host.appendChild(document.createTextNode(item.ch));
          dirty.add(host);
          return;
        }
        const sp = document.createElement("span");
        sp.className = "dshr_tk";
        sp.textContent = item.ch;
        sp.style.animationDelay = delayMs + "ms, " + delayMs + "ms";
        sp.addEventListener("animationend", (event) => {
          if (event.animationName !== "dshrBlur") return;
          active -= 1;
          sp.replaceWith(document.createTextNode(item.ch));
          dirty.add(host);
        });
        active += 1;
        host.appendChild(sp);
      };

      const compact = () => {
        if (dirty.size === 0) return;
        for (const node of dirty) if (node.isConnected) node.normalize();
        dirty.clear();
      };

      const step = (frameNow) => {
        raf = 0;
        if (disposed) return;
        if (t0 == null) t0 = last = frameNow;
        const dt = Math.min(0.05, (frameNow - last) / 1000);
        last = frameNow;

        const e = Math.min(1, (frameNow - t0) / rampMs);
        let speed = rate * (0.35 + 0.65 * smoothstep(e));
        // 积压超过 0.8 秒的量才开始提速，最多 maxBoost 倍（积压越深越快，追平后自动回落）
        const backlog = pending() / rate;
        if (backlog > 0.8) speed *= Math.min(maxBoost, 1 + (backlog - 0.8) * 0.9);
        const slow = ended ? 1 : Math.min(1, pending() / 6 + 0.25);
        const v = speed * slow;
        acc += v * dt;

        while (acc >= 1) {
          const item = decoder ? decoder.take() : queue.length > 0 ? queue.shift() : null;
          if (item === null || item === "hold") break;
          if (item === "skip") continue;
          acc -= 1;
          put(item, Math.round(-(acc / Math.max(v, 1e-6)) * 1000));
          revealed += 1;
        }
        compact();

        const done = ended && pending() === 0;
        if (onFrame) onFrame({ active, revealed, queued: pending(), done });
        // 队列空了但还有 span 在动 → 继续帧循环，等 active 归零再交给正式渲染
        if (pending() > 0 || (ended && active > 0)) raf = requestAnimationFrame(step);
      };

      const kick = () => {
        if (raf === 0 && !disposed) raf = requestAnimationFrame(step);
      };

      return {
        push(chunk) {
          if (!chunk) return;
          if (decoder) decoder.feed(chunk);
          else for (const ch of chunk) queue.push({ ch, el });
          kick();
        },
        end() {
          if (ended) return;
          ended = true;
          if (decoder) decoder.finish();
          kick();
        },
        flush() {
          ended = true;
          if (decoder) decoder.finish();
          if (raf !== 0) cancelAnimationFrame(raf);
          raf = 0;
          for (;;) {
            const item = decoder ? decoder.take() : queue.length > 0 ? queue.shift() : null;
            if (item === null || item === "hold") break;
            if (item === "skip") continue;
            const host = item.el ?? el;
            host.appendChild(document.createTextNode(item.ch));
            dirty.add(host);
            revealed += 1;
          }
          compact();
        },
        dispose() {
          disposed = true;
          if (raf !== 0) cancelAnimationFrame(raf);
          raf = 0;
        },
      };
    }

/* ======================================================================
   Character-ocean background.
   Engine logic (cell grid, alpha-bucketed batch draw, energy wake with 5-point
   blur + decay, Reynolds/Couzin fish schools, follow-the-leader spine with a
   per-joint bend limit, supersampled rasterisation, divergence-free current)
   adapted from stackedlol/ascii-sharks — https://github.com/stackedlol/ascii-sharks

   MIT License
   Copyright (c) 2026 drewdi
   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:
   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
   Changes here: neutral grey ink on light/dark paper, no colour/accents, no
   hunting or eating; a small pod of procedurally built whales (shark rasteriser
   re-shaped: whale width profile, pectoral fins, horizontal flukes) instead of
   sharks — mother, calf and a mid-size whale — plus an occasional manta ray;
   4-6 '-' fish schools; drifting swell-band ocean surface; chat-column fade.
   ====================================================================== */
function createOcean(canvas,opts){opts=opts||{};
const settings=Object.assign({},opts.settings||{});
let swimSpeed=Number(settings.speed)||1;
let fishCount=Math.round(Number(settings.fishCount))||100;
let fishGlint=Number(settings.fishGlint);if(!Number.isFinite(fishGlint))fishGlint=1;
let fishColor=String(settings.fishColor||"#a9bde8");
let whaleColor=String(settings.whaleColor||"#c3c8d2");
let sidebarFish=Math.round(Number(settings.sidebarFish))||0;
let whaleCount=Math.round(Number(settings.whaleCount))||3;
let cellSize=Math.round(Number(settings.cellSize))||9;
const reduced=opts.reducedMotion!=null?!!opts.reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=canvas,ctx=cv.getContext('2d');
const COLH=opts.columnHalf!=null?opts.columnHalf:384;  // half width of the readable chat column (px)
let goalTheme=opts.theme==='dark'?'dark':'light';
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const angD=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;}; // shortest a->b
function hash3(x,y,z){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,1442695041);
  h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
const K1=1/260,K2=1/310,K3=1/190,CUR=3400;
function current(x,y,t,o){const a=x*K1+t*.07,b=y*K2-t*.05,c=(x+y)*K3+t*.11;
  o.x=(-K2*Math.sin(a)*Math.sin(b)+.5*K3*Math.cos(c))*CUR;o.y=(-K1*Math.cos(a)*Math.cos(b)-.5*K3*Math.cos(c))*CUR;return o;}

// ---- palette: one neutral ink per theme (black on day, white on night), alpha only ----
// lo/hi: ocean surface glyph alpha (trough..crest); whale: peak creature alpha; fish: '-' fish alpha
const TH={light:{ink:0,lo:.095,hi:.145,whale:.34,fish:.86},dark:{ink:255,lo:.08,hi:.12,whale:.29,fish:.72}};
let dk=goalTheme==='dark'?1:0;
const mix=(a,b,k)=>a+(b-a)*k;
let P={};function palette(){const L=TH.light,D=TH.dark;P={ink:Math.round(mix(L.ink,D.ink,dk)),lo:mix(L.lo,D.lo,dk),hi:mix(L.hi,D.hi,dk),
  whale:mix(L.whale,D.whale,dk),fish:mix(L.fish,D.fish,dk)};P.avg=(P.lo+P.hi)/2;}
palette();

// glyph atlas (pre-rendered, drawn with drawImage + globalAlpha per bucket)
const GL=[' ','·','.','-','~',':',';','=','+','*','o','°',"'",',','t','%','S','X','8','#','@','`'];
const G_BLANK=0,G_DOT=1,G_PER=2,G_DASH=3,G_TILDE=4,G_COLON=5,G_EQ=7,G_O=10,G_DEG=11,G_TICK=12;
// ascii-sharks ramps: sparse glyphs on lit skin, dense glyphs in shadow
const SKIN=[5,6,14,15,16,17,18,19,20],FINS=[15,6,14,16,5],RIDGE=[20,18,15],EDGE_H=[5,6],EDGE_L=[2,12,13,21];
const atlas=document.createElement('canvas'),actx=atlas.getContext('2d');let atlasInk=-1;
const whaleAtlas=document.createElement('canvas'),whaleActx=whaleAtlas.getContext('2d');let whaleAtlasKey='';
const FONT='ui-monospace,"SFMono-Regular","DejaVu Sans Mono",Menlo,Consolas,monospace';

let W=0,H=0,dpr=1,cw=10,ch=15,cols=0,rows=0,N=0,sw=1,sh=1;
let noise,twP,twF,energy,energyT,colMask,wMask,cellA,cellG,surfaceA,surfaceG,bOf,order,fishStamp,wFlag,wShade,wKey,wA,blockA;
const NB=64,AMAX=.42,counts=new Int32Array(NB+1),starts=new Int32Array(NB+1);
const BB=16,BMAX=.1,bBuckets=Array.from({length:BB},()=>[]);
let frameId=0,T=0;
// The canvas spans sidebar + chat: splitX() is the sidebar width in canvas px (0 = no sidebar),
// columnCenter() is the centre of the readable chat column. Both come from the controller.
function splitX(){const v=typeof opts.splitX==='function'?opts.splitX():0;return clamp(Number(v)||0,0,W);}
function chatCenter(){const v=typeof opts.columnCenter==='function'?opts.columnCenter():W/2;return clamp(Number(v)||0,splitX(),W);}
function chatTop(){const v=typeof opts.chatTop==='function'?opts.chatTop():0;return clamp(Number(v)||0,0,H);}
const safeX=(x,m)=>{const a=splitX()+Math.max(0,m||0),b=W-Math.max(0,m||0);return b<=a?clamp(x,splitX(),W):clamp(x,a,b);};
// Creatures steer under their own motion rather than being translated as a layer.
let conversationMode=false;
// the single whale allowed in the sidebar while a conversation is open
let resident=null,residentTimer=0,residentEnter=0;
let released=null;   // an ex-resident still swimming back out of the sidebar after the conversation ended
function updateConversation() {}

function buildAtlas(){
  sw=Math.ceil(cw*dpr);sh=Math.ceil(ch*dpr);atlas.width=sw*GL.length;atlas.height=sh;
  actx.clearRect(0,0,atlas.width,atlas.height);
  actx.fillStyle=`rgb(${P.ink},${P.ink},${P.ink})`;actx.font=`500 ${Math.round(ch*.74*dpr)}px ${FONT}`;
  actx.textAlign='center';actx.textBaseline='middle';
  for(let g=1;g<GL.length;g++)actx.fillText(GL[g],g*sw+sw/2,sh/2+dpr);
  atlasInk=P.ink;}
function buildWhaleAtlas(){
  const key=whaleColor+'|'+sw+'|'+sh+'|'+dpr;
  if(key===whaleAtlasKey)return;
  whaleAtlas.width=sw*GL.length;whaleAtlas.height=sh;
  whaleActx.clearRect(0,0,whaleAtlas.width,whaleAtlas.height);
  whaleActx.fillStyle=whaleColor;whaleActx.font=`500 ${Math.round(ch*.74*dpr)}px ${FONT}`;
  whaleActx.textAlign='center';whaleActx.textBaseline='middle';
  for(let g=1;g<GL.length;g++)whaleActx.fillText(GL[g],g*sw+sw/2,sh/2+dpr);
  whaleAtlasKey=key;}

/* ---- whales: articulated creatures (same construction as an ascii-sharks shark, whale-shaped) ----
   sim spine: NN nodes, the head steers and every node follows at a fixed distance with a per-joint bend
   limit; render spine = sim spine + a travelling body wave that grows toward the tail. Each cell is
   supersampled against a top-down whale outline in body coordinates (s along the spine, v across).
   A small pod: a large whale (mother), her calf swimming at her flank with a phase-locked tail beat
   (two strokes per mother stroke, occasionally looping around her), and a mid-size whale with its own
   rhythm and path on the other side. */
const NN=20;
function hw(s){                                   // half-width as a fraction of body length (s: 0 snout -> 1 tail)
  if(s<.1)return .095*Math.pow(Math.sin(s/.1*Math.PI/2),.5);           // blunt, rounded head
  if(s<.32)return .095+.03*sm(.1,.32,s);                                // swelling to a thick belly
  if(s<.86)return .028+.097*Math.pow(Math.cos((s-.32)/.54*Math.PI/2),.95); // long taper
  return .028-.004*sm(.86,1,s);}                                        // tail stock carries into the flukes
function mkWhale(o){return Object.assign({depth:1,nodes:new Float32Array(NN*2),spine:new Float32Array(NN*2),arc:new Float32Array(NN),arcT:1,
  fat:1,heading:0,speed:30,cruise:30,phase:0,turn:0,wander:0,flick:-9,len:300,seg:15,mode:'roam',wp:{x:0,y:0},queue:[],sideT:0,circT:14,circLeft:0,circDir:1,
  FP:{x:0,y:0,tx:1,ty:0},finTipL:0,finTipR:0,finU:0,spoutT:rand(8,14),orb:-1,orbA:0,orbDir:1,orbEnd:TAU,cside:1,calfT:4,ptx:NaN,pty:0},o);}
const big=mkWhale({role:'big',scale:1,freq:.72,side:1,alpha:1,seed:5,circT:14,spoutT:16,depth:.98});
const mid=mkWhale({role:'mid',scale:.6,freq:.9,side:-1,alpha:.92,seed:9,phase:2.1,circT:6,spoutT:4.5,depth:.9});
const calf=mkWhale({role:'calf',scale:.4,fat:1.3,freq:1.44,alpha:.88,seed:13,spoutT:11,cside:-1,calfT:6.5,depth:.82});
const stepOrder=[big,mid,calf],drawOrder=[calf,mid,big],whales=stepOrder;
function applyWhaleVisibility(){big.visible=whaleCount>=1;mid.visible=whaleCount>=2;calf.visible=whaleCount>=3;}
let base=400;
function whaleSize(){const rw=Math.max(1,W-splitX());base=clamp(Math.min(rw*.34,H*.85),240,620);for(const w of whales){const want=base*w.scale*(w.depth||1);w.lenTarget=want;if(!w.len){w.len=want;w.seg=want/(NN-1);}w.cruise=(20+want*.045)*(.7+.3*(w.depth||1));}}
function margins(){const rw=Math.max(1,W-splitX()),half=Math.max(0,Math.min(COLH,rw/2-24)),mw=Math.max(0,rw/2-half);return {half,mw};}
const wide=()=>margins().mw>=big.len*.3;
function regionPoint(w,side,yLo,yHi){const {half,mw}=margins(),cx=chatCenter(),rw=Math.max(1,W-splitX());
  if(!wide())return {x:safeX(cx+rw*rand(-.3,.3),w.len*.25),y:H*rand(yLo,yHi)};   // narrow screens: anywhere in the chat water
  const px=cx+side*(half+mw*.42);return {x:safeX(px+rand(-.2,.2)*mw,w.len*.3),y:H*rand(yLo,yHi)};}
function nextWp(w){if(w.queue.length){w.wp=w.queue.shift();return;}
  let p,k=0;do{p=regionPoint(w,w.side,.14,.86);k++;}while(k<10&&Math.hypot(p.x-w.nodes[0],p.y-w.nodes[1])<w.len*.5);w.wp=p;}
function placeWhale(w,hx,hy,h,curve){const n=w.nodes;w.heading=h;let a=h+Math.PI,x=hx,y=hy;n[0]=x;n[1]=y;
  for(let k=1;k<NN;k++){a+=curve||0;x+=Math.cos(a)*w.seg;y+=Math.sin(a)*w.seg;n[k*2]=x;n[k*2+1]=y;}buildSpine(w);}
const mouse={x:-1e4,y:-1e4,active:false};
const drawQ=[];
let replying=false;const parts=[],ripples=[];
const fish=[],schools=[];const cur={x:0,y:0};

// ---- manta ray: an occasional slow glide across the whole scene, wings beating ----
const ray={on:false,x:0,y:0,h:0,speed:46,phase:0,span:90,t:0,next:1.2,yaw:0,seed:21,depth:.72};

// ---- 稀有访客：路过的锤头鲨 / 长尾鲨 ----
// 形状照 stackedlol/ascii-sharks 的做法做成数据表：一条半宽曲线 + 鳍的三角布局，
// 所以加物种只是加一个参数对象，不用再写一套渲染。鲸群仍走自己那套（为了不改变现有观感）。
const VN=20;                                              // 访客的脊线节点数
function classicHW(s){
  if(s<.13)return .09*Math.pow(Math.sin(s/.13*Math.PI/2),.95);
  if(s<.3)return .09+.016*sm(.13,.3,s);
  if(s<.84)return .019+.087*Math.pow(1-(s-.3)/.54,1.25);
  const k=(s-.84)/.16;return .019*(1-k)+.012*Math.sin(k*Math.PI);}
const SHAPES={
  // 头翼：横跨吻端的宽条，两端向眼后掠；眼长在翼尖上
  hammer:{
    halfWidth(s){if(s<.06)return .045;if(s<.3)return .045+.061*sm(.06,.3,s);return classicHW(s)*.92;},
    head:{span:.17,sweep:.035,depth:.09,notch:0},
    pectoral:[.17,.4,.5,.22],falcate:true,pelvic:[.56,.63,.67,.075],
    caudal:.11,dorsal:[.28,.44],secondDorsal:[.7,.74],eye:null,gills:[.16,.26]},
  // 前半身紧凑，上尾叶拉成与身体等长的鞭；尾鳍没有下叶
  thresher:{
    halfWidth(s){
      if(s<.08)return .07*Math.pow(Math.sin(s/.08*Math.PI/2),.75);
      if(s<.2)return .07+.02*sm(.08,.2,s);
      if(s<.48)return .012+.078*Math.pow(1-(s-.2)/.28,1.3);
      const k=(s-.48)/.52;return .012*(1-k)+.006*Math.sin(k*Math.PI*.9)+.002;},
    pectoral:[.12,.27,.36,.2],falcate:true,pelvic:[.37,.41,.44,.045],
    caudal:0,dorsal:[.24,.32],secondDorsal:[.45,.47],eye:[.05,.1],gills:[.11,.18]},
};
const visitors=[];
let visitorTimer=rand(30,60);
function inTri(px,py,ax,ay,bx,by,cx,cy){
  const d1=(px-bx)*(ay-by)-(ax-bx)*(py-by),d2=(px-cx)*(by-cy)-(bx-cx)*(py-cy),d3=(px-ax)*(cy-ay)-(cx-ax)*(py-ay);
  return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));}
function visitorLane(){                                   // 一条横向空水道：离鲸群身体和鱼群都尽量远
  let best=H*.5,score=-1;
  for(let i=0;i<12;i++){const y=rand(H*.2,H*.8);let gap=1e9;
    for(const w of whales){if(w.exitMode==='away')continue;
      for(let k=0;k<NN;k+=5)gap=Math.min(gap,Math.abs(w.nodes[k*2+1]-y)-w.len*.12);}
    for(const f of fish)gap=Math.min(gap,Math.abs(f.y-y));
    if(gap>score){score=gap;best=y;}}
  return best;}
function spawnVisitor(kind){
  if(conversationMode||reduced||visitors.length)return null;
  if(!SHAPES[kind])kind=Math.random()<.55?'hammer':'thresher';
  const rw=Math.max(1,W-splitX()),L=kind==='hammer'?clamp(rw*.22,380,520):clamp(rw*.3,520,720);
  const fromLeft=Math.random()<.5;
  const depth=rand(.64,1);
  const v={kind,depth,len:L*depth,spine:new Float32Array(VN*2),arc:new Float32Array(VN),arcT:1,
    alpha:.9*(.6+.4*depth),speed:rand(24,32)*(.72+.28*depth),phase:rand(0,TAU),wob:rand(0,TAU),t:0,turn:0,
    x:fromLeft?-L*.6:W+L*.6,y:visitorLane(),h:fromLeft?rand(-.06,.06):Math.PI+rand(-.06,.06),
    seed:(Math.random()*1e6)|0};
  stepVisitor(v,0);
  visitors.push(v);
  return v;}
// 直线巡游 + 身体行波；转向只是轻微摆头，不做追捕
function stepVisitor(v,dt){
  v.t+=dt;v.phase+=dt*(2.2-v.len*.0012);
  if(dt){
    const turn=Math.sin(v.t*.19+v.wob)*.02;
    v.h+=turn*dt;v.turn+=(turn-v.turn)*Math.min(1,dt*2);
    // 不穿过鲸群：沿身体最近点上下滑开，越近推得越快
    let push=0;
    for(const w of whales){if(w.exitMode==='away')continue;
      const R=(v.len+w.len)*.42;
      for(let k=0;k<NN;k+=5){const dx=v.x-w.nodes[k*2],dy=v.y-w.nodes[k*2+1],d=Math.hypot(dx,dy);
        if(d<R&&d>1){push+=(dy>=0?1:-1)*(1-d/R)*70;}}}
    if(ray.on){const dx=v.x-ray.x,dy=v.y-ray.y,d=Math.hypot(dx,dy),R=v.len*.45+ray.span*1.6;
      if(d<R&&d>1)push+=(dy>=0?1:-1)*(1-d/R)*55;}
    v.x+=Math.cos(v.h)*v.speed*dt;
    v.y+=Math.sin(v.h)*v.speed*dt+Math.sin(v.t*.24+v.wob)*1.5*dt+push*dt;
  }
  const c=Math.cos(v.h),s=Math.sin(v.h),seg=v.len/(VN-1);
  for(let k=0;k<VN;k++){
    const u=k*seg,amp=v.len*.045*(.1+.9*Math.pow(k/(VN-1),1.8));
    const off=amp*Math.sin(v.phase-k/(VN-1)*5.2);
    v.spine[k*2]=v.x-c*u-s*off;
    v.spine[k*2+1]=v.y-s*u+c*off;
  }
  v.arc[0]=0;
  for(let k=1;k<VN;k++)v.arc[k]=v.arc[k-1]+Math.hypot(v.spine[k*2]-v.spine[(k-1)*2],v.spine[k*2+1]-v.spine[(k-1)*2+1]);
  v.arcT=v.arc[VN-1]||1;}
function stepVisitors(dt){
  if(conversationMode||reduced){if(visitors.length)visitors.length=0;return;}
  if(!visitors.length){
    visitorTimer-=dt;
    if(visitorTimer<=0){if(!spawnVisitor())visitorTimer=rand(8,16);else visitorTimer=rand(150,320);}
    return;
  }
  for(let i=visitors.length-1;i>=0;i--){const v=visitors[i];stepVisitor(v,dt);
    const m=v.len*.8;
    if(v.x<-m||v.x>W+m||v.t>200)visitors.splice(i,1);}}
function rasterVisitor(v){
  const reach=v.len*.35;                                 // 长尾已包含在体长里，包围盒按半长放宽
  const xs=v.spine,ys=v.spine,pad=reach;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let k=0;k<VN;k++){const x=xs[k*2],y=xs[k*2+1];x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1+pad<0||x0-pad>W||y1+pad<0||y0-pad>H)return;
  raster(v,sampleVisitor,x0-pad,y0-pad,x1+pad,y1+pad,pad+Math.hypot(cw,ch),v.seed,v.alpha);}
// 通用取样：沿脊线找最近点，再按形状表判断身体、头翼、胸鳍、腹鳍、尾鳍
function sampleVisitor(v,px,py){
  const sp=v.spine,arc=v.arc,N=VN,L=v.len,shape=SHAPES[v.kind];
  let best=1e18,bS=0,sign=1,nx=0,ny=0;
  for(let k=0;k<N-1;k++){
    const ax=sp[k*2],ay=sp[k*2+1],sx=sp[k*2+2]-ax,sy=sp[k*2+3]-ay,l2=sx*sx+sy*sy||1;
    const u=clamp(((px-ax)*sx+(py-ay)*sy)/l2,0,1),qx=ax+sx*u-px,qy=ay+sy*u-py,d2=qx*qx+qy*qy;
    if(d2<best){best=d2;const l=Math.sqrt(l2);bS=(arc[k]+u*l)/v.arcT;sign=sx*(py-ay)-sy*(px-ax)>=0?1:-1;nx=-sy/l*sign;ny=sx/l*sign;}}
  const a=Math.sqrt(best),s=bS,u=s*L,w=shape.halfWidth(s)*L;
  HIT.d=a;HIT.ka=Math.round(s*64);HIT.kb=Math.round(a*sign/(cw*.9));
  if(shape.head&&u<L*(shape.head.sweep+shape.head.depth+shape.head.notch)){
    const span=L*shape.head.span,r=a/span;
    const front=L*shape.head.sweep*r*r+L*shape.head.notch*Math.max(0,1-r/.14);
    const depth=L*shape.head.depth*(1-.2*r*r*r*r);
    if(r<=1&&u>=front&&u<=front+depth){HIT.f=r>.84?F_EYE:F_BODY;HIT.sh=r>.84?0:.62-.2*r;return true;}}
  if(a<=w){
    const across=a/(w||1),facing=(nx*-.6+ny*-.8)*across;
    let shade=.58-across*across*.42+facing*.26,f=F_BODY;
    if(s>shape.dorsal[0]&&s<shape.dorsal[1]&&across<.3){f=F_RIDGE;shade=1;}
    else if(s>shape.secondDorsal[0]&&s<shape.secondDorsal[1]&&across<.4)shade=Math.max(shade,.82);
    else if(shape.eye&&s>shape.eye[0]&&s<shape.eye[1]&&across>.66){f=F_EYE;shade=0;}
    else if(s>shape.gills[0]&&s<shape.gills[1]&&across>.58){
      if(Math.floor((s-shape.gills[0])/(shape.gills[1]-shape.gills[0])*5)%2===0)shade*=.45;}
    else if(s<.05)shade=Math.max(shade,.7);
    HIT.f=f;HIT.sh=clamp(shade,0,1);return true;}
  const tip=L*shape.pectoral[3];
  const [p0,p1,p2]=shape.pectoral;
  if(inTri(u,a,L*p0,0,L*p1,0,L*p2,tip)&&!(shape.falcate&&inTri(u,a,L*p1,0,L*(p1+(p2-p1)*.33),tip*.55,L*p2,tip))){
    HIT.f=F_FIN;HIT.sh=.38+.22*(1-clamp(a/tip,0,1));return true;}
  const [v0,v1,v2,vr]=shape.pelvic;
  if(inTri(u,a,L*v0,0,L*v1,0,L*v2,L*vr)||(shape.caudal>0&&inTri(u,a,L*.86,0,L*.95,0,L,L*shape.caudal))){
    HIT.f=F_FIN;HIT.sh=.36;return true;}
  return false;}

function resize(){
  const first=W===0,ow=W,oh=H;
  dpr=Math.min(1.5,devicePixelRatio||1);W=Math.max(1,cv.clientWidth);H=Math.max(1,cv.clientHeight);
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  cw=Math.max(6,Math.min(12,Math.round(cellSize)));ch=Math.round(cw*1.45);cols=Math.ceil(W/cw);rows=Math.ceil(H/ch);N=cols*rows;
  noise=new Float32Array(N);twP=new Float32Array(N);twF=new Float32Array(N);energy=new Float32Array(N);energyT=new Float32Array(N);
  colMask=new Float32Array(N);wMask=new Float32Array(N);cellA=new Float32Array(N);cellG=new Uint8Array(N);surfaceA=new Float32Array(N);surfaceG=new Uint8Array(N);bOf=new Uint8Array(N);order=new Int32Array(N);
  fishStamp=new Uint32Array(N);wFlag=new Uint8Array(N);wShade=new Float32Array(N);wKey=new Uint32Array(N);wA=new Float32Array(N);blockA=new Float32Array(N);
  const half=Math.max(0,Math.min(COLH,Math.max(1,W-splitX())/2-24)),feather=70,cx=chatCenter();
  for(let i=0;i<N;i++){const c=i%cols,r=(i/cols)|0;
    noise[i]=(hash3(c,r,11)+hash3(c>>1,r>>1,12))*.5;twP[i]=hash3(c,r,23)*TAU;twF[i]=.35+hash3(c,r,37)*1.1;
    const dx=Math.abs(c*cw+cw/2-cx);const k=clamp((dx-half+feather*.5)/feather,0,1);const s=k*k*(3-2*k);
    colMask[i]=.55+.45*s;               // ocean / fish fade to ~55% under the chat column
    wMask[i]=.5+.5*s;}
  buildAtlas();whaleSize();ray.span=base*.2;
  if(first){startPod();seedFish();applyWhaleVisibility();return;}
  const sx=(ow?W/ow:1),sy=(oh?H/oh:1);
  for(const f of fish){f.x*=sx;f.y*=sy;}
  for(const w of whales){
    for(let k=0;k<NN;k++){w.nodes[k*2]*=sx;w.nodes[k*2+1]*=sy;}
    if(w.wp){w.wp.x*=sx;w.wp.y*=sy;}
    if(w.entry){w.entry.x*=sx;w.entry.y*=sy;}
    buildSpine(w);
  }
  ray.x*=sx;ray.y*=sy;ray.lane=(ray.lane||0)*sx;
  for(const v of visitors){v.x*=sx;v.y*=sy;v.len*=Math.sqrt(sx*sy);}
}
const TMP={x:0,y:0,tx:1,ty:0},TMP2={x:0,y:0,tx:1,ty:0},TMP3={x:0,y:0,tx:1,ty:0};

// ---- the one whale that may sit in the sidebar while a conversation is open ----
function residentPad(){return Math.max(14,splitX()*.08);}   // 8% margin inside the sidebar
function residentBounds(){const s=splitX(),pad=residentPad();
  const x0=Math.max(6,Math.min(pad,s*.5)),x1=Math.max(x0+2,s-pad),y0=Math.max(24,H*.06),y1=Math.max(y0+2,Math.min(H-24,H*.94));
  return {x0,x1,y0,y1};}
function residentPoint(){const {x0,x1}=residentBounds();
  return {x:rand(x0,x1),y:rand(H*.16,H*.84)};}
function evictSidebar(keep){                        // only the resident may be left of the split
  const s=splitX();if(s<=0)return;
  for(const w of whales){if(w===keep||w.exitMode==='away')continue;
    if(w.nodes[0]<s){w.exitMode='leaving';w.exitDir=0;w.mode='leaving';w.queue.length=0;w.entry=null;w.entryFor=null;}
    else if(w.mode==='resident')w.mode='roam';}}
function restoreSize(w){if(w)w.lenTarget=base*w.scale*(w.depth||1);}          // 回到开阔水面时慢慢长回去
function fitResident(w){                            // 侧栏不改变体型：大鱼进来还是大鱼，尾巴探到主界面也没关系
  if(!w)return;
  w.lenTarget=base*w.scale*(w.depth||1);
}
let lastResidentScale=0;                             // 上一只常驻的体型，用来让接替的那只换个大小
function pickFreshResident(pool){                    // 刚走的是大鱼，下一只就换小的，反之亦然
  if(!pool.length)return null;
  const score=w=>Math.abs(w.scale-lastResidentScale)+Math.random()*.25;
  return pool.slice().sort((a,b)=>score(b)-score(a))[0];
}
function makeResident(w,enter){
  if(!w)return;
  evictSidebar(w);
  fitResident(w);
  resident=w;lastResidentScale=w.scale;residentTimer=rand(30,60);
  w.mode='resident';w.resSpeed=rand(32,38);w.queue.length=0;w.ptx=NaN;w.roamT=rand(3,7);
  w.entryFor='resident';w.entry=residentPoint();w.resWp=w.entry;
  w.exitMode=enter?'entering':null;w.exitDir=null;
}
let residentExitN=(Math.random()*3)|0;
function residentExit(w){                            // leave by an open edge: left / up / down, never across the chat
  const dirs=[Math.PI,-Math.PI/2,Math.PI/2];         // rotates so the exits never settle into one bearing
  w.exitDir=dirs[residentExitN++%dirs.length];w.exitMode='leaving';w.mode='leaving';w.entry=null;w.entryFor=null;w.queue.length=0;
}
function spawnResident(){                            // a fresh resident swims in from outside the frame
  const s=splitX();if(s<24)return false;
  const pool=[big,mid,calf].filter(w=>w.exitMode==='away');
  if(!pool.length)return false;
  const w=pickFreshResident(pool);fitResident(w);
  const pad=residentPad(),m=w.len*1.15;
  const top=Math.random()<.5,fromSide=Math.random()<.32;
  const bx=clamp(rand(Math.min(pad,s*.4),Math.max(s*.4,s-pad)),8,Math.max(8,s-8));
  let x,y,h;
  if(fromSide){x=-m;y=rand(H*.24,H*.76);h=0;}
  else if(top){x=bx;y=-m;h=Math.PI/2;}
  else{x=bx;y=H+m;h=-Math.PI/2;}
  placeWhale(w,x,y,h,0);
  makeResident(w,true);
  return true;
}
function placeResidentStatic(){                      // reduced motion: parked in the sidebar, no transition
  const w=resident;if(!w)return;
  const s=splitX();if(s<24){resident=null;return;}
  const L=w.len,b=residentBounds();
  const x=clamp(s*.5,b.x0,b.x1);
  const y=clamp(H*.5+L*.22,Math.max(b.y0,L*.15),Math.min(b.y1,H-L*.15));
  placeWhale(w,x,y,Math.PI/2,0);
  w.exitMode=null;w.exitDir=null;w.mode='resident';w.speed=clamp(w.cruise,30,40);w.resSpeed=rand(32,38);
  w.resWp=residentPoint();w.roamT=rand(4,8);w.entry=null;w.entryFor=null;
}
function confineResident(){
  const w=resident;if(!w)return;
  const s=splitX();if(s<24)return;
  fitResident(w);
  const b=residentBounds(),m=w.len*.16;
  // 只收住头部：身体和尾鳍可以越过侧栏边界，探进主界面一点。
  const x0=Math.max(6,b.x0),x1=Math.max(x0+2,s*.94),y0=b.y0,y1=b.y1;
  const hx=w.nodes[0],hy=w.nodes[1],nx=clamp(hx,x0,x1),ny=clamp(hy,y0,y1);
  if(nx!==hx||ny!==hy){for(let k=0;k<NN;k++){w.nodes[k*2]+=nx-hx;w.nodes[k*2+1]+=ny-hy;}buildSpine(w);}
}
function holdOutOfSidebar(w){                         // hard wall: no head but the resident's ever crosses the split
  const s=splitX();if(!conversationMode||s<=0||w===resident||w===released||w.exitMode==='away')return;
  const n=w.nodes,m=Math.max(2,w.len*.02);
  if(n[0]<s+m){const dx=s+m-n[0];for(let k=0;k<NN;k++)n[k*2]+=dx;buildSpine(w);}
}
function keepOutOfSidebar(){                          // after a resize, nothing but the resident may sit left of the split
  const s=splitX();if(s<=0)return;
  for(const w of whales){if(w===resident||w.exitMode==='away')continue;
    const minX=s+Math.max(10,w.len*.25);
    if(w.nodes[0]>=0&&w.nodes[0]<minX){const dx=minX-w.nodes[0];for(let k=0;k<NN;k++)w.nodes[k*2]+=dx;buildSpine(w);}}
}
function reenterFromEdge(w){                         // comes back in from outside, aimed at the chat water
  const L=w.len,s=splitX(),cx=chatCenter(),rw=Math.max(1,W-s);
  const edges=s>0?[0,1,3]:[0,1,2,3];                 // never swim in through the sidebar
  const edge=edges[(Math.random()*edges.length)|0];
  let x,y,h;
  if(edge===0){x=safeX(cx+rand(-.3,.3)*rw,L*.3);y=-L*1.25;h=Math.PI/2;}
  else if(edge===1){x=safeX(cx+rand(-.3,.3)*rw,L*.3);y=H+L*1.25;h=-Math.PI/2;}
  else if(edge===2){x=-L*1.25;y=rand(H*.2,H*.8);h=0;}
  else{x=W+L*1.25;y=rand(H*.2,H*.8);h=Math.PI;}
  w.entry={x:safeX(cx,L*.35),y:rand(H*.28,H*.72)};w.entryFor='roam';
  placeWhale(w,x,y,h,0);
  w.exitMode='entering';w.exitDir=null;w.mode='roam';w.queue.length=0;w.ptx=NaN;
}
function placeOffscreen(w,a){                        // instant switch: park the body clear of the frame, on its bearing
  const L=w.len,ax=clamp(w.nodes[0],Math.max(L*.3,splitX()+L*.25),W-L*.25),ay=clamp(w.nodes[1],H*.25,H*.75);
  if(a===0)placeWhale(w,W+L*1.2,ay,0,0);
  else if(a===Math.PI)placeWhale(w,-L*1.2,ay,Math.PI,0);
  else if(a!=null&&a<0)placeWhale(w,ax,-L*1.2,-Math.PI/2,0);
  else placeWhale(w,ax,H+L*1.2,Math.PI/2,0);
  w.exitMode='away';w.exitDir=null;w.entry=null;w.entryFor=null;w.mode='roam';
}

// start: mother + calf in the right-hand area about to make a wide turn, mid-size whale rising on the left
function startPod(){const {half,mw}=margins(),wd=wide(),cx=chatCenter(),sx=splitX(),rw=Math.max(1,W-sx),xm=wd?cx+mw*.5:sx+rw*.7;
  big.side=1;placeWhale(big,safeX(wd?xm-mw*.12:sx+rw*.62,big.len*.3),H*.6,Math.PI/2+.15,-.02);
  big.queue=[{x:safeX(wd?cx+half*.8:cx,big.len*.2),y:H*.74},{x:safeX(xm,big.len*.2),y:H*.3}];nextWp(big);
  calf.cside=1;calfTarget(TMP3);const ix=TMP3.x;calf.cside=-1;calfTarget(TMP3);if(Math.abs(ix-cx)<Math.abs(TMP3.x-cx)){calf.cside=1;calfTarget(TMP3);}
  placeWhale(calf,TMP3.x,TMP3.y,big.heading,-.02);calf.ptx=NaN;
  const xl=wd?cx-half-mw*.5:sx+rw*.3;mid.side=-1;placeWhale(mid,safeX(xl+(wd?mw*.08:0),mid.len*.3),H*.62,-Math.PI/2+.35,.025);
  mid.queue=[{x:safeX(xl,mid.len*.2),y:H*.26}];nextWp(mid);}

// ---- fish: five species, boids + depth + eat/respawn (ported from dsh-ascii-whales) ----
const SPEC=[
  {name:'sardine',cruise:36,max:64,min:18,weight:3,schoolSize:[18,28],spacing:[1.8,1.1],align:1.6,coh:1.6,jitter:40,mill:70,vdrag:.5},
  {name:'anchovy',cruise:46,max:78,min:22,weight:3,schoolSize:[20,32],spacing:[1.5,1],align:3.2,coh:.45,jitter:30,mill:0,vdrag:1.4},
  {name:'silverside',cruise:40,max:70,min:20,weight:3,schoolSize:[12,20],spacing:[2,1.1],align:2.4,coh:1.1,jitter:35,mill:0,vdrag:1.6},
  {name:'mackerel',cruise:32,max:60,min:16,weight:2,schoolSize:[5,9],spacing:[2.6,1.3],align:2,coh:.9,jitter:25,mill:0,vdrag:2},
  {name:'goby',cruise:26,max:56,min:10,weight:1,schoolSize:[8,12],spacing:[1.4,1.1],align:.35,coh:1.4,jitter:110,mill:0,vdrag:.3},
];
const FISH_GLYPHS=['-','=','.','~','*'];
const TOTAL_WEIGHT=SPEC.reduce((n,s)=>n+s.weight,0);
function pickSpecies(){let r=Math.random()*TOTAL_WEIGHT;for(let i=0;i<SPEC.length;i++){r-=SPEC[i].weight;if(r<=0)return i;}return 0;}
let sepX=[],sepY=[],perc=60;
let fishBucketCols=0,fishBucketRows=0,fishBucketHead=new Int32Array(0),fishBucketNext=new Int32Array(0);
function rebuildFishHash(){
  const size=Math.max(1,perc),pad=2;
  const cols2=Math.ceil(W/size)+pad*2,rows2=Math.ceil(H/size)+pad*2;
  if(cols2!==fishBucketCols||rows2!==fishBucketRows){fishBucketCols=cols2;fishBucketRows=rows2;fishBucketHead=new Int32Array(cols2*rows2);}
  fishBucketHead.fill(-1);
  if(fishBucketNext.length!==fish.length)fishBucketNext=new Int32Array(fish.length);
  for(let i=0;i<fish.length;i++){const f=fish[i];if(!f.alive)continue;
    const c=clamp(Math.floor(f.x/size)+pad,0,cols2-1),r=clamp(Math.floor(f.y/size)+pad,0,rows2-1);
    const b=r*cols2+c;fishBucketNext[i]=fishBucketHead[b];fishBucketHead[b]=i;}}
function seedFish(){
  fish.length=0;schools.length=0;
  sepX=SPEC.map(s=>s.spacing[0]*cw);sepY=SPEC.map(s=>s.spacing[1]*ch);
  perc=Math.max(ch*3,cw*5.5);
  const total=Math.max(20,Math.min(200,Math.round(fishCount)));
  let schoolId=0;
  while(fish.length<total){
    const sp=pickSpecies(),def=SPEC[sp];
    const size=Math.min(Math.floor(rand(def.schoolSize[0],def.schoolSize[1]+1)),total-fish.length);
    const cx=rand(W*.06,W*.94),cy=rand(H*.08,H*.92);
    const dir=(Math.random()<.5?0:Math.PI)+rand(-.5,.5);
    const millDir=Math.random()<.5?1:-1;
    schools.push({dir,next:rand(6,14),cx,cy});
    for(let k=0;k<size;k++){
      fish.push({x:cx+rand(-1,1)*sepX[sp]*Math.sqrt(size),y:cy+rand(-1,1)*sepY[sp]*Math.sqrt(size)*.6,
        vx:Math.cos(dir)*def.cruise,vy:Math.sin(dir)*def.cruise,sp,alarm:0,alive:true,respawnAt:0,
        phase:rand(0,TAU),turn:0,depth:rand(.55,1),millDir,school:schoolId,sidebar:false});
    }
    schoolId++;
  }
  if(conversationMode)for(const f of fish)f.exitMode='leaving';
}
function stepSchools(dt){
  for(const s of schools){s.cx=0;s.cy=0;s.n=0;}
  for(const f of fish){if(!f.alive||f.sidebar)continue;const s=schools[f.school];s.cx+=f.x;s.cy+=f.y;s.n++;}
  for(const s of schools){if(!s.n)continue;s.cx/=s.n;s.cy/=s.n;s.next-=dt;
    const edge=s.cx<W*.08||s.cx>W*.92||s.cy<H*.1||s.cy>H*.9;
    if(s.next<=0||(edge&&s.next<8)){s.next=rand(8,16);
      if(edge)s.dir=Math.atan2(H*rand(.3,.7)-s.cy,W*rand(.3,.7)-s.cx);
      else s.dir+=(Math.random()<.5?-1:1)*rand(.8,2.2);}}}
function stepFish(dt){
  const R2=perc*perc,calm=Math.exp(-dt*.7),cont=Math.min(1,dt*6);
  rebuildFishHash();
  for(let i=0;i<fish.length;i++){const f=fish[i];if(!f.alive)continue;const sp=SPEC[f.sp];
    if(f.sidebar){
      const sx=splitX();
      if(!conversationMode||sx<24){f.sidebar=false;f.sideWp=null;}
      else{
        if(!f.sideWp||Math.hypot(f.sideWp.x-f.x,f.sideWp.y-f.y)<16||Math.random()<.0018){f.sideWp={x:rand(14,Math.max(20,sx-14)),y:rand(H*.18,H*.82)};}
        const dx=f.sideWp.x-f.x,dy=f.sideWp.y-f.y,d=Math.hypot(dx,dy)||1;
        f.vx+=(dx/d*45-f.vx)*Math.min(1,dt*1.2);f.vy+=(dy/d*26-f.vy)*Math.min(1,dt*1.2);
        f.x=clamp(f.x+f.vx*dt,10,sx-10);f.y=clamp(f.y+f.vy*dt,H*.14,H*.86);
        f.phase+=dt*(6+Math.hypot(f.vx,f.vy)*.1);
        continue;
      }
    }
    if(f.exitMode){
      if(f.exitMode==='away')continue;
      const targetX=clamp(f.x,W*.25,W*.75),targetY=clamp(f.y,H*.25,H*.75);
      const speed=Math.max(sp.min,Math.hypot(f.vx,f.vy));
      const old=Math.atan2(f.vy,f.vx),a=f.exitMode==='leaving'?old:Math.atan2(targetY-f.y,targetX-f.x);
      const angle=old+clamp(angD(old,a),-1.1*dt,1.1*dt);
      const next=speed+(sp.cruise-speed)*Math.min(1,dt*.8);
      f.vx=Math.cos(angle)*next;f.vy=Math.sin(angle)*next;f.x+=f.vx*dt;f.y+=f.vy*dt;
      if(f.exitMode==='leaving'&&(f.x < -18||f.x>W+18||f.y < -18||f.y>H+18))f.exitMode='away';
      else if(f.exitMode==='entering'&&f.x>W*.2&&f.x<W*.8&&f.y>H*.18&&f.y<H*.82)f.exitMode=null;
      continue;
    }
    const spread=1+1.8*f.alarm,sX=sepX[f.sp]*spread,sY=sepY[f.sp]*spread;
    const spd=Math.hypot(f.vx,f.vy)||1,hx=f.vx/spd,hy=f.vy/spd;
    let ax=0,ay=0,sx=0,sy=0,avx=0,avy=0,cx=0,cy=0,n=0,na=0;
    {
      const size = Math.max(1, perc);
      const bc = clamp(Math.floor(f.x / size) + 2, 0, fishBucketCols - 1);
      const br = clamp(Math.floor(f.y / size) + 2, 0, fishBucketRows - 1);
      for (let rr = br - 1; rr <= br + 1; rr++) {
        if (rr < 0 || rr >= fishBucketRows) continue;
        for (let cc = bc - 1; cc <= bc + 1; cc++) {
          if (cc < 0 || cc >= fishBucketCols) continue;
          let j = fishBucketHead[rr * fishBucketCols + cc];
          while (j !== -1) {
            const o = fish[j];
            const nextJ = fishBucketNext[j];
            if (j !== i && o.alive) {
              const dx = o.x - f.x, dy = o.y - f.y, d2 = dx * dx + dy * dy;
              if (d2 < R2 && d2 > 1e-6) {
                const d = Math.sqrt(d2);
                if ((dx * hx + dy * hy) / d > -0.6) {
                  const qx = dx / sX, qy = dy / sY, q2 = qx * qx + qy * qy;
                  if (q2 < 1) {
                    const q = Math.sqrt(q2) || 1e-3, k = (1 - q) / q;
                    sx -= qx * k; sy -= qy * k;
                  }
                  if (o.sp === f.sp) { avx += o.vx; avy += o.vy; cx += dx; cy += dy; n++; }
                  else if (d < cw * 3) { const k = ((1 - d / (cw * 3)) / d) * 0.6; sx -= dx * k; sy -= dy * k; }
                  if (o.alarm > na) na = o.alarm;
                }
              }
            }
            j = nextJ;
          }
        }
      }
    }
    ax+=sx*420;ay+=sy*420;
    if(n>0){const aK=1.4*sp.align,cK=sp.coh*(1-.8*f.alarm);ax+=(avx/n-f.vx)*aK+(cx/n)*cK;ay+=(avy/n-f.vy)*aK+(cy/n)*cK;
      if(sp.mill>0){const cl=Math.hypot(cx,cy)||1;ax+=-cy/cl*f.millDir*sp.mill*(1-f.alarm);ay+=cx/cl*f.millDir*sp.mill*(1-f.alarm);}}
    {const sc=schools[f.school],k=.45*(1-f.alarm);ax+=(Math.cos(sc.dir)*sp.cruise-f.vx)*k;ay+=(Math.sin(sc.dir)*sp.cruise-f.vy)*k;}
    let fear=0;
    for(const w of whales){const sp_=w.spine,fr=w.len*.22+40;
      const bx0=Math.min(sp_[0],sp_[(NN-1)*2])-fr,bx1=Math.max(sp_[0],sp_[(NN-1)*2])+fr,by0=Math.min(sp_[1],sp_[(NN-1)*2+1])-fr,by1=Math.max(sp_[1],sp_[(NN-1)*2+1])+fr;
      if(f.x<bx0-w.len*.3||f.x>bx1+w.len*.3||f.y<by0-w.len*.3||f.y>by1+w.len*.3)continue;
      let best=1e18,bx=0,by=0;for(let k=0;k<NN;k+=2){const dx=f.x-sp_[k*2],dy=f.y-sp_[k*2+1],d2=dx*dx+dy*dy;if(d2<best){best=d2;bx=sp_[k*2];by=sp_[k*2+1];}}
      const d=Math.sqrt(best);
      if(d<fr&&d>1e-3){let q=1-d/fr;q*=q;const awx=(f.x-bx)/d,awy=(f.y-by)/d,shx=Math.cos(w.heading),shy=Math.sin(w.heading);
        const side=shx*(f.y-sp_[1])-shy*(f.x-sp_[0])>=0?1:-1;ax+=(awx*.8-shy*side*.6)*900*q;ay+=(awy*.8+shx*side*.6)*900*q;fear=Math.max(fear,Math.sqrt(q)*.6);}}
    if(ray.on){const fr=ray.span*1.25,dx=f.x-ray.x,dy=f.y-ray.y,d=Math.hypot(dx,dy);
      if(d<fr&&d>1e-3){const q=(1-d/fr)**2;ax+=dx/d*800*q;ay+=dy/d*800*q;fear=Math.max(fear,Math.sqrt(q)*.5);}}
    for(const vi of visitors){const fr=vi.len*.55;
      for(const kk of [0,(VN>>1),VN-1]){const vx=vi.spine[kk*2],vy=vi.spine[kk*2+1],dx=f.x-vx,dy=f.y-vy,d=Math.hypot(dx,dy);
        if(d<fr&&d>1e-3){const q=(1-d/fr)**2;ax+=dx/d*950*q;ay+=dy/d*950*q;fear=Math.max(fear,Math.sqrt(q)*.85);}}}
    if(mouse.active){const pr=130,dx=f.x-mouse.x,dy=f.y-mouse.y,d=Math.hypot(dx,dy);
      if(d<pr&&d>1e-3){const q=(1-d/pr)**2;ax+=(dx/d)*1100*q;ay+=(dy/d)*1100*q;fear=Math.max(fear,Math.sqrt(q)*.8);}}
    let al=Math.max(f.alarm*calm,fear);const rel=na*.86;if(rel>al)al+=(rel-al)*cont;f.alarm=al;
    const m=36;if(f.x<m)ax+=(m-f.x)*7;else if(f.x>W-m)ax-=(f.x-(W-m))*7;if(f.y<m+40)ay+=(m+40-f.y)*7;else if(f.y>H-m)ay-=(f.y-(H-m))*7;
    current(f.x,f.y,T,cur);ax+=cur.x*.5+(Math.random()-.5)*sp.jitter;ay+=cur.y*.5+(Math.random()-.5)*sp.jitter;
    ay-=f.vy*sp.vdrag*(1-.7*f.alarm)*.6;
    const pref=sp.cruise*(1+1.3*f.alarm);ax+=(pref-spd)*hx*1.6;ay+=(pref-spd)*hy*1.6;
    f.vx+=ax*dt;f.vy+=ay*dt;const mx=sp.max*(1+1.8*f.alarm),sp2=Math.hypot(f.vx,f.vy);
    if(sp2>mx){f.vx*=mx/sp2;f.vy*=mx/sp2;}else if(sp2<sp.min&&sp2>1e-3){f.vx*=sp.min/sp2;f.vy*=sp.min/sp2;}
    f.turn+=((Math.atan2(f.vy,f.vx)-Math.atan2(hy,hx))/dt-f.turn)*Math.min(1,dt*8);
    f.phase+=dt*(7+Math.hypot(f.vx,f.vy)*.12);
    f.x=clamp(f.x+f.vx*dt,-60,W+60);f.y=clamp(f.y+f.vy*dt,-60,H+60);
    for(const w of whales){if(w.exitMode==='away')continue;const px=w.nodes[0],py=w.nodes[1],r=w.len*.055+7;
      if((f.x-px)**2+(f.y-py)**2<r*r){f.alive=false;f.respawnAt=T+rand(2.5,7);break;}}
  }
  for(const f of fish){if(!f.alive&&T>=f.respawnAt){f.alive=true;f.alarm=0;f.exitMode=undefined;f.x=Math.random()<.5?-25:W+25;f.y=rand(H*.15,H*.85);f.vx=(f.x<0?1:-1)*SPEC[f.sp].cruise;f.vy=0;f.depth=rand(.55,1);}}
}
function splash(x,y){ripples.push({x,y,age:0,sp:150,life:1.8,k:1});const r=220;
  for(const f of fish){const dx=f.x-x,dy=f.y-y,d=Math.hypot(dx,dy);if(d>r||d<1e-3)continue;const k=(1-d/r)*220;f.vx+=dx/d*k;f.vy+=dy/d*k;f.alarm=1;}}

// ---- whale behaviour ----
// big + mid: slow wander between waypoints in their own side area, occasional lazy circles; every ~45 s
// the pair swaps sides, the mother over the top and the mid-size whale across the middle, so they pass
// each other. The calf holds station at the mother's flank and now and then loops around her.
const flickEnv=w=>{const ft=w.flick;return ft>=0&&ft<2.8?Math.exp(-ft*1.5)*Math.min(1,ft*5):0;};
const CALF_S=.32;
function calfTarget(o){const m=big;pointAt(m,CALF_S,o);const fx=-o.tx,fy=-o.ty,nx=-fy,ny=fx;   // forward, left normal
  const B=m.len*.27+calf.len*.03;let al=0,lat=calf.cside*B;
  if(calf.orb>=0){const a=calf.orbA;al=Math.sin(a)*m.len*.4*calf.orbDir;lat=calf.cside*B*Math.cos(a);}
  o.x+=fx*al+nx*lat;o.y+=fy*al+ny*lat;return o;}
function avoid(w,acc){                                   // keep clear of the other whales' bodies
  for(const o of whales){if(o===w||(w===calf&&o===big)||(w===big&&o===calf))continue;
    const R=w.len*.3+o.len*.3;const hx=w.nodes[0],hy=w.nodes[1];
    for(let k=0;k<NN;k+=3){const dx=hx-o.spine[k*2],dy=hy-o.spine[k*2+1],d=Math.hypot(dx,dy);
      if(d<R&&d>1e-3){const q=(1-d/R)*(w===mid?1.6:1);acc.x+=dx/d*q;acc.y+=dy/d*q;}}}
  if(ray.on&&w!==calf){const R=ray.span*1.4+w.len*.25,dx=w.nodes[0]-ray.x,dy=w.nodes[1]-ray.y,d=Math.hypot(dx,dy);if(d<R&&d>1e-3){const q=(1-d/R)*1.2;acc.x+=dx/d*q;acc.y+=dy/d*q;}}}  // give way to the manta
const AV={x:0,y:0};
function stepWhale(w,dt){
  const n=w.nodes,L=w.len,hx=n[0],hy=n[1],{half,mw}=margins(),fe=flickEnv(w),sx=splitX(),cx=chatCenter();
  let dx=Math.cos(w.heading),dy=Math.sin(w.heading),forced=null,maxT,goal=w.cruise;
  if(w.exitMode==='away')return;
  if(w.exitMode){                                     // leaving on its own bearing, or coming back in
    if(w.exitMode==='entering'){
      const e=w.entry&&w.entryFor?w.entry:{x:cx,y:H*.5},d=Math.hypot(e.x-hx,e.y-hy)||1;
      dx=(e.x-hx)/d;dy=(e.y-hy)/d;
    }else if(w.exitDir!=null){dx=Math.cos(w.exitDir);dy=Math.sin(w.exitDir);}
    maxT=Math.min(.55,Math.max(w.speed,20)/(L*.27))*dt;goal=w.cruise;
  }
  else if(w===resident&&sx>=24){                        // the one whale allowed in the sidebar
    const {x0,x1,y0,y1}=residentBounds();
    w.roamT=(w.roamT||0)-dt;
    if(!w.resWp||w.roamT<=0||Math.hypot(w.resWp.x-hx,w.resWp.y-hy)<L*.3){w.resWp=residentPoint();w.roamT=rand(4,9);}
    const tx=w.resWp.x-hx,ty=w.resWp.y-hy,td=Math.hypot(tx,ty)||1;
    dx=tx/td;dy=ty/td;
    if(hx<x0)dx+=(x0-hx)/Math.max(1,x1-x0)*3.2;       // soft walls: no room in the sidebar for a hard turn
    else if(hx>x1)dx-=(hx-x1)/Math.max(1,x1-x0)*3.2;
    if(hy<y0)dy+=(y0-hy)/Math.max(1,H*.08)*2.4;
    else if(hy>y1)dy-=(hy-y1)/Math.max(1,H*.08)*2.4;
    w.wander=clamp(w.wander+(Math.random()-.5)*dt*1.2,-.5,.5);
    dx+=Math.cos(w.heading+w.wander)*.6;dy+=Math.sin(w.heading+w.wander)*.6;
    AV.x=AV.y=0;avoid(w,AV);dx+=AV.x*1.4;dy+=AV.y*1.4;
    goal=clamp(w.resSpeed||w.cruise,30,40);
    maxT=Math.min(.5,Math.max(w.speed,16)/(L*.35))*dt;
  }
  else if(w.role==='calf'){
    w.calfT-=dt;
    const mh=big.nodes,room=mh[0]>sx+(W-sx)*.12&&mh[0]<W-(W-sx)*.12&&mh[1]>H*.18&&mh[1]<H*.82;
    if(w.orb<0&&w.calfT<=0&&big.mode!=='circle'&&room&&Math.abs(big.turn)<.14){w.orb=0;w.orbA=0;w.orbDir=Math.random()<.5?1:-1;w.orbEnd=Math.random()<.65?Math.PI:TAU;}
    if(w.orb<0&&w.calfT<=0&&!room)w.calfT=1.5;
    if(w.orb>=0){w.orbA+=dt*TAU/18;if(w.orbA>=w.orbEnd){if(w.orbEnd<TAU)w.cside=-w.cside;w.orb=-1;w.orbA=0;w.calfT=rand(16,26);}}
    calfTarget(TMP3);let vx=0,vy=0;
    if(!isNaN(w.ptx)&&dt>0){vx=(TMP3.x-w.ptx)/dt;vy=(TMP3.y-w.pty)/dt;}w.ptx=TMP3.x;w.pty=TMP3.y;
    const mfx=-TMP3.tx,mfy=-TMP3.ty,ax=TMP3.x+vx*.55-hx,ay=TMP3.y+vy*.55-hy,d=Math.hypot(ax,ay)||1,near=clamp((d-L*.15)/(L*.5),0,1);
    dx=ax/d*near+mfx*(1-near)*(w.orb>=0?.3:1);dy=ay/d*near+mfy*(1-near)*(w.orb>=0?.3:1);   // close in: just match the mother's heading
    const along=(TMP3.x-hx)*Math.cos(w.heading)+(TMP3.y-hy)*Math.sin(w.heading);
    goal=clamp(Math.hypot(vx,vy)+clamp(along*1.2,-30,55),6,120);
    if(sx>0&&hx<sx+L*.6)dx+=clamp((sx+L*.6-hx)/Math.max(1,(W-sx)*.4),0,1)*3.4;   // never trail the mother into the sidebar
    AV.x=AV.y=0;avoid(w,AV);dx+=AV.x*1.5;dy+=AV.y*1.5;
    maxT=Math.min(1.4,Math.max(w.speed,20)/(L*.22))*dt;}
  else{
    w.wander=clamp(w.wander+(Math.random()-.5)*dt*1.8,-.8,.8);
    dx+=Math.cos(w.heading+w.wander)*.45;dy+=Math.sin(w.heading+w.wander)*.45;
    w.sideT+=dt;w.circT+=dt;
    if(w.mode==='circle'){                       // lazy loop at a fixed, generous radius
      const om=w.speed/(L*.36);forced=w.circDir*om*dt;w.circLeft-=om*dt;if(w.circLeft<=0){w.mode='roam';nextWp(w);}}
    else{const tx=w.wp.x-hx,ty=w.wp.y-hy,d=Math.hypot(tx,ty)||1;dx+=tx/d*1.3;dy+=ty/d*1.3;
      if(d<L*.2){
        const R=L*.36;let dir=Math.sign(Math.cos(w.heading)*((H*.5)-hy)*-1+Math.sin(w.heading)*((cx+w.side*(half+mw*.5))-hx))||1;
        const ccx=hx-Math.sin(w.heading)*R*dir,ccy=hy+Math.cos(w.heading)*R*dir,room=R+L*.15;
        if(!w.queue.length&&w.circT>20&&Math.random()<.6&&ccx>room+sx&&ccx<W-room&&ccy>room*.8&&ccy<H-room*.8){
          w.mode='circle';w.circDir=dir;w.circLeft=TAU*rand(.85,1.1);w.circT=0;}
        else nextWp(w);}
      if(w===big&&w.sideT>45&&!w.queue.length&&mw>=L*.3){w.sideT=0;const s2=-w.side;    // the pod swaps sides
        w.queue=[{x:safeX(cx+w.side*half*.35,0),y:H*rand(.12,.2)},{x:safeX(cx-w.side*half*.35,0),y:H*rand(.12,.2)},regionPoint(w,s2,.35,.6)];w.side=s2;nextWp(w);
        if(mid.side===s2){const m2=-mid.side;mid.queue=[{x:safeX(cx+mid.side*half*.3,0),y:H*rand(.55,.66)},{x:safeX(cx-mid.side*half*.3,0),y:H*rand(.5,.62)},regionPoint(mid,m2,.3,.7)];
          mid.side=m2;mid.mode='roam';nextWp(mid);}}}
    AV.x=AV.y=0;avoid(w,AV);dx+=AV.x*2.2;dy+=AV.y*2.2;
    // the sidebar belongs to the resident alone: nothing else steers into it
    if(conversationMode&&sx>0){const wall=sx+Math.max(40,L*.4);if(hx<wall){const k=clamp((wall-hx)/Math.max(1,(W-sx)*.4),0,1)*4.2;dx+=k;dy+=(H*.5-hy)*.0005*k;
      if(hx<sx+L*.6&&w.mode==='circle'){w.mode='roam';nextWp(w);forced=null;}}}
    // turn back once the head leaves the chat water
    const left=conversationMode?sx:0,lx=hx+Math.cos(w.heading)*L*.35,ly=hy+Math.sin(w.heading)*L*.35,over=Math.max(left-lx,lx-W,-ly,ly-H*1.02,left-hx,hx-W,-hy,hy-H);
    if(over>-L*.3){const k=clamp((over+L*.3)/(L*.35),0,1)*6,toX=cx-hx,toY=H/2-hy,d=Math.hypot(toX,toY)||1;dx+=toX/d*k;dy+=toY/d*k;
      if(over>-L*.25&&w.mode==='circle'){w.mode='roam';nextWp(w);forced=null;}}
    maxT=Math.min(.55,w.speed/(L*.27))*dt;          // a big body can't pivot: turning radius >= ~0.27 body lengths
    goal=w.cruise*(replying&&w===big?1.12:1)*(1+.7*fe);}
  const turned=forced!=null?forced:clamp(angD(w.heading,Math.atan2(dy,dx)),-maxT,maxT);
  w.heading+=turned;w.turn+=(turned/dt-w.turn)*Math.min(1,dt*3);
  w.speed+=(goal-w.speed)*Math.min(1,dt*(w.role==='calf'?2:1.2));
  {const want=w.lenTarget||base*w.scale*(w.depth||1);                     // 体型缓慢过渡，进侧栏时不会突然变小
    if(Math.abs(w.len-want)>.4){w.len+=(want-w.len)*Math.min(1,dt*.5);w.seg=w.len/(NN-1);}}
  if(w.role==='calf'){                              // two strokes per mother stroke, phase-locked unless sprinting
    const boost=clamp((w.speed-big.speed)/60,0,1);w.phase+=dt*TAU*w.freq*(1+.35*boost);
    w.phase+=angD(w.phase,2*big.phase+1.3)*Math.min(1,dt*1.5)*(1-boost);}
  else w.phase+=dt*TAU*(w.freq+.004*(w.speed-w.cruise)+.5*fe);
  w.flick+=dt;
  const surge=.86+.28*(.5-.5*Math.cos(2*w.phase-.9));       // thrust peaks once per stroke
  const v=w.speed*surge;
  n[0]+=Math.cos(w.heading)*v*dt;n[1]+=Math.sin(w.heading)*v*dt;
  // follow-the-leader spine with a per-joint stiffness limit (bends into an arc, never folds)
  const maxBend=.15;let prev=w.heading+Math.PI;
  for(let k=1;k<NN;k++){const px=n[(k-1)*2],py=n[(k-1)*2+1];let a=Math.atan2(n[k*2+1]-py,n[k*2]-px);
    a=prev+clamp(angD(prev,a),-maxBend,maxBend);n[k*2]=px+Math.cos(a)*w.seg;n[k*2+1]=py+Math.sin(a)*w.seg;prev=a;}
  buildSpine(w);
  if(w===resident&&!w.exitMode)confineResident();      // the sidebar is a closed basin: it never drifts out of it
  else holdOutOfSidebar(w);                           // and nothing else may cross into it
  // leaving: gone once the body is clear of the frame; entering: done once the head is home
  if(w.exitMode==='leaving'&&(n[0]<-L*.95||n[0]>W+L*.95||n[1]<-L*.95||n[1]>H+L*.95)){
    w.exitMode='away';w.exitDir=null;w.entry=null;w.entryFor=null;w.mode='roam';}
  else if(w.exitMode==='entering'){
    const res=w.entryFor==='resident';
    const b=res?residentBounds():null;
    const done=res?(n[0]>b.x0&&n[0]<b.x1&&n[1]>b.y0&&n[1]<b.y1)
                  :(n[0]>W*.18&&n[0]<W*.84&&n[1]>H*.14&&n[1]<H*.86);
    if(done){w.exitMode=null;w.entry=null;w.entryFor=null;w.queue.length=0;w.ptx=NaN;w.mode=res?'resident':'roam';
      if(res){residentTimer=rand(30,60);w.resWp=residentPoint();w.roamT=rand(3,7);confineResident();}else nextWp(w);}
  }
  // Quiet mode: no automatic spouts.
}
function pointAt(w,sf,o){const s=w.spine,a=w.arc,t=sf*w.arcT;let k=0;while(k<NN-2&&a[k+1]<t)k++;
  const l=a[k+1]-a[k]||1,u=clamp((t-a[k])/l,0,1),ex=s[k*2+2]-s[k*2],ey=s[k*2+3]-s[k*2+1];
  o.x=s[k*2]+ex*u;o.y=s[k*2+1]+ey*u;o.tx=ex/l;o.ty=ey/l;return o;}
function buildSpine(w){const n=w.nodes,s=w.spine,a=w.arc,L=w.len,on=reduced?0:1,fe=flickEnv(w);
  // travelling body wave: tiny at the head, large at the tail (amplitude ~ q^2)
  for(let k=0;k<NN;k++){const q=k/(NN-1),i0=Math.max(0,k-1),i1=Math.min(NN-1,k+1);let tx=n[i0*2]-n[i1*2],ty=n[i0*2+1]-n[i1*2+1];const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
    const amp=L*.052*(.07+.93*q*q)*(1+1.1*fe)*on,off=amp*Math.sin(w.phase-q*4.4);
    s[k*2]=n[k*2]-ty*off;s[k*2+1]=n[k*2+1]+tx*off;}
  a[0]=0;for(let k=1;k<NN;k++)a[k]=a[k-1]+Math.hypot(s[k*2]-s[k*2-2],s[k*2+1]-s[k*2-1]);
  w.arcT=a[NN-1]||1;
  // fluke frame: anchored on the tail stock, pitched through each stroke (lags the body wave)
  const FP=w.FP;pointAt(w,.8,TMP2);pointAt(w,.88,FP);let tx=s[(NN-1)*2]-TMP2.x,ty=s[(NN-1)*2+1]-TMP2.y;const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
  const fa=on*.42*Math.sin(w.phase-5.7)*(1+.9*fe),c=Math.cos(fa),sn=Math.sin(fa);FP.tx=tx*c-ty*sn;FP.ty=tx*sn+ty*c;
  // pectoral fins: slow flap (half the tail-beat rate); the outside fin spreads in a turn
  const fp=w.phase*.5,bank=clamp(w.turn*.7,-.3,.3)*on;
  w.finU=L*(.37+.04*Math.sin(fp)*on);const reach=L*(.13+.12*(.75+.25*Math.sin(fp+.6)*on));w.finTipR=reach*(1+bank);w.finTipL=reach*(1-bank);}
// classify one point against a creature: writes HIT {f flag, sh shade 0 dark..1 lit, ka/kb body-anchored key, d dist}
const F_BODY=1,F_EDGE=2,F_FIN=3,F_RIDGE=4,F_EYE=5;const HIT={f:0,sh:0,ka:0,kb:0,d:0};
function sample(w,px,py){
  const sp=w.spine,arc=w.arc,L=w.len;let best=1e18,bS=0,sign=1,nx=0,ny=0;
  for(let k=0;k<NN-1;k++){const ax=sp[k*2],ay=sp[k*2+1],sx=sp[k*2+2]-ax,sy=sp[k*2+3]-ay,l2=sx*sx+sy*sy||1;
    const u=clamp(((px-ax)*sx+(py-ay)*sy)/l2,0,1),qx=ax+sx*u-px,qy=ay+sy*u-py,d2=qx*qx+qy*qy;
    if(d2<best){best=d2;const l=Math.sqrt(l2);bS=(arc[k]+u*l)/w.arcT;sign=sx*(py-ay)-sy*(px-ax)>=0?1:-1;nx=-sy/l*sign;ny=sx/l*sign;}}
  const a=Math.sqrt(best),s=bS,hwid=hw(s)*L*(s<.8?w.fat:1);HIT.d=a;HIT.ka=Math.round(s*64);HIT.kb=Math.round(a*sign/(cw*.9));
  if(a<=hwid){const across=a/(hwid||1);
    const facing=(nx*-.6+ny*-.8)*across;                       // light from the top-left
    let shade=.5-across*across*.3+facing*.12,f=F_BODY;
    if(ny>0)shade+=.5*sm(.25,.9,across)*ny*(1-sm(.6,.85,s));   // pale belly (countershading), fades on the tail stock
    else shade-=.16*across*-ny;                                 // darker back
    if(across>.88&&!(ny>.3&&s<.6))shade-=.12;                   // darker rim
    if(s>.6&&s<.67&&across<.24){f=F_RIDGE;shade=.95;}            // small dorsal fin catching the light
    else if(s>.13&&s<.6&&across<.1)shade-=.16;                   // dark line down the back
    if(L>200){if(s>.07&&s<.095&&across>.68&&across<.9){f=F_EYE;shade=0;}   // eyes
      else if(s>.115&&s<.135&&across<.17){f=F_EYE;shade=0;}}     // blowhole
    if(s<.03&&f===F_BODY)shade=Math.max(shade,.68);             // pale snout tip
    HIT.f=f;HIT.sh=clamp(shade,0,1);return true;}
  // pectoral flippers: a paddle from the flank (root) to a flapping tip, chord tapering to a rounded end
  const u=s*L,tip=sign>0?w.finTipR:w.finTipL;
  if(s>.12&&s<.55){const rx=L*.2,ry=L*.085,ex=w.finU-rx,ey=tip-ry,el=ex*ex+ey*ey||1,t=clamp(((u-rx)*ex+(a-ry)*ey)/el,0,1),
      dd=Math.hypot(rx+ex*t-u,ry+ey*t-a),chord=L*(.05*(1-t)+.02*t);
    if(dd<chord&&a>ry*.6){HIT.f=F_FIN;HIT.sh=.34+.32*(1-t)*(sign>0?1:.8);return true;}}
  // flukes: wide, swept-back, notched in the middle, in a frame pitched with the stroke
  const FP=w.FP,qx=px-FP.x,qy=py-FP.y,xa=(qx*FP.tx+qy*FP.ty)/L,ya=(-qx*FP.ty+qy*FP.tx)/L,r=Math.abs(ya)/.2;
  if(xa>-.01&&r<=1){const fr=.075*Math.pow(r,1.35),bk=.085+.06*Math.sin(r*Math.PI*.85)-.03*Math.exp(-((r/.14)**2))-.06*sm(.8,1,r);
    if(xa>=fr&&xa<=bk){HIT.f=F_FIN;HIT.ka=Math.round((.88+xa)*64);HIT.kb=Math.round(ya*L/(cw*.9));HIT.sh=.3+.32*(1-r)+.12*((xa-fr)/(bk-fr+1e-3)<.35?1:0);return true;}}
  return false;}
// manta: top-down diamond disc whose span foreshortens as the wings beat up and down; tips lag the stroke
function sampleRay(o,px,py){const S=o.span,c=Math.cos(o.h),s=Math.sin(o.h),qx=px-o.x,qy=py-o.y;
  const u=(qx*c+qy*s)/S,v=(-qx*s+qy*c)/S,ph=o.phase,k=Math.cos(.8*Math.sin(ph)),av=Math.abs(v);
  HIT.d=Math.max(0,Math.hypot(qx,qy)-S*1.15);HIT.ka=Math.round(u*S/(cw*.8));HIT.kb=Math.round(v*S/(cw*.9));
  const r=av/k;
  if(r<=1){const lag=-.1*r*r*Math.cos(ph),uf=.42-.5*Math.pow(r,1.5)+lag,ub=-.28+.16*Math.pow(r,.8)+lag;
    if(u<=uf&&u>=ub){let sh=.58-.22*r*r+.26*r*Math.sin(ph)-(r<.13?.14:0);
      if(r>.1&&r<.17&&u>.24&&u<.32){HIT.f=F_EYE;HIT.sh=0;return true;}
      HIT.f=r>.75?F_FIN:F_BODY;HIT.sh=clamp(sh,0,1);return true;}
    if(r>.06&&r<.2&&u>uf&&u<.53){HIT.f=F_FIN;HIT.sh=.4;return true;}}       // cephalic lobes
  if(av<.04&&u<-.2&&u>-1.05){HIT.f=F_FIN;HIT.sh=.3;return true;}          // whip tail
  return false;}
const SUB=[.25,.3,.75,.3,.25,.72,.75,.72];
function raster(o,fn,x0,y0,x1,y1,skip,seed,alpha){
  const c0=Math.max(0,Math.floor(x0/cw)),c1=Math.min(cols-1,Math.floor(x1/cw)),r0=Math.max(0,Math.floor(y0/ch)),r1=Math.min(rows-1,Math.floor(y1/ch));
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const x=c*cw,y=r*ch;
    const hit=fn(o,x+cw/2,y+ch/2);if(!hit&&HIT.d>skip)continue;
    const f=HIT.f,sh_=HIT.sh,ka=HIT.ka,kb=HIT.kb;let hits=hit?1:0;
    for(let k=0;k<8;k+=2)if(fn(o,x+SUB[k]*cw,y+SUB[k+1]*ch))hits++;
    if(!hits)continue;const cov=hits/5,i=r*cols+c;
    wKey[i]=(hash3(ka,kb,seed)*4294967295)>>>0;   // body-anchored: glyphs ride with the skin
    const curtain = o.exitMode ? sm(0, Math.max(18, cw*2.5), Math.min(x+cw/2, W-x-cw/2, y+ch/2, H-y-ch/2)) : 1;
    if(curtain<=0)continue;
    wA[i]=alpha*curtain;
    if(hit&&cov>=.6){wFlag[i]=f;wShade[i]=sh_;}else{wFlag[i]=F_EDGE;wShade[i]=cov;}}}
function edgeFade(mode,x,y,margin){
  if(reduced&&conversationMode)return 0;
  if(!mode)return 1;
  const inside=Math.min(x,W-x,y,H-y);
  return sm(0,Math.min(24,margin),inside);
}
function rasterWhale(w){if(w.visible===false)return;const s=w.spine,reach=w.len*.3;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let k=0;k<NN;k++){x0=Math.min(x0,s[k*2]);x1=Math.max(x1,s[k*2]);y0=Math.min(y0,s[k*2+1]);y1=Math.max(y1,s[k*2+1]);}
  if(x1+reach<0||x0-reach>W||y1+reach<0||y0-reach>H)return;
  raster(w,sample,x0-reach,y0-reach,x1+reach,y1+reach,reach+Math.hypot(cw,ch),w.seed,w.alpha*(.6+.4*(w.depth||1)));}
function rasterRay(){const R=ray.span*1.15;if(ray.x+R<0||ray.x-R>W||ray.y+R<0||ray.y-R>H)return;
  raster(ray,sampleRay,ray.x-R,ray.y-R,ray.x+R,ray.y+R,Math.hypot(cw,ch)*1.5,ray.seed,.8*(.6+.4*ray.depth));}
function launchRay(){ray.span=base*.2;const m=ray.span*1.4,{half,mw}=margins(),down=Math.random()<.5;
  // glide the length of a side margin (top to bottom or back), tilted a little, away from the mother if there is room
  const side=mw>=ray.span*1.4?-big.side:(Math.random()<.5?-1:1),x=mw>=ray.span*1.4?W/2+side*(half+mw*.5):W*rand(.2,.8);
  ray.x=x+rand(-.15,.15)*mw;ray.lane=ray.x;ray.y=down?-m:H+m;ray.h=(down?Math.PI/2:-Math.PI/2)+side*rand(-.12,.12);
  ray.on=true;ray.t=0;ray.yaw=rand(0,TAU);ray.phase=rand(0,TAU);}
function stepRay(dt){
  if(ray.exitMode==='away')return;
  if(ray.exitMode&&ray.on){
    const tx=clamp(ray.x,W*.25,W*.75),ty=clamp(ray.y,H*.25,H*.75);
    if(ray.exitMode==='entering'){const target=Math.atan2(ty-ray.y,tx-ray.x);ray.h+=clamp(angD(ray.h,target),-.35*dt,.35*dt);}
    ray.phase+=dt*TAU*.32;ray.x+=Math.cos(ray.h)*ray.speed*dt;ray.y+=Math.sin(ray.h)*ray.speed*dt;
    const margin=ray.span*1.5;
    if(ray.exitMode==='leaving'&&(ray.x < -margin||ray.x > W+margin||ray.y < -margin||ray.y > H+margin))ray.exitMode='away';
    else if(ray.exitMode==='entering'&&ray.x>W*.2&&ray.x<W*.8&&ray.y>H*.18&&ray.y<H*.82)ray.exitMode=null;
    return;
  }
  if(!ray.on){if(conversationMode)return;ray.next-=dt;if(ray.next<=0)launchRay();return;}
  ray.t+=dt;ray.phase+=dt*TAU*.32;
  ray.h+=Math.sin(ray.t*.3+ray.yaw)*.12*dt;
  {const want=(Math.sin(ray.h)>0?Math.PI/2:-Math.PI/2)+clamp((ray.lane-ray.x)/120,-.35,.35)*(Math.sin(ray.h)>0?-1:1);ray.h+=clamp(angD(ray.h,want),-.25*dt,.25*dt);}  // keep to its lane                              // slow meander
  const glide=.7+.45*Math.max(0,Math.sin(ray.phase-.4));                  // thrust on the downstroke, then glide
  ray.x+=Math.cos(ray.h)*ray.speed*glide*dt;ray.y+=Math.sin(ray.h)*ray.speed*glide*dt;
  const m=ray.span*1.6;if(ray.t>3&&(ray.x<-m||ray.x>W+m||ray.y<-m||ray.y>H+m)){ray.on=false;ray.next=rand(18,32);}}
function blowhole(w){return pointAt(w,.125,TMP);}
function spawnBubble(){const b=blowhole(big);parts.push({k:'bub',g:Math.random()<.5?G_O:G_DEG,x:b.x+rand(-4,4),y:b.y,vx:rand(-3,3),vy:-rand(16,26),age:0,life:rand(2.4,3.4),w:Math.random()*6});}
function spout(w,k){k=k||1;const b=blowhole(w),n=Math.round(5+12*k);
  for(let i=0;i<n;i++){const a=-Math.PI/2+rand(-.45,.45),s=rand(55,110)*(.45+.55*k);
    parts.push({k:'drop',g:[G_TICK,G_PER,G_COLON,G_DEG][i%4],x:b.x,y:b.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,age:0,life:rand(1.4,1.9)*(.7+.3*k)});}
  ripples.push({x:b.x,y:b.y,age:0,sp:70*k+20,life:1.6,k:.7});}

let fAcc=0;
let seaCalm=1;
function simulate(dt){T+=dt;
  seaCalm+=( (conversationMode?.62:1) - seaCalm )*Math.min(1,dt*.45);
  fAcc+=dt;let st=0;while(fAcc>=1/60&&st<6){stepFish(1/60);fAcc-=1/60;st++;}if(st===6)fAcc=0;
  stepSchools(dt);
  for(const w of stepOrder)stepWhale(w,dt);
  stepRay(dt);
  stepVisitors(dt);
  if(released&&(released.exitMode||released.nodes[0]>=splitX()))released=null;   // back in the open water
  // resident bookkeeping: its stay, its own exit, then a quiet gap before the next one swims in
  if(conversationMode&&splitX()<24&&resident){         // the sidebar vanished under it: it is a plain whale again
    resident.mode='roam';residentExit(resident);resident=null;residentTimer=0;residentEnter=0;}
  if(conversationMode&&splitX()>0){
    if(resident){
      if(resident.exitMode==='away'){resident=null;residentTimer=0;residentEnter=rand(18,40);}
      else if(!resident.exitMode){residentTimer-=dt;if(residentTimer<=0)residentExit(resident);}
    }else if(residentEnter>0){residentEnter-=dt;if(residentEnter<=0&&!spawnResident())residentEnter=rand(3,6);}
  }
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.age+=dt;if(p.age>p.life){parts.splice(i,1);continue;}
    if(p.k==='bub'){p.x+=(p.vx+Math.sin(p.age*3+p.w)*5)*dt;p.y+=p.vy*dt;}else{p.vy+=95*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}}
  for(let i=ripples.length-1;i>=0;i--){ripples[i].age+=dt;if(ripples[i].age>ripples[i].life)ripples.splice(i,1);}
  // wake: tail stocks and fluke tips stir the water; the field blurs (5-point) and decays.
  // Only in the chat water — the sidebar stays clean, and the resident there leaves no trail.
  for(const w of whales){const s=w.spine,L=w.len,dep=dt*(1.5+2*flickEnv(w))*(.45+.55*w.scale),FP=w.FP;
    for(let k=NN-6;k<NN;k++){const i=cellIdxChat(s[k*2],s[k*2+1]);if(i>=0)energy[i]=Math.min(1.5,energy[i]+dep*(k-NN+7)/6);}
    for(const sg of [-1,1]){const x=FP.x+FP.tx*L*.085-FP.ty*sg*L*.17,y=FP.y+FP.ty*L*.085+FP.tx*sg*L*.17,i=cellIdxChat(x,y);if(i>=0)energy[i]=Math.min(1.5,energy[i]+dep*1.3);}}
  if(ray.on){const c=Math.cos(ray.h),s=Math.sin(ray.h),k=Math.cos(.8*Math.sin(ray.phase))*ray.span;
    for(const sg of [-1,1]){const i=cellIdxChat(ray.x-c*ray.span*.12-s*sg*k,ray.y-s*ray.span*.12+c*sg*k);if(i>=0)energy[i]=Math.min(1.2,energy[i]+dt*1.1);}}
  if(mouse.active){const i=cellIdxChat(mouse.x,mouse.y);if(i>=0)energy[i]=Math.min(1.4,energy[i]+.03);}
  const dec=Math.exp(-dt*.8),e=energy,t=energyT;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*cols+c;
    t[i]=(e[i]*4+(c>0?e[i-1]:e[i])+(c<cols-1?e[i+1]:e[i])+(r>0?e[i-cols]:e[i])+(r<rows-1?e[i+cols]:e[i]))*.125*dec;}
  energy=t;energyT=e;}
const cellIdx=(x,y)=>{const c=Math.floor(x/cw),r=Math.floor(y/ch);return c<0||r<0||c>=cols||r>=rows?-1:r*cols+c;};
const cellIdxChat=(x,y)=>x<splitX()?-1:cellIdx(x,y);   // the sidebar carries no surface, foam or wake

// ---- per-frame field: ocean surface glyphs, then the creatures overwrite the cells they cover ----
// surface = broad swell bands drifting slowly on a diagonal (plus a cross swell), with short current
// streaks sliding along each row; crests are denser and darker ('-', '~'), troughs sparse ('·', blank).
function field(){
  const lo=P.lo,hi=P.hi,t=reduced?0:T,sx=splitX();
  for(let r=0;r<rows;r++){const y=r*ch,ry=Math.sin(y*.043+t*.08)*2.2;for(let c=0;c<cols;c++){const i=r*cols+c,x=c*cw;
    const dc=x+cw*.5-sx;                                             // the sidebar keeps a much calmer sea
    const wSide=sx>0&&dc<0?.55+.45*sm(0,1,clamp((x+cw*.5)/sx,0,1)):1;
    if(x+cw*.5>=sx&&y+ch*.5<chatTop()){cellG[i]=G_BLANK;cellA[i]=0;blockA[i]=0;continue;}
    const nz=noise[i];
    const band=.55*Math.sin(x*.0052+y*.0155-t*.3)+.3*Math.sin(x*.0118-y*.0062+t*.17+1.7)+.15*Math.sin((x*.6+y)*.021+t*.4);
    const crest=sm(-.25,.8,band);
    const st=Math.sin((x-t*15)*.05+ry+nz*2.4);
    const g=.2+crest*.46+nz*.38+st*.11;const e=energy[i];
    let gi=g<.27?G_BLANK:g<.36?G_DOT:g<.45?G_PER:g<.61?G_DASH:G_TILDE;
    const tw=reduced?.92:.86+.14*Math.sin(t*twF[i]+twP[i]);
    let a=(lo*.72+(hi-lo*.72)*clamp(crest*.8+.25*st,0,1))*tw*wSide*seaCalm;
    if(e>.04){a+=Math.min(e,1)*hi*1.2;if(e>.12&&(gi<G_TILDE))gi=e>.5?G_TILDE:e>.25?G_DASH:G_PER;}   // wake: grey, diffusing
    cellG[i]=gi;cellA[i]=a;blockA[i]=0;}}
  for(const rp of ripples){const R=rp.age*rp.sp,f=(1-rp.age/rp.life)**2,amp=hi*1.3*f*rp.k;const c0=Math.max(0,Math.floor((rp.x-R-30)/cw)),c1=Math.min(cols-1,Math.floor((rp.x+R+30)/cw)),
    r0=Math.max(0,Math.floor((rp.y-R-30)/ch)),r1=Math.min(rows-1,Math.floor((rp.y+R+30)/ch));
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const dc=c*cw+cw*.5-sx,ws=sx>0&&dc<0?.55+.45*sm(0,1,clamp((c*cw+cw*.5)/sx,0,1)):1;
      const d=Math.hypot(c*cw+cw/2-rp.x,r*ch+ch/2-rp.y),k=Math.exp(-(((d-R)/13)**2));if(k<.15)continue;
      if(c*cw+cw*.5>=sx&&r*ch+ch*.5<chatTop())continue;
      const i=r*cols+c;cellA[i]+=amp*k*ws*seaCalm;if(cellG[i]<G_TILDE)cellG[i]=k>.6?G_TILDE:G_DASH;}}
  surfaceA.set(cellA);surfaceG.set(cellG);
  wFlag.fill(0);
  if(reduced&&conversationMode){                     // reduced motion: only the parked resident, nothing moving
    if(resident&&resident.exitMode!=='away'){rasterWhale(resident);shadeCreatures();}
  }else{
    // 远的先画、近的后画：深度决定谁压在上面
    drawQ.length=0;
    if(ray.on)drawQ.push(ray);
    for(const v of visitors)drawQ.push(v);
    for(const w of whales)drawQ.push(w);
    drawQ.sort((a,b)=>(a.depth||1)-(b.depth||1));
    for(const o of drawQ){if(o===ray)rasterRay();else if(o.role)rasterWhale(o);else rasterVisitor(o);}
    shadeCreatures();
  }}
// creature cells: glyph from a density ramp keyed to body coordinates, alpha from the light, plus a faint cell block
function shadeCreatures(){const tq=reduced?0:T;
  for(let i=0;i<N;i++){const f=wFlag[i];if(!f)continue;
    const key=wKey[i],sh_=wShade[i],A=P.whale*wA[i];
    if(f===F_EDGE){const set=sh_>=.5?EDGE_H:EDGE_L;cellG[i]=set[(key>>>8)%set.length];cellA[i]=Math.max(cellA[i]*(1-sh_),A*(.3+.42*sh_));continue;}
    const tone=mix(1-sh_,sh_,dk);                 // ink amount: day = shadow is darker, night = lit side is brighter
    const roll=hash3(key,Math.floor(tq*2.2+(key%997)/97),7),jit=roll<.05?1:roll>.95?-1:0;  // slow skin shimmer
    let g,a;
    if(f===F_BODY){g=SKIN[clamp(Math.floor(tone*8.99)+((key>>>4)%3)-1+jit,0,8)];a=A*(.62+.38*tone);}
    else if(f===F_FIN){g=FINS[(key>>>8)%FINS.length];a=A*(.6+.38*tone);}
    else if(f===F_RIDGE){g=RIDGE[(key>>>8)%RIDGE.length];a=A*.95;}
    else{g=G_O;a=A*1.08;}
    cellG[i]=g;cellA[i]=a;blockA[i]=A*(.13+.13*tone);}}

function render(){
  if(P.ink!==atlasInk)buildAtlas();
  const bandTop=chatTop(),bandLeft=splitX(),inBand=i=>{const c=i%cols,r=(i/cols)|0;return c*cw+cw*.5>=bandLeft&&r*ch+ch*.5<bandTop;};
  field();
  // fish snap to cells (not under a creature)
  frameId++;const fishA=P.fish;const fishColored=!!fishColor;
  for(const f of fish){if(!f.alive)continue;if(fishColored)continue;const i=cellIdx(f.x,f.y);if(i<0||wFlag[i]||fishStamp[i]===frameId||(reduced&&conversationMode))continue;fishStamp[i]=frameId;
    const depthA=.55+.45*((f.depth||.8)-.55)/.45;
    const glint=Math.min(1,Math.abs(f.turn||0)/3.5);
    cellG[i]=(f.depth||.8)<.68?G_PER:G_DASH;
    cellA[i]=fishA*depthA*(.75+.35*glint*fishGlint+.3*f.alarm)*edgeFade(f.exitMode,f.x,f.y,55);}
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,cv.width,cv.height);
  const cx=cw*dpr,cy=ch*dpr,ink=`rgb(${P.ink},${P.ink},${P.ink})`;
  // faint cell blocks under the creatures' bodies (reads as one solid creature, like the reference)
  for(const b of bBuckets)b.length=0;
  for(let i=0;i<N;i++){if(!blockA[i]||inBand(i))continue;const a=blockA[i]*wMask[i];bBuckets[clamp(Math.round(a/BMAX*BB),1,BB-1)].push(i);}
  ctx.fillStyle=ink;const ins=Math.max(1,Math.round(dpr));
  for(let b=1;b<BB;b++){const L=bBuckets[b];if(!L.length)continue;ctx.globalAlpha=b/BB*BMAX;
    for(const i of L){const c=i%cols,r=(i/cols)|0,x=Math.round(c*cx),y=Math.round(r*cy);ctx.fillRect(x+ins,y+ins,Math.round((c+1)*cx)-x-ins,Math.round((r+1)*cy)-y-ins);}}
  // counting sort glyph cells into alpha buckets, one globalAlpha per bucket
  counts.fill(0);const SKIP=NB;
  const whaleColored=!!whaleColor;
  for(let i=0;i<N;i++){if(cellG[i]===G_BLANK||inBand(i)||(whaleColored&&wFlag[i])){bOf[i]=SKIP;continue;}const a=cellA[i]*(wFlag[i]?wMask[i]:colMask[i]);const b=clamp(Math.round(a/AMAX*NB),0,NB-1);
    if(b===0){bOf[i]=SKIP;continue;}bOf[i]=b;counts[b]++;}
  starts[0]=0;for(let b=1;b<=NB;b++)starts[b]=starts[b-1]+counts[b-1];const cur=starts.slice();
  for(let i=0;i<N;i++){const b=bOf[i];if(b!==SKIP)order[cur[b]++]=i;}
  for(let b=1;b<NB;b++){const n=counts[b];if(!n)continue;ctx.globalAlpha=b/NB*AMAX;const st=starts[b];
    for(let k=st;k<st+n;k++){const i=order[k],c=i%cols,r=(i/cols)|0;ctx.drawImage(atlas,cellG[i]*sw,0,sw,sh,Math.round(c*cx),Math.round(r*cy),sw,sh);}}
  // coloured whale pass: independent atlas, still drawImage per cell
  if(whaleColored){
    buildWhaleAtlas();
    for(let i=0;i<N;i++){if(!wFlag[i]||cellG[i]===G_BLANK||inBand(i))continue;
      const a=cellA[i]*(wMask[i]||1);if(a<.008)continue;
      ctx.globalAlpha=Math.min(1,a);
      ctx.drawImage(whaleAtlas,cellG[i]*sw,0,sw,sh,Math.round((i%cols)*cx),Math.round(((i/cols)|0)*cy),sw,sh);}
    ctx.globalAlpha=1;
  }
  // coloured fish pass: 100 fish × fillText is cheap compared with the cell field
  if(fishColored){
    ctx.font=`400 ${Math.round(ch*.74)}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fishColor;
    for(const f of fish){if(!f.alive||(reduced&&conversationMode))continue;const i=cellIdx(f.x,f.y);if(i<0||wFlag[i]||inBand(i))continue;
      const depthA=.55+.45*((f.depth||.8)-.55)/.45;
      const glint=Math.min(1,Math.abs(f.turn||0)/3.5);
      const a=Math.min(.95,.28+.55*depthA+.22*glint*fishGlint+.15*f.alarm)*edgeFade(f.exitMode,f.x,f.y,55);
      if(a<.02)continue;ctx.globalAlpha=a;
      ctx.fillText(FISH_GLYPHS[f.sp]||'-',(i%cols)*cw+cw/2,((i/cols)|0)*ch+ch/2+1,Math.max(1,cw-1));}
    ctx.globalAlpha=1;
  }
  // bubbles / spout glyphs (free-floating), same grey
  for(const p of parts){const f=1-p.age/p.life,a=(conversationMode?0:1)*Math.min(1,p.age*4)*f*P.whale*(p.k==='bub'?.9:1.05)*(wMask[Math.max(0,cellIdx(p.x,p.y))]||1);
    if(a<.004)continue;ctx.globalAlpha=Math.min(AMAX,a);ctx.drawImage(atlas,p.g*sw,0,sw,sh,Math.round(p.x*dpr-sw/2),Math.round(p.y*dpr-sh/2),sw,sh);}
  ctx.globalAlpha=1;}

// ---- loop / events (original lines 555-571, made removable) ----
const offs=[];const on=(t,ev,fn,o)=>{t.addEventListener(ev,fn,o);offs.push(()=>t.removeEventListener(ev,fn,o));};
function draw(){palette();render();}
let raf=0,lastT=0,lastDraw=-1e9,alive=true;
function frame(now){raf=requestAnimationFrame(frame);
  if(now-lastDraw<1000/30-1.5)return;                 // 30 fps cap
  const dt=Math.min(.1,(now-lastT)/1000);lastT=now;lastDraw=now;
  const goal=goalTheme==='dark'?1:0;if(dk!==goal){dk+=Math.sign(goal-dk)*Math.min(Math.abs(goal-dk),dt/.4);palette();}
  updateConversation(now);simulate(dt*swimSpeed);render();}
resize();
if(reduced){startPod();draw();
  on(window,'resize',()=>{resize();draw();});}
else{on(window,'resize',resize);lastT=performance.now();raf=requestAnimationFrame(frame);
  on(document,'visibilitychange',()=>{if(!alive)return;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!raf){lastT=performance.now();raf=requestAnimationFrame(frame);}});}
let lastBub=0;
const api={
  /** Apply live settings; fish density reseeds the schools. */
  setSettings(next){Object.assign(settings,next||{});
    const fc=Math.max(20,Math.min(200,Math.round(Number(settings.fishCount)||100)));
    const fg=Math.max(0,Math.min(2,Number(settings.fishGlint)||0));
    const sf=Math.max(0,Math.min(12,Math.round(Number(settings.sidebarFish)||0)));
    const wc=Math.max(1,Math.min(3,Math.round(Number(settings.whaleCount)||3)));
    const cs=Math.max(6,Math.min(12,Math.round(Number(settings.cellSize)||9)));
    swimSpeed=clamp(Number(settings.speed)||1,.2,2);
    fishGlint=fg;
    fishColor=String(settings.fishColor||"#a9bde8");
    whaleColor=String(settings.whaleColor||"#c3c8d2");
    whaleAtlasKey='';
    if(fc!==fishCount){fishCount=fc;seedFish();}
    if(sf!==sidebarFish){sidebarFish=sf;}
    if(wc!==whaleCount){whaleCount=wc;applyWhaleVisibility();}
    if(cs!==cellSize){cellSize=cs;resize();}
    draw();},
  /** 'light' | 'dark' — ink crossfades over 400 ms (instant under reduced motion) */
  setTheme(th){goalTheme=th==='dark'?'dark':'light';if(reduced){dk=goalTheme==='dark'?1:0;draw();}},
  /** call on every input event: bubbles rise from the mother's blowhole (throttled 260 ms, max 40 particles) */
  onType(){const n=performance.now();if(!reduced&&n-lastBub>260&&parts.length<40){lastBub=n;spawnBubble();}},
  /** call when the user sends: mother tail flick + spout 180 ms later */
  onSend(){if(!reduced){big.flick=0;setTimeout(()=>{if(alive)spout(big,1);},180);}},
  /** conversation starts: every creature leaves on its own bearing, one whale stays in the sidebar.
      conversation ends: that whale is free again and everything that left swims back in. */
  setConversation(v,immediate=false){
    if(!alive||!!v===conversationMode)return;
    conversationMode=!!v;
    visitors.length=0;visitorTimer=conversationMode?rand(60,150):rand(30,70);
    if(immediate||reduced)seaCalm=conversationMode?.62:1;
    const sx=splitX();
    if(conversationMode){
      // Keep a small school inside the sidebar so it never goes completely blank.
      const keep=Math.max(0,Math.min(sidebarFish,fish.length));
      const candidates=fish.slice().sort((a,b)=>Math.abs(a.x-sx*.5)-Math.abs(b.x-sx*.5));
      for(const f of fish){f.sidebar=false;f.sideWp=null;}
      if(sx>0){
        for(let i=0;i<keep;i++){const f=candidates[i];if(!f)break;
          f.sidebar=true;f.exitMode=null;f.alive=true;
          f.x=rand(14,Math.max(20,sx-14));f.y=rand(H*.18,H*.82);
          f.vx=(Math.random()<.5?-1:1)*SPEC[f.sp].cruise*.45;f.vy=rand(-5,5);}
      }
      for(const f of fish)if(!f.sidebar)f.exitMode='leaving';
      if(ray.on)ray.exitMode='leaving';
      resident=null;residentTimer=0;residentEnter=0;released=null;
      if(sx>0){                                   // keep whoever is already in the sidebar, else send the mother in
        let pick=null,bestD=1e9;
        for(const w of whales){if(w.exitMode==='away'||w.visible===false)continue;const hx=w.nodes[0];
          if(hx<sx){const d=Math.abs(hx-sx*.5);if(d<bestD){bestD=d;pick=w;}}}
        if(pick)makeResident(pick,false);
        else {                                    // 谁进去都行：体型不再需要迁就侧栏宽度
          const cand=whales.filter(w=>w.exitMode!=='away'&&w.visible!==false);
          if(cand.length)makeResident(cand[0],true);else spawnResident();
        }
      }
      // each creature picks a bearing of its own: right / up / down — left only if it is already in the sidebar
      const outs=whales.filter(w=>w!==resident),dirs=[0,-Math.PI/2,Math.PI/2],rot=(Math.random()*3)|0;
      outs.forEach((w,i)=>{let a=dirs[(i+rot)%3];if(w.nodes[0]<sx&&a===0)a=Math.PI;
        w.exitMode='leaving';w.exitDir=a;w.mode='leaving';w.queue.length=0;w.entry=null;w.entryFor=null;});
      if(immediate||reduced){
        for(const w of outs){const a=w.exitDir;placeOffscreen(w,a);}
        for(const f of fish){if(f.sidebar)continue;const side=f.x<W*.5?-1:1;f.x=side<0?-20:W+20;f.y=clamp(f.y,H*.2,H*.8);f.vx=-side*SPEC[f.sp].cruise;f.vy=0;f.exitMode='away';}
        if(ray.on){ray.on=false;ray.exitMode=null;}
      }
      if((immediate||reduced)&&resident){placeResidentStatic();residentTimer=rand(30,60);}
    }else{
      released=resident&&resident.nodes[0]<sx?resident:null;   // let it swim back out, no jump
      resident=null;residentTimer=0;residentEnter=0;
      for(const w of whales)restoreSize(w);
      if(immediate||reduced){                     // instant: back to the opening scene, no transition
        released=null;startPod();seedFish();ray.on=false;ray.exitMode=null;
        for(const w of whales){w.exitMode=null;w.exitDir=null;w.entry=null;w.entryFor=null;w.mode='roam';w.queue.length=0;w.ptx=NaN;}
        for(const f of fish)f.exitMode=null;
      }else{
        for(const w of whales){
          if(w.exitMode==='away')reenterFromEdge(w);
          else{w.exitMode=null;w.exitDir=null;w.entry=null;w.entryFor=null;w.mode='roam';w.queue.length=0;w.ptx=NaN;nextWp(w);}}
        for(const f of fish){
          if(f.sidebar){f.sidebar=false;f.sideWp=null;f.exitMode='entering';}
          if(f.exitMode==='away'){const side=f.x<0?-1:1;f.x=side<0?-20:W+20;f.y=rand(H*.25,H*.75);f.vx=-side*SPEC[f.sp].cruise;f.vy=0;f.exitMode='entering';}
          else if(f.exitMode)f.exitMode='entering';}
        if(ray.on){if(ray.exitMode==='away'){ray.on=false;ray.next=rand(8,16);}else ray.exitMode=null;}
      }
    }
    if(reduced||immediate)draw();},
  /** Begin an empty scene with creatures swimming in from outside the frame. */
  enterFromEdges(){if(!alive||reduced||conversationMode)return;
    for(const w of whales)reenterFromEdge(w);
    for(const f of fish){f.x=W+25+f.school*12+Math.random()*12;f.y=clamp(f.y,H*.18,H*.82);f.vx=-SPEC[f.sp].cruise;f.vy=0;f.exitMode='entering';}
    ray.on=false;ray.next=rand(12,24);
    visitorTimer=rand(28,60);
    render();},
  /** compatibility: true when nothing of the ocean is on screen any more */
  isExited(){
    const vis=whales.some(w=>w.exitMode!=='away')||fish.some(f=>f.exitMode!=='away')||(ray.on&&ray.exitMode!=='away');
    return !vis;},
  /** true while the assistant is replying: mother cruises 12% faster */
  setReplying(v){replying=!!v;},
  /** manual ripple at canvas-local px */
  ripple(x,y){if(!reduced)splash(x,y);},
  resize(){resize();if(reduced)draw();},
  destroy(){alive=false;cancelAnimationFrame(raf);raf=0;offs.forEach(f=>f());offs.length=0;},
  get debug(){return {whales,big,mid,calf,ray,fish,schools,P,TH,placeWhale,render,palette,W,H,T,
    visitors,spawnVisitor,
    splitX:()=>splitX(),chatCenter:()=>chatCenter(),
    get cells(){return {cellA,cellG,wFlag,blockA,cols,rows,cw,ch};},
    get resident(){return resident},get released(){return released},get residentTimer(){return residentTimer},get residentEnter(){return residentEnter},
    get conversationMode(){return conversationMode}};}
};
return api;

}

    /* =====================================================================
     * 小工具（背景层用）
     * ===================================================================*/
    const prefersReduced = () =>
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* =====================================================================
     * 小工具
     * ===================================================================*/
    const NO_PRESENTATION = () => true;

    function firstLine(text) {
      const newline = text.indexOf("\n");
      return newline === -1 ? text : text.slice(0, newline);
    }

    function latestCompletedParagraphFirstLine(text) {
      let summary = "";
      let paragraphStart = 0;
      const separator = /\r?\n(?:[\t ]*\r?\n)+/g;
      for (;;) {
        const nextParagraph = separator.exec(text);
        const paragraphEnd = nextParagraph === null ? text.length : nextParagraph.index + nextParagraph[0].indexOf("\n");
        const newline = text.indexOf("\n", paragraphStart);
        if (newline !== -1 && newline <= paragraphEnd) {
          const candidate = text.slice(paragraphStart, newline).trim();
          if (candidate !== "") summary = candidate;
        }
        if (nextParagraph === null) return summary;
        paragraphStart = nextParagraph.index + nextParagraph[0].length;
      }
    }

    function reasoningText(text) {
      if (!text || text[0] !== "<") return text;
      const opening = "<signature>";
      if (opening.startsWith(text)) return "";
      if (!text.startsWith(opening)) return text;
      const end = text.indexOf("</signature>", 11);
      if (end === -1) return "";
      let start = end + 12;
      while (start < text.length) {
        if (text[start] === "\n") start++;
        else if (text[start] === "\r" && text[start + 1] === "\n") start += 2;
        else break;
      }
      return text.slice(start);
    }

    function markdownLabels(t) {
      return {
        code: {
          copyLabel: t("copy"),
          copiedLabel: t("copied"),
          toolbarLabels: {
            codeLabel: t("codeBlock.title"),
            wrapLabel: t("codeBlock.wrap"),
            unwrapLabel: t("codeBlock.unwrap"),
          },
        },
        footnotes: t("markdown.footnotes"),
      };
    }

    /* =====================================================================
     * 逐字浮现的正文块
     * ===================================================================*/
    function RevealBlock({ text, labels, fileMentions, streaming, t }) {
      const hostRef = React.useRef(null);
      const [reduced, setReduced] = React.useState(prefersReduced);
      React.useEffect(() => {
        const query = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
        if (!query) return undefined;
        const update = () => setReduced(query.matches);
        if (query.addEventListener) query.addEventListener("change", update);
        else if (query.addListener) query.addListener(update);
        return () => {
          if (query.removeEventListener) query.removeEventListener("change", update);
          else if (query.removeListener) query.removeListener(update);
        };
      }, []);
      const machine = React.useRef(null);
      const fed = React.useRef(0);
      // 挂载时这条回复已经结束（历史消息）→ 直接走正式 Markdown，不演
      const [drained, setDrained] = React.useState(!streaming);

      React.useEffect(() => {
        if (!streaming || reduced) return undefined;
        const host = hostRef.current;
        if (!host) return undefined;
        syncTone();
        machine.current = createRevealer(host, {
          rate: 40,
          decoder: createMarkdownStream(host),
          onFrame(frame) {
            if (frame.done && frame.active === 0) setDrained(true);
          },
        });
        if (text) {
          // 挂载时已经有内容（切会话、或无 streaming 标记的首帧）：直接落字，不重演
          machine.current.push(text);
          machine.current.flush();
          fed.current = text.length;
        } else {
          fed.current = 0;
        }
        return () => {
          machine.current?.dispose();
          machine.current = null;
        };
      }, [reduced]);

      React.useEffect(() => {
        const target = machine.current;
        if (!target) return;
        if (text.length > fed.current) {
          target.push(text.slice(fed.current));
          fed.current = text.length;
        }
      }, [text]);

      React.useEffect(() => {
        if (!streaming) {
          if (reduced) setDrained(true);
          else machine.current?.end();
        }
      }, [streaming, reduced]);

      if (drained || reduced) {
        if (!P.MarkdownText) return h("div", null, text);
        return h(P.MarkdownText, { text, labels, fileMentions });
      }
      return h("div", { ref: hostRef, className: "dshr_reveal", "data-reveal": "character" });
    }

    /* =====================================================================
     * 思考行（移植自 chat 的 ReasoningRow，正文仍交给原生 Body Slot）
     * ===================================================================*/
    if (P.MarkdownText === undefined || P.DisclosureRow === undefined) {
      console.warn("[dsh-whale-tide] required UI primitives are missing; the effect stays off");
    }

    const THINK_ICON = P.IconThinkOutlineRegular ? h(P.IconThinkOutlineRegular, { size: 14 }) : null;

    function ReasoningRow(props) {
      const { rawText, running, usePresentation, useDisclosure, renderSlot, t } = props;
      const disclosure = useDisclosure ? useDisclosure() : { expanded: false, toggle: () => {} };
      const { expanded, toggle } = disclosure;
      const text = React.useMemo(() => reasoningText(rawText || ""), [rawText]);
      const summaryText = running ? latestCompletedParagraphFirstLine(text) : firstLine(text);
      const summary = React.useMemo(() => summaryText.replaceAll("**", ""), [summaryText]);
      const presentation = usePresentation || NO_PRESENTATION;
      const settledPreview = presentation(() => true);
      const preview = !expanded && summary !== "" && (running || settledPreview !== false);

      if (text !== rawText && text.trim() === "") return null;

      const collapsedContent = h(
        React.Fragment,
        null,
        h("span", { className: "dshr_sep", "data-shimmer-decoration": true, "aria-hidden": true }),
        h(
          "span",
          { className: "dshr_summary", "data-streaming": running || undefined },
          h(
            "span",
            { className: "dshr_summaryText" },
            P.TextShimmer ? h(P.TextShimmer, null, summary) : summary,
          ),
        ),
      );

      return h(
        "div",
        {
          className: "dshr_reason",
          "data-variant": "think",
          "data-state": running ? "running" : "ok",
          "data-expanded": expanded || undefined,
          "data-preview": preview || undefined,
        },
        running ? h("span", { style: { display: "none" } }, t("row.running")) : null,
        h(
          P.DisclosureRow,
          {
            icon: THINK_ICON,
            title: t("message.think"),
            running,
            open: expanded,
            expandable: true,
            expandOnRowClick: true,
            onToggle: toggle,
            collapsedContent,
          },
          expanded
            ? h("div", { className: "dshr_reasonBody" }, renderSlot("conversation.chat.reasoning.body", { rawText, text, running }))
            : null,
        ),
      );
    }

    /* =====================================================================
     * AI 回复这一格
     * ===================================================================*/
    /** 与原生 ProcessReasoning 同形的包装：ref 由 useGroupAction 交给折叠动画 */
    function ProcessInline({ hidden, reveal, useGroupAction, children }) {
      const ref = useGroupAction ? useGroupAction(hidden, reveal) : undefined;
      return h("div", { ref, "data-turn-process-inline": hidden || undefined }, children);
    }

    function AssistantCell(props) {
      const { node, groupPart, loadImage, useDisclosure, useGroupAction, turnProcess, renderSlot } = props;
      const t = typeof props.t === "function" ? props.t : (key) => key;
      const data = node && node.data ? node.data : { blocks: [], status: "closed" };
      const blocks = Array.isArray(data.blocks) ? data.blocks : [];
      const streaming = data.status === "running";
      const interrupted = data.status === "interrupted";
      const labels = React.useMemo(() => markdownLabels(t), [t]);

      const lastTextIndex = (() => {
        for (let i = blocks.length - 1; i >= 0; i -= 1) {
          const block = blocks[i];
          if (block && block.kind === "text" && block.text.trim() !== "") return i;
        }
        return -1;
      })();

      if (!(streaming || interrupted === true || blocks.some((block) => block.kind !== "tool-call"))) return null;

      const reasoningHidden =
        turnProcess !== undefined &&
        turnProcess.foldable === true &&
        turnProcess.spec !== undefined &&
        turnProcess.spec.answerStep === data.step &&
        turnProcess.spec.inlineReasoning === true &&
        !turnProcess.open;

      const revealProcess = () => {
        if (turnProcess && typeof turnProcess.setOpen === "function") turnProcess.setOpen(true);
      };

      const rendered = [];
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        if (!block) continue;
        if (groupPart === "reasoning" && block.kind !== "reasoning") continue;
        if (groupPart === "response" && block.kind === "reasoning") continue;

        if (block.kind === "text") {
          const live = streaming && i === lastTextIndex;
          rendered.push(
            h("div", { key: i, className: "dshr_text" }, h(RevealBlock, {
              text: block.text,
              labels,
              streaming: live,
              t,
            })),
          );
          continue;
        }

        if (block.kind === "reasoning") {
          if (!block.text || block.text.trim() === "") continue;
          rendered.push(
            h(
              ProcessInline,
              { key: i, hidden: reasoningHidden, reveal: revealProcess, useGroupAction },
              h(ReasoningRow, {
                rawText: block.text,
                running: streaming && i === blocks.length - 1,
                useDisclosure,
                renderSlot,
                t,
              }),
            ),
          );
          continue;
        }

        if (block.kind === "image") {
          const start = i;
          const group = [block];
          while (i + 1 < blocks.length) {
            const next = blocks[i + 1];
            if (!next || next.kind !== "image") break;
            group.push(next);
            i += 1;
          }
          rendered.push(
            h(React.Fragment, { key: "img" + start }, renderSlot("conversation.chat.message.images", {
              images: group.map((entry) => ({ attachment: entry.attachment })),
              loadImage,
              align: "start",
            })),
          );
          continue;
        }

        if (block.kind === "tool-call") continue;

        rendered.push(
          P.JsonBlock
            ? h(P.JsonBlock, {
                key: i,
                label: t("message.unknownBlock"),
                payload: block.block !== undefined ? block.block : block,
              })
            : null,
        );
      }

      const stoppedAllowed =
        interrupted &&
        (groupPart === undefined || groupPart === "response" || !blocks.some((block) => block.kind !== "reasoning" && block.kind !== "tool-call"));

      return h(
        "div",
        { className: "dshr_root", "data-streaming": streaming || undefined },
        h(
          "div",
          { className: "dshr_body" },
          rendered,
          stoppedAllowed ? h("span", { className: "dshr_stopped" }, t("message.stopped")) : null,
        ),
      );
    }

    /** 兜底：万一本插件渲染出错，回复仍然以纯文字出现，不会把聊天打空 */
    function PlainFallback({ node }) {
      const blocks = (node && node.data && Array.isArray(node.data.blocks) ? node.data.blocks : []).filter(
        (block) => block && block.kind === "text" && typeof block.text === "string",
      );
      return h(
        "div",
        { className: "dshr_root" },
        h(
          "div",
          { className: "dshr_body dshr_text", style: { whiteSpace: "pre-wrap" } },
          blocks.map((block) => block.text).join("\n\n"),
        ),
      );
    }

    class SafeCell extends React.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false };
      }
      static getDerivedStateFromError() {
        return { failed: true };
      }
      componentDidCatch(error) {
        console.error("[dsh-whale-tide] render failed, falling back to plain text:", error);
      }
      render() {
        if (this.state.failed) return h(PlainFallback, this.props);
        return h(AssistantCell, this.props);
      }
    }


    /* =====================================================================
     * 背景层 + 日/夜配色
     * ===================================================================*/
    const TOKENS = {
      "--dsw-alias-bg-base": { light: "transparent", dark: "transparent" },
      "--dsw-alias-bg-layer-1": { light: "rgba(255,255,255,0.84)", dark: "rgba(23,24,28,0.88)" },
      "--dsw-alias-bg-layer-2": { light: "#f7f8f9", dark: "#1b1d21" },
      "--dsw-alias-bg-layer-3": { light: "#ffffff", dark: "#202226" },
      "--dsw-specific-sidebar-fill": { light: "rgba(255,255,255,0.55)", dark: "rgba(20,21,24,0.60)" },
      "--dsw-specific-bubble": { light: "#f3f4f6", dark: "#24262b" },
      "--dsw-alias-label-primary": { light: "#1f2329", dark: "#e6e7ea" },
      "--dsw-alias-label-secondary": { light: "#5b6472", dark: "#a6acb6" },
      "--dsw-alias-label-tertiary": { light: "#7c8593", dark: "#878d97" },
      "--dsw-alias-label-caption": { light: "#98a0ac", dark: "#71767f" },
      "--dsw-alias-border-l1": { light: "rgba(31,35,41,0.08)", dark: "rgba(230,231,234,0.08)" },
      "--dsw-alias-border-l2": { light: "rgba(31,35,41,0.12)", dark: "rgba(230,231,234,0.12)" },
      "--dsw-alias-border-l3": { light: "rgba(31,35,41,0.18)", dark: "rgba(230,231,234,0.16)" },
      "--dsw-alias-interactive-bg-hover": { light: "rgba(31,35,41,0.05)", dark: "rgba(230,231,234,0.06)" },
    };


    /* =====================================================================
     * Settings model + store
     * ===================================================================*/
    const SETTINGS_KEY = "dsh-whale-tide:v1";
    const SETTINGS_DEFAULTS = Object.freeze({
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
      cellSize: 9,
      sidebarBlur: 6,
      composerGlass: true,
      streamBlur: 10,
    });
    const SETTINGS_RANGES = Object.freeze({
      opacity: [0, 1, 0.05],
      conversationOpacity: [0, 1, 0.05],
      speed: [0.2, 2, 0.1],
      fishCount: [20, 200, 10],
      fishGlint: [0, 2, 0.1],
      whaleCount: [1, 3, 1],
      sidebarFish: [0, 12, 1],
      cellSize: [6, 12, 1],
      sidebarBlur: [0, 20, 1],
      streamBlur: [0, 20, 1],
    });
    const SETTINGS_GROUPS = [
      { id: "backdrop", keys: ["enabled", "opacity", "conversationOpacity"] },
      { id: "motion", keys: ["speed", "fishCount", "fishGlint", "fishColor", "whaleColor", "whaleCount", "sidebarFish"] },
      { id: "surface", keys: ["cellSize", "sidebarBlur", "composerGlass", "streamBlur"] },
    ];
    const SETTINGS_BOOL = ["enabled", "composerGlass"];

    function normalizeSettings(value) {
      const out = { ...SETTINGS_DEFAULTS };
      if (!value || typeof value !== "object" || Array.isArray(value)) return out;
      for (const key of SETTINGS_BOOL) if (typeof value[key] === "boolean") out[key] = value[key];
      for (const key of Object.keys(SETTINGS_RANGES)) {
        const raw = value[key];
        const n = raw === null || raw === "" || typeof raw === "boolean" ? NaN : Number(raw);
        if (Number.isFinite(n)) {
          const [lo, hi] = SETTINGS_RANGES[key];
          out[key] = n < lo ? lo : n > hi ? hi : n;
        }
      }
      out.whaleCount = Math.round(out.whaleCount);
      out.fishCount = Math.round(out.fishCount);
      out.sidebarFish = Math.round(out.sidebarFish);
      out.cellSize = Math.round(out.cellSize);
      for (const key of ["fishColor", "whaleColor"]) {
        if (typeof value[key] === "string" && /^#[0-9a-f]{6}$/i.test(value[key])) out[key] = value[key].toLowerCase();
      }
      return out;
    }
    function loadSettings() {
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        return raw ? normalizeSettings(JSON.parse(raw)) : { ...SETTINGS_DEFAULTS };
      } catch (error) {
        return { ...SETTINGS_DEFAULTS };
      }
    }
    function createStore() {
      let current = loadSettings();
      const listeners = new Set();
      const persist = () => {
        try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(current)); } catch (error) { /* optional */ }
      };
      const notify = () => { for (const fn of listeners) { try { fn(current); } catch (error) { /* keep layer alive */ } } };
      return {
        get: () => current,
        set(patch) { current = normalizeSettings({ ...current, ...(patch || {}) }); persist(); notify(); return current; },
        reset() { current = { ...SETTINGS_DEFAULTS }; persist(); notify(); return current; },
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      };
    }
    function settingsText(key) {
      const zh = String(navigator.language || "en").toLowerCase().startsWith("zh");
      const dict = zh ? {
        title: "鲸汐", description: "dsh-quiet 的安静海面、鲸群与流式浮现，加上可调设置。",
        groupBackdrop: "背景", groupMotion: "动画", groupSurface: "界面",
        enabled: "显示背景", opacity: "背景透明度", conversationOpacity: "对话中透明度",
        speed: "游动速度", fishCount: "鱼群数量", fishColor: "鱼群颜色", fishGlint: "鱼群闪光",
        whaleColor: "鲸鱼颜色", whaleCount: "鲸鱼数量", sidebarFish: "侧栏鱼群数量",
        cellSize: "字符格大小", sidebarBlur: "侧栏玻璃模糊", composerGlass: "输入框磨砂", streamBlur: "流式模糊强度",
        hintEnabled: "关闭后移除背景层，界面恢复原生样式", hintOpacity: "空会话中的背景不透明度",
        hintConversationOpacity: "进入对话后的背景不透明度", hintSpeed: "0.2–2 倍速",
        hintFishCount: "20–200 条，5 种鱼", hintFishColor: "鱼群字符颜色", hintFishGlint: "鱼转向/受惊时的闪光强度", hintWhaleColor: "鲸鱼字符颜色", hintWhaleCount: "1–3 头鲸鱼，其余隐藏", hintSidebarFish: "对话中侧栏保留的鱼数量（0–12）", hintCellSize: "6–12px，默认 9px；8px 对齐 dsh-ascii-whales",
        hintSidebarBlur: "侧栏背后画布的模糊半径", hintComposerGlass: "空会话与对话中给输入框加磨砂",
        hintStreamBlur: "流式回复从模糊到清晰的模糊强度", reset: "恢复默认", saved: "已保存", resetDone: "已恢复默认",
      } : {
        title: "Whale Tide", description: "dsh-quiet's quiet ocean, whales and blur-to-clear stream, with settings.",
        groupBackdrop: "Backdrop", groupMotion: "Motion", groupSurface: "Interface",
        enabled: "Show background", opacity: "Opacity", conversationOpacity: "Opacity in conversation",
        speed: "Swimming speed", fishCount: "Fish count", fishColor: "Fish color", fishGlint: "Fish glint",
        whaleColor: "Whale color", whaleCount: "Whale count", sidebarFish: "Sidebar fish",
        cellSize: "Cell size", sidebarBlur: "Sidebar blur", composerGlass: "Frosted composer", streamBlur: "Stream blur",
        hintEnabled: "Turn off to remove the backdrop and restore the native interface.", hintOpacity: "Backdrop opacity in an empty conversation.",
        hintConversationOpacity: "Backdrop opacity while a conversation is active.", hintSpeed: "0.2x to 2x the base speed.",
        hintFishCount: "20 to 200 fish across five species.", hintFishColor: "Color used for fish glyphs.", hintFishGlint: "Brightness glint when fish turn or panic.", hintWhaleColor: "Color used for whale glyphs.", hintWhaleCount: "1 to 3 whales; the rest stay hidden.", hintSidebarFish: "Fish kept in the sidebar during a conversation (0–12).", hintCellSize: "6–12px, default 9px; 8px matches dsh-ascii-whales.",
        hintSidebarBlur: "Backdrop blur behind the sidebar.", hintComposerGlass: "Frost the composer in empty and active conversations.",
        hintStreamBlur: "Blur-to-clear strength for streaming replies.", reset: "Restore defaults", saved: "Saved", resetDone: "Defaults restored",
      };
      return dict[key] || key;
    }

    const TONE = { light: "#c3c8d2", dark: "#5b5f68" };

    /**
     * 聊天区的矩形：从输入框往上找第一个「够高、够宽、且顶端在标题栏之下」的祖先。
     * 不依赖哈希类名，面板开合、侧栏收起都跟着变。
     */
    function chatBounds() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const main = Array.from(document.querySelectorAll('[data-conversation-content][data-conversation-region="chat"]'))
        .find((node) => { const r = node.getBoundingClientRect(); return r.width >= vw * .3 && r.height >= vh * .5 && r.bottom > 0; });
      if (main) { const r = main.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }
      const editing = document.querySelector('[contenteditable="true"], textarea');
      if (!editing) return null;
      let el = editing;
      while (el && el !== document.body) {
        const r = el.getBoundingClientRect();
        if (r.height >= vh * 0.6 && r.width >= vw * 0.3 && r.width <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1) {
          return { x: r.left, y: r.top, width: r.width, height: r.height };
        }
        el = el.parentElement;
      }
      return null;
    }

    /* =====================================================================
     * 背景层：一片横跨侧栏与聊天区的水面。
     * 生物可以在两栏之间自然游过；侧栏文字区用一整片磨砂面保护阅读。
     * ===================================================================*/
    function mountBackdrop(ctx, store) {
      const layer = document.createElement("div");
      layer.className = "dshr-backdrop";
      layer.setAttribute("aria-hidden", "true");
      const canvas = document.createElement("canvas");
      layer.append(canvas);
      const glass = document.createElement("div");
      glass.className = "dshr-sidebar-glass";
      glass.style.display = "none";
      layer.append(glass);
      document.body.prepend(layer);
      document.body.dataset.dshr = "on";
      let settings = store.get();

      const theme = ctx.get("theme");
      const readScheme = () => (theme && theme.getTheme && theme.getTheme().active.colorScheme === "dark" ? "dark" : "light");
      let scheme = readScheme();

      let backdrop = null;
      let scene = null;
      let sidebarWidth = 0;
      let glassKey = "";
      let switchTimer = 0;
      // 与 CSS 的 --dsq-dur-4（400ms）保持一致；多留 50ms 保证最后一帧过渡跑完。
      const SWITCH_TRANSITION_MS = 400;
      const SWITCH_WINDOW_MS = SWITCH_TRANSITION_MS + 50;
      let disposed = false;
      let conversation = false;

      const setConversation = (next) => {
        if (next === conversation) return;
        conversation = next;
        if (backdrop) backdrop.setConversation(next);
        applySettings();
      };

      const rebuild = () => {
        if (backdrop) backdrop.destroy();
        backdrop = null;
        if (!scene) return;
        backdrop = createOcean(canvas, {
          settings: store.get(),
          theme: scheme,
          reducedMotion: prefersReduced(),
          clickRipple: false,
          splitX: () => sidebarWidth,
          columnCenter: () => scene.chatCenter,
          chatTop: () => (scene ? scene.chatTop : 0),
        });
        if (conversation) backdrop.setConversation(true, true);
        else if (!prefersReduced()) backdrop.enterFromEdges();
      };

      const applySettings = () => {
        const s = store.get();
        settings = s;
        document.body.dataset.dshr = s.enabled ? "on" : "off";
        document.body.dataset.dshrGlass = s.composerGlass ? "on" : "off";
        document.documentElement.style.setProperty("--dshr-sidebar-blur", s.sidebarBlur + "px");
        document.documentElement.style.setProperty("--dshr-blur", s.streamBlur + "px");
        layer.style.display = s.enabled ? "block" : "none";
        layer.style.opacity = String((conversation ? s.conversationOpacity : 1) * s.opacity);
        if (!s.enabled) {
          if (backdrop) { backdrop.destroy(); backdrop = null; }
          return;
        }
        if (scene && !backdrop) { rebuild(); return; }
        if (backdrop && backdrop.setSettings) backdrop.setSettings(s);
      };

      // 侧栏整条共用一层模糊；尺寸只跟侧栏宽度，不随内容多少变化。
      const syncGlass = () => {
        const show = !!scene && sidebarWidth >= 80;
        if (!show) {
          if (glass.style.display !== "none") { glass.style.display = "none"; glassKey = ""; }
          return;
        }
        const key = Math.round(sidebarWidth);
        if (key === glassKey) return;
        glassKey = key;
        Object.assign(glass.style, { display: "block", width: key + "px" });
      };

      const syncBounds = () => {
        const rect = chatBounds();
        if (!rect || rect.width < 240 || rect.height < 240) {
          glass.style.display = "none";
          glassKey = "";
          layer.removeAttribute("data-ready");
          return;
        }
        // 画布铺到窗口底部：侧栏比聊天区高，若只按聊天区裁剪，侧栏下半截就没有海面和模糊层，
        // 会露出一道随会话布局移动的分界。
        // 画布从窗口顶端铺到窗口底部：侧栏的上半截（品牌行、新会话）比聊天内容区更高，
        // 若从聊天区顶部开始铺，侧栏上段就只剩系统毛玻璃，和下段分成两种颜色。
        const next = {
          y: 0,
          width: Math.round(rect.x + rect.width),
          height: Math.round(Math.max(window.innerHeight, rect.y + rect.height)),
          chatLeft: rect.x,
          chatCenter: rect.x + rect.width / 2,
          chatTop: rect.y,
        };
        const changed = !scene || Math.abs(next.width - scene.width) > 1 || Math.abs(next.height - scene.height) > 1
          || Math.abs(next.chatLeft - scene.chatLeft) > 1 || Math.abs(next.chatTop - scene.chatTop) > 1;
        scene = next;
        sidebarWidth = rect.x;
        Object.assign(layer.style, { left: "0px", top: next.y + "px", width: next.width + "px", height: next.height + "px" });
        syncGlass();
        const main = Array.from(document.querySelectorAll('[data-conversation-content][data-conversation-region="chat"]'))
          .find((node) => { const r = node.getBoundingClientRect(); return Math.abs(r.left - rect.x) < 2 && Math.abs(r.top - rect.y) < 2 && r.width > 0; });
        const phase = main && main.getAttribute("data-content-phase");
        if (phase === "hero") setConversation(false);
        else if (phase === "active") setConversation(true);
        if (!backdrop) rebuild();
        else if (changed) backdrop.resize();
        if (!disposed) layer.setAttribute("data-ready", "");
      };
      syncBounds();
      applySettings();
      const unsubscribe = store.subscribe(applySettings);
      const boundsTimer = window.setInterval(syncBounds, 400);
      window.addEventListener("resize", syncBounds);

      const applyScheme = (next, animate) => {
        scheme = next;
        document.body.dataset.dshrScheme = next;
        document.documentElement.style.setProperty("--dshr-from", TONE[next]);
        if (animate) {
          document.body.setAttribute("data-dshr-switching", "1");
          window.clearTimeout(switchTimer);
          switchTimer = window.setTimeout(() => document.body.removeAttribute("data-dshr-switching"), SWITCH_WINDOW_MS);
        }
        if (backdrop) backdrop.setTheme(next);
      };
      applyScheme(scheme, false);

      const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
      const onMotion = () => rebuild();
      if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener("change", onMotion);
      else if (motionQuery && motionQuery.addListener) motionQuery.addListener(onMotion);

      let offTheme;
      if (theme && typeof ctx.on === "function") {
        offTheme = ctx.on("theme/change", (snapshot) => {
          const next = snapshot && snapshot.active && snapshot.active.colorScheme === "dark" ? "dark" : "light";
          if (next !== scheme) applyScheme(next, true);
        });
      }

      return () => {
        disposed = true;
        window.clearInterval(boundsTimer);
        window.clearTimeout(switchTimer);
        window.removeEventListener("resize", syncBounds);
        if (motionQuery && motionQuery.removeEventListener) motionQuery.removeEventListener("change", onMotion);
        else if (motionQuery && motionQuery.removeListener) motionQuery.removeListener(onMotion);
        if (typeof offTheme === "function") offTheme();
        if (unsubscribe) unsubscribe();
        if (backdrop) backdrop.destroy();
        document.body.removeAttribute("data-dshr-switching");
        layer.remove();
        delete document.body.dataset.dshr;
        delete document.body.dataset.dshrScheme;
        delete document.body.dataset.dshrGlass;
        document.documentElement.style.removeProperty("--dshr-sidebar-blur");
        document.documentElement.style.removeProperty("--dshr-blur");
      };
    }


    /* =====================================================================
     * Settings panel
     * ===================================================================*/
    function SettingsPanel(props) {
      const store = props.store;
      const [value, setValue] = React.useState(store.get());
      const [status, setStatus] = React.useState("");
      React.useEffect(() => store.subscribe((next) => setValue(next)), [store]);

      const save = (patch) => {
        setValue(store.set(patch));
        setStatus("saved");
      };
      const reset = () => { setValue(store.reset()); setStatus("resetDone"); };
      const hintKey = (key) => "hint" + key.charAt(0).toUpperCase() + key.slice(1);
      const row = (key, control) => h("div", { className: "dshwt-row", key },
        h("div", { className: "dshwt-label" },
          h("span", { className: "dshwt-name" }, settingsText(key)),
          h("span", { className: "dshwt-hint" }, settingsText(hintKey(key)))),
        h("div", { className: "dshwt-control" }, control));
      const switchControl = (key) => h("button", {
        type: "button", role: "switch", className: "dshwt-switch",
        "aria-checked": value[key] ? "true" : "false", "aria-label": settingsText(key),
        onClick: () => save({ [key]: !value[key] }),
      });
      const colorControl = (key) => h("div", { className: "dshwt-color" },
        h("input", { type: "color", value: value[key], "aria-label": settingsText(key),
          onChange: (event) => save({ [key]: event.target.value }) }),
        h("code", null, value[key]));
      const rangeControl = (key) => {
        const range = SETTINGS_RANGES[key];
        const text = key === "speed" ? Number(value[key]).toFixed(1) + "x"
          : key === "fishCount" ? String(Math.round(value[key]))
          : key === "fishGlint" ? Number(value[key]).toFixed(1)
          : key === "whaleCount" || key === "sidebarFish" || key === "cellSize" ? String(Math.round(value[key]))
          : key === "sidebarBlur" || key === "streamBlur" ? Math.round(value[key]) + "px"
          : Number(value[key]).toFixed(2);
        return h("div", { className: "dshwt-range" },
          h("input", { type: "range", min: range[0], max: range[1], step: range[2], value: value[key], "aria-label": settingsText(key),
            onChange: (event) => { const n = Number(event.target.value); if (Number.isFinite(n)) save({ [key]: n }); } }),
          h("span", { className: "dshwt-value" }, text));
      };
      const controlFor = (key) => (key === "fishColor" || key === "whaleColor") ? colorControl(key) : SETTINGS_BOOL.includes(key) ? switchControl(key) : rangeControl(key);
      return h("div", { className: "dshwt-settings" },
        h("div", { className: "dshwt-head" }, h("h2", null, settingsText("title")), h("p", null, settingsText("description"))),
        SETTINGS_GROUPS.map((group) => h("div", { key: group.id },
          h("div", { className: "dshwt-group-title" }, settingsText("group" + group.id.charAt(0).toUpperCase() + group.id.slice(1))),
          h("div", { className: "dshwt-card" }, group.keys.map((key) => row(key, controlFor(key))))),
        ),
        h("div", { className: "dshwt-actions" },
          h("button", { type: "button", className: "dshwt-button", onClick: reset }, settingsText("reset")),
          h("span", { className: "dshwt-status", "aria-live": "polite" }, status ? settingsText(status) : "")),
      );
    }

    /* =====================================================================
     * 注册
     * ===================================================================*/
    // -50：低于默认（0），高于 ds-bot 气泡模式的 -100，
    // 所以气泡模式仍然归 ds-bot，原生界面才用这里的逐字浮现。
    const PRIORITY = -50;

    function apply(ctx) {
      const slots = ctx.get("slots");
      if (!slots) {
        console.warn("[dsh-whale-tide] slot service unavailable; plugin idle");
        return;
      }
      installStyles();
      syncTone();

      const theme = ctx.get("theme");
      if (theme && typeof theme.overrideTokens === "function") {
        ctx.effect(() => theme.overrideTokens("dsh-whale-tide", TOKENS), "dsh-whale-tide: palette");
      }

      const store = createStore();
      try {
        ctx.effect(() => mountBackdrop(ctx, store), "dsh-whale-tide: backdrop");
      } catch (error) {
        console.error("[dsh-whale-tide] backdrop failed to mount:", error);
      }

      // 必须等 chat 声明了这个 slot 再注册（slots.inject 会跟随它出现/消失）
      ctx.effect(
        () =>
          slots.inject("conversation.chat.node", () =>
            slots.register(
              {
                name: "conversation.chat.node",
                key: "assistant-step",
                priority: PRIORITY,
                locale: "chat",
                children: {
                  "conversation.chat.reasoning.body": { kind: "single", scope: "session" },
                  "conversation.chat.message.images": { kind: "single", scope: "session" },
                },
              },
              SafeCell,
            ),
          ),
        "dsh-whale-tide: assistant cell",
      );

      try {
        ctx.effect(
          () =>
            slots.inject("settings.section", () =>
              slots.register(
                { name: "settings.section", id: "dsh-whale-tide", order: 57, label: () => settingsText("title") },
                (props) => h(SettingsPanel, { ...props, store }),
              ),
            ),
          "dsh-whale-tide: settings section",
        );
      } catch (error) {
        console.warn("[dsh-whale-tide] settings slot unavailable", error);
      }
    }

    exports.name = "dsh-whale-tide";
    exports.inject = ["slots", "theme"];
    exports.apply = apply;
    return module.exports;
  },
});
