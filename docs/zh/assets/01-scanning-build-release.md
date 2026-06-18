# 资源扫描、构建与发布

## Registry

当前扫描命令：

```bash
npm run assets:scan
```

内部执行：

```bash
python3 scripts/assets/scan_assets.py
```

扫描输入：

```text
assets/models/**/*.pmx|*.pmd
assets/motions/**/*.vmd
assets/poses/**/*.vpd
apps/web/src/registry/legacy/*.json
```

扫描器输出到生成目录：

```text
.generated/assets-registry.json
.generated/characters-registry.json
.generated/resource_manifest.json
```

Registry 保存稳定 ID、相对磁盘路径、公共 URL、类型、兼容信息和来源元数据。

## 开发模式

不复制大资源：

```text
/assets/* -> assets/*
/generated/* -> .generated/*
```

`apps/web/vite.config.js` 在 dev/preview 下提供上述映射。

## 当前生产构建

```bash
npm run build
```

当前 Vite 构建输出：

```text
dist/index.html
dist/assets/index-*.js
dist/assets/index-*.css
```

`assets/` 仍是资源真源，不复制进主分支 `dist/`。

## 未来 Server 模式

Web `dist/` 和 `assets/` 可以继续分离，由 Server 分别托管。

## 独立静态包

发布命令可复制资源：

```text
dist/index.html
dist/assets/app-*.js
dist/models/...
```

但该复制只存在于 Release artifact。`dist/` 默认 `.gitignore`。

## Legacy Manifest 输入

迁移后不再运行时读取 `public/*` manifest。旧 manifest 只作为扫描器输入保留在：

```text
apps/web/src/registry/legacy/avatar_manifest.json
apps/web/src/registry/legacy/vmd_manifest.json
apps/web/src/registry/legacy/resource_manifest.json
```
