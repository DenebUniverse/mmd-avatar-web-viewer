# UI 与状态设计

## 1. 页面布局

```text
┌──────────────┬─────────────────────┬─────────────────────┐
│ ControlPanel │ StageView           │ ChatPanel           │
│ 可收起       │ PMX Actor(s)        │ Sessions + Messages │
└──────────────┴─────────────────────┴─────────────────────┘
```

右侧参考 Codex/Claude Code VS Code 插件的信息层级，而不是简单聊天气泡：

- Session 列表；
- 当前 Session 状态；
- 用户/助手消息；
- Agent run、工具、错误和停止状态；
- 输入框与发送/停止按钮。

## 2. Store 划分

```text
appStore       public config、feature flags
characterStore characters、selectedCharacterId
stageStore     actor 状态、动作、姿态、错误
sessionStore   session summaries、activeSessionId
messageStore   messages、streaming delta、run status
voiceStore     STT/TTS capability、queue、playback
```

不得建立一个包含所有字段的全局对象。

## 3. 懒绑定 UI 语义

- 切换 Character：只触发 Stage；
- 点击“新会话”：可创建本地 draft，不启动 Agent；
- 打开历史会话：加载消息，不恢复 Agent；
- 点击发送：Server 创建/恢复 Agent 并建立 binding。

## 4. 错误显示

错误需区分：

```text
asset_load_error
stage_runtime_error
network_error
provider_rate_limit
provider_auth_error
agent_process_error
voice_not_supported
```
