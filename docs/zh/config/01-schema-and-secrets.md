# 配置 Schema 与 Secret

## 示例字段树

```yaml
schema_version: 1
app:
  name: AgentStage Web
server:
  host: 127.0.0.1
  port: 8787
web:
  asset_base_url: /assets
llm:
  default_provider: openrouter
  max_output_tokens: 512
providers:
  openrouter:
    enabled: true
    base_url: https://openrouter.ai/api/v1
    api_key: ""
    chat_model: google/gemma-4-26b-a4b-it:free
    fallback_models: [openrouter/free]
  claude_code:
    enabled: false
    command: claude
    working_directory: ./workspace
voice:
  stt:
    provider: browser
    language: zh-CN
  tts:
    provider: browser
    language: zh-CN
    rate: 1.0
assets:
  root_dir: ./assets
  public_url_prefix: /assets
characters:
  root_dir: ./characters
storage:
  data_dir: ./data
```

## Secret 字段

```text
*.api_key
*.token
*.authorization
providers.claude_code.working_directory
providers.claude_code.permission_mode
```

Server 日志和错误序列化必须脱敏。

## 模型 URL 的归属

- OpenRouter Base URL、chat model ID：全局 Config；
- PMX/PMD URL：`character.yaml`；
- Motion/Pose URL：Asset Registry；
- Browser 不允许提交任意远程 URL 覆盖以上配置。
