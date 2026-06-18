# packages/voice

对应目标代码目录：`packages/voice/`。

## 职责

- STT Adapter；
- TTS Adapter；
- TTS Queue；
- 播放、中断和完成状态；
- Browser capability detection；
- 音量/播放状态转 Lip Sync signal。

## V1 Provider

```text
STT: Chrome SpeechRecognition / webkitSpeechRecognition
TTS: Chrome SpeechSynthesis
LLM: 由 Orchestrator/OpenRouter 负责，不属于 Voice
```

Voice 不直接修改 PMX morph，只输出 `lip level` 给 Stage。
