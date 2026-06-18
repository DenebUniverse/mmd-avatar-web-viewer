# apps/server 迁移说明

当前项目没有 Server，因此采用增量新建。

## 顺序

1. Health API；
2. Config Loader；
3. Public Config API；
4. Character Registry API；
5. Session Store；
6. Mock Agent Adapter；
7. SSE；
8. OpenRouter Adapter；
9. Claude Code Adapter；
10. 生产托管和资产映射。

## 首阶段禁止做的事

- 不立即接真实 Provider；
- 不在 Server 内实现 Three.js；
- 不一次性引入数据库；
- 不把已有 Viewer 迁移与 Server 创建混在同一个提交。

## 验收

- `/health/ready` 能指出具体缺失配置；
- API Key 不出现在 API、日志、错误栈和前端；
- Mock streaming 可取消；
- Server 重启后 Session metadata/messages 可恢复。
