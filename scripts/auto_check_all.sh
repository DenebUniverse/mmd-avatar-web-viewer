#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/12] Resource auto-scan manifest"
python3 scripts/check_resource_scanning.py

echo "[2/12] Official PMX package/material baseline"
python3 scripts/check_official_pmx_package.py

echo "[3/12] MMD-native runtime static checks"
python3 scripts/check_mmd_runtime_static.py

echo "[4/12] DOM binding/layout runtime guard"
python3 scripts/check_dom_bindings.py

echo "[5/12] VMD/VPD architecture checks"
python3 scripts/check_vmd_architecture.py

echo "[6/12] Character/model compatibility checks"
python3 scripts/check_character_compatibility.py

echo "[7/12] JS syntax check"
bash scripts/check_js_syntax.sh

echo "[8/12] Deprecated VRM branch cleanup"
python3 scripts/check_no_deprecated_vrm_branch.py

echo "[9/12] Dist fallback files"
python3 scripts/check_dist_fallback.py

echo "[10/12] Frontend smoke test"
python3 scripts/check_frontend_smoke.py

echo "[11/12] package-lock/node_modules hygiene"
if [[ -d node_modules ]]; then
  echo "FAIL: node_modules should not be shipped in the zip"
  exit 1
fi
if [[ -f package-lock.json ]]; then
  echo "NOTE: package-lock.json exists locally; this is okay after npm install, but should not be required."
fi

echo "[12/12] Optional frontend build if dependencies are installed"
if [[ -f node_modules/vite/bin/vite.js ]]; then
  node node_modules/vite/bin/vite.js build
else
  echo "SKIP: node_modules not installed. Run npm install, then npm run build."
fi

echo "PASS: required checks passed"
