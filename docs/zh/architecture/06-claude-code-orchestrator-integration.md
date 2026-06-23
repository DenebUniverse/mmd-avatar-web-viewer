# Claude Code Orchestrator 接入方案

本文说明如何把 `packages/experimental` 中已经验证的 Claude Code Web 逻辑迁入目标框架。

当前实现状态：

- `config/agentstage.default.yaml` 已提供可提交默认配置；
- `config/secrets.local.env` 已提供本机私有 secret 入口，并由 `.gitignore` 保护；
- `apps/server` 已实现本地 REST + SSE server；
- `packages/orchestrator` 已实现 session store、run manager、Claude Code CLI adapter 和 `stream-json` parser；
- `apps/web` 当前 ChatPanel 已接入 `/api/v1` REST + SSE；
- `npm run dev` 会同时启动 `apps/server` 和 `apps/web`。

结论：

```text
apps/web
  -> apps/server
  -> packages/orchestrator
  -> Claude Code CLI
  -> local CCR
  -> LLM Provider API
```

不是：

```text
LLM API -> CCR -> Claude Code session -> orchestrator -> frontend
```

LLM API 是 Claude Code CLI 的下游。Browser 永远不直接接触 CCR、API Key、Claude Code 进程或本地工作目录。

## 1. experimental 当前结构

`packages/experimental` 是一个独立验证包，里面把多个未来模块揉在一起：

| 当前文件 | 当前职责 | 目标位置 |
|---|---|---|
| `src/client/App.tsx` | React Chat UI、session 列表、WebSocket client | 已迁入 `apps/web/src/main.js` 当前 ChatPanel 逻辑；后续再拆组件 |
| `src/client/api.ts` | REST client | 已迁入 `apps/web/src/main.js` 当前 Agent client 逻辑；后续再拆 `apps/web/src/api/*` |
| `src/shared/protocol.ts` | UI/Server 消息类型 | `packages/protocol` |
| `src/server/main.ts` | HTTP、WebSocket、session API、run 管理 | 已拆到 `apps/server/src/main.js` + `packages/orchestrator/index.js` |
| `src/server/session-store.ts` | session 文件持久化 | 已迁入 `packages/orchestrator` 的 `FileSessionStore` |
| `src/server/claude-runner.ts` | spawn `claude`、cancel、收 stdout/stderr | 已迁入 `packages/orchestrator` 的 `ClaudeCodeAdapter` |
| `src/server/claude-stream-parser.ts` | 解析 `stream-json` | 已迁入 `packages/orchestrator` parser |
| `scripts/run-with-ccr.mjs` | `ccr status/start/activate` 和 env 注入 | 已迁入 `apps/server/src/ccr.js` |

迁入时不要直接把 `experimental` 作为生产入口接到 `apps/web`。应把它拆成框架能力。

## 2. Orchestrator 放在哪里

Orchestrator 当前实现为：

```text
packages/orchestrator/
  index.js
```

当前为了保持迁移步幅可控，先集中在一个 ESM 文件中。后续稳定后再拆成：

```text
packages/orchestrator/src/
  agent-adapter.ts
  run-manager.ts
  session-service.ts
  stores/file-session-store.ts
  adapters/claude-code/claude-code-adapter.ts
  adapters/claude-code/claude-stream-parser.ts
```

`packages/orchestrator` 只提供可复用业务能力，不直接监听端口。它负责：

- Session 生命周期；
- AgentAdapter 抽象；
- Claude Code CLI 适配器；
- run 并发控制和取消；
- Claude Code `stream-json` 到统一 `AgentEvent` 的转换；
- session message 和 tool trace 的持久化；
- permission mode、workspace、max turns 等运行参数校验。

`packages/orchestrator` 不应该负责：

- Express/Fastify 路由；
- Vite dev server；
- DOM、Three.js、Stage 控制；
- Browser 状态管理；
- 直接读取前端 URL 参数；
- 把 API Key 暴露给前端。

