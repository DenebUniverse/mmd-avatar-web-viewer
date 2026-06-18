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

## 3. SSE

客户端维护：

- `lastEventId`；
- `sessionId`；
- sequence；
- reconnect backoff；
- heartbeat timeout；
- run correlation。

重复事件必须可幂等处理。`message.delta` 只追加到对应 `messageId`。

## 4. Stage 命令

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
