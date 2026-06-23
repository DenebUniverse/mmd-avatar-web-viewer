# 当前实现基线

## 1. 当前仓库

当前前端入口已经迁移到：

```text
apps/web/
```

当前资源真源：

```text
assets/models/
assets/motions/
assets/poses/
```

当前生成产物：

```text
.generated/assets-registry.json
.generated/characters-registry.json
.generated/resource_manifest.json
dist/
```

运行链路：

```text
npm run dev / npm run build
  -> npm run assets:scan
  -> scripts/assets/scan_assets.py
  -> .generated/assets-registry.json
  -> apps/web 读取 /generated/assets-registry.json
  -> MMDLoader / MMDAnimationHelper
  -> PMX/PMD + VMD/VPD 渲染
```

## 2. 已实现且必须保留的能力

| 能力 | 当前入口 | 目标边界 |
|---|---|---|
| 资源 registry 加载 | `apps/web/src/main.js` | `packages/characters` Registry Client |
| 资源标准化 | `normalizeCharacter/Motion/Pose()` | `packages/core` + `packages/characters` |
| PMX/PMD 加载 | `loadModel()` | `packages/stage` ActorRuntime |
| VMD 加载 | `loadMotion()` | `packages/stage` MotionController |
| VPD 加载 | `loadPose()` | `packages/stage` PoseController |
| 表情 morph | `setMorph()`、`applyEmotion()` | `packages/stage` ExpressionController |
| 嘴型 | `setMouth()` | `packages/stage` LipSyncController |
| 麦克风口型 | `startMicLipSync()` | `packages/voice` + Stage Lip API |
| 浏览器 TTS | `browserSpeak()` | `packages/voice` BrowserTtsAdapter |
| 左侧控制台 | DOM bindings in `apps/web/src/main.js` | `apps/web` ControlPanel |
| 中央舞台 | `#stage` + `#avatar` | `apps/web` StageView |
| 右侧面板 | `ChatPanel` + `/api/v1` REST/SSE | 后续拆到 `components/chat-panel/*` |
| OBS/URL 参数 | `apps/web/src/main.js` | `apps/web` Compatibility Layer |

## 3. 当前技术债务

- `apps/web/src/main.js` 仍同时承担 UI、渲染、资源、Voice 和状态；
- `packages/stage` 等包目录已有壳，但 Stage runtime 尚未完全拆出；
- Character、Actor、Agent、Session 已有第一版边界，但仍集中在 `main.js` 和文件型 store 中；
- ChatPanel 已接入本地 Server，可创建/续写 session；
- Server、Config、Session Store、Orchestrator、Claude Code Adapter 已有第一版，仍需组件化和测试补强。

## 4. 基线验收

当前版本至少需要验证：

1. `npm run assets:scan` required missing 为 0；
2. 两个现有角色可加载；
3. 内置和外部 VMD 可播放，或显示明确兼容错误；
4. VPD 可应用；
5. 表情和嘴型可更新；
6. OBS 模式和 URL 参数不失效；
7. ChatPanel 可收回/展开，sessions view 发送创建新 session，messages view 发送续写当前 session；
8. `npm run build` 通过；
9. `npm run check` 通过。