HTTP、SSE、安全 header、CORS/Origin、静态资源托管放在 `apps/server`。

## 3. apps/server 的职责

当前新增：

```text
apps/server/
  src/
    main.js
    config.js
    ccr.js
```

`apps/server` 负责把 orchestrator 暴露成本地 API。当前已实现：

```text
GET  /api/v1/config/public
GET  /api/v1/health
GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:id
GET  /api/v1/sessions/:id/messages
POST /api/v1/sessions/:id/messages
PATCH /api/v1/sessions/:id
DELETE /api/v1/sessions/:id
POST /api/v1/runs/:runId/cancel
GET  /api/v1/events?sessionId=...
```

开发期建议仍保留 loopback 限制：

```text
127.0.0.1
localhost
::1
```

Browser 可以知道：

- public config；
- workspace 显示名；
- character public DTO；
- session summary；
- message；
- run status；
- tool trace。

Browser 不能知道：

- OpenRouter key；
- CCR auth token；
- `ANTHROPIC_AUTH_TOKEN`；
- 真实磁盘绝对路径，除非作为只读展示字段且来自 server；
- 任意可由用户输入覆盖的 workspace。

## 4. 和本地 CCR 的交互方式

CCR 不应该被前端直接调用。目标框架沿用 experimental 的机制：

```text
server bootstrap
  -> ccr status
  -> ccr start, if needed
  -> ccr activate
  -> parse allowlisted env
  -> instantiate Orchestrator
  -> prepareClaudeConfigDir() 写隔离 settings.json（含强制 env）
  -> ClaudeCodeAdapter spawn claude with CLAUDE_CONFIG_DIR + env
```

`ccr activate` 输出中只允许导入白名单：

```text
ANTHROPIC_BASE_URL
ANTHROPIC_AUTH_TOKEN
NO_PROXY
no_proxy
DISABLE_TELEMETRY
DISABLE_COST_WARNINGS
API_TIMEOUT_MS
```

之后每次 run：

```text
ClaudeCodeAdapter
  -> spawn claude（CLAUDE_CONFIG_DIR 指向本项目隔离目录）
  -> claude 读隔离 settings.json 的 env（ANTHROPIC_BASE_URL=127.0.0.1:3457 ...）
  -> claude calls local CCR
  -> CCR routes to OpenRouter or configured provider
```

因此 orchestrator 不需要手写 `fetch(http://127.0.0.1:3457/...)`。它只要确保 Claude Code 子进程用正确的配置目录和环境变量。

### 4.1 配置隔离 + 强制 OpenRouter（已实现，2026-06）

> 背景：实测发现「只靠 `ccr activate` 覆盖进程环境变量、让 claude 继承」在 `start.sh` 下不可靠，claude 会改走机器全局 `~/.claude/settings.json` 里写死的 `ANTHROPIC_BASE_URL`（如 `https://api-gateway.glm.ai`），CCR 收不到任何请求。

实测结论（claude v2.1.179）：

1. **CCR allowlist 不清模型/key**。`ccr activate` 只注入 `ANTHROPIC_BASE_URL`/`AUTH_TOKEN`，不清除本机残留的 `ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`、`ANTHROPIC_DEFAULT_*_MODEL`，这些会跟着泄漏到请求。
2. **真凶是 `~/.claude/settings.json` 的 `env` 块**。claude CLI 读 settings.json 的 `env` 会覆盖继承来的进程环境变量，因此即便 server 进程里 base_url 已是 CCR，claude 仍可能落到 glm。
3. **隔离 `settings.json` 的 `env` 块优先级最高**。把强制 env 钉进 `CLAUDE_CONFIG_DIR/settings.json` 的 `env` 块后，即使进程环境是 glm，claude 也稳定走 CCR（CCR 日志确认 `POST /v1/messages`，并按 Router 重映射为 `openrouter, google/gemma-4-31b-it:free`）。

实现要点：

