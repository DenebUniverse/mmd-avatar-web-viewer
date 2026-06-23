# 语音聊天功能

> 状态：**已实现**（2026-06）。本文先给实现总览与代码位置，再保留设计细节与验收。

语音聊天在 ChatPanel（已通过本地 `apps/server` 接入 Claude Code，见 [04-chat-panel.md](./04-chat-panel.md)）之上叠加：语音输出（自动朗读助手回复 + 舞台口型）与语音输入（麦克风实时转写到输入框）。全部为浏览器原生能力，不引入第三方库，不改 `apps/server`。

## 实现总览（代码位置）

| 能力 | 代码位置 | 说明 |
|---|---|---|
| 语音下拉「无 / 机器」 | `apps/web/index.html`「语音 / 口型」卡片 `#voiceSelect` | 默认「无」；绑定见 `apps/web/src/main.js` `bindUi()` |
| 自动朗读触发 | `apps/web/src/main.js` `finishAgentRun()` | 仅 `statusText === '完成'` 且 `voiceOutputMode === 'machine'` 时朗读 |
| 取助手文本 | `pickAssistantText()` | 优先回传 message，否则取最后一条非流式 assistant |
| 文本清洗 | `sanitizeForSpeech()` | 去代码块/Markdown/截断 1000 字 |
| 朗读 + 舞台口型 | `browserSpeak()` + `animate()` | `speakingTimer` 写 `mouthTarget` → 嘴部 morph |
| 中断 | `stopBrowserSpeak()` | Stop（`cancelAgentRun`）或切回「无」时 cancel + 复位口型 |
| 麦克风按钮 | `apps/web/index.html` composer-bar `#chatMicBtn`（发送左侧） | 不支持 `SpeechRecognition` 时禁用 |
| 录音开关 | `toggleMic()/startMic()/stopMic()` | `continuous + interimResults`，追加写入 `chatInput` |
| 发送即关麦 | `sendAgentPrompt()` 入口 `if (micRecording) stopMic()` | 满足「发送自动关闭麦克风」 |

## 0. 目标概览

| 能力 | 入口 | 行为 |
|---|---|---|
| 语音输出（TTS） | ControlPanel 新增「语音」下拉 | 选「机器」时，Chat 助手输出自动浏览器朗读，且舞台角色口型随朗读动起来 |
| 语音输入（STT） | ChatPanel composer 新增麦克风按钮 | 点击实时把语音转文字写入输入框；点击发送 / 二次点击麦克风都会关闭录音 |

设计约束：

- 不引入第三方库，全部使用浏览器原生 `SpeechSynthesis` / `SpeechRecognition`；
- 不改动 `apps/server`，语音完全是浏览器侧能力；
- 不破坏现有 OBS 模式（`?obs=1`）和现有「语音 / 口型」卡片中的手动 TTS / 麦克风口型按钮。

## 1. 现状盘点

`apps/web/src/main.js` 已具备复用基础：

- `browserSpeak(text)`：调用 `speechSynthesis`，并启动 `speakingTimer` 周期性写 `mouthTarget`，在 `animate()` 中插值到 `あ/い/う/え/お` morph，实现「朗读时角色嘴动」。结束时 `utterance.onend` 复位口型。这正是「舞台角色嘴也动」所需，**语音输出可直接复用，无需新建口型逻辑**。
- `startMicLipSync()`：用麦克风音量驱动口型，与本方案的 STT 无关，保留不动。
- `frontendLipEnabled`：口型覆盖开关，`browserSpeak` 内部会置 `true`。
- 助手输出最终文本可在 `handleAgentEvent` 的 `agent.run.completed` 分支 / `finishAgentRun(session, message, ...)` 中取得。

`packages/voice/index.js` 目前仅有 `isBrowserSpeechAvailable()`，可扩展为能力检测与适配器入口（见 §6）。

## 2. 语音输出（TTS）

### 2.1 控制台「语音」下拉

在 `index.html` 的「语音 / 口型」卡片内，于 `#textBox` 上方新增：

```html
<label class="field-label" for="voiceSelect">语音</label>
<select id="voiceSelect" class="select-input" aria-label="语音输出">
  <option value="none">无</option>
  <option value="machine">机器</option>
</select>
```

- 默认值 `none`（无），即不自动朗读，保持现有行为；
- `machine`（机器）= 浏览器 TTS 自动朗读助手输出。

> 选项设计为「可扩展枚举」：未来云 TTS、特定角色音色只需向 `voiceSelect` 追加 option 并在分发处映射到对应 adapter（见 §6），不改动调用点。

### 2.2 状态与默认值

在 `main.js` 顶部新增运行态：

```js
let voiceOutputMode = 'none'; // 'none' | 'machine'
```

绑定（在 `bindUi()` 中）：

