# apps/web 迁移说明

当前已完成第一轮全量迁移：`apps/web` 是唯一前端入口，旧根 Viewer 不再运行。

## 当前来源到目标文件

| 当前实现 | 当前路径 | 后续目标 |
|---|---|---|
| 入口 HTML | `apps/web/index.html` | 保持 |
| 样式 | `apps/web/src/styles/style.css` | 按组件拆分 |
| ControlPanel DOM/事件 | `apps/web/src/main.js` | `components/control-panel/*` |
| StageView DOM/生命周期 | `apps/web/src/main.js` | `components/stage-view/*` |
| ChatPanel 禁用 UI | `apps/web/index.html` + CSS + `main.js` | `components/chat-panel/*` |
| Stage runtime | `apps/web/src/main.js` | `packages/stage/*` |
| Registry 读取 | `apps/web/src/main.js` | `packages/characters` client |
| `setStatus()` / `reportRuntimeError()` | `apps/web/src/main.js` | `stores/appStore` + ErrorBanner |
| URL/OBS 参数 | `apps/web/src/main.js` | `compatibility/legacyQuery.ts` |

## 当前已完成

- `npm run dev` 指向 `apps/web`；
- `npm run build` 使用 `apps/web/vite.config.js`；
- `assets/*` 替代 `public/*` 成为资源真源；
- `.generated/assets-registry.json` 替代旧 runtime manifest；
- `ControlPanel` 和 `StageView` 可用；
- `ChatPanel` 有 session/messages/composer UI，但全部禁用；
- 旧根 `index.html`、`src/main.js`、`src/style.css` 不再使用。

## 后续拆分顺序

1. 把 ControlPanel 从 `main.js` 拆到 `components/control-panel/*`；
2. 把 StageView 生命周期从 `main.js` 拆到 `components/stage-view/*`；
3. 把 Stage runtime 从 `main.js` 拆到 `packages/stage/*`；
4. 把 registry 读取从 `main.js` 拆到 `packages/characters`；
5. 把 ChatPanel 静态 UI 拆到 `components/chat-panel/*`；
6. 下一轮再接可用 Session/Message/Agent。

## 验收

- 左侧控制台全部旧功能可用；
- 中央角色默认加载；
- 右侧 ChatPanel 可收回/展开；
- ChatPanel session 列表和 messages 列表可静态切换；
- ChatPanel 输入区 disabled，且无网络请求；
- Web bundle 中无 API Key；
- `npm run build` 和 `npm run check` 通过。
