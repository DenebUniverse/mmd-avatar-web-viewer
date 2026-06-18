# Config 迁移说明

## 当前硬编码来源

- `src/main.js` 的默认模型/动作/姿态路径；
- `package.json` 的 host/port；
- `build_dist_fallback.py` 的 CDN 和资产路径；
- 未来 OpenRouter/Claude Code 参数。

## 迁移步骤

1. 建 schema 和 default/local loader；
2. 增加 redaction 测试；
3. 把 Server 端口和 Provider 参数迁入 Config；
4. 建 Public Config DTO；
5. 把 PMX URL 迁入 Character config；
6. 把 Motion/Pose URL 迁入 Asset Registry；
7. 移除前端硬编码 fallback。

## 验收

- 修改模型 ID 不需要改代码；
- 修改 PMX URL 只需要改角色配置；
- 缺 API Key 时 Server 给出明确 readiness 状态；
- local config 不进入 Git 和 dist。
