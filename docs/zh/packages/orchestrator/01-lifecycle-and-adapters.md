# Session、Agent 生命周期与 Adapters

## Adapter 接口

```ts
interface AgentAdapter {
  create(input: CreateAgentInput): Promise<AgentHandle>
  resume(input: ResumeAgentInput): Promise<AgentHandle>
  send(handle: AgentHandle, input: AgentMessageInput): AsyncIterable<AgentEvent>
  cancel(handle: AgentHandle, runId: RunId): Promise<void>
  close(handle: AgentHandle): Promise<void>
}
```

## OpenRouter

配置来自 Server Config：

```yaml
providers:
  openrouter:
    base_url: https://openrouter.ai/api/v1
    api_key: ${secret}
    chat_model: google/gemma-4-26b-a4b-it:free
    fallback_models:
      - openrouter/free
```

免费模型可被限流或下线，因此模型 ID 必须可配置，不能写死在 Web。

## Claude Code

Adapter 保存 provider session ID 或 resume token。工作目录、权限模式和命令只由 Server Config 控制。

## 懒绑定状态机

```text
character selected -> actor ready
new session        -> draft
first send         -> agent create + binding
history opened     -> no resume
next send          -> agent resume/rebuild context
```
