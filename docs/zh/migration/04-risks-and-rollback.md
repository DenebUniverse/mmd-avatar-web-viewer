# 风险与回滚

## 1. Stage 视觉回归

风险：材质、透明度、骨骼、helper 注册、camera 或 resize 行为变化。

措施：

- 保持 Three.js 版本不变；
- 使用当前两个模型作为 fixture；
- 分别验证 `hiying`、`qianyeBlade`；
- 重复切换角色检查 dispose；
- 记录默认视角截图。

回滚：

- 回滚最近一个 Stage controller 提交；
- 不恢复旧 Viewer 作为长期入口；
- 如果新 `apps/web` 暂时不可用，继续修新入口，不再补旧入口兼容。

## 2. 资产 URL 与中文路径

风险：中文文件名、空格、TGA/BMP 贴图、相对贴图路径、Vite `/assets/*` 映射出错。

措施：

- 所有浏览器 URL 由统一 URL builder 生成；
- 扫描器输出 missing 和 optional missing；
- 构建前运行 `npm run assets:scan`；
- 显式检查 `星穹铁道—绯英2.pmx`、`星穹铁道—千冶·刃2.pmx`、`環.pmx`。

回滚：

- 回滚资源移动提交；
- 保留 `assets/*` 和 registry 修复，不重新启用 `public/*` 作为长期真源。

## 3. Registry 丢资源

风险：旧 manifest 中的动作、姿态、附件模型或 readme 元数据没有进入新 registry。

措施：

- 用 `public/resource_manifest.json`、`avatar_manifest.json`、`vmd_manifest.json` 做迁移输入；
- 新 registry 必须列出角色、motions、poses、missing；
- optional 资源必须显式标记。

回滚：

- 回滚 registry 生成器提交；
- 不恢复运行时 fetch 旧 manifest，修复生成器后重新生成。

## 4. ControlPanel 功能缺失

风险：角色选择、动作选择、姿态选择、表情、口型/TTS 或面板收起遗漏。

措施：

- ControlPanel 验收逐项对应旧控制台；
- 所有操作通过 StageRuntime API；
- 不让 ControlPanel 直接操作 Three.js 对象。

回滚：

- 回滚 ControlPanel 组件提交；
- 保留 StageRuntime，修复组件绑定。

## 5. StageView 布局或生命周期错误

风险：三栏布局遮挡 canvas，resize 不生效，卸载不 dispose，错误 overlay 阻塞控制。

措施：

- 固定左中右布局验收；
- StageView mount/unmount 必须成对；
- resize 后检查模型可见；
- Web 控制台不能有阻塞性运行时错误。

回滚：

- 回滚 StageView 组件提交；
- 不回滚已验证通过的 assets 和 StageRuntime。

## 6. ChatPanel 被误接入

风险：ChatPanel 虽然标记禁用，但实际发送请求、创建 session、触发 Stage command 或 TTS。

措施：

- input、send、stop 全部 disabled；
- 点击按钮没有副作用；
- smoke test 检查没有 chat/session/provider 请求；
- ChatPanel 不 import StageRuntime。

回滚：

- 回滚 ChatPanel 提交；
- 保留左侧和中间功能。

## 7. npm 命令不可用

风险：迁移后 `npm install`、`npm run dev`、`npm run build`、`npm run preview`、`npm run check` 指向旧路径或缺脚本。

措施：

- 根 `package.json` 作为唯一命令入口；
- `npm run dev` 必须启动 `apps/web`；
- `npm run assets:scan` 必须可独立运行；
- README 和 migration 文档使用同一套命令。

回滚：

- 回滚脚本修改提交；
- 修正根脚本后继续迁移，不恢复旧 Viewer 脚本。

## 8. dist 与 assets 重复

风险：主分支同时保存 `assets` 真源和 `dist` 大资源副本。

措施：

- `assets/*` 是真源；
- `dist/` 是构建产物；
- `dist/` 可删除重建；
- 独立发布包复制资源只能发生在 release 步骤。

回滚：

- 删除错误提交的 `dist` 资源副本；
- 保留 `assets/*`。

## 回滚规则

- 按提交回滚，不做整分支大回滚；
- 旧 Viewer 不作为长期回滚目标；
- 如果新入口失败，修复新入口；
- 资源删除必须发生在 registry 和 StageView 验收之后；
- 清理旧入口必须单独提交，方便单独回滚。
