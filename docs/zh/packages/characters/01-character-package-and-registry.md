# Character Package 与 Registry

## 角色包目录

```text
characters/hiying/
  character.yaml
  Soul.md
  skills/
  memory/
```

二进制资产不复制进角色包：

```text
assets/models/hiying/...
assets/motions/...
assets/poses/...
```

## character.yaml

```yaml
schema_version: 1
id: hiying
name: 绯英
model:
  type: pmx
  url: /assets/models/hiying/model.pmx
defaults:
  motion_id: breath
voice:
  language: zh-CN
  rate: 1.0
agent_context:
  soul: ./Soul.md
  skills_dir: ./skills
```

## 两种视图

### Public Character DTO

用于 Browser/Stage，只含名称、模型 URL、默认动作、Voice 公共参数。

### Private Character Context

用于 Orchestrator，包含 Soul、Skills、初始 Memory，不发给 Browser。
