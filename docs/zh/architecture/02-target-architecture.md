# 目标架构

## 1. 运行拓扑

```text
Browser
├── apps/web
│   ├── Left Control Panel
│   ├── Center Stage View
│   ├── Right Session/Chat Panel
│   ├── Web Store
│   └── Protocol Client
├── packages/stage
└── packages/voice (browser adapters)
            │
            │ HTTP + SSE
            ▼
Server
├── apps/server
├── packages/orchestrator
├── packages/characters
├── packages/protocol
├── packages/core
├── Config Loader
└── Data Store
            │
            ├── OpenRouter
            ├── Claude Code
            └── Future Harnesses
```

## 2. 目标仓库结构

```text
apps/
  web/
  server/
packages/
  core/
  stage/
  characters/
  orchestrator/
  protocol/
  voice/
config/
characters/
stages/
assets/
data/
scripts/
tests/
docs/zh/
```

## 3. 关键对象

```text
Character = 人格、角色元数据和资源引用
Actor     = Character 在 Stage 中的运行实例
Session   = 聊天记录和 Agent 生命周期容器
Agent     = 推理、回复和工具调用实体
Binding   = Session 与 Actor 的运行时关联
```

Actor 可以没有 Agent。加载角色和发送消息是两个独立动作。

## 4. 部署模式

### 开发模式

```text
Vite apps/web
Agent Server apps/server
/assets/* 由 Server 或 Vite 映射到 assets 真源
```

### 生产模式

```text
apps/server 托管 web dist
apps/server 映射 /assets/*
```

### 独立静态演示包

仅发布时把资产复制进 `dist/`。该目录不进入主分支，也不作为编辑真源。
