# data

对应目标代码目录：`data/`。

运行时数据，不属于 Character Package，默认不提交 Git。

```text
data/
  sessions/
    <session-id>/metadata.json
    <session-id>/messages.jsonl
    <session-id>/runs.jsonl
  memory/
  logs/
  cache/
```

## Session

保存 Character ID、Provider、模型、provider session ID、状态和时间戳。

## Messages

JSONL 追加写，字段至少包含：message ID、role、content、createdAt、runId。

## Memory

长期 Memory 与角色默认 initial memory 分离。运行时更新只写 `data/memory`。

## 安全

日志和元数据不得保存 API Key。Claude Code 工作区路径等敏感本机信息应最小化记录。
