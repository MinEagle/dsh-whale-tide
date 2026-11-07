
## 33. 插件页开关无效：插件被装了两遍（实际命中）

现象：在「插件」页打开鲸汐的开关，页面没有任何反应。

排查：

- `plugin_manager list_plugins` 里同时存在两个入口：
  - `include:dsh-market:mkt-dsh-whale-tide`（marketplace 写入
    `~/.dsh/profiles/<profile>/.dsh-market/hot-1.yml`，指向
    `file:///.../lib/index.js`，`readOnlyReason: unaddressable`）
  - `include:dsh-whale-tide`（profile 依赖 + `cordis.patch.yml` 行）
- 插件页的开关操作的是 marketplace 那个只读入口，所以点了不生效；
  真正渲染背景的是另一个入口。
- 另外该包还被写进了 `dsh.profile.bundles`，bundle 组合会让
  `disabled` patch 行失效。

修复（profile 层，不是插件代码）：

1. 清空 `.dsh-market/hot-1.yml` 里的 `mkt-dsh-whale-tide` 行；
2. 从 `dsh.profile.bundles` 移除 `dsh-whale-tide`；
3. 保留 `dependencies["dsh-whale-tide"] = "link:..."` 与
   `cordis.patch.yml` 的 `- id: dsh-whale-tide / disabled: false`；
4. 退出并重开 Harness，让 host 重新组合插件。

之后插件页只剩一个可寻址的鲸汐入口，开关即可正常生效。
