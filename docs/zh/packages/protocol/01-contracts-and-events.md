# Protocol Contracts

## Envelope

```ts
interface Envelope<T> {
  version: '1.0'
  id: string
  timestamp: string
  type: string
  source: 'web' | 'server' | 'orchestrator' | 'stage' | 'voice'
  target: string
  correlationId?: string
  actorId?: string
  sessionId?: string
  sequence?: number
  payload: T
}
```

## V1 Stage Commands

```text
stage.actor.load        { characterId }
stage.actor.unload      {}
stage.motion.play       { motionId, loop? }
stage.pose.apply        { poseId }
stage.expression.set    { expressionId, weight }
stage.lip.set           { value }
stage.camera.reset      {}
```

`stage.actor.load` 传 `characterId`，不是强制传模型 URL。模型 URL 由 Character Registry 解析后提供给 Stage。

## Stage Events

```text
stage.actor.loading
stage.actor.ready
stage.actor.failed
stage.motion.started
stage.motion.completed
stage.pose.applied
stage.error
```

## Agent/SSE Events

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

## Tool 预留

V1 默认不注册 `motion`、`pose`、`expression` 给 Agent。未来开放时，Tool 输出先转换为 Protocol Command，再由 Stage 校验执行。
