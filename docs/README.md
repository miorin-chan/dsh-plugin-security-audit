# 项目文档

`plugins.detail.actions` 在已安装插件详情页顶部提供按钮。
版本候选通过插件管理的只读接口取得，注册表更新选最新的兼容、未弃用正式版，官方目录更新采用目录提供的安装规格。
查询失败时可在详情页重试。`uiWorkspace.startSession` 写入草稿，已有草稿采用 `append` 行为。

DSH 0.2.2-rc.5 的原生「发现」详情、版本列表的单独版本行和更新确认弹窗没有公开的动作插槽。
通过「发现」提供 Git 目标的更新也属于这个边界。
审计按钮使用已安装详情的公开插槽。

运行 `npm run build` 和 `npm run check`，再从工作区运行插件骨架校验。
行为测试覆盖候选选择、按钮点击只初始化草稿、访问限制和停用清理。

开发约定见 [AGENTS.md](../AGENTS.md) 与 [AGENTS.local.md](../AGENTS.local.md)。