- **真理源在 `config/`**：`config/agentstage.default.yaml` 的 `claude_code` 新增 `config_dir`、`debug`、`env`：

  ```yaml
  claude_code:
    config_dir: ./.agentstage/claude-config   # 与 ~/.claude 隔离（settings/session/history/日志都在此）
    debug: false                              # 开启则写 <config_dir>/logs/claude-debug.log
    env:                                      # 写入隔离 settings.json 的 env 块（优先级高于进程环境变量）
      ANTHROPIC_BASE_URL: "http://127.0.0.1:3457"
      ANTHROPIC_AUTH_TOKEN: "claude-code-router-local"
      ANTHROPIC_API_KEY: ""                   # 空串清掉本机残留 key
      ANTHROPIC_MODEL: ""
      ANTHROPIC_DEFAULT_OPUS_MODEL: ""
      ANTHROPIC_DEFAULT_SONNET_MODEL: ""
      ANTHROPIC_DEFAULT_HAIKU_MODEL: ""
  ```

- `apps/server/src/config.js` 解析出 `claudeConfigDir` / `claudeDebug` / `claudeEnv`，经 `apps/server/src/main.js` 透传给 orchestrator。
- `packages/orchestrator/index.js`：
  - `init()` → `prepareClaudeConfigDir()`：建目录、（debug 时建 `logs/`）、把 `claudeEnv` 写入隔离 `settings.json` 的 `env` 块（每次启动覆盖，确保以 `config/` 为准）；空串值用于清除残留变量。
  - `send()` spawn 时注入 `CLAUDE_CONFIG_DIR` + `claudeEnv`（settings.json 为主力，进程 env 作冗余兜底）。
  - debug 时 `buildClaudeArgs` 追加 `--debug-file <config_dir>/logs/claude-debug.log`。
- `.gitignore` 忽略 `.agentstage/`。

效果：本项目 Claude Code 的 settings/session/日志与机器其他项目隔离，且**强制走本地 CCR → OpenRouter，不被全局 `~/.claude` 或 shell 的 `ANTHROPIC_*` 覆盖**。

> 已知外部因素：OpenRouter 免费模型 `google/gemma-4-31b-it:free` 可能被上游 429 限流。路由本身正确，可在 `~/.claude-code-router/config.json` 配自有 OpenRouter key 或更换模型。

当前默认配置位于 `config/agentstage.default.yaml`：

```yaml
agent:
  default_adapter: claude_code
  workspace: /absolute/path/to/repo
  permission_mode: acceptEdits
  max_turns: 30

claude_code:
  command: claude
  output_format: stream-json
  include_partial_messages: true
  config_dir: ./.agentstage/claude-config
  debug: false
  env:
    ANTHROPIC_BASE_URL: "http://127.0.0.1:3457"
    ANTHROPIC_AUTH_TOKEN: "claude-code-router-local"
    # ANTHROPIC_API_KEY / ANTHROPIC_MODEL / ANTHROPIC_DEFAULT_*_MODEL 置空以清除残留

ccr:
  enabled: true
  autostart: true
  required: false
```

`required: false` 表示如果用户希望用 Claude Code 自己的登录态直连，也可以不要求 CCR env 存在。若要「CCR 不在就直接报错、绝不回退」，把 `ccr.required` 设为 `true`。

本机私有 secret 位于 `config/secrets.local.env`，该文件禁止提交真实内容。`apps/server/src/config.js` 会在启动时加载它，且不会覆盖已经存在的 shell 环境变量。

## 5. AgentAdapter 设计

`packages/orchestrator` 以 Adapter 思路屏蔽 Claude Code 和未来 provider 差异。当前 `ClaudeCodeAdapter` 已落地，后续可把接口显式拆出：

```ts
interface AgentAdapter {
  create(input: CreateAgentInput): Promise<AgentHandle>
  resume(input: ResumeAgentInput): Promise<AgentHandle>
  send(handle: AgentHandle, input: AgentMessageInput): AsyncIterable<AgentEvent>
  cancel(handle: AgentHandle, runId: string): Promise<void>
  close(handle: AgentHandle): Promise<void>
}
```

