# Architecture

本目录只记录跨模块设计，不承载某个具体模块的实现细节。

## 文档

- [当前实现基线](./01-current-baseline.md)
- [目标架构](./02-target-architecture.md)
- [模块边界与依赖规则](./03-module-boundaries.md)
- [关键运行流程](./04-runtime-flows.md)
- [架构决策记录](./05-decisions.md)

## 总体原则

```text
Browser Stage/UI
      │ HTTP + SSE
      ▼
Agent Server
      │
      ├── OpenRouter
      ├── Claude Code
      └── Future Agent Harness
```

Browser 持有渲染和浏览器语音能力；Server 持有密钥、Session、Agent 生命周期和数据持久化。
