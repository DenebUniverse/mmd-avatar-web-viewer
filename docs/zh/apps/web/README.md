# apps/web

对应目标代码目录：`apps/web/`。

## 职责

- 左侧角色/动作/姿态控制台；
- 中央 PMX Stage 容器；
- 右侧 Session 列表、Message 列表和输入区；
- Web 状态管理；
- REST/SSE 客户端；
- Browser STT/TTS UI；
- 错误、加载和运行状态展示；
- OBS/URL 兼容入口。

## 不负责

- API Key；
- OpenRouter 直接调用；
- Claude Code 进程；
- Session 文件写入；
- PMX 内部实现；
- Character Soul 原文读取。

## 目标子目录

```text
apps/web/src/
  app/
  components/
    control-panel/
    stage-view/
    chat-panel/
  stores/
  clients/
  compatibility/
  bootstrap/
```

## 当前迁移来源

- `index.html`；
- `src/style.css`；
- `src/main.js` 中 DOM、选择框、状态、URL 参数和 `bootstrap()` 部分。

详见 [迁移说明](./03-migration.md)。
