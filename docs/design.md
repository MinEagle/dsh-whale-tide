# 设计说明

本文说明鲸汐（Whale Tide）0.2.0 的架构、相位模型、渲染流水线、性能取舍与验证边界。
需求与验收见仓库根目录 README；这里记录“为什么这样做”。

## 1. 目标与非目标

目标：

- 在 DSH 空会话与对话中都可见的动态背景；
- 纯代码绘制，零图片素材；
- 对话中自动退潮，正文可读；
- 8 项设置，即时生效、刷新保留、可恢复默认；
- 遵循减少动效与页面隐藏；
- 卸载后界面完全恢复。

非目标：

- 不修改 DSH 的会话渲染逻辑，不接管消息组件；
- 不引入字体/图片/视频资源；
- 不做在线商店、遥测、网络请求；
- 不暴露超过 8 项的设置 UI（引擎内部参数保留）。

## 2. 文件与运行边界

| 文件 | 运行位置 | 作用 |
| --- | --- | --- |
| `lib/index.js` | Host（Node） | 只提供插件行，`apply()` 为空 |
| `lib/client.js` | 浏览器 | 单文件 bundle：海洋引擎 + DSH 接入 + 设置页 |
| `lib/settings.js` | Node 测试/文档 | 默认值、范围、normalize 的规范副本 |
| `cordis.patch.yml` | Loader | 插入 `dsh-whale-tide` 行 |
| `tools/preview.html` | 浏览器（无 DSH） | 与插件同源的独立预览 |
| `locale/*.json` | Host/Plugin Manager | `meta.title` / `meta.description` 与设置文案 |
| `vendor/ascii-sharks/` | 仅仓库 | 上游固定 commit 的 MIT 源码快照 |

为什么 `lib/client.js` 不 `require("./settings.js")`：DSH 的客户端模块表只解析
包 id（平台种子、已注册 factory、boot graph 行），不支持手写 bundle 同步
`require` 相对路径。相对路径只有编译器生成的 `require.async` chunk 才可用。
因此客户端内联设置模型，`lib/settings.js` 作为测试与文档的规范源，两者由
`test/manifest.test.js` 与人工 review 保证一致。

## 3. 渲染流水线

### 3.1 固定步长

```text
rAF(now)
  dt = min(0.1, (now - last) / 1000)
  acc += dt
  while acc >= 1/60 and steps < 4:
      world.step(1/60)
      acc -= 1/60
      steps++
  if steps == 4: acc = 0
  renderer.render(world, dt)
```

物理与动画以 60 Hz 固定步进；渲染跟随显示器。掉帧时最多补 4 步，超出就丢弃
积压，避免“追帧雪崩”。页面隐藏时取消 rAF，恢复时重置 `last` 与累加器。

### 3.2 世界（dsh-ascii-whales 引擎）

