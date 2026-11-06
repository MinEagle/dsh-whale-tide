# 设计说明

本文说明鲸汐（Whale Tide）0.1.0 的架构、相位模型、渲染流水线、性能取舍与验证边界。
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

### 3.2 世界

- 鲸鱼：一条 18 节点脊线。头节点沿一条水平巡游路径行进；每节受 `maxBend = 0.1`
  的角度约束，身体最多弯成 C，不会折返。渲染时再叠加沿脊线传播的行波，形成摆尾。
- 鱼群：Reynolds boids，三种体型/行为参数（sardine / anchovy / silverside）。
  每帧重建空间哈希：桶大小 = 感知半径，`Int32Array head` 头插入 + `next` 链；
  邻域扫描 3×3 桶。
- 鱼群行为：椭圆个人空间（横向宽、纵向窄）、盲区、警报传染、洋流（无散度流函数）、
  软墙、指针惊吓、鲸鱼惊吓（喷泉式侧向逃逸）。不捕食，鱼不会被吃掉。
- 潮汐种群：每条鱼有 `active / leaving / away / entering` 四态。退潮时让离中心最远的
  鱼转向最近边缘，出界后 `away`；涨潮时从随机边缘激活 `entering`，游进内区后转
  `active`。这样切换不会瞬移、不会整屏闪。

### 3.3 格子与字形

- 单元格：`cw = clamp(round(width / 180), 6, 9)`，`ch = round(cw × 1.45)`。
  1920×876 下约 212×70 ≈ 14,800 格。
- 连续坐标 → `floor(x / cw)`、`floor(y / ch)` → 一维索引。
- 两级缓冲：`flag: Uint8Array`（BODY / EDGE / FIN / RIDGE / EYE / FLUKE / MARK / WAKE）
  与 `shade: Float32Array`。颜色与字符由 flag + shade + hash key 决定：
  - BODY：`InkRamp.pick(1 - shade)`，阴影处选重字，亮部选稀疏字；
  - RIDGE / EYE / MARK / FIN / FLUKE：各自字符集；
  - EDGE：按覆盖率选重/轻描边字符，并用亮色填充形成清晰轮廓；
  - WAKE：按能量选 `.` / `~` / `=`。
- GlyphAtlas：每个「字符 + 颜色」一张离屏 canvas，`drawImage` 贴到主画布；
  `cellPx` 变化时清空；超过 6000 条时清空重建。颜色先量化到 12/6/5 档，
  避免缓存无界增长。
- InkRamp：启动时把 ASCII 候选池逐个画到 64×64 离屏 canvas，读 `getImageData`
  的 alpha 总和作为墨量，排序后采样 64 档。候选池是常量，换成汉字池即可复用。
- 字体：`document.fonts.load("600 16px <computed stack>")` → `document.fonts.ready`
  → 再建 InkRamp 与 GlyphAtlas。若跳过这一步，图集缓存的是 fallback 字形。

### 3.4 脏格重绘

每帧：

1. 把上一帧 `touched` 的格子标记为 dirty，并清空这些格子的状态；
2. 把当前帧写过的格子加入 `touched`；
3. 对 dirty 并集逐格：
   - 从离屏背景画布 `drawImage` 恢复该格（底色 + 点阵 + 暗角）；
   - 画可选色块填充；
   - 画字形图集贴图。
4. `prev = touched`。

背景（底色、点阵、暗角）只在 resize / 主题/主色变化时重画一次。这样不做全屏
`clearRect + 7000 次 drawImage`，也满足“脏格重绘”的要求。代价是每格需要一次
背景贴图，但比全量重绘便宜，且随实体数量而不是屏幕面积增长。

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

## 5. 性能取舍

| 决策 | 取舍 |
| --- | --- |
| 约 9 px 字符格 | 鲸鱼轮廓更细、更像鲸；代价是格数约 1.5 万。实测 1920×876 预览 60 fps |
| 脏格重绘 | 每格两次 `drawImage`；比全屏字形重绘便宜，且随实体数增长 |
| 字符图集 6000 上限 | 换主色/主题时可能清空重建一次；避免长期运行内存无界 |
| 每帧空间哈希重建 | O(n)，但实现简单、缓存友好；n ≤ 300 |
| 鱼群最多 300 且按深度分桶 | 限制绘制状态切换；对话中只保留 30% |
| 鲸鱼单条 | 保证轮廓可读和性能；引擎支持多条，但 0.1.0 只放一条 |
| 单文件 client.js | 无构建、无 chunk；代价是 engine 与 preview 有两份代码，靠 review 与同源生成流程保持一致 |
| 设置只暴露 8 项 | 降低认知负担；高级参数留在引擎内部 |

## 6. 验证与边界

已执行：

- `npm test`：16 项通过（settings + manifest）。
- 独立预览：Chrome 打开 `tools/preview.html`，hero/active、浅/深、减少动效、设置面板均可运行；
  1920×876 下 60 fps；生成的截图与 GIF 在 `docs/media/`。
- 浏览器 harness：最小 `__ModuleLoader__` + `ctx` 加载 `lib/client.js`，验证
  `id === package name`、背景层/Canvas 挂载、`hero → active` 相位与 0.16 透明度、
  卸载后无 layer / body 属性残留、无控制台错误。
- DSH 安装：`plugin_manager.install_bundle` 在 0.2.2-rc.1 上 `application: applied`；
  `Slots.listSubTree("settings.section")` 显示 `dsh-whale-tide` occupant 且
  `active: true`。
- 真实 GUI（CDP 已认证页面）验证：
  - 空会话：`body` 四个 data 属性、背景层 1920×876、canvas 有非白像素、
    侧栏 `rgba(255,255,255,.55)` + `blur(10px)`、输入框 `::before` 磨砂；
  - 打开已有会话后：chat 节点 `data-content-phase="active"`、body 相位同步为
    `active`、层不透明度 0.16、输入框磨砂消失、正文 `text-shadow` 生效；
  - 设置页：从账号菜单进入“设置 → 鲸汐”，8 项控件全部渲染（2 个开关、
    5 个 range、1 个取色器、恢复默认）；修改 density 0.25 / opacity 0.5 后
    `localStorage` 立即写入，刷新后仍为 0.5（active 会话中显示 0.08 =
    0.5 × 0.16）；恢复默认后回到 0.65 / 1 / 0.16；
  - 设置里的“显示背景”开关：关闭后 `body` 属性消失、层隐藏、界面恢复原生；
    再开启后层与属性恢复；
  - 关闭插件：layer / canvas / style / body 属性全部消失，body 与侧栏恢复原生底色；
    再启用后 layer、canvas、设置页注册恢复。
- 0.1.0 已推送 GitHub（`MinEagle/dsh-whale-tide`）并创建 `v0.1.0` Release，
  附件为 `dsh-whale-tide-0.1.0.tgz`；npm registry 发布**未执行**：本机 npm 未登录
  （`npm whoami` 返回 ENEEDAUTH）。配置 npm token 后执行 `npm publish --access public`
  即可补上。


## 7. 后续可做

- 多鲸鱼 / 鲸群编队，用密度设置控制；
- 汉字模式（同 InkRamp，换候选池与字体）；
- 更精细的尾迹与气泡文字（喷水、鲸歌）；
- 主题 token 驱动的调色，而不是只支持浅/深两套；
- 可选的“只在空会话显示”开关（目前对话中保留 16%）。
