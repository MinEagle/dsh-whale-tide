# 鲸汐 · Whale Tide

以 **[dsh-quiet](https://github.com/AvenYQ/dsh-quiet) 0.3.0 为模板**的 DeepSeek Harness 动态背景插件：
安静的点阵海面、缓慢游动的鲸群、侧栏磨砂玻璃、AI 回复的模糊到清晰流式浮现，并新增一套设置面板。

> 代码、背景引擎、对话布局与流式渲染来自 dsh-quiet（MIT，© 2026 AvenYQ）；设置是鲸汐新增的部分。

## 特性

- **安静海面**：低对比度 ASCII 海面 + 程序化鲸鱼（母鲸、幼鲸、中鲸），带深度、尾迹和气泡。
- **丰富鱼群（来自 dsh-ascii-whales）**：5 种鱼（sardine / anchovy / silverside / mackerel / goby），默认约 100 条，带 depth、转向/警报闪光、群游与鲸鱼捕食/重生。
- **对话退潮**：空白会话中生物在侧栏与聊天区之间游动；进入对话后其他生物向边缘游走，主聊天区只剩极淡水纹，侧栏最多一只驻留鲸。
- **流式浮现**：AI 回复逐字以模糊到清晰的效果出现；减少动态效果时退回原生渲染。
- **设置面板**：在「设置 → 鲸汐」中调整 12 项参数，实时生效并持久化到 `localStorage`。
- **主题适配**：跟随 Harness 的深/浅色；侧栏、输入框和正文柔光随主题切换。

## 设置

| 分组 | 设置 | 默认 | 范围 |
| --- | --- | --- | --- |
| 背景 | 显示背景 | 开 | 开 / 关 |
| 背景 | 背景透明度 | 1.00 | 0–1 |
| 背景 | 对话中透明度 | 1.00 | 0–1 |
| 动画 | 游动速度 | 1.0× | 0.2–2 |
| 动画 | 鱼群数量 | 100 条 | 20–200 |
| 动画 | 鱼群颜色 | `#a9bde8` | 任意颜色 |
| 动画 | 鱼群闪光 | 1.0 | 0–2 |
| 动画 | 鲸鱼数量 | 3 | 1–3 |
| 动画 | 侧栏鱼群数量 | 6 条 | 0–12 |
| 界面 | 侧栏玻璃模糊 | 6 px | 0–20 |
| 界面 | 输入框磨砂 | 开 | 开 / 关 |
| 界面 | 流式模糊强度 | 10 px | 0–20 |

设置页提供「恢复默认」。

## 安装

```bash
dsh plugin --profile <profile> add github:MinEagle/dsh-whale-tide
```

本地开发也可以直接 link 本目录安装。当前仓库的 Release 里附 `dist/dsh-whale-tide-0.7.0.tgz`。

## 开发

```bash
npm test
node tools/preview.mjs   # 从 lib/client.js 抽出海洋引擎，生成 tools/preview/index.html
```

预览页可独立打开，不依赖 Harness。

## 兼容性

- 与 dsh-quiet 使用相同的 `window.__ModuleLoader__.load` 浏览器模块格式，包名与 `id` 必须等于 `dsh-whale-tide`。
- 不发送网络请求，不读取凭据。
- 与 dsh-quiet 二选一启用，避免两个背景层叠加。

## License

MIT。第三方来源与完整 MIT 声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 `LICENSE.dsh-quiet`。
