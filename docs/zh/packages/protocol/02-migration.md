# packages/protocol 迁移说明

## 第一阶段

先用 Protocol 包住现有本地 Stage 调用，不要求经过网络：

```text
ControlPanel -> typed command -> StageRuntime
```

## 第二阶段

Server SSE 复用相同 Envelope 基础字段。

## 第三阶段

新增 Agent Tool schema，但保持默认关闭。

## Contract Tests

- 所有 command/event 示例通过 schema；
- 未知字段策略明确；
- 旧 minor version 可被当前 reader 接受；
- sequence 重复和乱序处理有测试；
- error code 不依赖具体 Provider 文案。
