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

Adapter 保存 Claude Code transcript id，字段名为 `adapterSessionId`。V1 中该值由 AgentStage 指定，等于 AgentStage `session.id`。工作目录、权限模式和命令只由 Server Config 控制。

首次发送：

```text
claude -p --output-format stream-json --verbose --include-partial-messages \
  --permission-mode <mode> --session-id <sessionId> <prompt>
```

首次发送用 AgentStage `session.id` 指定 Claude Code session。Claude Code 会在 `stream-json` 输出中返回顶层 `session_id`；正常情况下它应与传入的 `session.id` 一致。Orchestrator 解析后写入：

```json
{
  "adapter": {
    "name": "claude_code",
    "adapterSessionId": "agentstage-session-id",
    "claudeStarted": true
  }
}
```

如果 Claude Code 返回的 `session_id` 与传入的 `session.id` 不一致，Orchestrator 不覆盖本地绑定，仍然保留 AgentStage 指定的 UUID，并通过 `agent.status` 报告 mismatch。这样可以避免续写时漂移到另一个 transcript。

后续发送：

```text
claude -p --output-format stream-json --verbose --include-partial-messages \
  --permission-mode <mode> --resume <adapterSessionId> <prompt>
```

如果历史 session 缺少 `adapterSessionId`，可以回退使用 AgentStage `session.id`，因为 V1 的绑定策略就是两者一致。AgentStage session 仍负责 UI、消息持久化和 ActorBinding；Claude Code transcript 通过同一个 UUID resume。

## 懒绑定状态机

```text
character selected -> actor ready
new session        -> draft
first send         -> agent create + binding
history opened     -> no resume
next send          -> claude --resume adapterSessionId
```
