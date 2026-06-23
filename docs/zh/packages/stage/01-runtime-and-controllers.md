# Stage Runtime 与 Controllers

## StageRuntime

持有：

```text
scene
camera
renderer
controls
clock
actors: Map<ActorId, ActorRuntime>
```

公开能力：

```ts
mount(container)
loadActor(actorId, characterConfig)
unloadActor(actorId)
dispatch(command)
resize(width, height)
dispose()
```

## ActorRuntime

只保存运行时对象：mesh、materials、bone map、helper registration 和 controller 实例，不写入 Core DTO。

## Motion/Pose 冲突

- 播放 Motion 前清理或覆盖静态 Pose；
- 应用 Pose 时暂停/移除影响同一骨骼的 Motion；
- 具体策略由 Stage 控制，不由 UI 临时修改 bone。

### 切换 Motion 前必须复位骨骼到绑定姿势（已实现）

> 状态：**已实现**（2026-06）。当前运行逻辑仍在 `apps/web/src/main.js`，抽到 `packages/stage` 时需保留此规则。

现象（修复前）：播放「昇天」等全身动作未结束时切到「呼吸」，角色不归位；连续点「呼吸」腿部会过度旋转直至 360°。

根因（与地板/物理无关，当前 `physics: false`）：

1. **VMD 只驱动它自身包含的骨骼轨道**。「呼吸」VMD 不含腿/手臂轨道，切过去后这些骨骼停留在上一个动作的最后姿势，即「不归位」。
2. **MMDAnimationHelper 的 IK/grant 会在已变形的骨骼上反复累加**。每次 `loadMotion` 都 `remove` + `add`，若不先复位，IK 在「上一次已被拧过的腿」上再解一次，扭转量逐次累积，连点后出现 360° 过度旋转。

修复：每次加载新 Motion 前，先把蒙皮骨骼还原到绑定姿势再注册动画。

```text
loadMotion(url):
  removeRegisteredMeshFromHelper()
  resetSkeletonToBindPose()     // mesh.skeleton.pose() + 清零 morph/口型
  mmdHelper.add(mesh, { animation, physics: false })
```

`resetSkeletonToBindPose()`（`apps/web/src/main.js`）：

- `mesh.skeleton.pose()` 用 `boneInverses` 还原到绑定姿势（T-pose），`try/catch` 兜底；
- `morphTargetInfluences.fill(0)` 清空表情；
- `mouthTarget = mouthValue = 0` 复位口型。

`loadPose()` 无需改动：它已用 `mmdHelper.pose(mesh, vpd, { resetPose: true, ... })` 内部复位。

未来若启用 physics + 地面，是 MMD 原生表现的增强方向；但修复本 bug **不需要地板**。

## Lip Sync

输入是归一化 `0..1` 信号。Stage 只负责将信号映射到角色 morph，不负责生成音频。
