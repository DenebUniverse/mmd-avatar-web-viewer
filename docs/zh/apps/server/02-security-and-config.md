# Server 安全与配置边界

## Secret 来源

优先级：

```text
environment variables
  > config/agentstage.local.yaml
  > config/agentstage.default.yaml
```

`local.yaml` 必须被 Git 忽略。

## Public Config 白名单

允许：

- App 名称；
- API/Protocol 版本；
- Feature flags；
- `/assets` URL 前缀；
- Browser STT/TTS 默认参数；
- 可展示的 Provider/模型名称（按产品需要）。

禁止：

- API Key/token；
- Claude CLI 命令与工作目录；
- Storage 路径；
- 环境变量；
- 内网地址；
- 任意自定义 Authorization header。

## 代理限制

Browser 不得传入任意 `base_url` 让 Server 代发请求。Provider URL 必须来自可信 Config，防止 SSRF 和任意代理。

## 日志脱敏

统一过滤：

```text
Authorization
api_key
token
cookie
provider raw request headers
```
