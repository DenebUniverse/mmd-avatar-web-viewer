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
packages/stage/            # Stage runtime 迁移边界
packages/characters/       # 资源路径与角色 registry 边界
packages/core/             # 通用纯函数和领域类型边界
packages/voice/            # 浏览器语音/口型边界
packages/protocol/         # 后续 Stage command/event 边界
assets/models/             # PMX/PMD 与贴图真源
assets/motions/            # VMD 真源
assets/poses/              # VPD 真源
apps/web/src/registry/     # legacy manifest 迁移输入
.generated/                # 扫描生成产物，不手写
scripts/assets/            # 资源扫描
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

右侧 `ChatPanel` 本轮只提供禁用态 UI：

- 可收回和展开；
- 顶部是工具栏；
- 中间初始展示 session 列表，点击静态 session 后展示 messages 列表；
- 底部是禁用输入框；
- 不发送请求；
- 不创建 session；
- 不连接 OpenRouter；
- 不连接 Claude Code；
- 不触发 Stage command。

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
