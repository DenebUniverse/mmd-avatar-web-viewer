import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(serverDir, '../../..');

export function loadServerConfig() {
  loadEnvFile(path.join(repoRoot, 'config/secrets.local.env'));

  const defaultConfig = readYamlIfExists(path.join(repoRoot, 'config/agentstage.default.yaml'));
  const localConfig = readYamlIfExists(path.join(repoRoot, 'config/agentstage.local.yaml'));
  const merged = deepMerge(defaultConfig, localConfig);

  applyEnvOverrides(merged);

  const server = merged.server || {};
  const agent = merged.agent || {};
  const claudeCode = merged.claude_code || {};
  const storage = merged.storage || {};
  const characters = merged.characters || {};

  return {
    raw: merged,
    host: String(server.host || '127.0.0.1'),
    port: positiveInt(server.port, 4310),
    apiPrefix: String(server.api_prefix || '/api/v1'),
    appName: merged.app?.name || 'AgentStage Web',
    protocolVersion: '1.0',
    workspace: resolveFromRoot(agent.workspace || '.'),
    dataDir: resolveFromRoot(storage.data_dir || './data'),
    defaultCharacterId: characters.default_character_id || 'hiying',
    defaultPermissionMode: agent.permission_mode || 'auto',
    enableBypassPermissions: Boolean(agent.enable_bypass_permissions),
    maxPromptChars: positiveInt(agent.max_prompt_chars, 50_000),
    maxTurns: positiveInt(agent.max_turns, 30),
    cliCommand: claudeCode.command || 'claude',
    outputFormat: claudeCode.output_format || 'stream-json',
    includePartialMessages: claudeCode.include_partial_messages !== false,
    claudeConfigDir: resolveFromRoot(claudeCode.config_dir || './.agentstage/claude-config'),
    claudeDebug: Boolean(claudeCode.debug),
    claudeEnv: isObject(claudeCode.env) ? { ...claudeCode.env } : {},
    ccr: {
      enabled: merged.ccr?.enabled !== false,
      autostart: merged.ccr?.autostart !== false,
      required: Boolean(merged.ccr?.required),
    },
    publicConfig: {
      appName: merged.app?.name || 'AgentStage Web',
      apiVersion: 'v1',
      protocolVersion: '1.0',
      assetBaseUrl: merged.web?.asset_base_url || '/assets',
      workspaceName: path.basename(resolveFromRoot(agent.workspace || '.')),
      defaultCharacterId: characters.default_character_id || 'hiying',
      defaultAdapter: agent.default_adapter || 'claude_code',
      defaultPermissionMode: agent.permission_mode || 'auto',
      permissionModes: Boolean(agent.enable_bypass_permissions)
        ? ['plan', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions']
        : ['plan', 'acceptEdits', 'auto', 'dontAsk'],
      maxPromptChars: positiveInt(agent.max_prompt_chars, 50_000),
      features: {
        chat: true,
        voiceInput: true,
        voiceOutput: true,
        debugPanel: Boolean(merged.web?.debug_panel),
      },
      voice: {
        sttProvider: merged.voice?.stt?.provider || 'browser',
        ttsProvider: merged.voice?.tts?.provider || 'browser',
        language: merged.voice?.tts?.language || merged.voice?.stt?.language || 'zh-CN',
      },
    },
  };
}

export function redactConfig(config) {
  return JSON.parse(
    JSON.stringify(config, (key, value) => {
      const lower = key.toLowerCase();
      if (lower.includes('key') || lower.includes('token') || lower.includes('auth')) return '[redacted]';
      return value;
    }),
  );
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    if (process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = unquote(match[2].trim());
  }
}

function readYamlIfExists(filePath) {
  if (!existsSync(filePath)) return {};
  return parseSimpleYaml(readFileSync(filePath, 'utf8'));
}

function parseSimpleYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    const withoutComment = raw.replace(/\s+#.*$/, '');
    if (!withoutComment.trim()) continue;
    const indent = withoutComment.match(/^ */)?.[0].length || 0;
    const line = withoutComment.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;

    if (line.startsWith('- ')) {
      if (!Array.isArray(parent)) continue;
      parent.push(parseYamlScalar(line.slice(2).trim()));
      continue;
    }

    const index = line.indexOf(':');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const rest = line.slice(index + 1).trim();

    if (rest === '') {
      const nextLine = lines.slice(lines.indexOf(raw) + 1).find((item) => item.trim());
      const nextIsArray = nextLine?.trim().startsWith('- ');
      const child = nextIsArray ? [] : {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else {
      parent[key] = parseYamlScalar(rest);
    }
  }

  return root;
}

function parseYamlScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => parseYamlScalar(item.trim()))
      .filter((item) => item !== '');
  }
  return unquote(value);
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function deepMerge(base, override) {
  if (!isObject(base) || !isObject(override)) return structuredClone(override ?? base ?? {});
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    result[key] = isObject(result[key]) && isObject(value) ? deepMerge(result[key], value) : structuredClone(value);
  }
  return result;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function applyEnvOverrides(config) {
  if (process.env.AGENTSTAGE_SERVER_HOST) config.server = { ...(config.server || {}), host: process.env.AGENTSTAGE_SERVER_HOST };
  if (process.env.AGENTSTAGE_SERVER_PORT) config.server = { ...(config.server || {}), port: Number(process.env.AGENTSTAGE_SERVER_PORT) };
  if (process.env.AGENTSTAGE_WORKSPACE) config.agent = { ...(config.agent || {}), workspace: process.env.AGENTSTAGE_WORKSPACE };
  if (process.env.CLAUDE_WEB_WORKSPACE) config.agent = { ...(config.agent || {}), workspace: process.env.CLAUDE_WEB_WORKSPACE };
  if (process.env.CLAUDE_WEB_CLI) config.claude_code = { ...(config.claude_code || {}), command: process.env.CLAUDE_WEB_CLI };
  if (process.env.CLAUDE_WEB_PERMISSION_MODE) config.agent = { ...(config.agent || {}), permission_mode: process.env.CLAUDE_WEB_PERMISSION_MODE };
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveFromRoot(value) {
  return path.resolve(repoRoot, String(value));
}
