# 全量迁移方案

本文是当前迁移的执行计划。最新决策：

- 直接完成全量迁移到新目录结构；
- 不保留旧 Viewer 作为可运行入口；
- 本轮必须保证 `ControlPanel` 和 `StageView` 正常；
- `ChatPanel` 本轮只实现 UI 壳和禁用态，不能发送消息、不能创建 session、不能连接 Agent；
- 当前所有模型、动作、姿态资源必须有清楚的迁移后路径；
- 文档必须写明迁移后 `npm install`、启动、构建和资源扫描命令。

## 1. 本轮完成定义

### 必须完成

- `apps/web` 成为唯一前端入口；
- 根目录旧 `index.html`、`src/main.js`、`src/style.css` 不再作为运行入口；
- 当前左侧控制台能力迁入 `ControlPanel`；
- 当前舞台展示能力迁入 `StageView` 和 `packages/stage`；
- 当前资源读取从 `public/*` 迁到 `assets/*`；
- 角色、动作、姿态清单从旧 manifest 迁到新的 registry；
- `ChatPanel` 有稳定 UI 布局，但明确禁用；
- `npm install` 后可按本文命令启动和构建。

### 本轮不做

- 不保留旧 Viewer 入口；
- 不要求旧 URL、旧 DOM id、旧脚本入口继续兼容；
- 不实现可用聊天；
- 不接 OpenRouter；
- 不接 Claude Code；
- 不实现 Session Store；
- 不实现 Server SSE；
- 不实现 Agent Tools；
- 不实现 Multi-Agent / Multi-Actor；
- 不实现云 TTS。

### 不允许丢失

| 功能 | 迁移后必须正常 |
|---|---|
| 默认角色加载 | 打开新 Web 后默认显示 `hiying` |
| 角色切换 | 可在 `hiying` 和 `qianyeBlade` 之间切换 |
| PMX 材质贴图 | 中文文件名、BMP/JPG/PNG/TGA 贴图可加载 |
| 附件模型 | `qianyeBlade` 的 `剑.pmx`、`環.pmx` 不丢失配置 |
| VMD 动作 | 当前 generated/external 动作能出现在控制台 |
| 默认动作 | 默认 `breath` 可加载 |
| VPD 姿态 | `defaultStand` 可加载 |
| 表情 | 当前表情/morph 控制继续可用 |
| 口型 | 当前浏览器 TTS 或手动口型逻辑迁到 Stage/Voice 边界 |
| 镜头适配 | 普通页面中模型居中可见 |
| 错误展示 | 资源加载失败时 UI 有明确错误 |

## 2. 迁移后目录结构

```text
apps/
  web/
    index.html
    package.json
    vite.config.js
    src/
      main.js
      app/
      components/
        control-panel/
        stage-view/
        chat-panel/
      stores/
      styles/
      registry/
packages/
  core/
  stage/
  characters/
  voice/
  protocol/
assets/
  models/
  motions/
  poses/
  stages/
  audio/
.generated/
  assets-registry.json
  characters-registry.json
scripts/
  assets/
  checks/
  release/
docs/
  zh/
```

说明：

- `apps/web` 是唯一浏览器应用；
- `packages/stage` 承担 Three.js / MMD 运行时；
- `packages/characters` 承担角色和资源 registry 解析；
- `packages/voice` 只保留当前浏览器 TTS/口型相关能力，不接云服务；
- `packages/protocol` 本轮只保留 Stage command/event 类型，不接 Server；
- `.generated/*` 是生成产物，不手写；
- `assets/*` 是资源真源；
- `public/*` 不再作为资源真源。

## 3. 迁移后命令

### 环境要求

```bash
node --version   # 建议 Node.js 20 LTS；最低按 Vite 5 要求使用 Node.js 18+
npm --version
```

本项目当前已有 `package-lock.json`，迁移后继续使用 npm，不引入 pnpm/yarn。

