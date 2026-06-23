# 提交拆分建议

> 状态说明：本文是早期迁移提交拆分建议，保留用于追溯，不代表当前功能状态。当前 ChatPanel 已接入本地 Server 和 Claude Code Orchestrator；当前行为以 `docs/zh/apps/web/04-chat-panel.md` 和 `docs/zh/architecture/06-claude-code-orchestrator-integration.md` 为准。

每个提交只完成一个可回滚边界。当前策略是直接迁到新架构，不保留旧 Viewer 运行入口。

```text
docs(migration): document full web migration scope
chore(web): create apps web entry and root npm scripts
refactor(assets): move public asset source to assets
feat(assets): add generated asset and character registries
refactor(stage): extract stage runtime shell
refactor(stage): extract actor and model loader
refactor(stage): extract motion controller
refactor(stage): extract pose controller
refactor(stage): extract expression and lip controllers
refactor(stage): extract camera and resize controller
feat(web): add three-column app shell
feat(web): migrate control panel to registry-backed components
feat(web): migrate stage view to StageRuntime
feat(web): add disabled chat panel UI
test(web): add control panel and stage view smoke checks
chore(scripts): move asset and check scripts to new folders
chore: remove legacy root viewer entry and old manifests
docs: update README with npm install and run commands
```

禁止事项：

- 不把 Stage runtime 抽取和资源搬迁混在同一个提交；
- 不把 ChatPanel 做成可用聊天；
- 不接 OpenRouter；
- 不接 Claude Code；
- 不新增 Session Store；
- 不维护旧 Viewer 第二入口。

允许旧入口在中间提交短暂不可用，但最终提交必须保证 `npm run dev`、`npm run build`、`npm run preview` 都指向 `apps/web`。
