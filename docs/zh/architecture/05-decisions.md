# 架构决策记录

## ADR-001：Stage 运行在 Browser

原因：Three.js、Canvas、Web Audio 与 PMX 渲染天然属于 Browser。Server 只产生数据和事件。

## ADR-002：REST + SSE 作为 V1 通信方式

用户操作使用 REST；Agent 流式输出使用 SSE。只有出现双向高频实时控制需求时再引入 WebSocket。

## ADR-003：Actor 与 Agent 懒绑定

角色选择频繁，但 Agent 启动可能昂贵或产生副作用，因此只在发送消息时绑定。

## ADR-004：配置分公开与私密

默认配置可提交，local 配置禁止提交；Server 只向 Browser 下发白名单 DTO。

## ADR-005：资产单一真源

`assets/` 是二进制资源真源。Character Package 保存引用，不复制 PMX/VMD。`dist/` 仅发布期生成。

## ADR-006：V1 不开放舞台 Agent Tools

先稳定聊天、Session、TTS 和协议链路。motion/pose/expression Tool 在协议中预留，但默认不注册给 Agent。
