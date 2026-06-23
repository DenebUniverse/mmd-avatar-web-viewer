# Web Protocol Client

## 1. 客户端组成

```text
RestClient
SseClient
StageCommandBus
ProtocolValidator
CorrelationTracker
```

## 2. REST

- Public Config；
- Character 列表与详情；
- Session CRUD；
- 消息发送；
- Run 取消。

消息发送请求必须带前端生成的 `clientMessageId`：

```json
{
  "content": "用户输入",
  "clientMessageId": "client-1760000000000-ab12cd",
  "characterId": "hiying",
  "actorId": "actor_main",
  "permissionMode": "acceptEdits"
}
```

`clientMessageId` 用来把 optimistic user message 和 SSE 返回的正式 user message 对齐。客户端不得用文本内容做关联。

## 3. SSE

客户端维护：

- `lastEventId`；
- `sessionId`；
- sequence；
- reconnect backoff；
- heartbeat timeout；
- run correlation。

重复事件必须可幂等处理。`message.delta` 只追加到对应 `messageId`。

`message.created` 如果携带 `payload.message.clientMessageId`，客户端先查找本地 optimistic message：

```text
找到相同 clientMessageId -> 用服务端 message 替换本地临时 message
找不到                  -> 按 message.id upsert
```

这样即使 HTTP 响应和 SSE 到达顺序不同，也不会重复显示用户消息。

## 4. ChatPanel 发送路由

Composer 发送目标由当前 ChatPanel view 决定：

```text
sessions view:
  视为新任务
  -> POST /api/v1/sessions
  -> POST /api/v1/sessions/<newSessionId>/messages

messages view:
  视为续写当前任务
  -> POST /api/v1/sessions/<activeSessionId>/messages
```

`activeSession` 不能单独决定发送目标。页面初始化只渲染 session 列表，不自动选择最近 session；只要 UI 还在 `sessions` view，发送就必须创建新 session。

## 5. Stage 命令

Web 不直接执行：

```js
mesh.morphTargetInfluences[index] = value
```

而是发送 typed command：

```json
{
  "type": "stage.expression.set",
  "actorId": "actor_main",
  "payload": {"expressionId": "happy", "weight": 0.8}
}
```
