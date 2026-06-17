#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --check src/main.js
node --check dist/main.js
echo "PASS: JS syntax checks passed"
