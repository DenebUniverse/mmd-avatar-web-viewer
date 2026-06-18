# ChatPanel UI 结构

本轮 ChatPanel 只实现 UI 结构和禁用态，不实现真正聊天能力。

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

当前按钮只作为 UI 占位：

- refresh disabled；
- settings disabled；
- new session disabled；
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

点击静态 session 只切换到 messages view，不创建真实 session，不发请求。

### 3.2 Messages View

进入 session 后展示消息列表：

```text
用户消息气泡
时间/复制等元信息占位
运行状态占位
助手消息内容占位
```

当前消息内容是静态占位，用于验证布局和滚动，不接 Agent。

## 4. Composer

底部输入区参考 Codex VS Code 插件：

```text
┌──────────────────────────────┐
│ 随心输入                     │
│ +   完全访问⌄      5.5⌄   ↑  │
└──────────────────────────────┘
```

当前全部禁用：

- input disabled；
- attach disabled；
- mode disabled；
- send disabled；
- stop hidden/disabled。

## 5. 禁止行为

本轮 ChatPanel 不允许：

- 发送网络请求；
- 创建 session；
- 持久化消息；
- 连接 OpenRouter；
- 连接 Claude Code；
- 连接 Server SSE；
- 触发 Stage command；
- 触发 TTS。

## 6. 验收

- 右侧面板可以收回和展开；
- 初始显示 session 列表；
- 点击静态 session 后显示 messages 列表；
- messages view 可以返回 session 列表；
- 输入区和按钮均 disabled；
- Network 中没有 chat/session/provider 请求；
- ChatPanel 收回和展开后 `StageView` 尺寸正常。
