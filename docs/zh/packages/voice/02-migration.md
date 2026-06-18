# packages/voice 迁移说明

| 当前函数 | 目标 |
|---|---|
| `browserSpeak()` | `BrowserTtsAdapter` |
| `startMicLipSync()` | Browser audio input/lip source |
| `setMouth()` | 移到 `packages/stage/LipSyncController` |

## 顺序

1. 抽 BrowserTtsAdapter；
2. 加 Queue 和 interrupt；
3. 抽 STT Adapter；
4. 输出 lip signal；
5. Character voice override；
6. 未来增加云 TTS Adapter。

## 验收

- Chrome 不支持 STT 时仍可文本聊天；
- TTS 不会重叠播放；
- 停止 Agent run 时可停止 TTS；
- Voice 模块不依赖 Three.js。