### 安装

```bash
npm install --registry=https://registry.npmmirror.com
```

### 扫描资源

```bash
npm run assets:scan
```

预期行为：

- 扫描 `assets/models`、`assets/motions`、`assets/poses`；
- 生成 `.generated/assets-registry.json`；
- 生成 `.generated/characters-registry.json`；
- 校验 manifest 中引用的文件真实存在；
- 对中文路径做 URL 编码检查。

### 开发启动

```bash
npm run dev
```

迁移后 `npm run dev` 应启动 `apps/web`，等价于：

```bash
npm run dev:web
```

预期地址：

```text
http://127.0.0.1:5173
```

### 构建

```bash
npm run build
```

预期行为：

- 构建 `apps/web`；
- 输出到 `dist/` 或 `apps/web/dist/`，具体路径在根 `package.json` 中固定；
- 构建前自动执行 `npm run assets:scan`；
- bundle 中不包含 local config、API Key、Soul。

### 预览构建结果

```bash
npm run preview
```

预期地址：

```text
http://127.0.0.1:5173
```

### 检查

```bash
npm run check
```

预期至少包含：

- JS 语法检查；
- DOM 入口检查；
- 资源 registry 检查；
- MMD runtime 静态检查；
- 前端 smoke 检查；
- deprecated 旧入口检查。

### 迁移后根 `package.json` 脚本目标

```json
{
  "scripts": {
    "dev": "npm run assets:scan && npm run dev:web",
    "dev:web": "vite --config apps/web/vite.config.js --host 127.0.0.1 --port 5173",
    "build": "npm run assets:scan && vite build --config apps/web/vite.config.js",
    "preview": "vite preview --config apps/web/vite.config.js --host 127.0.0.1 --port 5173",
    "check": "bash scripts/checks/auto_check_all.sh",
    "assets:scan": "node scripts/assets/scan-assets.mjs"
  }
}
```

如果暂时继续使用 Python 扫描器，脚本名仍然按上面的命令暴露，内部可先调用迁移后的 Python 文件：

```json
{
  "assets:scan": "python3 scripts/assets/scan_assets.py"
}
```

## 4. 当前资源到迁移后路径

### 4.1 目录映射

| 当前路径 | 迁移后路径 | 说明 |
|---|---|---|
| `public/models/avatar_manifest.json` | `.generated/characters-registry.json` | 生成文件，不手写 |
| `public/resource_manifest.json` | `.generated/assets-registry.json` + `.generated/characters-registry.json` | 拆成资源 registry 和角色 registry |
| `public/models/hiying_pmx/` | `assets/models/hiying_pmx/` | 绯英模型目录，整目录迁移 |
| `public/models/qianye_blade_pmx/` | `assets/models/qianye_blade_pmx/` | 千冶·刃模型目录，整目录迁移 |
| `public/motions/vmd_manifest.json` | `.generated/assets-registry.json` | 动作清单改由扫描器生成 |
| `public/motions/generated/` | `assets/motions/generated/` | 内置/项目生成 VMD |
| `public/motions/external/` | `assets/motions/external/` | 第三方 VMD 和 README |
| `public/motions/local/` | `assets/motions/local/` | 本地动作目录，保留为空目录或 README |
| `public/poses/generated/` | `assets/poses/generated/` | 项目生成 VPD |
| `dist/` | `dist/` 或 `apps/web/dist/` | 构建产物，可删除重建 |

### 4.2 角色映射

| 角色 ID | 当前模型 | 迁移后模型 | 迁移后角色配置 |
|---|---|---|---|
| `hiying` | `public/models/hiying_pmx/星穹铁道—绯英2.pmx` | `assets/models/hiying_pmx/星穹铁道—绯英2.pmx` | `apps/web/src/registry/characters/hiying.json` 或 `.generated/characters-registry.json` |
| `qianyeBlade` | `public/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx` | `assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx` | `apps/web/src/registry/characters/qianyeBlade.json` 或 `.generated/characters-registry.json` |

