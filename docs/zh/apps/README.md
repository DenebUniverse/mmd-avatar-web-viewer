# apps

`apps/` 保存可直接运行和部署的应用入口。

- [`web/`](./web/)：浏览器 UI、Stage 容器、聊天面板和协议客户端；
- [`server/`](./server/)：Config、API、SSE、Session、Orchestrator 接入和安全边界。

应用层可以组合多个 package，但不应复制 package 内部实现。跨应用通信只使用 `packages/protocol` 定义的契约。
