# 模块边界与依赖规则

## 1. 允许依赖方向

```text
apps/web --------> packages/core
    |             packages/stage
    |             packages/protocol
    └------------ packages/voice

apps/server -----> packages/core
    |             packages/characters
    |             packages/orchestrator
    └------------ packages/protocol

packages/orchestrator -> core + protocol + characters
packages/stage        -> core + protocol
packages/voice        -> core
packages/characters   -> core
packages/protocol     -> core 或独立 schema primitives
```

## 2. 禁止依赖

- `packages/stage` 禁止依赖 OpenRouter、Claude Code、Express 或 Session Store；
- `packages/orchestrator` 禁止依赖 Three.js、DOM 和 PMX mesh；
- `packages/core` 禁止依赖具体框架；
- `apps/web` 禁止读取 API Key、磁盘数据目录或启动本地进程；
- `packages/characters` 禁止直接启动 Agent；
- `packages/voice` 禁止知道 Character Soul 和聊天历史。

## 3. 跨模块通信

同一 Browser 进程内也通过 typed interface/Protocol event 调用，不允许组件直接修改 Stage 内部变量。

```text
UI action
  -> Web Store/Controller
  -> Protocol Command
  -> Stage Command Handler
  -> Stage Event
  -> Web Store update
```

Server 与 Browser 使用 REST + SSE。V1 不急于引入 WebSocket。
