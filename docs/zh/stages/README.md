# stages

对应目标代码目录：`stages/`。

用于保存可复用舞台配置，而不是 Three.js Runtime 代码。

```text
stages/default/stage.yaml
stages/obs-transparent/stage.yaml
```

建议字段：

```yaml
id: default
name: Default Stage
background: transparent
camera:
  position: [0, 10, 35]
actor_slots:
  - id: main
    position: [0, 0, 0]
    rotation: [0, 0, 0]
```

V1 可以只实现一个 Actor slot，但结构需支持未来多个 Actor。Stage 配置由 `packages/stage` 执行，不包含 Agent 信息。
