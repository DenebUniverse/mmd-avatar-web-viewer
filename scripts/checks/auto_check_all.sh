#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "[1/5] Asset registry"
python3 scripts/checks/check_asset_registry.py

echo "[2/5] Web migration structure"
python3 scripts/checks/check_web_migration.py

echo "[3/5] JS syntax"
bash scripts/checks/check_js_syntax.sh

echo "[4/5] Frontend smoke"
python3 scripts/checks/check_frontend_smoke.py

echo "[5/5] Production build"
npm run build

echo "PASS: migration checks passed"
