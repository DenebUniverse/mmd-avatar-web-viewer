# scripts

对应目标代码目录：`scripts/`。

脚本分两层：

1. 根目录入口脚本：面向人直接执行，负责一键安装和一键启动。
2. `scripts/` 任务脚本：面向 npm script、CI 和入口脚本调用，负责可组合的扫描、生成、检查、诊断、清理和发布任务。

脚本不承载应用运行时核心逻辑。真正的业务逻辑仍放在 `apps/*` 和 `packages/*` 中；脚本只做环境编排、文件生成、检查和本地进程管理。

目标分类：

```text
install.sh                 # 首次安装入口：依赖、CLI、默认本地配置、资源扫描
start.sh                   # 本地启动入口：加载本地 secrets、转交 npm run dev 编排服务
scripts/
  assets/                  # 资源扫描、资源 registry 生成、内置动作/姿态生成
  checks/                  # 本地/CI 门禁检查，总入口和细分检查
  clean/                   # 清理本地开发进程、端口和临时产物
  diagnostics/             # 外部依赖和服务连通性诊断
  migration/               # 一次性迁移、兼容性检查和数据搬迁脚本
  release/                 # 生产构建、静态包、发布前校验
  dev_all.mjs              # 本地开发总编排：资产扫描、CCR 监督、server、web
```

所有生成文件必须可删除重建，并在文件头或 metadata 中标记 generated。

## 根目录入口脚本

### `install.sh`

职责：

- 检查 Node.js/npm 等基础命令；
- 安装项目依赖；
- 安装或提示安装本地开发所需 CLI，例如 Claude Code 和 claude-code-router；
- 创建不会提交到 Git 的本地配置模板，例如 `config/secrets.local.env`、`config/agentstage.local.yaml`；
- 准备 claude-code-router 的默认本地配置；
- 执行一次资源扫描，确保 `.generated/` 可用；
- 输出下一步启动说明。

不负责：

- 不启动长期运行服务；
- 不写入真实 API Key；
- 不把本地配置提交到仓库；
- 不生成业务数据。

### `start.sh`

职责：

- 在缺少 `node_modules` 时引导执行 `install.sh`；
- 停止旧的本地 AgentStage Web/Vite/Server 进程；
- 加载 `config/secrets.local.env`；
- 检查 `ccr` 命令是否存在并给出提示；
- 调用 `npm run dev`，由 `scripts/dev_all.mjs` 启动并监督 CCR、`apps/server` 和 `apps/web`。

不负责：

- 不安装系统级依赖，除非是在缺少 `node_modules` 时转交给 `install.sh`；
- 不修改长期配置，除非转交给 `install.sh`；
- 不直接管理 CCR daemon 生命周期；
- 不替代 `scripts/dev_all.mjs` 的开发进程编排职责。

### `scripts/dev_all.mjs`

职责：

- 先执行资源扫描，保证 `.generated/` 与当前资产一致；
- 检查 claude-code-router 是否已运行；
- 当 CCR 未运行时，以开发总进程的子进程启动 `ccr start`；
- 等待 `ccr status` 出现 `Status: Running` 或 `127.0.0.1:3457` 可连接；
- 执行 `ccr activate`，把 Claude Code 需要的环境变量写入本次 dev 进程树；
- 启动 `apps/server` 和 Vite；
- 收到退出信号或任一关键子进程异常退出时，停止整组开发进程。

注意：

- `ccr status` 在 `Status: Not Running` 时也可能返回 exit code 0，不能只依赖退出码，必须解析输出或检查 3457 端口。
- `ccr activate` 只能证明环境变量可生成，不能证明 CCR daemon 仍在运行。若 Claude Code 继承了 `ANTHROPIC_BASE_URL=http://127.0.0.1:3457`，但 3457 没有监听，就会在运行中报 `ConnectionRefused`。
- `ccr start` 是长期运行进程，本地开发应由 `scripts/dev_all.mjs` 持有并监督，避免 shell 后台进程提前退出导致 ChatPanel 卡住。

## `scripts/` 子目录职责

### `scripts/assets/`

负责从资产真源生成可删除重建的 registry 或内置资源，例如：

- 扫描 `assets/models`、`assets/motions`、`assets/poses`；
- 合并 legacy manifest；
- 输出 `.generated/assets-registry.json`、`.generated/characters-registry.json`；
- 生成内置 VMD/VPD。

### `scripts/checks/`

负责本地和 CI 门禁：

- 总入口 `auto_check_all.sh`；
- 资源 registry 检查；
- 迁移结构检查；
- JS 语法检查；
- 前端 smoke test；
- 生产构建检查。

### `scripts/clean/`

负责清理本地开发状态：

- 停止 `apps/server`；
- 停止 Vite dev server；
- 清理常用监听端口；
- 按参数决定是否保留 claude-code-router。

### `scripts/diagnostics/`

负责外部依赖诊断：

- 检查 Claude Code 是否可用；
- 检查 OpenRouter/CCR 连通性；
- 输出可操作的失败原因。

### `scripts/migration/`

只放一次性或阶段性迁移脚本，例如：

- 旧 manifest 转 registry；
- 旧目录结构迁移；
- 兼容性检查迁移过渡脚本。

迁移完成后，脚本应删除或降级为测试 fixture，不长期堆积。

### `scripts/release/`

负责发布产物相关任务，例如：

- 构建静态 bundle；
- 校验 `dist/` 可独立预览；
- 生成发布清单；
- 发布前检查。

Release 构建与开发构建分开，不能依赖本地 secrets。
