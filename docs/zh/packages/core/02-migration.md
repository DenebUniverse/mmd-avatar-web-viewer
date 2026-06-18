# packages/core 迁移说明

当前 `src/main.js` 使用普通字符串和隐式全局状态。迁移时先引入类型和纯函数，不移动渲染逻辑。

| 当前数据 | 目标类型 |
|---|---|
| character manifest item | `CharacterSummary` / `CharacterPublicConfig` |
| motion item | `MotionDescriptor` |
| pose item | `PoseDescriptor` |
| 当前 mesh 状态 | `Actor` 状态摘要；真实 mesh 留在 Stage |
| 错误字符串 | `DomainError` |

验收重点：Core 包可在 Node 和 Browser 环境单独测试，不导入 Three.js。
