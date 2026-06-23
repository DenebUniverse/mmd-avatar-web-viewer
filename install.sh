#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

CLAUDE_CODE_PACKAGE="${CLAUDE_CODE_PACKAGE:-@anthropic-ai/claude-code}"
CCR_PACKAGE="${CCR_PACKAGE:-@musistudio/claude-code-router}"

require_command() {
  local name="$1"
  local hint="$2"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    echo "$hint" >&2
    exit 1
  fi
}

install_global_if_missing() {
  local command_name="$1"
  local package_name="$2"
  if command -v "$command_name" >/dev/null 2>&1; then
    echo "$command_name already installed: $(command -v "$command_name")"
    return
  fi
  echo "Installing $package_name globally for $command_name"
  npm install -g "$package_name"
}

write_file_if_missing() {
  local path="$1"
  local mode="${2:-}"
  if [[ -f "$path" ]]; then
    return
  fi
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  if [[ -n "$mode" ]]; then
    chmod "$mode" "$path"
  fi
}

require_command node "Install Node.js 20 LTS or newer, then rerun ./install.sh."
require_command npm "Install npm with Node.js, then rerun ./install.sh."

node -e "const major=Number(process.versions.node.split('.')[0]); if (major < 20) { console.error('Node.js 20+ is required. Current: ' + process.version); process.exit(1); }"

echo "Installing project dependencies"
npm install

install_global_if_missing claude "$CLAUDE_CODE_PACKAGE"
install_global_if_missing ccr "$CCR_PACKAGE"

echo "Preparing local config files"
mkdir -p config
write_file_if_missing config/secrets.local.env 600 <<'EOF'
# Local-only secrets for AgentStage Web. Ignored by Git.
#
# 这里是本项目唯一需要你手动填的地方。填入 OpenRouter API Key 后，
# install.sh / start.sh 会自动把它同步进 claude-code-router 的 config.json（CCR 只认那个文件）。
#
# 1. 去 https://openrouter.ai 注册并创建一个 API Key（形如 sk-or-v1-...）。
# 2. 取消下面这行注释并填入你的 key：
# OPENROUTER_API_KEY=sk-or-v1-replace-me
#
# 下面两个通常由 `ccr activate` 自动提供，一般不用手填：
# ANTHROPIC_BASE_URL=http://127.0.0.1:3457
# ANTHROPIC_AUTH_TOKEN=claude-code-router-local
EOF

# 在生成 CCR config 之前加载本机 secrets，使 OPENROUTER_API_KEY 可用。
if [[ -f config/secrets.local.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source config/secrets.local.env
  set +a
fi

if [[ ! -f config/agentstage.local.yaml ]]; then
  CLAUDE_BIN="$(command -v claude || echo claude)"
  cat > config/agentstage.local.yaml <<EOF
agent:
  workspace: $ROOT_DIR

claude_code:
  command: $CLAUDE_BIN

ccr:
  enabled: true
  autostart: true
  required: false
EOF
  chmod 600 config/agentstage.local.yaml
fi

echo "Preparing claude-code-router config"
mkdir -p "$HOME/.claude-code-router"
if [[ ! -f "$HOME/.claude-code-router/config.json" ]]; then
  cat > "$HOME/.claude-code-router/config.json" <<'JSON'
{
  "PORT": 3457,
  "LOG": true,
  "LOG_LEVEL": "info",
  "APIKEY": "claude-code-router-local",
  "API_TIMEOUT_MS": 600000,
  "NON_INTERACTIVE_MODE": true,
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "${OPENROUTER_API_KEY}",
      "models": [
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free"
      ],
      "transformer": {
        "use": ["openrouter"]
      }
    }
  ],
  "Router": {
    "default": "openrouter,google/gemma-4-31b-it:free",
    "background": "openrouter,google/gemma-4-26b-a4b-it:free",
    "think": "openrouter,google/gemma-4-31b-it:free",
    "longContext": "openrouter,google/gemma-4-31b-it:free",
    "longContextThreshold": 60000
  }
}
JSON
  chmod 600 "$HOME/.claude-code-router/config.json"
else
  echo "CCR config already exists: $HOME/.claude-code-router/config.json"
fi

# 把 OPENROUTER_API_KEY 写进 CCR config 的 openrouter.api_key。
# CCR 不会运行时展开 ${OPENROUTER_API_KEY}，必须落成真实字面值。
echo "Syncing OpenRouter key into CCR config"
node scripts/setup/ensure-ccr-key.mjs || true

echo "Scanning assets"
npm run assets:scan

echo "Verifying installed commands"
claude --version || true
ccr status >/dev/null 2>&1 || true

if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
  cat <<EOF

Install complete. OpenRouter key 已同步到 CCR。

启动：
  ./start.sh

打开： http://127.0.0.1:5173/

EOF
else
  cat <<EOF

Install complete，但还没有配置 OpenRouter API Key。

要让聊天（Claude Code → CCR → OpenRouter）跑通，请：
  1. 去 https://openrouter.ai 创建 API Key；
  2. 编辑 config/secrets.local.env，写入 OPENROUTER_API_KEY=sk-or-v1-...；
  3. 运行 ./start.sh（会自动把 key 同步进 CCR）。

只看模型舞台（不聊天）则可直接 ./start.sh。

EOF
fi
