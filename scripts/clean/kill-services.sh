#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KEEP_CCR=0

for arg in "$@"; do
  case "$arg" in
    --keep-ccr)
      KEEP_CCR=1
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: scripts/clean/kill-services.sh [--keep-ccr]

Stops AgentStage local services:
  - apps/server
  - Vite apps/web
  - npm/node dev wrapper
  - claude-code-router, unless --keep-ccr is passed
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

kill_pid() {
  local pid="$1"
  local label="$2"
  if [[ -z "$pid" || "$pid" == "$$" ]]; then
    return
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi
  echo "Stopping $label (pid $pid)"
  kill "$pid" 2>/dev/null || true
}

kill_by_pattern() {
  local pattern="$1"
  local label="$2"
  if ! command -v pgrep >/dev/null 2>&1; then
    return
  fi
  local pids
  pids="$(pgrep -f "$pattern" 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return
  fi
  while IFS= read -r pid; do
    kill_pid "$pid" "$label"
  done <<< "$pids"
}

kill_listeners_on_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    return
  fi
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return
  fi
  while IFS= read -r pid; do
    kill_pid "$pid" "listener on port $port"
  done <<< "$pids"
}

kill_by_pattern "$ROOT_DIR/apps/server/src/main.js" "AgentStage server"
kill_by_pattern "$ROOT_DIR/scripts/dev_all.mjs" "AgentStage dev wrapper"
kill_by_pattern "vite --config apps/web/vite.config.js" "AgentStage Vite"
kill_by_pattern "vite.*apps/web/vite.config.js" "AgentStage Vite"

kill_listeners_on_port 4310
for port in 5173 5174 5175 5176 5177 5178 5179 5180; do
  kill_listeners_on_port "$port"
done

sleep 0.5

for port in 4310 5173 5174 5175 5176 5177 5178 5179 5180; do
  kill_listeners_on_port "$port"
done

if [[ "$KEEP_CCR" -eq 0 ]]; then
  if command -v ccr >/dev/null 2>&1; then
    echo "Stopping claude-code-router"
    ccr stop >/dev/null 2>&1 || true
  fi
  kill_listeners_on_port 3457
else
  echo "Keeping claude-code-router running"
fi

echo "AgentStage local services stopped."
