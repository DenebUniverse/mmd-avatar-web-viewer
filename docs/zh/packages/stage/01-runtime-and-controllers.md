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

## Lip Sync

输入是归一化 `0..1` 信号。Stage 只负责将信号映射到角色 morph，不负责生成音频。