`qianyeBlade` 附件模型必须保留：

| 当前路径 | 迁移后路径 |
|---|---|
| `public/models/qianye_blade_pmx/剑.pmx` | `assets/models/qianye_blade_pmx/剑.pmx` |
| `public/models/qianye_blade_pmx/環.pmx` | `assets/models/qianye_blade_pmx/環.pmx` |

角色配置字段至少包含：

```json
{
  "id": "hiying",
  "label": "绯英",
  "modelPath": "/assets/models/hiying_pmx/星穹铁道—绯英2.pmx",
  "assetDir": "/assets/models/hiying_pmx/",
  "defaultMotionId": "breath",
  "defaultPoseId": "defaultStand"
}
```

### 4.3 动作映射

| 动作 ID | 当前路径 | 迁移后路径 | 状态 |
|---|---|---|---|
| `breath` | `public/motions/generated/breath_hiying_compatible.vmd` | `assets/motions/generated/breath_hiying_compatible.vmd` | 默认动作，必须可用 |
| `idle` | `public/motions/generated/builtin_idle.vmd` | `assets/motions/generated/builtin_idle.vmd` | 必须可用 |
| `wave` | `public/motions/generated/builtin_wave.vmd` | `assets/motions/generated/builtin_wave.vmd` | 必须可用 |
| `jump` | `public/motions/generated/builtin_jump.vmd` | `assets/motions/generated/builtin_jump.vmd` | 必须可用 |
| `peek` | `public/motions/generated/builtin_peek.vmd` | `assets/motions/generated/builtin_peek.vmd` | 必须可用 |
| `shotenTime` | `public/motions/external/shoten_time_mihoyo_yujie.vmd` | `assets/motions/external/shoten_time_mihoyo_yujie.vmd` | 必须保留 readme/source 元数据 |
| `goodTea` | `public/motions/external/good_tea_shake_mihoyo_yujie.vmd` | `assets/motions/external/good_tea_shake_mihoyo_yujie.vmd` | 必须保留 readme/source 元数据 |
| `lovermaxHipSway` | `public/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd` | `assets/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd` | 必须保留兼容说明 |
| `external_lovermax_tiktok_hip_sway` | `public/motions/external/lovermax_tiktok_hip_sway.vmd` | `assets/motions/external/lovermax_tiktok_hip_sway.vmd` | 原始动作，保留但默认不选 |
| `breathConversationOriginal` | `public/motions/external/breath_original/breath_conversation_0f.vmd` | `assets/motions/external/breath_original/breath_conversation_0f.vmd` | 原始动作，保留兼容限制 |
| `breathMultistageOriginal` | `public/motions/external/breath_original/breath_multistage_loop_9415f.vmd` | `assets/motions/external/breath_original/breath_multistage_loop_9415f.vmd` | 原始动作，保留兼容限制 |
| `breath_original_breath_multistage_0f` | `public/motions/external/breath_original/breath_multistage_0f.vmd` | `assets/motions/external/breath_original/breath_multistage_0f.vmd` | 扫描动作，保留 |
| `eyedartBreath` | `public/motions/external/eyedart_breath.vmd` | `assets/motions/external/eyedart_breath.vmd` | 当前 manifest 标记 optional；迁移时若文件不存在，registry 必须标记 missing/optional，不能静默成功 |

动作 README 和辅助文件一起迁移：

| 当前路径 | 迁移后路径 |
|---|---|
| `public/motions/external/README.md` | `assets/motions/external/README.md` |
| `public/motions/external/shoten_time_README.txt` | `assets/motions/external/shoten_time_README.txt` |
| `public/motions/external/good_tea_shake_README.txt` | `assets/motions/external/good_tea_shake_README.txt` |
| `public/motions/external/lovermax_tiktok_hip_sway_README.txt` | `assets/motions/external/lovermax_tiktok_hip_sway_README.txt` |
| `public/motions/external/breath_original/*` | `assets/motions/external/breath_original/*` |

