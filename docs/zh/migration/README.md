# Migration

本目录负责当前 Viewer 到新 `apps/web` 架构的实际迁移。

最新范围：

- 直接全量迁移，不保留旧 Viewer 作为可运行入口；
- `ControlPanel` 和 `StageView` 正常；
- `ChatPanel` 已接入本地 Server，可创建/续写 session；
- Claude Code 通过 Server-side Orchestrator 调用，Browser 不直接接 CLI、CCR 或 API Key；
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
-> 加 ChatPanel UI
-> 接入 Server / Session / Claude Code Orchestrator
-> 删除旧 Viewer 入口和旧 manifest
```

历史迁移计划中的“ChatPanel 禁用态”是早期阶段描述；当前行为以 `docs/zh/apps/web/04-chat-panel.md` 和 `docs/zh/architecture/06-claude-code-orchestrator-integration.md` 为准。
