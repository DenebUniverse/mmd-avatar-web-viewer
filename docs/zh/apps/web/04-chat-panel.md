# ChatPanel UI 与 Agent 接入

当前 ChatPanel 已从静态禁用态接入本地 `apps/server`。

## 1. 布局

ChatPanel 位于右侧，和左侧 `ControlPanel` 一样可以收回和展开。

```text
┌──────────────────────────────┐
│ Toolbar                      │
├──────────────────────────────┤
│ Content                      │
│ - sessions view              │
│ - messages view              │
├──────────────────────────────┤
│ Composer                     │
└──────────────────────────────┘
```

折叠状态：

- body 增加 `chat-collapsed`；
- 右侧 grid 宽度变为 `0`；
- 显示 `openChatPanelBtn`；
- 展开后重新触发 Stage resize。

## 2. Toolbar

Session 列表态：

```text
任务                         ↻  ⚙  ✎
```

Messages 详情态：

```text
‹  当前 session 标题          ...  ↻  ⚙  ✎
```

当前按钮状态：

- refresh 调用 `GET /api/v1/sessions`；
- settings disabled；
- new session 调用 `POST /api/v1/sessions`；
- more disabled。

## 3. Content

### 3.1 Sessions View

初始状态展示 session 列表：

```text
任务
我按照 plan.md 在 docs/zh/ 下详细写了一下...     2 小时
codex 的 chrome 插件 能看到浏览器内的网页吗...  2 周
Compare simple-evals search results              3 个月
查看全部（50 个）
```

session 列表来自：

```text
GET /api/v1/sessions
```

点击 session 后：

```text
GET /api/v1/sessions/:id
GET /api/v1/events?sessionId=:id
```

注意：进入页面后只渲染 session 列表，不自动选择最近 session，不自动连接旧 session 的 SSE。只有用户点击某个 session 后，才进入 `messages` view 并绑定 `activeSession`。

### 3.2 Messages View

进入 session 后展示消息列表：

```text
用户消息气泡
时间/复制等元信息占位
运行状态占位
助手消息内容占位
```

消息来自 session store。运行中消息通过 SSE 增量更新，tool call 会显示为折叠前的工具卡片结构。

## 4. Composer

底部输入区参考 Codex VS Code 插件：

```text
┌──────────────────────────────┐
│ 随心输入                     │
│ +   完全访问⌄      5.5⌄   ↑  │
└──────────────────────────────┘
```

当前可用：

- input 可输入；
- attach disabled；
- mode 显示当前权限模式；
- send 在 `sessions` view 创建新 session 后发送；
- send 在 `messages` view 续写当前 session；
- stop 调用 `POST /api/v1/runs/:runId/cancel`。

## 5. 发送语义

ChatPanel 的发送语义由当前 UI view 决定，而不是只由 `activeSession` 决定。

### 5.1 从 Sessions View 发送

用户在任务列表页底部直接输入并发送：

```text
chatPanel[data-view="sessions"]
  -> 立即切换到 messages view
  -> 清空当前 messages 视图状态
  -> optimistic append 本地 user message
  -> optimistic append streaming assistant 占位
  -> POST /api/v1/sessions 创建新会话
  -> GET /api/v1/events?sessionId=<newSessionId>
  -> POST /api/v1/sessions/<newSessionId>/messages
```

这个路径永远创建新会话，即使内存里已有 `activeSession`。原因是任务列表页的 Composer 表示“开始一个新任务”，不是“继续列表中高亮、曾经点击过或缓存的任务”。

### 5.2 从 Messages View 发送

用户已经进入某个 session 的消息页后继续输入并发送：

```text
chatPanel[data-view="messages"]
  -> 保持当前 activeSession
  -> optimistic append 本地 user message
  -> optimistic append streaming assistant 占位
  -> POST /api/v1/sessions/<activeSessionId>/messages
```

这个路径续写当前会话，不创建新 session。

### 5.3 临时消息与正式消息

前端点击发送后必须立即渲染本地消息，不能等待 API 返回。为了避免 SSE 返回正式 user message 后重复显示，前端会生成：

```text
clientMessageId = client-...
```

并同时放入：

- 本地 optimistic user message；
- `POST /api/v1/sessions/:id/messages` 请求体。

后端保存正式 user message 时原样带回 `clientMessageId`。前端收到 `message.created` 后用 `clientMessageId` 替换本地临时消息，不用消息文本做匹配。

`clientMessageId` 只用于前端本地消息和后端正式消息的关联，不作为服务端主键；服务端正式消息仍使用自己的 `id`。

## 6. 状态机

核心状态：

```text
chatState.activeSession       # 当前 messages view 绑定的 session
chatState.messages            # 当前 messages view 渲染的消息
chatState.running             # 当前 ChatPanel 是否处于等待/运行态
chatState.runId               # stop 使用的 run id
chatState.streamingMessage    # assistant 增量输出占位
chatState.pendingUserMessageId # 本地 optimistic user message id
chatPanel.dataset.view        # sessions | messages
```

发送前置条件：

```text
online = true
running = false
input.trim() 非空
```

发送后的 UI 要求：

- 立即进入 `messages` view；
- 立即显示用户消息；
- 立即显示 assistant streaming 占位；
- 发送按钮隐藏，Stop 按钮显示；
- 状态区持续显示 Claude Code 当前状态、重试次数和已等待时长；
- 不因为 `/messages` API 未返回而停留在任务列表页。

运行状态显示格式：

```text
Claude Code 正在工作 · 已等待 12s
Claude Code: api_retry (...) · 重试 1 次 · 已等待 48s
检查 Claude Code Router · 已等待 1s
```

`agent.status` 事件可以携带：

```json
{
  "message": "API retry ...",
  "phase": "api_retry",
  "retryCount": 1
}
```

前端必须用这些字段更新 ChatPanel 状态区，不能只在最终失败时显示错误。

## 7. 禁止行为

ChatPanel 不允许：

- 直接连接 OpenRouter；
- 直接连接 Claude Code；
- 直接读取 API Key；
- 直接选择任意 workspace；
- 触发 Stage command。

> 语音输出例外：自 [05-voice-chat.md](./05-voice-chat.md) 起，当 ControlPanel 的语音下拉选为「机器」时，助手一轮 run 完成后由前端触发浏览器 TTS 朗读。ChatPanel 仍不直接选择音色、不直接连接任何 provider；是否朗读由 ControlPanel 的语音模式决定。

## 8. 验收

- 右侧面板可以收回和展开；
- 初始显示 session 列表；
- 点击 session 后显示 messages 列表；
- messages view 可以返回 session 列表；
- 输入区可用；
- sessions view 直接发送会创建新 session；
- messages view 发送会续写当前 session；
- 发送后不等待 API 返回，立即显示 messages view 和本地 user message；
- `message.created` 通过 `clientMessageId` 替换本地临时 user message，不重复显示；
- Network 中只有 `/api/v1/*` 请求，不出现 provider key；
- ChatPanel 收回和展开后 `StageView` 尺寸正常。