### 4.4 姿态映射

| 姿态 ID | 当前路径 | 迁移后路径 | 状态 |
|---|---|---|---|
| `defaultStand` | `public/poses/generated/default_stand.vpd` | `assets/poses/generated/default_stand.vpd` | 默认姿态，必须可用 |

### 4.5 URL 映射规则

迁移前：

```text
/models/hiying_pmx/星穹铁道—绯英2.pmx
/motions/generated/breath_hiying_compatible.vmd
/poses/generated/default_stand.vpd
```

迁移后：

```text
/assets/models/hiying_pmx/%E6%98%9F%E7%A9%B9%E9%93%81%E9%81%93%E2%80%94%E7%BB%AF%E8%8B%B12.pmx
/assets/motions/generated/breath_hiying_compatible.vmd
/assets/poses/generated/default_stand.vpd
```

代码中不手写编码后的 URL。统一由 URL builder 从 registry path 生成浏览器 URL。

### 4.6 资源扫描器要求

扫描器必须输出：

- characters 数量；
- motions 数量；
- poses 数量；
- 每个资源的源文件路径；
- 每个资源的浏览器 URL；
- missing 文件列表；
- optional missing 文件列表；
- 中文/空格路径 URL 编码检查结果。

迁移验收时必须确认：

```text
models: 当前 2 个模型目录完整迁移
motions: 当前 22 个 motion 相关文件完整迁移
poses: 当前 1 个 pose 文件完整迁移
```

## 5. Web 迁移范围

### 5.1 ControlPanel 必须可用

`ControlPanel` 包含：

- 角色选择；
- 动作选择；
- 姿态选择；
- 表情控制；
- 口型/TTS 入口，如果当前 UI 已有；
- 面板收起/展开；
- 资源加载状态；
- 错误显示。

迁移后来源：

```text
apps/web/src/components/control-panel/
apps/web/src/stores/characterStore.js
apps/web/src/stores/stageStore.js
packages/characters
packages/stage
```

验收：

- 可以选择 `hiying`；
- 可以选择 `qianyeBlade`；
- 可以选择 `breath`、`idle`、`wave`、`jump`、`peek`；
- 可以选择 external 动作；
- 可以应用 `defaultStand`；
- 控制台收起后 StageView 不错位；
- 加载失败能显示错误。

### 5.2 StageView 必须可用

`StageView` 包含：

- canvas 容器；
- renderer 初始化；
- camera 初始化和 resize；
- PMX/PMD loader；
- MMDAnimationHelper；
- ActorRuntime；
- MotionController；
- PoseController；
- ExpressionController；
- LipSyncController；
- dispose；
- runtime error boundary。

迁移后来源：

```text
apps/web/src/components/stage-view/
packages/stage/
packages/core/
```

验收：

- 打开页面默认显示 `hiying`；
- 切换到 `qianyeBlade` 后模型显示正常；
- 重复切换角色不保留旧 mesh；
- 默认 `breath` 动作播放；
- VPD 姿态可应用；
- 表情和口型不互相异常覆盖；
- 窗口 resize 后模型仍可见；
- Web 控制台无阻塞性运行时错误。

### 5.3 ChatPanel 只做 UI 禁用态

`ChatPanel` 本轮只实现：

- 右侧面板布局；
- 会话列表空态；
- 消息列表空态；
- 输入框；
- 发送按钮；
- 停止按钮；
- 禁用提示；
- 配置入口占位。

明确禁止：

- 不发送请求；
- 不创建 session；
- 不保存消息；
- 不连接 OpenRouter；
- 不连接 Claude Code；
- 不连接 Server SSE；
- 不触发 TTS；
- 不触发 Stage command。

推荐禁用文案：

```text
Chat is not available in this migration build.
Stage controls are available on the left.
```

