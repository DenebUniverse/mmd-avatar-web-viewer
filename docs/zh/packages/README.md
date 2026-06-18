# packages

`packages/` 保存可复用、边界清晰的模块，不直接作为独立产品启动。

- [`core/`](./core/)：领域模型；
- [`stage/`](./stage/)：Three.js/MMD 舞台运行时；
- [`characters/`](./characters/)：Character Package 与 Registry；
- [`orchestrator/`](./orchestrator/)：Agent 和 Session 编排；
- [`protocol/`](./protocol/)：跨模块命令、事件和 schema；
- [`voice/`](./voice/)：STT、TTS 与 Lip Sync 信号。

每个 package 的 `README.md` 都包含职责和禁止依赖，`02-migration.md` 或同类文件说明当前代码如何迁入。