Claude Code Adapter 的核心实现来自 experimental：

```text
create/resume
  -> 生成或复用 sessionId

send
  -> build args
  -> spawn claude
  -> readline stdout
  -> parse stream-json line
  -> yield AgentEvent

cancel
  -> AbortController
  -> SIGTERM
  -> timeout 后 SIGKILL
```

Claude Code 参数映射：

```text
first send:
claude -p --output-format stream-json --verbose --include-partial-messages \
  --permission-mode <mode> --session-id <sessionId> <prompt>

next send:
claude -p --output-format stream-json --verbose --include-partial-messages \
  --permission-mode <mode> --resume <sessionId> <prompt>
```

这里的 `sessionId` 使用 AgentStage session UUID。Claude Code 支持 `--session-id <uuid>`，因此首次发送由 AgentStage 指定 Claude Code transcript id。Orchestrator 同时从 `stream-json` 顶层 `session_id` 解析 Claude Code 实际返回值，但该返回值只用于校验和诊断，不覆盖本地指定的 `adapter.adapterSessionId`。

正常情况下：

```text
adapter.adapterSessionId === session.id
```

如果 Claude Code 返回的 `session_id` 与 AgentStage 传入的 `session.id` 不一致，Orchestrator 不应切换到返回值，而应保留本地指定的 `session.id` 作为 `adapterSessionId`，并通过状态事件暴露 mismatch。V1 的目标是保证 Web session、Server session 和 Claude Code transcript 使用同一个 UUID。

后续同一 AgentStage session 继续发送时，使用：

```text
claude --resume <adapter.adapterSessionId>
```

如果历史数据没有 `adapterSessionId`，Server 可以回退使用 AgentStage `session.id`，因为 V1 明确要求两者一致。

## 6. Session 和 Run 边界

需要区分三层 ID：

| ID | 所属层 | 用途 |
|---|---|---|
| `sessionId` | AgentStage | UI 会话、消息持久化、ActorBinding |
| `runId` | AgentStage | 单次发送的运行、取消、SSE correlation |
| `adapterSessionId` | Claude Code CLI | 由 AgentStage 指定的 transcript id；Claude Code 可能回传 `session_id`，但 V1 不用返回值覆盖本地绑定 |

Session Store 保存映射：

```json
{
  "sessionId": "agentstage-session",
  "adapter": "claude_code",
  "adapterSessionId": "agentstage-session",
  "claudeStarted": true
}
```

首次 run 完成前，`adapterSessionId` 可以为空；发送 Claude Code 时仍使用 AgentStage `session.id` 作为 `--session-id`。首次 run 成功启动后，持久化的 `adapterSessionId` 必须是本地指定的 AgentStage `session.id`。如果 Claude Code 输出的 `session_id` 不一致，只记录 mismatch 状态事件，不能改写绑定。后续续写优先用 `adapterSessionId` 执行 `--resume`；缺失时回退到 AgentStage `session.id`。

RunManager 负责：

- 同一 session 同时只允许一个 active run；
- 保存 `runId -> AbortController/process`；
- cancel 时中断子进程；
- run 完成后清理 active map；
- 把失败、停止、完成统一成协议事件。

SessionService 负责：

- 创建 session；
- 追加 user message；
- 追加 assistant message；
- 保存 tool calls；
- 更新 title；
- 保存 permission mode；
- 保存 actor/character binding。

## 7. Protocol 和 SSE 事件

`packages/protocol` 应承接 experimental 的 shared protocol，但改成框架通用事件。

推荐事件：

```text
session.created
session.updated
session.bound
agent.run.started
message.created
message.delta
message.replace
tool.started
tool.input.delta
tool.finished
agent.status
agent.run.completed
agent.run.failed
agent.run.cancelled
voice.enqueue
```

SSE payload 使用统一 envelope：

