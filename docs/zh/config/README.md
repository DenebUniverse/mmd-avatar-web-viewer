# config

对应目标代码目录：`config/`。

## 文件

```text
config/agentstage.default.yaml          可提交的默认配置
config/agentstage.local.yaml            本机私密覆盖，禁止提交
config/agentstage.local.yaml.example    可提交模板
```

角色 PMX URL 放在 `characters/*/character.yaml`。LLM API Base URL、模型 ID、API Key、Server 端口等放全局 Config。

## 覆盖顺序

```text
environment variables
  > agentstage.local.yaml
  > agentstage.default.yaml
```

## Git

```gitignore
config/agentstage.local.yaml
.env
.env.*
!.env.example
```

Browser 只能通过 `/api/v1/config/public` 获取白名单字段。
