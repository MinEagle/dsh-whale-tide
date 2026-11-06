# 踩坑记录

这份记录只写本次开发中**实际遇到**或**在代码里显式防御**的坑，以及对应的
验证方式。需求里列出的通用坑也一并标注了“是否实际命中”。

## 1. 客户端注册 id 必须逐字等于包名（实际命中）

`window.__ModuleLoader__.load({ id })` 的 id 一旦与 `package.json` 的 `name`
不一致，页面会报：

```text
... loaded without registering "dsh-whale-tide" via __ModuleLoader__.load
```

整个插件条目激活失败。本次包名、patch 行 id、settings section id、客户端
`load({ id })` 全部使用 `dsh-whale-tide`，并由 `test/manifest.test.js` 断言
三者一致。

## 2. `createOcean` 命名冲突导致栈溢出（实际命中）

DSH 集成函数本来叫 `createOcean()`，内部又调用引擎的 `createOcean(canvas, opts)`。
函数声明提升后，内部调用解析到自己，形成无限递归：

```text
RangeError: Maximum call stack size exceeded
  at createOcean ...
```

修复：集成函数改名 `ensureOcean()`，引擎工厂保留 `createOcean()`。浏览器
harness 的 `window.__logs` 捕获到了完整调用栈，否则只会看到“背景层挂载失败”。

## 3. `engines.dsh` 与 peerDependencies 的优先级（按源码确认）

需求要求不声明 DSH peer，只写 `engines.dsh`。实际读了 DSH 0.2.2-rc.1 的
`@deepseek-ai/dsh-app-boot/lib/index.js`：

```js
const engines = ...
if (Object.hasOwn(engines, "dsh")) {
  return satisfies(runtime, engines.dsh) ? {} : { "engines.dsh": engines.dsh };
}
// 只有没有 engines.dsh 时才检查 @deepseek-ai/dsh-* peer
```

所以 `engines.dsh: ">=0.2.0-rc.2 <0.3.0-0"` 单独决定兼容性，peer 被忽略。
安装实际返回 `application: applied`。

## 4. `immediately: true` 不是可选项（实际命中风险）

客户端插件默认按需加载；如果只注册设置页，页面启动时不会 materialize
client bundle，背景自然不出现。给 `dsh.client` 加：

```json
"immediately": true
```

安装后 `Slots.listSubTree("settings.section")` 立刻能看到 occupant，说明
client 在 boot 阶段已执行。

## 5. pnpm 10 的构建脚本拦截（按需求规避，未命中）

本包没有 `prepare` / `prebuild` / `build` / `install` / `postinstall` 脚本。
`test/manifest.test.js` 断言这些字段不存在。从 git 或本地目录安装时，
pnpm 不会要求 approve-builds。

## 6. 安装时 pnpm 会解析整个 profile（实际命中）

`plugin_manager.install_bundle` 第一次失败不是本包的问题，而是 profile 里已有
一个 GitHub Release tarball 依赖（`dsh-superagent`）在当前网络下 HEAD 超时：

```text
[WARN] HEAD https://github.com/.../dsh-superagent-0.2.1.tgz ... timeout
[ERROR] fetch failed
```

临时在 profile 放 `.npmrc`：

```ini
offline=true
prefer-offline=true
```

让 pnpm 从本地 store 解析既有依赖，安装完成后立即删除该临时文件。
这不是插件自身的缺陷；README 的安装说明不要求用户这样做。

## 7. `Number(null) === 0` 不是默认值（实际命中）

设置 normalize 最初写成：

```js
const n = Number(value);
if (!Number.isFinite(n)) return fallback;
```

`{ speed: null }` 会变成 0，再被钳到 `0.1`，而不是回退到默认 1。修复为：

```js
if (value === null || value === "" || typeof value === "boolean") return fallback;
```

`test/settings.test.js` 的 “normalize recovers from malformed numbers and colours”
覆盖了这个用例。

## 8. `document.fonts.ready` 之前建图集会缓存 fallback（代码防御）

引擎 `bootstrap()` 顺序：

```js
const family = getComputedStyle(canvas).fontFamily;
await document.fonts.load(`600 16px ${family}`);
await document.fonts.ready;
renderer.buildRamp();
renderer.setPalette(...);
resize();
start();
```

否则 atlas 里全是 fallback 字形，之后即使字体到了也不会自动重建。

## 9. `getContext("2d", { alpha: false })` 会让字形贴图变黑块（代码防御）

主画布和离屏 tile 都使用默认 `alpha: true`；tile 先 `clearRect` 再 `fillText`。
参考实现里主画布用 `{ alpha: false }` 是因为它直接铺不透明黑底；本插件背景是
透明/浅色，不能照抄。

