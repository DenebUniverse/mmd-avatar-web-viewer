import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

export function activateCcr(config) {
  if (!config.enabled) {
    return { enabled: false, activated: false, env: {}, error: undefined };
  }

  const running = isCcrRunning();
  if (!running && config.autostart) {
    startCcrDetached();
  } else if (!running && config.required) {
    throw new Error('claude-code-router is not running.');
  }

  const activation = spawnSync('ccr', ['activate'], { encoding: 'utf8' });
  if (activation.status !== 0) {
    const error = activation.stderr || activation.stdout || 'Unable to read `ccr activate` output.';
    if (config.required) throw new Error(error);
    return { enabled: true, activated: false, env: {}, error };
  }

  const env = parseCcrExports(activation.stdout);
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  return {
    enabled: true,
    activated: Boolean(env.ANTHROPIC_BASE_URL && env.ANTHROPIC_AUTH_TOKEN),
    env,
    error: undefined,
  };
}

export async function ensureCcrReady(config, options = {}) {
  if (!config.enabled) return { enabled: false, activated: false, env: {}, error: undefined };

  const timeoutMs = options.timeoutMs || 20_000;
  if (!isCcrRunning() && config.autostart) startCcrDetached();

  const ready = await waitForCcr(timeoutMs);
  if (!ready) {
    const error = 'claude-code-router is not running or port 3457 is not listening.';
    if (config.required) throw new Error(error);
    return { enabled: true, activated: false, env: {}, error };
  }

  const activation = spawnSync('ccr', ['activate'], { encoding: 'utf8' });
  if (activation.status !== 0) {
    const error = activation.stderr || activation.stdout || 'Unable to read `ccr activate` output.';
    if (config.required) throw new Error(error);
    return { enabled: true, activated: false, env: {}, error };
  }

  const env = parseCcrExports(activation.stdout);
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  return {
    enabled: true,
    activated: Boolean(env.ANTHROPIC_BASE_URL && env.ANTHROPIC_AUTH_TOKEN),
    env,
    error: undefined,
  };
}

function startCcrDetached() {
  const child = spawn('ccr', ['start'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function isCcrRunning() {
  const status = spawnSync('ccr', ['status'], { encoding: 'utf8' });
  return /Status:\s*Running/.test(`${status.stdout || ''}\n${status.stderr || ''}`);
}

async function waitForCcr(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isCcrRunning() || await canConnect(3457)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return isCcrRunning() || await canConnect(3457);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

export function parseCcrExports(output) {
  const allowlist = new Set([
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_BASE_URL',
    'NO_PROXY',
    'no_proxy',
    'DISABLE_TELEMETRY',
    'DISABLE_COST_WARNINGS',
    'API_TIMEOUT_MS',
  ]);
  const result = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || !allowlist.has(match[1])) continue;
    result[match[1]] = unquote(match[2].trim());
  }
  return result;
}

function unquote(value) {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/'\\''/g, "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\([\\"$`])/g, '$1');
  }
  return value;
}
