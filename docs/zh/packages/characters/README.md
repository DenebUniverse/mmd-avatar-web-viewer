# packages/characters

对应目标代码目录：`packages/characters/`。

## 职责

- 扫描 `characters/*/character.yaml`；
- 校验角色配置；
- 解析 PMX/PMD、默认动作、姿态和 Voice 设置；
- 读取 `Soul.md`、Skills、初始 Memory；
- 生成公开 DTO 和 Server 私有上下文；
- 构建 Character Registry。

## 不负责

- Stage 渲染；
- Agent 启动；
- Session 绑定；
- 把 Soul 原文发给 Browser。