```json
{
  "version": "1.0",
  "id": "event-id",
  "timestamp": "2026-06-18T00:00:00.000Z",
  "type": "message.delta",
  "source": "orchestrator",
  "target": "web",
  "sessionId": "session-id",
  "runId": "run-id",
  "sequence": 12,
  "payload": {
    "messageId": "assistant-message-id",
    "text": "增量文本"
  }
}
```

experimental 使用 WebSocket 是可行验证；目标框架文档已约定 V1 使用 REST + SSE，因此迁移时建议：

```text
POST /api/v1/sessions/:id/messages -> 返回 runId
GET  /api/v1/events?sessionId=<id> -> 接收 delta/tool/status/completed
POST /api/v1/runs/:runId/cancel -> 停止
```

这样前端不会持有长连接发送命令，命令走 REST，流式输出走 SSE。

## 8. 接入当前前端

当前 `apps/web` 仍是 Stage 单体，`ChatPanel` 已接入本地 `/api/v1`。后续拆分顺序应该是：

### 8.1 Web Agent Client

当前先实现于 `apps/web/src/main.js` 中：

```text
AGENT_API_PREFIX = /api/v1
agentRequest()
initAgentChat()
refreshAgentSessions()
createAgentSession()
selectAgentSession()
connectAgentEvents()
sendAgentPrompt()
cancelAgentRun()
```

后续组件化时再拆为：

```text
apps/web/src/api/agent-client.js
apps/web/src/stores/session-store.js
apps/web/src/components/chat-panel/*
```

ChatPanel 只调用 client/store，不直接拼 Claude Code 参数。

### 8.2 ChatPanel 输入能力

当前行为：

```text
打开页面
  -> GET /api/v1/config/public
  -> GET /api/v1/health
  -> GET /api/v1/sessions
  -> 渲染任务列表
  -> 不自动选择最近 session
  -> 不自动连接旧 session 的 SSE

用户在 sessions view 发送消息
  -> 立即切换 messages view
  -> optimistic append user message 和 streaming assistant
  -> POST /api/v1/sessions 创建新 session
  -> GET /api/v1/events?sessionId=<newSessionId>
  -> POST /api/v1/sessions/<newSessionId>/messages
  -> 保存 runId
  -> SSE 更新 assistant streaming message

用户在 messages view 发送消息
  -> 使用当前 activeSession
  -> optimistic append user message 和 streaming assistant
  -> POST /api/v1/sessions/:id/messages
  -> 保存 runId
  -> agent.status 显示 CCR 检查、Claude Code 状态、api_retry 和已等待时长
  -> SSE 更新 assistant streaming message
```

关键约束：

- `sessions` view 的 Composer 表示“开始新任务”；
- `messages` view 的 Composer 表示“续写当前任务”；
- 不能在初始化阶段自动选择最近 session；
- 不能只因为内存中存在 `activeSession` 就把列表页输入发到旧 session；
- optimistic user message 必须带 `clientMessageId`；
- 服务端正式 user message 也必须回传同一个 `clientMessageId`；
- 前端用 `clientMessageId` 替换本地临时消息，不能用文本内容匹配。
- Orchestrator 每次 run 前必须确认 CCR 当前可用，不能只依赖启动时 `ccr activate`；
- ChatPanel 必须显示等待时长和 retry/status 信息，不能只在最终失败时显示错误。

### 8.3 保持 Stage 和 Agent 解耦

第一版不要让 Claude Code 直接控制动作、表情、镜头。Agent 完成文本后只触发：

```text
message.completed
  -> voice.enqueue
  -> packages/voice browser TTS
  -> LipSync signal
  -> packages/stage lip.set
```

未来如果开放 motion/pose/expression tool，路径应是：

```text
Claude tool output
  -> Orchestrator validates tool result
  -> protocol command
  -> Web Stage command handler
  -> Stage runtime
```

不要让 agent 输出直接调用 Stage 内部函数。

## 9. 迁移步骤

### Phase 1: 后端骨架

状态：已完成。

验收：

```text
curl http://127.0.0.1:<server-port>/api/v1/health
```