游动实现直接取自 [dsh-ascii-whales](https://github.com/Chael-Chael/dsh-ascii-whales)
0.1.5 的浏览器 bundle（MIT），保留其：

- 3 头座头鲸（`World.sharkSpecs`）在整窗范围内巡游、追逐、避让边缘；不是底部固定带；
- 18 节点脊线的 follow-the-leader 运动，逐节点 `maxBend` 限制 + 行波；
- 鱼群的 Boids（分离 / 对齐 / 聚合 / mill / 垂直阻尼 / 软墙 / 指针惊吓），
  `Int32Array` 头链表空间哈希；
- 固定步长 `OceanEngine.frame`：`STEP = 1/60`、`MAX_STEPS = 4`、速度倍率影响累加器；
- `AsciiRenderer` 的格子栅格化、蓝底白字鲸鱼、点阵、尾迹、热区、吃鱼事件与音效字；
- `IntersectionObserver` + `visibilitychange` + `prefers-reduced-motion` 暂停/静态帧；
- 指针 move / down 的鱼群惊吓与 splash。

**为什么不用自己写的“水平巡游”**：0.1.0 曾把鲸鱼限制在底部一条水平带里，画面上
只会在底部来回摆；即使轮廓更可控，也破坏了 dsh-ascii-whales 的“整片海”观感。
0.1.1 改为直接复用上游 `World` / `AsciiRenderer`，只做设置与相位的适配层。

适配层 `createOcean()`：

```js
const engine = new OceanEngine(canvas, [
  { kind: "whale", size: 1 },
  { kind: "whale", size: 0.7 },
  { kind: "whale", size: 0.84 },
], speed * 0.65, dark, 1, 0.05, 300, 1, color, "ascii", false, "primary", .8, .7, .8);
```

- 固定 300 条鱼的上限，`renderer.fishRatio` 控制实际显示比例，所以调密度不会重启世界；
- `setAppearance` 更新速度 / 主题 / 主色 / 摆动 / 转向 / 摆尾；
- `setPhase` 只改 `fishRatio`；整层透明度由 DSH 挂载层负责（dsh-quiet 的退潮）。

### 3.3 格子与字形

- `cellSize(1,false)`：8 px × 12 px 的字符格；1920×876 下约 212×70 = 17,520 格。
- `AsciiRenderer` 每帧清屏、恢复网格背景，再逐格绘制：
  - 身体/鳍/尾/眼/斑纹用 `sharkFlag` 与 `sharkShade` 选择色块与字符；
  - 鲸鱼色块填充 + 深色/浅色字形，保留 ascii-sharks 的“蓝块白字”质感；
  - 鱼逐条吸附一格、按亮度分桶；点阵按 bucket 批量绘制，减少 `fillStyle` 切换；
  - 尾迹/热区/事件字单独图层。
- `GlyphAtlas` / `InkRamp` 仍在引擎内（Kanji 分支使用）；ASCII 模式使用
  `ctx.fillText` 的原生字形，与参考实现一致。

### 3.4 全屏渲染

0.1.1 沿用上游的整屏重绘：每帧 `clearRect` → 绘制离屏网格 → 逐层画鲸鱼 / 点阵 /
鱼 / 热区 / 尾迹。原因是点阵会随时间闪烁、鲸鱼色块几乎覆盖全屏，脏格重绘的并集
接近全屏，收益很小；整屏路径更容易保持与 dsh-ascii-whales 完全一致的观感。
在 1920×876、17,520 格的预览中实测约 30 fps；设置页与对话退潮不会降低刷新率。

### 3.5 颜色

- 浅色：白底 + 深蓝鲸身 + 近白字形，鱼群用蓝青，尾迹淡蓝。
- 深色：`#141518` 底 + 亮蓝鲸身 + 近白字形，鱼群青光。
- 主色（`#rrggbb`）与深蓝/亮蓝按比例混合，因此换主色会改变鲸、鱼、尾迹，
  但不会破坏对比度。
- 所有颜色在 `wtPalette(theme, accent)` 中一次算好，渲染器只查表。

## 4. DSH 接入

### 4.1 挂载

```text
apply(ctx):
  installStyles(ctx)                 // ctx.effect 清理 <style>
  installLocale(ctx)                 // ctx.locale.register + bind
  store = createStore()              // localStorage
  ctx.effect(() => mountBackdrop(...)) // 背景层 + 引擎 + 观察器
  registerSettings(ctx, store)       // settings.section 槽位
```

`mountBackdrop` 创建：

```html
<div class="dsh-whale-tide-backdrop" aria-hidden="true">
  <canvas></canvas>
</div>
```

并 `document.body.prepend(layer)`。CSS：

```css
.dsh-whale-tide-backdrop {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
  opacity: 0; transition: opacity .6s ...;
}
body[data-dsh-whale-tide="on"] { background: #fff; }
body[...][data-dsh-whale-tide-scheme="dark"] { background: #141518; }
```

必须铺 `body` 底色，否则透明背景层与页面底色混在一起，鲸鱼会“消失”。
`pointer-events: none` 保证不挡点击。

但只铺 body 底色还不够：DSH 的对话 root 与 frame 会用自己的不透明背景盖住
`z-index: 0` 的层。插件只在“存在 `[data-conversation-content]`”的页面里把
对话表面变透明，并把侧栏主题变量换成半透明 + 模糊：

```css
body[data-dsh-whale-tide="on"]:has([data-conversation-content]){
  --dsw-alias-bg-base: transparent !important;
}
body[...]:has([data-conversation-content]) [data-conversation-scroll],
body[...]:has([data-conversation-content]) [data-conversation-content]{
  background-color: transparent !important;
}
body[...]:has([data-conversation-content])[data-dsh-whale-tide-ui="light"]{
  --dsw-specific-sidebar-fill: rgba(255,255,255,.55) !important;
}
body[...]:has([data-conversation-content])[data-dsh-whale-tide-ui="dark"]{
  --dsw-specific-sidebar-fill: rgba(20,21,24,.58) !important;
}
body[...]:has([data-conversation-content]) div:has(> [data-slot="sidebar"]){
  backdrop-filter: blur(10px);
}
```

所有覆盖都在插件自己的 `<style>` 里，依赖 body data 属性；卸载时随样式一起消失，
不会修改宿主的内联样式或主题变量。

### 4.2 相位与退潮

- `hero`（空会话）：层不透明度 = `opacity`；鱼群全量；输入框毛玻璃。
- `active`（对话中）：层不透明度 = `opacity × conversationOpacity`；鱼群 ×
  `conversationDensity`；输入框恢复原生；正文加继承式 `text-shadow` 柔光。
- 切换用 CSS `opacity` 过渡（0.6 s），不重建 canvas，不闪。
- 鱼群离开/进入由世界内部状态机完成；回 `hero` 时从边缘游回。

相位读取：

```js
const chat =
  document.querySelector('[data-conversation-content][data-conversation-region="chat"]') ||
  document.querySelector('[data-conversation-content] [data-conversation-region="chat"]');
const phase = chat?.getAttribute('data-content-phase') === 'active' ? 'active' : 'hero';
```

本机 0.2.2-rc.1 把两个 data 属性放在同一个节点上，需求里的后代选择器会返回
null；代码同时兼容“同节点”与“嵌套”两种形式。

- `MutationObserver` 监听 body 子树与 `data-content-phase` 属性；
- 500 ms 轮询兜底（节点替换、属性延迟写入、布局切换）；
- 多个 chat 节点时取第一个有尺寸的；
- 找不到 chat 时按 `hero` 处理（例如设置页/插件页），背景仍然可见。

### 4.3 主题

优先 `ctx.get("theme").getTheme().active.colorScheme`；其次
`data-theme` / `data-color-scheme` / `dark` class / computed `color-scheme`；
再退回 body 背景亮度与 `prefers-color-scheme`。
订阅 `ctx.on("theme/change")`，并用 `MutationObserver` 监听
`documentElement` 的 class/style（覆盖主题切换不触发事件的情况）。

`followTheme = false` 时固定为“关闭那一刻”的深浅色，记录在
`dsh-whale-tide:scheme`；页面 UI 表面（侧栏、输入框、正文柔光）始终跟随当前 DSH
主题，只有海洋调色板被冻结。这样不会出现“深色海洋 + 浅色文字”或反过来的
不可读组合。

### 4.4 设置页

`ctx.slots.inject("settings.section", () => ctx.slots.register({...}, Component))`，
`id = "dsh-whale-tide"`，`order = 57`，`locale = "whale-tide"`，
`label: () => t("title")`。

面板使用原生 React 元素与主题 token，不依赖 UI primitives（减少客户端依赖）：

- 8 行，开关 / range / color；
- 每次改动 `store.set()`：normalize → localStorage → 通知；
- 挂载组件订阅 store，因此「恢复默认」和其他入口的修改会同步；
- 存储失败显示行内提示，不阻塞渲染；
- 文案走 `ctx.locale`，`navigator.language` 作为无 locale 服务时的回退。

### 4.5 毛玻璃

只在 `hero` 相位覆盖 `[data-composer-card]`：

- 卡片本身 `background: transparent`，`isolation: isolate`；
- `::before` 绝对定位铺满卡片，`backdrop-filter: blur(14px)`；
- 这样不会把 `backdrop-filter` 直接加在卡片上，避免卡片成为 fixed 菜单的
  containing block（参考 dsh-ascii-whales 的经验）。

`active` 相位没有这些覆盖，输入框回到原生样式。

### 4.6 减少动效 / 页面隐藏 / 卸载

- `prefers-reduced-motion`：世界先跑 240 步（4 秒）让鱼群稳定，然后只渲染一帧；
  CSS 过渡在媒体查询中关闭。
- `visibilitychange`：隐藏时 `cancelAnimationFrame`；恢复时重置时钟后继续。
- 卸载：`ctx.effect` 清理样式、locale、背景层、观察器、interval、主题监听、
  store 订阅；删除 `dsh-whale-tide`、`dsh-whale-tide-scheme`、
  `dsh-whale-tide-phase` 三个 body 属性；`layer.remove()`。
  浏览器 harness 已验证卸载后 layer 不存在、body 属性为 null、底色恢复。

### 4.7 设置模型（24 项）

设置分两层：

- **上游参数**（20 项）与 dsh-ascii-whales 0.1.5 完全同名同范围：
  `count / species / size / bodySwing / turnAgility / tailFrequency /
  speed / color / colorfulShimmer / eyeColor / wake / gridScale /
  gridOpacity / fishCount / glyphMode / glass / blur / glassOpacity`（另有
  本插件的 `enabled / opacity / density / conversationOpacity /
  conversationDensity / followTheme`）。
- **生效方式**分两类：
  - `count / species / size / fishCount` 需要重建 `World`，适配层 `build()`；
  - 其余通过 `setAppearance()`、`renderer.fishRatio`、`renderer.gridScale +
    resize()`、CSS 变量（`--dshwt-blur`、`--dshwt-glass-opacity`）实时更新。

`lib/settings.js` 是 Node 侧规范副本（测试用），`lib/client.js` 内联同一份
常量；`test/manifest.test.js` 断言两边覆盖同一组控件，且 `locale/*.json`
为每个控件提供标签与提示。

### 4.8 深/浅色

主题来源按优先级读取：

1. `ctx.get("theme").getTheme().active`（`colorScheme` 或主题 id）；
2. `html[data-ds-theme-source]`（0.2.x 实际使用的属性）；
3. `body[data-ds-dark-theme]`；
4. `data-theme` / `data-color-scheme` / `.dark` class；
5. `getComputedStyle(html).colorScheme`；
6. `prefers-color-scheme`。

**不能**用 body 背景判断：本插件自己把 body 铺成 `#fff` / `#151517`，会污染判断
（这是 0.1.1 在深色下失效的原因之一）。

两套属性分开：

- `data-dsh-whale-tide-ui`：宿主主题，控制侧栏玻璃、正文柔光、输入框磨砂；
- `data-dsh-whale-tide-scheme`：海洋配色（`followTheme` 关闭时被冻结）。

背景底色、侧栏 token、正文 text-shadow、磨砂底色、画布调色板都按这两个属性
分浅/深两套；切换时只更新属性与引擎 `setAppearance`，不重建引擎。

## 5. 性能取舍

| 决策 | 取舍 |
| --- | --- |
| 直接复用 dsh-ascii-whales 引擎 | 观感、游动、鲸鱼细节与参考完全一致；代价是整屏重绘，约 30 fps |
| 8 px 字符格 / 17,520 格 | 鲸鱼细节和点阵质感接近参考；不适合更低端设备 |
| 固定 300 条鱼 + `fishRatio` | 调密度/退潮即时生效，不重启世界；代价是死鱼也参与模拟 |
| 3 头鲸鱼 | 与 dsh-ascii-whales 默认一致；保证整窗都有主体 |
| 全窗口 fixed 层 + 主题表面透明 | 满足 dsh-quiet 的整窗退潮；需要按 DSH DOM 作用域覆盖 token |
| 8 项设置 | 只暴露关键参数；上游的 19 项参数保留为引擎常量 |
| 单文件 client.js | 无构建；引擎代码内联，文件约 3.2k 行 |

## 6. 验证与边界

已执行：

- `npm test`：16 项通过（settings + manifest）。
- 独立预览：Chrome 打开 `tools/preview.html`，hero/active、浅/深、减少动效、设置面板均可运行；
  1920×876 下约 30 fps；生成的新截图与 GIF 在 `docs/media/`。
- 浏览器 harness：最小 `__ModuleLoader__` + `ctx` 加载 `lib/client.js`，验证
  `id === package name`、背景层/Canvas 挂载、`hero → active` 相位与 0.16 透明度、
  卸载后无 layer / body 属性残留、无控制台错误。
- DSH 安装：`plugin_manager.install_bundle` 在 0.2.2-rc.1 上 `application: applied`；
  `Slots.listSubTree("settings.section")` 显示 `dsh-whale-tide` occupant 且
  `active: true`。
- 真实 GUI（CDP 已认证页面）验证：
  - 空会话：`body` 四个 data 属性、背景层 1920×876、canvas 有 3 头鲸鱼与鱼群、
    侧栏 `rgba(255,255,255,.55)` + `blur(10px)`、输入框 `::before` 磨砂；
  - 打开已有会话后：chat 节点 `data-content-phase="active"`、body 相位同步为
    `active`、层不透明度 0.16、输入框磨砂消失、正文 `text-shadow` 生效；
  - 设置页：从账号菜单进入“设置 → 鲸汐”，**24 项控件**全部渲染（4 个开关、
    16 个 range、3 个下拉、1 个取色器、恢复默认），按四组分区；
  - 修改 `count=5 / species=orca / speed=1.4 / fishCount=240 / gridScale=1.4`
    后 `localStorage` 立即写入上述值，画布重建为 5 头虎鲸、240 条鱼、更大的字符格，
    游动继续；“恢复默认”回到上游默认值；
  - 深色：在「设置 → 通用设置 → 外观 → 深色」切换后
    `body[data-dsh-whale-tide-scheme=dark]`、body 背景 `rgb(21,21,23)`、
    层背景 `rgb(21,21,23)`、侧栏 token `rgba(21,21,23,.62)`、
    磨砂 `rgba(24,24,26,.45)`、画布深色调色板全部生效；切回浅色恢复；
  - 卸载：关闭插件后 layer / canvas / style / `--dshwt-*` 变量 / body 属性
    全部消失，侧栏 token 回到 `#f9fafb`、`--dsw-alias-bg-base` 回到 `#fff`；
  - 设置里的“显示背景”开关：关闭后 `body` 属性消失、层隐藏、界面恢复原生；
    再开启后层与属性恢复；
  - 关闭插件：layer / canvas / style / body 属性全部消失，body 与侧栏恢复原生底色；
    再启用后 layer、canvas、设置页注册恢复。
- 0.1.1 推送 GitHub（`MinEagle/dsh-whale-tide`）并创建 `v0.1.1` Release，
  附件为 `dsh-whale-tide-0.1.1.tgz`；npm registry 发布**未执行**：本机 npm 未登录
  （`npm whoami` 返回 ENEEDAUTH）。配置 npm token 后执行 `npm publish --access public`
  即可补上。


## 7. 后续可做

- 多鲸鱼 / 鲸群编队，用密度设置控制；
- 汉字模式（同 InkRamp，换候选池与字体）；
- 更精细的尾迹与气泡文字（喷水、鲸歌）；
- 主题 token 驱动的调色，而不是只支持浅/深两套；
- 可选的“只在空会话显示”开关（目前对话中保留 16%）。
