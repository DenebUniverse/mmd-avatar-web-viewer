# AgentStage Web

AgentStage Web 当前迁移目标是本地 PMX/PMD 角色舞台：

```text
ControlPanel + StageView + disabled ChatPanel
PMX / PMD 模型 + VMD 动作 + VPD 姿态 + three.js MMDLoader + MMDAnimationHelper
```

本轮迁移后，旧根目录 Viewer 入口已不再使用。唯一前端入口是 `apps/web`。

## 重要用途声明

本项目仅供建模学习、MMD/PMX/VMD/VPD 前端加载实验和本地非商用预览使用。

请勿用于 18 禁作品、极端宗教宣传、血腥恐怖猎奇作品、人身攻击等。

请勿用于商业用途。

模型版权所属 miHoYo / HoYoverse。第三方 VMD / VPD / Camera / Stage / MME 等素材需遵守原作者页面和包内 README。

## 快速启动

### 只看角色舞台（不聊天）

不需要任何 API Key，纯前端：

```bash
npm install
npm run assets:scan
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

如果 5173 被占用，Vite 会自动使用下一个端口。

### 完整功能（含 ChatPanel 聊天 / 语音）

ChatPanel 通过本地 `apps/server` 接入 Claude Code，再经本地 claude-code-router（CCR）转发到 OpenRouter。需要一次性配置：

```bash
./install.sh          # 安装依赖、claude CLI、ccr，并生成本地配置
# 编辑 config/secrets.local.env，填入 OPENROUTER_API_KEY（见下一节）
./start.sh            # 启动；会自动把 key 同步进 CCR，再拉起前后端
```

打开 `http://127.0.0.1:5173/`，右侧 ChatPanel 即可对话。

## 配置 API Key（OpenRouter + CCR）

聊天链路是：

```text
Browser ChatPanel
  → apps/server（本地，持有 Session/生命周期）
  → Claude Code CLI
  → 本地 CCR（127.0.0.1:3457）
  → OpenRouter API
```

**唯一需要你手动填的就是 OpenRouter 的 API Key**，填一个地方即可：

1. 去 <https://openrouter.ai> 注册并创建一个 API Key（形如 `sk-or-v1-...`）。
2. 编辑 `config/secrets.local.env`（首次运行 `./install.sh` 后会自动生成），取消注释并填入：

   ```bash
   OPENROUTER_API_KEY=sk-or-v1-你的key
   ```

3. 运行 `./start.sh`。启动脚本会调用 `scripts/setup/ensure-ccr-key.mjs`，自动把这个 key 写进 `~/.claude-code-router/config.json` 的 `openrouter.api_key`。

> 为什么必须同步？CCR 是独立进程，只读自己的 `config.json` 里 `api_key` 的**字面值**，不会展开 `${OPENROUTER_API_KEY}`，也不读 server 的环境变量。所以 `secrets.local.env` 里的 key 由启动脚本写进 CCR config 才会生效——你只需填 `secrets.local.env` 这一个地方。

安全说明：

- `config/secrets.local.env`、`config/*.local.*`、`~/.claude-code-router/config.json` 都不进 Git；
- API Key 只在本地 server / CCR 之间使用，不会进入浏览器、构建产物或前端 public config；
- 本项目的 Claude Code 配置（settings/session/日志）隔离在 `./.agentstage/claude-config`，与机器全局 `~/.claude` 互不影响，详见 [docs/zh/architecture/06-claude-code-orchestrator-integration.md](docs/zh/architecture/06-claude-code-orchestrator-integration.md)。

> 默认路由到 OpenRouter 免费模型 `google/gemma-4-31b-it:free`。免费模型可能被上游限流（HTTP 429）；如需稳定，可在 `~/.claude-code-router/config.json` 换成付费模型，或为 OpenRouter 账号充值。

## 常用命令

```bash
npm run assets:scan
npm run dev
npm run build
npm run preview
npm run check
```

`npm run dev` 和 `npm run build` 都会先执行 `npm run assets:scan`。

## 目录结构