```js
const voiceSelect = optionalEl('#voiceSelect');
voiceSelect?.addEventListener('change', () => {
  voiceOutputMode = voiceSelect.value === 'machine' ? 'machine' : 'none';
  if (voiceOutputMode === 'none') stopBrowserSpeak(); // 切回「无」立即停掉正在进行的朗读
});
```

### 2.3 触发时机：助手输出完成后朗读

只在「一次 run 真正结束、拿到完整助手文本」时朗读，**不在 `message.delta` 流式过程中逐段朗读**（避免重叠、避免半句重读）。

在 `finishAgentRun(session, message, statusText)` 中，run 正常完成时取最终助手文本并朗读：

```js
function finishAgentRun(session, message, statusText) {
  // ...existing...
  const finalText = pickAssistantText(session, message);
  if (voiceOutputMode === 'machine' && statusText === '完成' && finalText) {
    browserSpeak(finalText);
  }
}
```

`pickAssistantText` 规则：

1. 优先用 `message?.text`；
2. 否则取 `session.messages` 中最后一条 `role === 'assistant'` 且 `status !== 'streaming'` 的 `text`；
3. 朗读前做清洗（见 §2.4）。

仅在 `statusText === '完成'` 时朗读；`已停止` / `运行失败` 不朗读。

### 2.4 朗读文本清洗

助手输出可能含 Markdown / 代码块 / 工具卡片噪声，朗读体验差。新增 `sanitizeForSpeech(text)`：

- 去掉 ``` 代码块整段；
- 去掉行内 `` `code` `` 反引号、`#`、`*`、`>`、列表符号等 Markdown 标记；
- 折叠多余空白；
- 截断到上限（如 1000 字）避免超长朗读，超出部分丢弃并在状态栏提示。

### 2.5 中断策略（interrupt: replace）

复用文档 [packages/voice/01-stt-tts-lipsync.md](../../packages/voice/01-stt-tts-lipsync.md) 的 `replace` 策略：

- 新一轮朗读前先 `speechSynthesis.cancel()`（`browserSpeak` 已内置 `synth.cancel()`）；
- 用户点击 Chat 的 Stop / 把语音切回「无」时，调用 `stopBrowserSpeak()`：`speechSynthesis.cancel()` + 清 `speakingTimer` + `mouthTarget = 0`。

新增 `stopBrowserSpeak()`，并在 `cancelAgentRun()` 中一并调用，保证停止 run 时朗读也停。

### 2.6 舞台口型联动

无需新增口型代码：`browserSpeak` 已通过 `speakingTimer` 周期写 `mouthTarget`，`animate()` 把 `mouthValue` 插值到口型 morph，`utterance.onend` 复位。语音输出选「机器」后，朗读期间角色自动张合嘴。

### 2.7 OBS 模式

`obsMode` 下 ChatPanel 不渲染、`initAgentChat` 直接 return，因此不会有助手 run，TTS 不会触发。下拉本身位于左侧控制台，OBS 模式下控制台已隐藏，无需特殊处理。

## 3. 语音输入（STT）

### 3.1 麦克风按钮

在 `index.html` 的 `.chat-composer-bar` 中，**发送按钮 `#chatSendBtn` 左侧**新增：

```html
<button id="chatMicBtn" type="button" aria-label="语音输入" title="语音输入">🎤</button>
```

并将 grid 模板列数 +1（当前 `grid-template-columns: auto auto minmax(0,1fr) auto auto`，新增一列）。麦克风开启时加 `.recording` class 做高亮（如红点 / 变色）。

### 3.2 能力检测与降级

```js
const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
```

不支持时：麦克风按钮 `disabled`，`title` 改为「当前浏览器不支持语音输入」，文本输入照常可用（不让 Chat 整体失效）。

### 3.3 录音状态机

```text
idle --click--> listening --(send | click | end | error)--> idle
```

新增状态：

```js
let recognition = null;     // SpeechRecognition 实例
let micRecording = false;   // 是否正在录音
let micBaseText = '';       // 开始录音那一刻 chatInput 已有的文本
```

### 3.4 实时转写写入输入框

`SpeechRecognition` 配置：

```js
recognition.lang = 'zh-CN';
recognition.continuous = true;     // 持续监听，直到手动停止
recognition.interimResults = true; // 实时拿到 interim 文本
```

`onresult` 把（已确认 final + 当前 interim）拼接后写回输入框。注意 `continuous` 模式下 `event.results` 会累积本次录音的所有片段，因此从 0 遍历，并以固定的 `micBaseText` 作为前缀（实现与设计一致）：

```js
recognition.onresult = (event) => {
  let finalText = '';
  let interim = '';
  for (let i = 0; i < event.results.length; i++) {
    const seg = event.results[i];
    if (seg.isFinal) finalText += seg[0].transcript;
    else interim += seg[0].transcript;
  }
  chatInput.value = `${micBaseText}${finalText}${interim}`.trimStart();
  updateChatControls(); // 让发送按钮随文本可用态刷新
};
```

