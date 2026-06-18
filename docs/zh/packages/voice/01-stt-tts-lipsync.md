# STT、TTS 与 Lip Sync

## Browser STT

启动必须来自用户手势。能力检测：

```ts
window.SpeechRecognition || window.webkitSpeechRecognition
```

不支持时降级为文本输入，不让 Chat 整体失效。

## Browser TTS

```ts
speechSynthesis.speak(new SpeechSynthesisUtterance(text))
```

Voice 名称、语言、rate、pitch、volume 来自公开 Config 和 Character override。

## TTS Queue

状态：

```text
idle -> queued -> speaking -> completed
                    └-> interrupted/error
```

默认 `interrupt_policy: replace`：用户发送新消息或点击停止时，取消旧播放。

## Lip Sync

V1 可用播放状态 + 随机平滑值；更稳定方案是把可获取的音频接入 Web Audio Analyser，计算 RMS 后归一化到 `0..1`。
