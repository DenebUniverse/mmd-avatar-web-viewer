# Server API 与 SSE

## 1. 基础接口

```text
GET  /health/live
GET  /health/ready
GET  /api/v1/config/public
GET  /api/v1/characters
GET  /api/v1/characters/:id
GET  /api/v1/sessions
POST /api/v1/sessions
GET  /api/v1/sessions/:id/messages
POST /api/v1/sessions/:id/messages
POST /api/v1/runs/:runId/cancel
GET  /api/v1/events?sessionId=...
```

## 2. Character DTO

Browser 得到公开加载信息：

```json
{
  "id": "hiying",
  "name": "绯英",
  "model": {"type": "pmx", "url": "/assets/models/hiying/model.pmx"},
  "defaults": {"motionId": "breath"},
  "voice": {"language": "zh-CN", "rate": 1.0}
}
```

不返回 `Soul.md`、Skills 原文、API Key 或磁盘路径。

## 3. 消息发送

请求：

```json
{
  "content": "你好",
  "clientMessageId": "client-1760000000000-ab12cd",
  "actorId": "actor_main",
  "characterId": "hiying",
  "permissionMode": "acceptEdits"
}
```

返回 `runId` 后由 SSE 接收 delta。

`clientMessageId` 是前端生成的临时消息关联 ID：

- 可选；
- 最大按服务端实现截断到 128 字符；
- 服务端保存正式 user message 时原样写入该字段；
- SSE `message.created` 返回正式 user message 后，前端用它替换 optimistic user message；
- 不作为数据库主键，不参与跨 session 查找。

发送接口只负责把用户消息入库并启动后台 run。它应该尽快返回 `202`：

```json
{
  "runId": "run-id",
  "session": {
    "id": "session-id",
    "messages": [
      {
        "id": "server-message-id",
        "clientMessageId": "client-1760000000000-ab12cd",
        "role": "user",
        "text": "你好",
        "status": "completed"
      }
    ]
  }
}
```

Claude Code 的长时间执行不能阻塞这个 HTTP 请求；后续输出走 SSE。

## 4. Claude Code Session 绑定

Server 使用 AgentStage session id 作为 Claude Code session id：

```text
首次发送:
  claude ... --session-id <agentstageSessionId> <prompt>

续写发送:
  claude ... --resume <adapterSessionId> <prompt>
```

V1 中：

```text
adapterSessionId === agentstageSessionId
```

绑定流程：

```text
POST /api/v1/sessions
  -> 创建 AgentStage session.id

POST /api/v1/sessions/:id/messages
  -> 保存 user message
  -> 确认 claude-code-router 正在运行且 3457 可连接
  -> 启动 Claude Code
  -> 首次 run 使用 --session-id :id
  -> 解析 Claude Code stream-json 顶层 session_id 作为校验信号
  -> 写入本地指定的 session.id 到 session.adapter.adapterSessionId

下一次 POST /api/v1/sessions/:id/messages
  -> 使用 session.adapter.adapterSessionId 执行 --resume
```

Browser 永远不拼 Claude Code 参数，也不读取 `adapterSessionId` 来直接调用 Claude Code。它只通过 `/api/v1/sessions/:id/messages` 和 SSE 与 Server 通信。

Server 在每次 run 前都必须重新确认 CCR live 状态。不能只依赖 Server 启动时的 `ccr activate`，因为 `ccr activate` 只设置环境变量，不代表 `127.0.0.1:3457` 当前仍在监听。

## 5. SSE 事件

```text
session.bound
agent.run.started
agent.status
message.created
message.delta
message.completed
agent.run.completed
agent.run.failed
agent.run.cancelled
voice.enqueue
```

每个事件包含 `eventId`、`sequence`、`timestamp`、`correlationId`。

当前实现的关键事件顺序：

```text
POST /api/v1/sessions/:id/messages
  -> message.created      # user message 已持久化
  -> agent.run.started    # runId 可用于 stop
  -> agent.status          # CCR 检查、Claude Code status、api_retry、等待状态
  -> message.delta        # assistant 增量文本
  -> tool.started/input/finished
  -> message.completed
  -> agent.run.completed | agent.run.failed | agent.run.cancelled
```
