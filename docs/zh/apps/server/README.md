# apps/server

对应目标代码目录：`apps/server/`。

## 职责

- 读取和校验 Config；
- 提供 Public Config；
- Character/Asset API；
- Session/Message API；
- SSE 事件流；
- 调用 Orchestrator；
- 数据持久化；
- API Key、安全、限流、取消；
- 可选托管 Web dist 与 `/assets/*`。

## 目标子目录

```text
apps/server/src/
  config/
  routes/
  sse/
  services/
  storage/
  middleware/
  bootstrap/
```

Server 是浏览器与本地/远程 Agent Provider 之间的唯一安全边界。
