# packages/core

对应目标代码目录：`packages/core/`。

保存稳定领域模型和纯逻辑，不依赖 DOM、Three.js、Express 或 Provider SDK。

## 主要类型

```text
CharacterId
ActorId
SessionId
MessageId
RunId
ProviderId
ActorBinding
SessionStatus
MessageRole
DomainError
Result<T, E>
```

## 目标结构

```text
packages/core/src/
  ids.ts
  actor.ts
  character.ts
  session.ts
  message.ts
  provider.ts
  errors.ts
```