## 10. 图集不设上限会长期吃内存（代码防御）

`WTGlyphAtlas` 有 `limit = 6000`；超过时 `tiles.clear()`。颜色先量化到有限档，
正常情况下远低于上限。

## 11. 背景层挡点击（代码防御）

```css
.dsh-whale-tide-backdrop {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
}
```

canvas 本身也不接收指针。鼠标交互通过 `window` 的 passive `pointermove`
读取位置，仅用于鱼群惊吓，不影响点击。

## 12. 不铺 body 底色，背景层看不见（代码防御）

```css
body[data-dsh-whale-tide="on"] { background: #fff; }
body[data-dsh-whale-tide-scheme="dark"] { background: #141518; }
```

关闭插件时删除 `data-dsh-whale-tide`，`body` 背景立即回到宿主样式；
卸载时同时删除 scheme/phase 属性。

## 13. 对话中文字发灰（实际命中）

只靠 0.16 透明度还不够：浅色主题下鲸鱼的蓝色块会透到正文后面，长段落会累。
DSH 页面里不能安全假设消息节点的类名，因此采用**继承式 `text-shadow` 柔光**：

```css
body[data-dsh-whale-tide-phase="active"] [data-conversation-content]
  [data-conversation-region="chat"] {
  text-shadow: 0 0 1px rgba(255,255,255,.92),
               0 0 10px rgba(255,255,255,.78),
               0 0 26px rgba(255,255,255,.38);
}
```

预览页保留了需求里的 `.text::before` 柔光盒（更接近 dsh-quiet 的原机制），
用于验证“大量文字 + 柔光罩”的可读性；DSH 侧用同一视觉目标的继承式变体，
避免给未知 DOM 注入盒子改变布局。

## 14. 毛玻璃破坏 fixed 菜单定位（代码沿用 dsh-ascii-whales 的规避）

`backdrop-filter` 直接加在输入框卡片上会让它成为 fixed 后代的 containing block。
本插件把滤镜放在 `[data-composer-card]::before` 上，卡片本身只
`isolation: isolate; background: transparent`。该覆盖只在 `hero` 相位存在，
`active` 时恢复原生。

## 15. 相位属性可能晚到、被节点替换，且选择器形式会变（实际命中）

`MutationObserver` 同时监听：

- `childList: true, subtree: true`（节点替换）；
- `attributes: true, attributeFilter: ["data-content-phase"]`。

再加 500 ms interval 兜底。找不到 chat 节点时按 `hero` 处理，绝不抛错。

真正踩到的是选择器：需求给的是后代选择器

```js
document.querySelector('[data-conversation-content] [data-conversation-region="chat"]')
```

但本机 DSH 0.2.2-rc.1 把两个属性放在**同一个节点**上（`kiGsTW_body`）：

```html
<div data-conversation-content data-conversation-region="chat" data-content-phase="active">
```

后代选择器返回 null，于是永远判成 `hero`。`findChatNode()` 现在同时尝试：

```js
'[data-conversation-content][data-conversation-region="chat"]', // same node
'[data-conversation-content] [data-conversation-region="chat"]', // nested
'[data-conversation-content]',
```

CSS 的正文柔光也同时覆盖两种形式。

## 16. 自己写“水平巡游”，鲸鱼只在底部固定区域来回摆动（实际命中，用户反馈）

0.1.0 为了控制轮廓，把鲸鱼头节点限制在 `cy = H * 0.77` 附近的一条水平带里，
只做很小的垂直呼吸。结果就是用户看到的：“只会在底部固定区域内来回摆动”。
这不是 dsh-ascii-whales 的游动实现，而是我自行简化的巡游。

修复（0.1.1）：删除自写 `WTWorld` / `WTEngine`，把 dsh-ascii-whales 0.1.5
浏览器 bundle 中的 `World` / `OceanEngine` / `AsciiRenderer` 整段内联进
`lib/client.js`，只保留适配层：

```js
const engine = new OceanEngine(canvas, [
  { kind: "whale", size: 1 },
  { kind: "whale", size: 0.7 },
  { kind: "whale", size: 0.84 },
], speed * 0.65, dark, 1, 0.05, 300, 1, color, "ascii", false, "primary", .8, .7, .8);
```

上游的 3 头鲸鱼围绕中心轨道巡游、追逐、避边、随机 wander，因此在整窗游动；
不再有“底部固定带”。

## 17. 格子太粗，鲸鱼像一块蓝砖（实际命中）

