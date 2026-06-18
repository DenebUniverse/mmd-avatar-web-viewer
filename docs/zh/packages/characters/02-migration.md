# packages/characters 迁移说明

## 当前来源

```text
public/models/avatar_manifest.json
public/motions/vmd_manifest.json
public/resource_manifest.json
src/main.js normalize*/applyResourceManifest/loadResourceManifest
```

## 迁移步骤

1. 为现有两个角色创建 `characters/*/character.yaml`；
2. 模型仍引用旧 `/models/...` URL，先不移动资产；
3. 实现 Character schema 与 Registry；
4. Web 角色列表改从 Server 获取；
5. 将资产真源迁移到 `assets/`，更新 URL 映射；
6. 移除 `avatar_manifest.json` 的角色职责；
7. 保留通用 Motion/Pose Asset Registry。

## 验收

- 非法 YAML 给出可定位错误；
- 缺少 Soul 不影响纯 Stage 加载；
- 选择角色不启动 Agent；
- Public DTO 中不含 Soul/Skills 内容。
