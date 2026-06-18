# 当前文件与函数到目标目录映射

## 1. 顶层文件

| 当前路径 | 目标路径 | 处理方式 |
|---|---|---|
| `index.html` | `apps/web/index.html` | 原样迁入后再组件化 |
| `src/style.css` | `apps/web/src/styles/*` | 按左/中/右拆分 |
| `src/main.js` | 多个模块 | 逐函数抽取，最后删除 |
| `public/models` | `assets/models` | 建 URL 映射后迁移 |
| `public/motions` | `assets/motions` | 建 Registry 后迁移 |
| `public/poses` | `assets/poses` | 建 Registry 后迁移 |
| `public/resource_manifest.json` | `.generated/assets-registry.json` | 生成文件 |
| `dist/` | `apps/web/dist` 或 root `dist` | 构建产物，忽略 Git |
| `scripts/*` | `scripts/assets|checks|release` | 分类迁移 |

## 2. `src/main.js` 函数

| 当前函数 | 目标模块/文件 |
|---|---|
| `firstExistingMotionId` | `packages/characters` 或 Web compatibility helper |
| `asArray` | 通用纯函数，必要时 `packages/core` |
| `normalizeAssetPath` | `packages/characters` Asset URL normalizer |
| `normalizeCharacter` | Character schema/mapper |
| `normalizeMotion` | Asset Registry mapper |
| `normalizePose` | Asset Registry mapper |
| `applyResourceManifest` | Character/Asset Registry client |
| `loadResourceManifest` | `apps/web` API client；迁移后不直接读文件 |
| `resolveInitialCharacterId` | Web bootstrap/config |
| `resolveInitialModelUrl` | Character Registry，不再 UI 决定 URL |
| `setStatus` | appStore/ErrorBanner |
| `reportRuntimeError` | Web error normalization |
| `getRenderSize`、`resize` | StageRuntime |
| `clamp01` | Stage utility/Core pure helper |
| `setMorph`、`resetFacial` | ExpressionController |
| `setMouth` | LipSyncController |
| `applyEmotion`、`setEmotion` | ExpressionController |
| `prepareMaterials` | ActorRuntime material setup |
| `buildBoneMap` | ActorRuntime |
| `fitCamera` | CameraController |
| `removeRegisteredMeshFromHelper` | ActorRuntime dispose |
| `resolveInitialMotion` | Character defaults + MotionController |
| `getCharacterByModelUrl` | 删除反向 URL 查找；使用 Character ID |
| `syncCharacterSelect` | Web characterStore |
| `motionLabel` | Web presentation helper |
| `loadMotion`、`loadMotionById` | MotionController |
| `loadPose`、`loadPoseById` | PoseController |
| `loadModel` | StageRuntime.loadActor |
| `startMicLipSync` | Voice input/lip signal |
| `browserSpeak` | BrowserTtsAdapter |
| `animate` | StageRuntime render loop |
| `requireEl`、`optionalEl`、`bindClick` | Web component/bootstrap；最终删除 |
| `populate*Select` | Web stores/components |
| `setPanelCollapsed` | ControlPanel state |
| `refreshResourceManifest` | Character API refresh |
| `bindUi` | Web components/controllers |
| `bootstrap` | `apps/web/src/bootstrap` |

## 3. 迁移完成判定

当 `src/main.js` 删除时，以上每个职责都必须有明确目标文件和测试。不能用新的“大一统 main.ts”替代旧文件。