```text
apps/web/                  # 唯一前端入口
apps/server/               # 本地 REST + SSE server（持有 Session/密钥/Agent 生命周期）
packages/stage/            # Stage runtime 迁移边界
packages/characters/       # 资源路径与角色 registry 边界
packages/core/             # 通用纯函数和领域类型边界
packages/voice/            # 浏览器语音/口型边界
packages/protocol/         # 后续 Stage command/event 边界
packages/orchestrator/     # Claude Code 适配、Session store、run 管理
assets/models/             # PMX/PMD 与贴图真源
assets/motions/            # VMD 真源
assets/poses/              # VPD 真源
apps/web/src/registry/     # legacy manifest 迁移输入
.generated/                # 扫描生成产物，不手写
scripts/assets/            # 资源扫描
scripts/setup/             # 安装/启动辅助（如 CCR key 同步）
scripts/checks/            # 迁移后检查
dist/                      # Vite 构建产物，可删除重建
```

## 资源扫描

扫描器读取：

```text
assets/models/**/*.pmx|*.pmd
assets/motions/**/*.vmd
assets/poses/**/*.vpd
apps/web/src/registry/legacy/*.json
```

并生成：

```text
.generated/assets-registry.json
.generated/characters-registry.json
.generated/resource_manifest.json
```

前端通过 dev/preview server 读取：

```text
/generated/assets-registry.json
/assets/*
```

## 当前内置角色

```text
hiying       -> assets/models/hiying_pmx/星穹铁道—绯英2.pmx
qianyeBlade  -> assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx
```

`qianyeBlade` 附件模型：

```text
assets/models/qianye_blade_pmx/剑.pmx
assets/models/qianye_blade_pmx/環.pmx
```

## 当前内置动作和姿态

```text
assets/motions/generated/breath_hiying_compatible.vmd
assets/motions/generated/builtin_idle.vmd
assets/motions/generated/builtin_wave.vmd
assets/motions/generated/builtin_jump.vmd
assets/motions/generated/builtin_peek.vmd
assets/motions/external/shoten_time_mihoyo_yujie.vmd
assets/motions/external/good_tea_shake_mihoyo_yujie.vmd
assets/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd
assets/poses/generated/default_stand.vpd
```

`eyedartBreath` 在 legacy manifest 中保留为 optional 资源；如果文件不存在，扫描器会在 `optionalMissing` 中报告。

## URL 参数

```text
?character=hiying
?character=qianyeBlade
?model=/assets/models/local/xxx.pmx
?motion=breath
?motion=idle
?motion=wave
?motion=jump
?motion=peek
?motion=shotenTime&face=vmd&lip=vmd
?motion=goodTea&face=vmd&lip=vmd
?motion=lovermaxHipSway&face=vmd&lip=vmd
?vmd=/assets/motions/local/xxx.vmd
?framing=bust
?obs=1
```

OBS Browser Source 示例：

```text
http://127.0.0.1:5173/?obs=1&character=hiying
```

## ChatPanel 状态

右侧 `ChatPanel` 已接入本地 `apps/server`（Claude Code → CCR → OpenRouter）：

- 可收回和展开；
- 顶部工具栏，中间 session 列表 / messages 列表两态切换；
- 底部输入框可发送，配置好 API Key（见「配置 API Key」）后可真实对话；
- 通过 `/api/v1` REST + SSE 与本地 server 通信；浏览器不直接接触 CCR、API Key 或 Claude Code 进程；
- 语音：控制台「语音」下拉选「机器」可自动朗读助手回复并驱动角色口型；输入框左侧麦克风可语音转文字。详见 [docs/zh/apps/web/05-voice-chat.md](docs/zh/apps/web/05-voice-chat.md)。

未配置 API Key 时，ChatPanel 仍可展开浏览，但发送会因 CCR 无可用 key 而失败。仅看模型舞台不受影响。

## 检查

```bash
npm run check
```

检查覆盖：

```text
资源 registry
apps/web 迁移结构
JS 语法
前端 smoke test
生产 build
```

## 文档

迁移计划见：

```text
docs/zh/migration/02-phases.md
```