自写引擎曾用 `cw = width / 104`（约 14 px），400 px 的鲸鱼只有 28×8 格，
头尾细节被吃掉。改用上游 `cellSize(1,false)` 后是 8×12 px，1920×876 下约
17,520 格，鲸鱼轮廓、鳍、尾、眼睛都清晰。代价是整屏重绘约 30 fps。

## 18. 尾迹/鱼群把整屏变成噪点（实际命中）

自写引擎曾把 wake 沉积量设得过大、阈值过低，鱼群后方全是点。上游
`AsciiRenderer` 的 wake 阈值与衰减已经调好；适配层只保留 `wake = 1`，
不再额外覆盖。鱼群密度通过 `renderer.fishRatio` 控制，避免把 wake 也一起
缩放到看不见。

## 19. `localStorage` 失败不能让设置页崩（代码防御）

`loadSettings` / `persist` 都 try/catch；失败时 `storageError = true`，设置仍在
内存中生效，面板显示 `saveError`。DSH 桌面端一般可用，但隐私模式/配额满时
不应影响背景。

## 20. 真实 GUI 需要认证（实际命中，已解决）

`http://127.0.0.1:49897` 未带一次性 token 时返回：

```text
dsh web authentication required; reopen the URL printed by dsh web.
```

Desktop 没有开 `--remote-debugging-port`；Electron 的 9222 CDP 属于另一个应用。
后来在 `~/Library/Application Support/@deepseek-ai/dsh-desktop/Cookies`
（SQLite）里找到当前 GUI 的 `dsh-auth-*` 会话 cookie（明文 `value`），用
ego-browser 的 `Network.setCookie` 注入后，成功打开已认证的 live 页面。
cookie/token 不写入仓库，也不在回复中输出。

## 21. 背景层挂上了，但被对话区的不透明表面挡住（实际命中）

按需求只做 `.backdrop { position: fixed; z-index: 0 }` + body 底色，live 页面里
`canvas` 确实在渲染（非白像素 5000+），但截图仍是纯白。检查
`document.elementsFromPoint` 发现：

```text
div.kiGsTW_root   background: rgb(255,255,255)
div.PIRFFq_frame  background: rgb(255,255,255)
div.PIRFFq_sidebarCol background: rgb(249,250,251)
```

对话 root 用主题变量 `--dsw-alias-bg-base: #fff` 铺底，z-index 0 的层永远在它下面。
修复：

```css
body[data-dsh-whale-tide="on"]:has([data-conversation-content]){
  --dsw-alias-bg-base: transparent !important;
}
body[data...]:has([data-conversation-content]) [data-conversation-scroll],
body[data...]:has([data-conversation-content]) [data-conversation-content]{
  background-color: transparent !important;
}
```

并把侧栏从 `#f9fafb` 换成半透明 + 模糊：

```css
--dsw-specific-sidebar-fill: rgba(255,255,255,.55) !important;
body[...] div:has(> [data-slot="sidebar"]){ backdrop-filter: blur(10px); }
```

只覆盖“有对话内容”的页面，设置页/插件市场不受影响。修复后 live 空会话与
对话中都能看到海洋；关闭插件时这些覆盖随 `<style>` 一起移除。

## 22. 关闭插件后“看起来恢复了”，但 token/主题变量可能残留（代码防御）

所有主题覆盖都写在插件自己的 `<style>` 里，并依赖
`body[data-dsh-whale-tide="on"]`；`ctx.effect` 清理时删除 `<style>`，同时删掉
`dsh-whale-tide` / `scheme` / `ui` / `phase` 四个 body 属性。live 验证关闭后：

```text
layer=false canvas=false style=false bodyAttrs={} bodyBg=rgb(255,255,255)
sidebar=rgb(249,250,251)
```

特别注意 `--dsw-alias-bg-base` 这类主题变量不能写到 `body.style` 上；一旦写到
内联样式，清理时容易漏掉，且会覆盖宿主主题。本插件只通过带选择器的 CSS 规则
覆盖，不修改任何内联 style。

## 23. 不要为“轮廓更可控”而重写上游游动（0.1.1 的教训）

这次修正的核心不是再调参数，而是**换掉实现**：

- 游动、鲸鱼脊线、boids、渲染、指针交互、减少动效、页面隐藏暂停，
  全部使用 dsh-ascii-whales 0.1.5 的实现（MIT，保留 LICENSE 与 notices）；
- 我们只写三件事：全窗挂载层（dsh-quiet 机制）、相位/设置适配、设置页；
- 设置里的密度/对话密度映射到 `renderer.fishRatio`，速度/颜色/主题映射到
  `setAppearance`，不在适配层重新发明物理。

以后如果还需要调整观感，优先改上游参数（`count` / `size` / `speed` /
`bodySwing` / `turnAgility` / `tailFrequency`），不要回到自写巡游。
