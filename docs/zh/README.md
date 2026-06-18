# AgentStage Web 中文架构与迁移文档

> 本目录用于指导 `mmd-avatar-web-viewer v0.12.0` 向 AgentStage Web 迁移。文档目录直接镜像未来代码目录，避免“设计文档一套、项目结构另一套”。

## 1. 文档目录与代码目录一一对应

| 目标代码目录 | 对应文档目录 | 主要内容 |
|---|---|---|
| `apps/web/` | `docs/zh/apps/web/` | 左中右 UI、Web 状态、协议客户端、浏览器能力 |
| `apps/server/` | `docs/zh/apps/server/` | API、SSE、配置加载、安全边界、Session 服务 |
| `packages/core/` | `docs/zh/packages/core/` | Actor、Character、Session、Message 等领域模型 |
| `packages/stage/` | `docs/zh/packages/stage/` | Three.js、PMX/PMD、VMD/VPD、表情、摄像机、口型 |
| `packages/characters/` | `docs/zh/packages/characters/` | Character Package、Registry、Soul、资源引用 |
| `packages/orchestrator/` | `docs/zh/packages/orchestrator/` | Agent 生命周期、Provider Adapter、流式回复、取消 |
| `packages/protocol/` | `docs/zh/packages/protocol/` | 跨模块命令、事件、Envelope、错误和版本 |
| `packages/voice/` | `docs/zh/packages/voice/` | STT、TTS、播放队列、Lip Sync 信号 |
| `config/` | `docs/zh/config/` | 模型 ID、API URL、API Key、端口、功能开关 |
| `characters/` | `docs/zh/characters/` | 可提交的角色包目录规范 |
| `stages/` | `docs/zh/stages/` | 舞台布局、背景、灯光和 Actor slot 配置 |
| `assets/` | `docs/zh/assets/` | PMX/PMD、VMD、VPD、音频等二进制资源真源 |
| `data/` | `docs/zh/data/` | 会话、Memory、日志、缓存等运行时数据 |
| `scripts/` | `docs/zh/scripts/` | 扫描、迁移、构建、检查脚本 |
| `tests/` | `docs/zh/tests/` | 单元、契约、集成和 E2E 验收 |

跨模块设计放在：

- `docs/zh/architecture/`：总体架构、依赖规则和运行流程；
- `docs/zh/migration/`：旧文件映射、阶段计划、提交拆分和回滚。

## 2. 核心约束

1. 当前 PMX/PMD、VMD/VPD、表情、口型、OBS、资源扫描能力不可回退。
2. 选择 Character 只加载舞台角色并创建/切换 Actor，不启动 Agent。
3. 只有用户真正发送消息时，才创建或恢复 Agent session，并绑定 Actor。
4. Stage 不依赖 LLM；Orchestrator 不直接操作 Three.js。
5. API Key 只由 Server 读取，不进入 Browser、构建产物和 Git。
6. LLM Base URL、模型 ID、API Key、端口、功能开关统一由 Config 管理。
7. PMX/PMD 模型 URL 放在角色配置中，不由 UI 或 Agent 临时硬编码。
8. `dist/` 是构建产物，不是资产真源，默认不提交主分支。
9. V1 不向 Agent 开放 motion/pose/expression 工具；协议先保留扩展能力。

## 3. 推荐阅读顺序

首次迁移：

```text
architecture/README.md
  -> migration/README.md
  -> migration/01-current-to-target-map.md
  -> config/README.md
  -> packages/stage/README.md
  -> packages/characters/README.md
  -> apps/server/README.md
  -> apps/web/README.md
```

开发具体模块时，直接进入与代码路径同名的文档目录。