返回 Claude Code 可用状态和 CCR 是否激活。

### Phase 2: REST + SSE

状态：已完成基础链路。

验收：

```text
send prompt
  -> session file 有 user/assistant
  -> SSE 有 message.delta
  -> tool call 可显示 tool.started/tool.finished
```

### Phase 3: 前端 ChatPanel 接入

状态：已完成基础链路。

已实现：

- Agent client；
- 真实 session list；
- Composer 解除 disabled；
- streaming assistant；
- tool trace 展示；
- stop button 调 cancel；
- status 显示 Claude/CCR 可用状态。

验收：

```text
浏览器发送消息
  -> 右侧实时出现 Claude Code 输出
  -> tool trace 可见
  -> 停止按钮能中断 run
  -> 刷新页面后历史消息仍在
```

### Phase 4: Voice 和 Stage 联动

- message completed 后触发 `voice.enqueue`；
- 浏览器 TTS 播放；
- TTS 音量或播放状态驱动 LipSync；
- 不开放 Agent 直接操作 Stage。

状态：待实现。Orchestrator 已发出 `voice.enqueue` 事件，前端尚未消费该事件。

## 12. 验证状态

当前已通过：

```text
npm run check
```

覆盖：

- assets registry；
- web migration structure；
- JS syntax；
- frontend smoke；
- production build。

本地 API smoke 已验证：

```text
GET  http://127.0.0.1:4310/api/v1/health
POST http://127.0.0.1:4310/api/v1/sessions
GET  http://127.0.0.1:4310/api/v1/sessions
```

当前机器验证结果：

```text
Claude Code: 2.1.179
CCR detected: true
CCR activated: true
End-to-end prompt: completed, text "OK"
```

### 配置隔离 + 强制 OpenRouter 验证（2026-06）

端到端实测（带「脏」glm 进程环境变量，验证隔离 settings.json 仍强制走 CCR）：

```text
- spawn claude，进程 env: ANTHROPIC_BASE_URL=https://api-gateway.glm.ai (+glm key/model)
- CLAUDE_CONFIG_DIR 指向隔离目录，settings.json env 钉死 CCR
- 结果: CCR 日志新增 POST /v1/messages（计数 3 → 4）
- CCR Router: 重映射为 openrouter, google/gemma-4-31b-it:free
- 对照组: BASE_URL=glm 且无隔离 env 时，CCR 零请求（claude 直连 glm）
```

结论：claude 已稳定走本地 CCR → OpenRouter，不再被 `~/.claude` 或 shell 的 `ANTHROPIC_*` 覆盖。`npm run check`（JS 语法 / web migration / frontend smoke）通过。

## 10. 必须保留的安全边界

- Server 默认只监听 loopback；
- Browser 不能传任意 workspace；
- `CLAUDE_WEB_WORKSPACE` 等价能力只能来自 server config；
- Browser 不能传任意 CLI command；
- `bypassPermissions` 默认不开放；
- prompt 需要最大长度限制；
- 同一 session 同时只能一个 run；
- session delete 前必须没有 active run；
- CCR/OpenRouter key 不写入前端、不进入 public config；
- `scripts/diagnostics` 中的真实 key 应迁出到环境变量并轮换。

## 11. 最终目标拓扑

```text
Browser apps/web
  ChatPanel
  SessionStore
  AgentClient
  StageView
        │
        │ REST commands + SSE events
        ▼
apps/server
  HTTP routes
  SSE hub
  Config loader
  Origin/security guard
        │
        ▼
packages/orchestrator
  SessionService
  RunManager
  AgentAdapter
  ClaudeCodeAdapter
        │
        │ spawn claude
        ▼
Claude Code CLI
        │
        │ ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN
        ▼
local CCR
        │
        ▼
OpenRouter / LLM Provider
```

这个拆法能复用 experimental 已验证的关键能力，同时符合目标框架中 `apps/web`、`apps/server`、`packages/orchestrator`、`packages/protocol` 的边界。