验收：

- ChatPanel 显示在右侧；
- 输入框和按钮处于 disabled；
- 点击发送不会产生网络请求；
- ChatPanel 不影响 ControlPanel 和 StageView；
- 隐藏/收起右侧面板后 StageView 仍正常。

## 6. 代码迁移步骤

## Phase 0：确认基线和资源

### 目标

在删除旧 Viewer 前，记录当前能用的能力和资源。

### 步骤

1. 运行当前项目：

```bash
npm install --registry=https://registry.npmmirror.com
npm run prepare-assets
npm run dev
```

2. 记录当前资源数量：

```bash
find public/models -type f | wc -l
find public/motions -type f | wc -l
find public/poses -type f | wc -l
```

3. 保存一份当前 manifest：

```text
public/resource_manifest.json
public/models/avatar_manifest.json
public/motions/vmd_manifest.json
```

4. 手动确认：
   - 默认角色显示；
   - 角色切换；
   - 默认动作；
   - 一个 external 动作；
   - defaultStand 姿态；
   - 表情；
   - 口型/TTS，如果当前可用。

### 验收

- 已确认当前资源和功能基线；
- 可以开始删除旧入口；
- 不要求旧 Viewer 后续继续可运行。

## Phase 1：建立新目录并切换入口

### 目标

让 `apps/web` 成为唯一入口。

### 步骤

1. 创建 `apps/web`。
2. 移动入口：

| 当前 | 迁移后 |
|---|---|
| `index.html` | `apps/web/index.html` |
| `src/main.js` | 拆分到 `apps/web/src/*`、`packages/stage/*`、`packages/characters/*`、`packages/voice/*` |
| `src/style.css` | `apps/web/src/styles/*` |

3. 更新根 `package.json`：
   - `dev` 指向 `apps/web`；
   - `build` 指向 `apps/web`；
   - `preview` 指向 `apps/web`；
   - `prepare-assets` 改名为 `assets:scan` 或保留 alias。
4. 删除或废弃旧根入口：
   - 根 `index.html` 不再使用；
   - 根 `src/main.js` 不再作为入口；
   - 根 `src/style.css` 不再作为入口。

### 验收

- `npm run dev` 打开的是 `apps/web`；
- 根旧入口不存在或明确不可用；
- 页面能渲染基础三栏布局；
- 没有同时维护两个 Viewer。

## Phase 2：迁移资源到 assets

### 目标

把资源真源从 `public` 改为 `assets`。

### 步骤

1. 创建 `assets/models`、`assets/motions`、`assets/poses`。
2. 移动模型目录：
   - `public/models/hiying_pmx` -> `assets/models/hiying_pmx`
   - `public/models/qianye_blade_pmx` -> `assets/models/qianye_blade_pmx`
3. 移动动作目录：
   - `public/motions/generated` -> `assets/motions/generated`
   - `public/motions/external` -> `assets/motions/external`
   - `public/motions/local` -> `assets/motions/local`
4. 移动姿态目录：
   - `public/poses/generated` -> `assets/poses/generated`
5. 新扫描器输出 `.generated/assets-registry.json`。
6. Vite dev server 映射 `/assets/*` 到仓库 `assets/*`。
7. 删除旧 `public` 资源目录，或者只保留说明文件。

### 验收

- `npm run assets:scan` 成功；
- registry 中没有静默 missing；
- 中文路径可生成有效浏览器 URL；
- `hiying` 和 `qianyeBlade` 模型文件真实存在；
- 所有 VMD/VPD 文件真实存在或被标为 optional missing。

## Phase 3：迁移 Stage Runtime

### 目标

把舞台运行逻辑从旧 `src/main.js` 抽到 `packages/stage`。

### 目标模块

```text
packages/stage/StageRuntime
packages/stage/ActorRuntime
packages/stage/MotionController
packages/stage/PoseController
packages/stage/ExpressionController
packages/stage/LipSyncController
packages/stage/CameraController
```

