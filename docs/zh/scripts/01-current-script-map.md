# 当前脚本映射

| 当前脚本 | 当前职责 | 目标去向 |
|---|---|---|
| `scan_public_assets.py` | 扫描 public 资产和 manifest | `scripts/assets/scan_assets.py` |
| `generate_builtin_vmd.py` | 生成内置 VMD/VPD | `scripts/assets/generate_builtin_motion.py` |
| `build_dist_fallback.py` | 生成独立 dist 并复制资源 | `scripts/release/build_static_bundle.py` |
| `auto_check_all.sh` | 12 项总检查 | `scripts/checks/check_all.sh` |
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
