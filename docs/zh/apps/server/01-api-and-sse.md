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
  "actorId": "actor_main",
  "characterId": "hiying"
}
```

返回 `runId` 后由 SSE 接收 delta。

## 4. SSE 事件

```text
session.bound
agent.run.started
message.created
message.delta
message.completed
agent.run.completed
agent.run.failed
agent.run.cancelled
voice.enqueue
```

每个事件包含 `eventId`、`sequence`、`timestamp`、`correlationId`。