### 当前函数归属

| 当前函数/职责 | 迁移后 |
|---|---|
| `getRenderSize()`、`resize()`、`animate()` | `StageRuntime` |
| renderer/scene/camera 初始化 | `StageRuntime` |
| `loadModel()` | `StageRuntime.loadActor()` + `ActorRuntime` |
| `prepareMaterials()` | `ActorRuntime` |
| `buildBoneMap()` | `ActorRuntime` |
| `removeRegisteredMeshFromHelper()` | `ActorRuntime.dispose()` |
| `resolveInitialMotion()` | `MotionController` + character defaults |
| `loadMotion()`、`loadMotionById()` | `MotionController` |
| `loadPose()`、`loadPoseById()` | `PoseController` |
| `setMorph()`、`resetFacial()` | `ExpressionController` |
| `applyEmotion()`、`setEmotion()` | `ExpressionController` |
| `setMouth()` | `LipSyncController` |
| `fitCamera()` | `CameraController` |

### 验收

- StageView 默认加载 `hiying`；
- 可以切换到 `qianyeBlade`；
- VMD、VPD、表情、口型、camera resize 可用；
- dispose 后重复切换不累积 mesh/helper/event listener；
- `packages/stage` 不依赖 ChatPanel、Provider、Server。

## Phase 4：迁移 Character 和 Asset Registry

### 目标

用 registry 替代旧 manifest。

### 步骤

1. 从旧 manifest 迁出角色：
   - `hiying`
   - `qianyeBlade`
2. 从旧 manifest 迁出 motions 和 poses。
3. 建立 registry reader：
   - 读取 `.generated/assets-registry.json`；
   - 读取 `.generated/characters-registry.json`；
   - 输出 Web 可用 DTO。
4. ControlPanel 从 registry 获取角色、动作、姿态选项。
5. 删除旧 manifest 运行时依赖。

### 验收

- 不再 fetch `public/resource_manifest.json`；
- 不再 fetch `public/models/avatar_manifest.json`；
- 不再 fetch `public/motions/vmd_manifest.json`；
- ControlPanel 选项和旧 Viewer 等价；
- 默认角色、默认动作、默认姿态正确。

## Phase 5：迁移 ControlPanel

### 目标

让左侧控制台在新架构中完整可用。

### 组件拆分

```text
ControlPanel
CharacterSelect
MotionSelect
PoseSelect
ExpressionControls
LipControls
PanelCollapseButton
StatusBar
```

### 步骤

1. 从旧 DOM 绑定迁移到组件事件。
2. 从 registry 初始化选项。
3. 事件调用 StageRuntime API。
4. 状态写入 `stageStore`。
5. 错误写入 `appStore` 或 `stageStore.error`。

### 验收

- 所有 select 有选项；
- 选择角色触发模型切换；
- 选择动作触发 VMD；
- 选择姿态触发 VPD；
- 表情控制有效；
- collapse 有效；
- 控制台操作不会触发 ChatPanel。

## Phase 6：迁移 StageView

### 目标

让中央舞台在新架构中完整可用。

### 组件拆分

```text
StageView
StageCanvas
StageStatusOverlay
StageErrorOverlay
```

### 步骤

1. StageView 创建并持有 StageRuntime。
2. 挂载时初始化 renderer。
3. 卸载时 dispose。
4. 订阅 ControlPanel 发出的 stage state。
5. 展示加载状态和错误。
6. resize 时更新 camera 和 renderer。

### 验收

- 默认模型自动显示；
- canvas 不被左右面板遮挡；
- 错误 overlay 不阻塞正常控制；
- 页面 resize 后模型仍可见；
- 控制台收起/展开后 StageView 尺寸正确。

## Phase 7：实现 ChatPanel 禁用 UI

### 目标

右侧面板存在，但明确不可用。

### 步骤

