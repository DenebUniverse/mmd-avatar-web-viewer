# packages/orchestrator 迁移说明

该模块完全新增，但必须先使用 Mock Adapter 验证契约。

## 顺序

1. 定义 Adapter 与 normalized events；
2. 实现 MockAdapter；
3. 实现 Session/Actor 懒绑定；
4. 实现取消与错误；
5. 接 OpenRouter；
6. 接 Claude Code；
7. 增加 fallback 和重试；
8. 未来再开放 Agent Stage Tools。

## 验收

- 仅选择角色时 Adapter 调用次数为 0；
- 首次发送只创建一次 Agent；
- 历史会话继续发送可恢复；
- 取消后不继续发送 delta；
- Provider 原始错误不会直接泄漏 secret。