`micBaseText` 保证语音文字追加在用户已手输内容之后，而不是覆盖。

### 3.5 开关逻辑（toggle）

`#chatMicBtn` 点击：

```js
function toggleMic() {
  if (micRecording) { stopMic(); return; } // 二次点击关闭
  startMic();
}

function startMic() {
  if (!SpeechRecognitionImpl) return;
  recognition = new SpeechRecognitionImpl();
  // ...config + handlers...
  micBaseText = chatInput.value ? chatInput.value + ' ' : '';
  recognition.start();
  micRecording = true;
  chatMicBtn.classList.add('recording');
}

function stopMic() {
  micRecording = false;
  chatMicBtn.classList.remove('recording');
  try { recognition?.stop(); } catch {}
  recognition = null;
}
```

`recognition.onend` / `onerror` 都兜底调用 `stopMic()`，保证 UI 状态与底层一致（含 `no-speech`、超时自动结束等情况）。

### 3.6 发送时自动关闭麦克风

在 `sendAgentPrompt()` 入口（读取 `chatInput.value` 后、清空输入框前）插入：

```js
if (micRecording) stopMic();
```

满足「点击发送自动将麦克风切换为关闭」。Enter 发送走的也是 `sendAgentPrompt()`，同样覆盖。

### 3.7 与 chat 运行态的关系

- 录音独立于 `chatState.running`：可以在等待助手输出时继续口述下一句；
- 但 `updateChatControls()` 仍按既有规则控制发送按钮可用性（online 且非 running 且有文本）；
- 录音不阻塞、不修改 SSE 流程。

## 4. UI / 样式改动清单

| 文件 | 改动 |
|---|---|
| `apps/web/index.html` | 「语音 / 口型」卡片加 `#voiceSelect`；composer-bar 在发送左侧加 `#chatMicBtn` |
| `apps/web/src/styles/style.css` | `.chat-composer-bar` grid 列数 +1；`#chatMicBtn` 尺寸与 `.recording` 高亮样式 |
| `apps/web/src/main.js` | 见 §5 |

## 5. main.js 改动清单

1. 新增状态：`voiceOutputMode`、`recognition`、`micRecording`、`micBaseText`、`SpeechRecognitionImpl`；
2. 新增函数：`stopBrowserSpeak()`、`sanitizeForSpeech()`、`pickAssistantText()`、`toggleMic()`/`startMic()`/`stopMic()`；
3. 改 `finishAgentRun()`：完成时按 `voiceOutputMode` 朗读；
4. 改 `cancelAgentRun()`：调用 `stopBrowserSpeak()`；
5. 改 `sendAgentPrompt()`：发送时 `stopMic()`；
6. 改 `bindUi()`：绑定 `#voiceSelect` change、`#chatMicBtn` click，并按能力检测决定是否禁用麦克风按钮；
7. `browserSpeak()` 微调：抽出 `speakingTimer` 复位逻辑供 `stopBrowserSpeak()` 复用（行为不变）。

## 6. 与 packages/voice 的关系（演进方向，非本轮强制）

本轮先在 `main.js` 内最小实现。后续可按 [packages/voice 迁移说明](../../packages/voice/02-migration.md) 抽象：

- `voiceOutputMode` 分发到 `BrowserTtsAdapter`，新增云 TTS 时只加 adapter 与下拉 option；
- STT 抽成 `BrowserSttAdapter`，输出 transcript 回调；
- 朗读音量/状态作为 lip signal 输出给 Stage（替代当前的随机 `mouthTarget`，口型更贴合）。

## 7. 文档一致性更新

[04-chat-panel.md §7「禁止行为」](./04-chat-panel.md) 原写明「ChatPanel 不允许触发 TTS」。本功能有意调整该约束，且 04 文档**已同步修订**：

- ChatPanel 自身仍不直接选择音色 / 不直接连 provider；
- 但「语音输出由 ControlPanel 的语音下拉控制，助手 run 完成后由前端触发浏览器 TTS」已成为允许行为。

落地实现时需同步修订 04 文档该条，避免文档与实现矛盾。

## 8. 验收

语音输出：

- 控制台「语音」下拉默认「无」，助手输出不朗读；
- 选「机器」后，助手一轮输出**完成时**自动朗读，且舞台角色嘴随朗读动；
- 流式过程中不重复朗读、不重叠；
- 点击 Chat 的 Stop，或把下拉切回「无」，正在进行的朗读立即停止、口型复位。

语音输入：

- 发送按钮左侧出现麦克风按钮；
- 点击麦克风开始录音，说话时文字实时写入输入框（追加在已有文本后）；
- 点击发送后麦克风自动关闭；
- 二次点击麦克风关闭录音；
- 不支持 `SpeechRecognition` 的浏览器麦克风按钮禁用，文本聊天不受影响。

通用：

- OBS 模式（`?obs=1`）下不触发 TTS、不报错；
- 不新增第三方依赖；不改动 `apps/server`。
