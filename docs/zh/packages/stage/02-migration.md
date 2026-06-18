# packages/stage 迁移说明

## 当前函数映射

| `src/main.js` | 目标 |
|---|---|
| `getRenderSize()`、`resize()`、`animate()` | `StageRuntime` |
| `prepareMaterials()`、`buildBoneMap()` | `ActorRuntime` |
| `fitCamera()` | `CameraController` |
| `removeRegisteredMeshFromHelper()` | `ActorRuntime.disposeMotion()` |
| `loadModel()` | `StageRuntime.loadActor()` |
| `loadMotion()`、`loadMotionById()` | `MotionController` |
| `loadPose()`、`loadPoseById()` | `PoseController` |
| `setMorph()`、`resetFacial()`、`applyEmotion()` | `ExpressionController` |
| `setMouth()` | `LipSyncController` |

## 迁移顺序

1. 抽 renderer/scene/camera，不改 UI；
2. 抽 ActorRuntime 与模型加载；
3. 抽 Motion；
4. 抽 Pose；
5. 抽 Expression/Lip；
6. 抽 Camera/OBS；
7. 所有回归通过后删除旧全局状态。

## 验收

- 旧角色和动作结果视觉一致；
- 重复切换角色不泄漏 mesh/helper；
- dispose 后无 animation frame、audio 或 event listener 残留；
- Stage 单元测试不依赖真实 Agent Server。
