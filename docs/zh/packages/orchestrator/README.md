# packages/orchestrator

对应目标代码目录：`packages/orchestrator/`。

## 职责

- Session 与 Actor binding；
- 首次消息延迟启动 Agent；
- Provider/Agent Adapter 选择；
- 组装 Character 上下文和聊天历史；
- 流式回复、重试、fallback、取消；
- Provider 错误标准化；
- Tool call 标准化和协议事件输出。

## 不负责

- Three.js；
- DOM；
- 直接写 PMX morph；
- 暴露 API Key 给 Browser。
