# 关键运行流程

## 1. 应用启动

```text
Web 启动
  -> GET /api/v1/config/public
  -> GET /api/v1/characters
  -> 创建 StageRuntime
  -> 选择默认 Character
  -> actor.load(characterId)
  -> Stage 通过 Character public DTO 获得模型 URL
```

API Key、Soul、Storage 路径不进入 Browser。

## 2. 选择角色

```text
用户选择 Character
  -> Web 更新 selectedCharacterId
  -> 创建或复用 Actor
  -> stage.actor.load { actorId, characterId }
  -> Stage 加载模型和默认动作
```

此时不创建 Session，不启动 OpenRouter/Claude Code。

## 3. 第一次发送消息

```text
用户发送消息
  -> Web 确保有 draft session metadata
  -> POST /sessions/:id/messages
  -> Orchestrator 读取 Character Soul/Skills
  -> 创建 Agent session
  -> 保存 ActorBinding
  -> 流式 assistant delta 经 SSE 返回
  -> 完成后进入 TTS Queue
```

## 4. 打开历史会话

打开历史消息只读取存储，不自动恢复 Agent。继续发送消息时才调用 Adapter 的 `resume()` 或重建上下文。

## 5. Voice

```text
SpeechRecognition -> user text -> message send
assistant text -> SpeechSynthesis -> playback state/level
playback signal -> Stage LipSyncController -> mouth morph
```

## 6. 取消

```text
用户点击停止
  -> POST /runs/:runId/cancel
  -> Orchestrator AbortController/process interrupt
  -> SSE agent.run.cancelled
  -> TTS queue 清空或按策略保留已开始片段
```
