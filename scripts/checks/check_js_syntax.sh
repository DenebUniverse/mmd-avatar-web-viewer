#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node --check apps/web/src/main.js
node --check apps/web/vite.config.js
for f in packages/*/index.js; do
  node --check "$f"
done
echo "PASS: JS syntax checks passed"
