# scripts 迁移说明

## 原则

- 先保留旧脚本作为回归门禁；
- 新模块测试稳定后再逐项替代；
- 不在目录移动同时重写检测逻辑；
- Release 构建与开发构建分开。
- 根目录只保留人直接执行的一键入口，内部可组合任务全部收敛到 `scripts/`。
- 安装、启动、检查、发布互相解耦，避免一个脚本同时承担多种生命周期职责。

## 顺序

1. 保留 `install.sh` 作为首次安装入口，负责依赖、CLI、本地配置模板和资源扫描；
2. 保留 `start.sh` 作为本地启动入口，负责加载 secrets、准备 CCR、清理旧服务并转交给 `npm run dev`；
3. `scripts/dev_all.mjs` 继续作为 `npm run dev` 的前后端开发服务编排；
4. `auto_check_all.sh` 继续作为迁移检查总入口；
5. 增加 workspace lint/typecheck/test；
6. Asset Registry 测试替代旧 manifest 检查；
7. Stage tests 替代源码字符串检查；
8. Web component/E2E 替代 DOM 静态检查；
9. 将外部依赖排查脚本收敛到 `scripts/diagnostics/`；
10. 将本地进程清理脚本收敛到 `scripts/clean/`；
11. 将发布构建和 dist 校验收敛到 `scripts/release/`；
12. 最后移除一次性兼容脚本。

## 最终入口

面向使用者：

```bash
./install.sh
./start.sh
```

面向开发和 CI：

```bash
npm run assets:scan
npm run dev
npm run build
npm run check
npm run stop
```

面向脚本内部组合：

```text
scripts/assets/*
scripts/checks/*
scripts/clean/*
scripts/diagnostics/*
scripts/migration/*
scripts/release/*
```
