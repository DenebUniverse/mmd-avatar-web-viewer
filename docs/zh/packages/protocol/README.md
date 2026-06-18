# packages/protocol

对应目标代码目录：`packages/protocol/`。

Protocol 是 Web、Server、Orchestrator、Stage 和 Voice 之间唯一的跨模块契约。

## 目标结构

```text
packages/protocol/src/
  envelope.ts
  commands/
  events/
  errors.ts
  schemas/
  version.ts
```

## 约束

- 所有消息版本化；
- 所有异步链路有 correlation ID；
- Command 和 Event 分离；
- Payload 经过 schema 校验；
- 不传 Three.js 对象、DOM、Buffer 句柄或 Provider SDK 对象。
