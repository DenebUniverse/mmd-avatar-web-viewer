# 开发状态 / 变更记录

按时间倒序记录已落地的开发成果，每条指向对应的详细文档与代码位置。本文件只记「已实现」状态摘要，细节不在此展开。

## 2026-06：语音聊天 · 动作切换修复 · Claude Code 配置隔离

本轮三块成果均已实现并验证（`npm run check` 全过，关键链路有端到端实测）。

### 1. 语音聊天（TTS 输出 + STT 输入）

- 控制台「语音」下拉：`无`（默认）/ `机器`；选「机器」后助手一轮 run **完成时**自动浏览器朗读，舞台角色口型随朗读张合。
- ChatPanel composer 发送按钮左侧新增麦克风按钮：点击实时把语音转写进输入框；发送时自动关闭；二次点击关闭；浏览器不支持 `SpeechRecognition` 时禁用、文本聊天不受影响。
- 纯浏览器原生能力，无第三方依赖，不改 `apps/server`。
- 详见 [apps/web/05-voice-chat.md](./apps/web/05-voice-chat.md)；连带修订 [apps/web/04-chat-panel.md §7](./apps/web/04-chat-panel.md)（放开「ChatPanel 不允许触发 TTS」）。
- 代码：`apps/web/index.html`、`apps/web/src/styles/style.css`、`apps/web/src/main.js`。

### 2. 切换动作不归位 / 腿部 360° 旋转修复

- 现象：全身动作（如「昇天」）未结束时切「呼吸」，角色不归位；连点「呼吸」腿部过度旋转至 360°。
- 根因：VMD 只驱动自身包含的骨骼轨道；未被新动作覆盖的骨骼残留旧姿势，且 IK/grant 在已变形骨骼上反复累加。**与地板/物理无关**（当前 `physics: false`）。
- 修复：每次加载新 Motion 前 `resetSkeletonToBindPose()`（`mesh.skeleton.pose()` 还原绑定姿势 + 清零 morph/口型），再注册动画。`loadPose()` 已自带 `resetPose`，无需改。
- 详见 [packages/stage/01-runtime-and-controllers.md](./packages/stage/01-runtime-and-controllers.md)「切换 Motion 前必须复位骨骼到绑定姿势」。
- 代码：`apps/web/src/main.js`。

### 3. Claude Code 配置隔离 + 强制走 OpenRouter（修复误用 glm.ai）

- 问题：`start.sh` 启动后 claude 实际走机器全局 `~/.claude/settings.json` 里写死的 `https://api-gateway.glm.ai`，而非配置期望的 OpenRouter（经本地 CCR）。
- 实测根因（claude v2.1.179）：① `ccr activate` 的白名单不清除残留的 `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`；② 真凶是全局 `~/.claude/settings.json` 的 `env` 块会覆盖继承的进程环境变量；③ 隔离 `settings.json` 的 `env` 块优先级最高。
- 修复：用 `CLAUDE_CONFIG_DIR` 把本项目 Claude Code 的 settings/session/history/日志隔离到 `./.agentstage/claude-config`，并把强制 env（钉死 CCR、清空残留 key/model）写入该隔离 `settings.json` 的 `env` 块。真理源在 `config/agentstage.default.yaml` 的 `claude_code.{config_dir,debug,env}`。
- 端到端验证：带「脏」glm 进程 env spawn 真实 claude，CCR 仍收到 `POST /v1/messages` 并重映射为 `openrouter, google/gemma-4-31b-it:free`；对照组（无隔离 env）则 claude 直连 glm、CCR 零请求。
- 详见 [architecture/06-claude-code-orchestrator-integration.md §4.1](./architecture/06-claude-code-orchestrator-integration.md)。
- 代码：`config/agentstage.default.yaml`、`apps/server/src/config.js`、`apps/server/src/main.js`、`packages/orchestrator/index.js`、`.gitignore`。
- 已知外部因素：OpenRouter 免费模型 `google/gemma-4-31b-it:free` 可能被上游 429 限流（路由正确，可在 CCR 配置换模型或配自有 key）。
