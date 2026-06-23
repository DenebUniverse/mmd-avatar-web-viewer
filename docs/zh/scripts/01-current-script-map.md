# 当前脚本映射

| 当前脚本 | 当前职责 | 目标去向 |
|---|---|---|
| `install.sh` | 首次安装入口：检查 Node/npm、安装依赖和 CLI、创建本地配置、初始化 CCR 配置、扫描资源 | 保留根目录，作为人直接执行的安装入口 |
| `start.sh` | 本地启动入口：加载 secrets、启动/激活 CCR、清理旧服务、启动 dev 服务 | 保留根目录，作为人直接执行的启动入口 |
| `scripts/dev_all.mjs` | npm dev 编排：先扫描资源，再同时启动 `apps/server` 和 `apps/web` | 保留在 `scripts/`，由 `npm run dev` 和 `start.sh` 间接调用 |
| `scan_public_assets.py` | 扫描 public 资产和 manifest | `scripts/assets/scan_assets.py` |
| `scripts/assets/scan_assets.py` | 扫描资产真源和 legacy manifest，生成 `.generated/*registry*.json` | 保留在 `scripts/assets/` |
| `generate_builtin_vmd.py` | 生成内置 VMD/VPD | `scripts/assets/generate_builtin_motion.py` |
| `build_dist_fallback.py` | 生成独立 dist 并复制资源 | `scripts/release/build_static_bundle.py` |
| `auto_check_all.sh` | 12 项总检查 | `scripts/checks/check_all.sh` |
| `scripts/checks/auto_check_all.sh` | 当前迁移门禁总入口：asset registry、web migration、JS 语法、frontend smoke、production build | 保留在 `scripts/checks/`，后续可改名为 `check_all.sh` |
| `scripts/clean/kill-services.sh` | 停止本地 server/Vite/dev wrapper/CCR 和常用端口监听 | 保留在 `scripts/clean/` |
| `scripts/diagnostics/check_claude_code.sh` | Claude Code 本地可用性诊断 | 保留在 `scripts/diagnostics/` |
| `scripts/diagnostics/check_openrouter.sh` | OpenRouter/CCR 连通性诊断 | 保留在 `scripts/diagnostics/` |
| `check_resource_scanning.py` | 动态扫描检查 | Asset Registry 测试 |
| `check_character_compatibility.py` | PMX/VMD 兼容 | `tests/assets` + 检查脚本 |
| `check_vmd_architecture.py` | VMD/VPD runtime 静态检查 | `tests/stage` |
| `check_mmd_runtime_static.py` | MMD Runtime 静态门禁 | `tests/stage` |
| `check_dom_bindings.py` | DOM 绑定检查 | `apps/web` component tests |
| `check_frontend_smoke.py` | 前端冒烟 | E2E |
| `check_dist_fallback.py` | 独立 dist 检查 | Release artifact test |
| `check_js_syntax.sh` | JS 语法 | workspace lint/typecheck |
| `check_no_deprecated_vrm_branch.py` | 清理旧 VRM 分支 | 一次性迁移门禁，最终删除 |
| `check_official_pmx_package.py` | 官方 PMX/材质基线 | Asset fixture/compatibility tests |

## 入口脚本设计

`install.sh` 和 `start.sh` 不放入 `scripts/`，因为它们是面向使用者的顶层命令：

```bash
./install.sh
./start.sh
```

内部任务脚本放入 `scripts/`，并通过 npm script 形成稳定入口：

```bash
npm run dev
npm run build
npm run check
npm run assets:scan
npm run stop
```

这个边界可以避免用户需要理解内部脚本树，同时也让 CI 和开发工具可以调用更细粒度的任务。
