# 验收矩阵

## 当前迁移版本

| 模块 | 必测场景 |
|---|---|
| Web 入口 | `npm run dev` 启动 `apps/web`，根旧 Viewer 不再作为入口 |
| Assets | `npm run assets:scan` 生成 `.generated/assets-registry.json`，required missing 为 0 |
| Character | `hiying`、`qianyeBlade` 进入 registry，附件 `剑.pmx`、`環.pmx` 不丢失 |
| Stage | 默认加载、角色切换、dispose、VMD、VPD、表情、口型、resize、OBS |
| ControlPanel | 角色、动作、姿态、表情、口型/TTS、收起/展开可用 |
| StageView | canvas 不被左右面板遮挡，窗口变化后模型仍可见 |
| ChatPanel | 可收起/展开；session 列表和 messages 列表 UI 可切换；输入区 disabled；无网络请求 |
| Build | `npm run build` 成功，输出 `dist/index.html` 和 `dist/assets/*` |
| Check | `npm run check` 成功，覆盖 registry、结构、语法、smoke、build |

## 当前不验收

- Server；
- Config Loader；
- Session Store；
- Orchestrator；
- OpenRouter；
- Claude Code；
- Server SSE；
- 真正可用聊天；
- Multi-Agent / Multi-Actor。

## 完成定义

不允许只以“目录已经创建”作为完成。当前版本必须满足：`ControlPanel` 和 `StageView` 可用，`ChatPanel` 明确禁用，资源真源在 `assets/`，旧 Viewer 入口和旧 runtime manifest 不再使用。
