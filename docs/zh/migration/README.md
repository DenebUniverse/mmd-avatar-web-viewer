# Migration

本目录负责当前 Viewer 到新 `apps/web` 架构的实际迁移。

最新范围：

- 直接全量迁移，不保留旧 Viewer 作为可运行入口；
- 本轮只保证 `ControlPanel` 和 `StageView` 正常；
- `ChatPanel` 只做 UI 壳和禁用态；
- 当前 `public/*` 资源迁到 `assets/*`；
- 迁移后使用 npm 命令启动新 `apps/web`。

- [当前文件/函数到目标目录映射](./01-current-to-target-map.md)
- [全量迁移方案](./02-phases.md)
- [提交拆分](./03-commit-plan.md)
- [风险与回滚](./04-risks-and-rollback.md)

## 迁移原则

```text
确认当前功能和资源
-> 切换唯一入口到 apps/web
-> 迁移 assets 和 registry
-> 迁移 Stage runtime
-> 迁移 ControlPanel 和 StageView
-> 加 ChatPanel 禁用 UI
-> 删除旧 Viewer 入口和旧 manifest
```

本轮不做 Server、Session、OpenRouter、Claude Code 或可用聊天。
