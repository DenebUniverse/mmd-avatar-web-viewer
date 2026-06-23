#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -d node_modules ]]; then
  echo "node_modules not found. Running ./install.sh first."
  ./install.sh
fi

echo "Stopping stale AgentStage app/web services"
scripts/clean/kill-services.sh --keep-ccr

if [[ -f config/secrets.local.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source config/secrets.local.env
  set +a
fi

if ! command -v ccr >/dev/null 2>&1; then
  echo "Warning: ccr command not found. Run ./install.sh first."
fi

# 把 config/secrets.local.env 里的 OPENROUTER_API_KEY 同步进 CCR config，使「填 key → 启动即生效」。
echo "Syncing OpenRouter key into CCR config"
node scripts/setup/ensure-ccr-key.mjs || true

echo "Starting AgentStage Web"
echo "npm run dev will start and supervise claude-code-router."
exec npm run dev