1. 创建 `ChatPanel`。
2. 实现空会话状态。
3. 实现 disabled input。
4. 实现 disabled send/stop buttons。
5. 显示当前不可用提示。
6. 禁止任何网络请求和 session 创建。

### 验收

- ChatPanel UI 在右侧；
- 输入区 disabled；
- 点击按钮没有副作用；
- Network 面板中没有 chat/session/provider 请求；
- ChatPanel 不影响 StageView FPS、加载和控制。

## Phase 8：清理旧 Viewer 和旧资源入口

### 目标

删除双入口和双真源。

### 步骤

1. 删除或废弃根 `index.html`。
2. 删除或废弃根 `src/main.js`。
3. 删除或废弃根 `src/style.css`。
4. 删除旧 runtime manifest：
   - `public/resource_manifest.json`
   - `public/models/avatar_manifest.json`
   - `public/motions/vmd_manifest.json`
5. 更新脚本路径：
   - `scripts/scan_public_assets.py` -> `scripts/assets/scan_assets.py`
   - `scripts/auto_check_all.sh` -> `scripts/checks/auto_check_all.sh`
6. 更新 README 和 docs 中旧命令。

### 验收

- 搜索不到旧入口被启动脚本引用；
- 搜索不到运行时代码 fetch 旧 manifest；
- `npm run dev`、`npm run build`、`npm run preview` 都走 `apps/web`；
- `public` 不再保存模型、动作、姿态真源。

## 7. 最终验收清单

### 命令验收

```bash
npm install --registry=https://registry.npmmirror.com
npm run assets:scan
npm run dev
npm run build
npm run preview
npm run check
```

### UI 验收

- 页面是左中右布局；
- 左侧 `ControlPanel` 可操作；
- 中间 `StageView` 正常渲染；
- 右侧 `ChatPanel` 显示但不可用；
- 没有可用聊天入口；
- ChatPanel 不发送请求。

### Stage 验收

- 默认角色 `hiying` 显示；
- 角色可切换到 `qianyeBlade`；
- `qianyeBlade` 附件模型配置不丢；
- 默认动作 `breath` 可播放；
- generated 动作可播放；
- external 动作可播放或明确显示兼容错误；
- `defaultStand` 姿态可应用；
- 表情可用；
- 口型/TTS 能力不比迁移前少；
- resize 后模型仍可见。

### 资源验收

素材都存在
- `assets/models/hiying_pmx/星穹铁道—绯英2.pmx` 存在；
- `assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx` 存在；
- `assets/models/qianye_blade_pmx/剑.pmx` 存在；
- `assets/models/qianye_blade_pmx/環.pmx` 存在；
- `assets/motions/generated/breath_hiying_compatible.vmd` 存在；
- `assets/poses/generated/default_stand.vpd` 存在；
- `.generated/assets-registry.json` 可重建；
- `.generated/characters-registry.json` 可重建；
- registry 中没有未解释的 missing 文件。

### 代码边界验收

- `packages/stage` 不 import Web component；
- `packages/stage` 不 import ChatPanel；
- `apps/web` 通过 StageRuntime API 操作舞台；
- `ControlPanel` 不直接操作 Three.js 对象；
- `ChatPanel` 不触发 Stage command；
- 没有旧 Viewer 兼容层作为第二套运行路径。

## 8. 后续阶段，不在本轮实现

这些能力留到下一轮计划：

- `apps/server`；
- Config Loader；
- Public Config API；
- Session Store；
- Orchestrator；
- OpenRouter；
- Claude Code；
- Server SSE；
- Agent tools；
- 真正可用的 ChatPanel；
- 语音输入 STT；
- 云端 TTS；
- Multi-Agent；
- Multi-Actor。

下一轮开始前，必须先确认本轮 `ControlPanel` + `StageView` 已稳定，且 `ChatPanel` 禁用态没有隐藏的网络或状态副作用。
