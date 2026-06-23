#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node --check apps/web/src/main.js
node --check apps/web/vite.config.js
node --check apps/server/src/main.js
node --check apps/server/src/config.js
node --check apps/server/src/ccr.js
node --check scripts/dev_all.mjs
for f in packages/*/index.js; do
  node --check "$f"
done
echo "PASS: JS syntax checks passed"
