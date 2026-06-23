#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

const scan = spawnSync('npm', ['run', 'assets:scan'], { stdio: 'inherit' });
if (scan.status !== 0) process.exit(scan.status || 1);

const children = [];
const ccrChild = await startCcrIfNeeded();
if (ccrChild) children.push(ccrChild);
activateCcrEnv();

children.push(
  spawn(process.execPath, [path.resolve('apps/server/src/main.js')], {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  }),
  spawn('npm', ['run', 'dev:web'], {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  }),
);

let closing = false;
function shutdown(signal = 'SIGTERM') {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (!child.pid || child.killed) continue;
    try {
      if (process.platform === 'win32') child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch {
      // Child may already have exited.
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(signal);
    process.exit(0);
  });
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!closing && (code !== 0 || signal)) {
      shutdown('SIGTERM');
      process.exitCode = code ?? 1;
    }
  });
}

async function startCcrIfNeeded() {
  if (!commandExists('ccr')) {
    console.warn('Warning: ccr command not found. Run ./install.sh first.');
    return null;
  }
  if (await isCcrReady()) {
    console.log('claude-code-router already running');
    return null;
  }

  console.log('Starting claude-code-router');
  const child = spawn('ccr', ['start'], {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  });

  const ready = await waitForCcr(25_000);
  if (!ready) {
    stopChildProcess(child, 'SIGTERM');
    shutdown('SIGTERM');
    throw new Error('claude-code-router did not become ready on 127.0.0.1:3457.');
  }
  return child;
}

function stopChildProcess(child, signal = 'SIGTERM') {
  if (!child?.pid || child.killed) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    // Child may already have exited.
  }
}

function activateCcrEnv() {
  if (!commandExists('ccr')) return;
  const activation = spawnSync('ccr', ['activate'], { encoding: 'utf8' });
  if (activation.status !== 0) {
    console.warn('Warning: ccr activate failed; apps/server will try to activate CCR again.');
    if (activation.stderr) console.warn(activation.stderr.trim());
    return;
  }
  for (const [key, value] of Object.entries(parseCcrExports(activation.stdout))) {
    process.env[key] = value;
  }
}

function commandExists(command) {
  return spawnSync('command', ['-v', command], { shell: true, stdio: 'ignore' }).status === 0;
}

async function waitForCcr(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isCcrReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return isCcrReady();
}

async function isCcrReady() {
  const status = spawnSync('ccr', ['status'], { encoding: 'utf8' });
  if (/Status:\s*Running/.test(`${status.stdout || ''}\n${status.stderr || ''}`)) return true;
  return canConnect(3457);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(300);
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

function parseCcrExports(output) {
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
