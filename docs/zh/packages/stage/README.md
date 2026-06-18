# packages/stage

对应目标代码目录：`packages/stage/`。

## 职责

- Three.js Scene/Camera/Renderer；
- MMDLoader/MMDAnimationHelper；
- Actor mesh 生命周期；
- Motion、Pose、Expression、Lip Sync；
- Camera、resize、OBS 展示；
- Stage Command 执行和 Stage Event 发出。

## 不负责

- Character Soul；
- Agent/LLM；
- Session 持久化；
- API Key；
- Provider fallback。

## 目标结构

```text
packages/stage/src/
  StageRuntime.ts
  ActorRuntime.ts
  controllers/
    MotionController.ts
    PoseController.ts
    ExpressionController.ts
    LipSyncController.ts
    CameraController.ts
  loaders/
  commands/
  events/
```
