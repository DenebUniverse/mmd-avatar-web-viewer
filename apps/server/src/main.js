import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { AgentStageOrchestrator } from '../../../packages/orchestrator/index.js';
import { activateCcr, ensureCcrReady } from './ccr.js';
import { loadServerConfig, redactConfig, repoRoot } from './config.js';

const config = loadServerConfig();
let ccrStatus = activateCcr(config.ccr);
const orchestrator = new AgentStageOrchestrator({
  workspace: config.workspace,
  dataDir: config.dataDir,
  defaultCharacterId: config.defaultCharacterId,
  defaultPermissionMode: config.defaultPermissionMode,
  enableBypassPermissions: config.enableBypassPermissions,
  maxPromptChars: config.maxPromptChars,
  maxTurns: config.maxTurns,
  cliCommand: config.cliCommand,
  outputFormat: config.outputFormat,
  includePartialMessages: config.includePartialMessages,
  claudeConfigDir: config.claudeConfigDir,
  claudeDebug: config.claudeDebug,
  claudeEnv: config.claudeEnv,
  beforeRun: async () => {
    ccrStatus = await ensureCcrReady(config.ccr);
    if (config.ccr.enabled && !ccrStatus.activated) {
      throw new Error(ccrStatus.error || 'claude-code-router is not ready.');
    }
  },
});
await orchestrator.init();

const server = http.createServer(async (request, response) => {
  try {
    if (!isTrustedRequest(request)) {
      sendJson(response, 403, { error: 'Cross-origin access is not allowed.' });
      return;
    }
    setSecurityHeaders(response);

    const url = new URL(request.url || '/', `http://${request.headers.host || config.host}`);
    if (url.pathname.startsWith(config.apiPrefix)) {
      await handleApi(request, response, url);
      return;
    }
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/generated/')) {
      await serveStatic(response, url.pathname);
      return;
    }
    sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`AgentStage server: http://${config.host}:${config.port}`);
  console.log(`Workspace: ${config.workspace}`);
  console.log(`CCR detected: ${Boolean(process.env.ANTHROPIC_BASE_URL)} (${ccrStatus.activated ? 'activated' : 'not activated'})`);
});

async function handleApi(request, response, url) {
  const route = url.pathname.slice(config.apiPrefix.length) || '/';

  if (request.method === 'GET' && route === '/config/public') {
    sendJson(response, 200, config.publicConfig);
    return;
  }

  if (request.method === 'GET' && route === '/health') {
    ccrStatus = await ensureCcrReady(config.ccr, { timeoutMs: 2_000 });
    const claude = await orchestrator.health();
    sendJson(response, 200, {
      ok: true,
      appName: config.appName,
      workspace: config.workspace,
      config: redactConfig({
        cliCommand: config.cliCommand,
        dataDir: config.dataDir,
        defaultPermissionMode: config.defaultPermissionMode,
      }),
      claudeAvailable: claude.claudeAvailable,
      claudeVersion: claude.claudeVersion,
      ccrEnvironmentDetected: Boolean(process.env.ANTHROPIC_BASE_URL),
      ccrActivated: ccrStatus.activated,
      ccrError: ccrStatus.error,
      error: claude.error,
    });
    return;
  }

  if (request.method === 'GET' && route === '/config/private-health') {
    sendJson(response, 200, {
      workspace: config.workspace,
      dataDir: config.dataDir,
      ccrEnvironmentDetected: Boolean(process.env.ANTHROPIC_BASE_URL),
    });
    return;
  }

  if (request.method === 'GET' && route === '/sessions') {
    const includeDeleted = url.searchParams.get('includeDeleted') === '1';
    sendJson(response, 200, orchestrator.listSessions(includeDeleted));
    return;
  }

  if (request.method === 'POST' && route === '/sessions') {
    const body = await readJson(request);
    sendJson(response, 201, await orchestrator.createSession(body));
    return;
  }

  const sessionMatch = route.match(/^\/sessions\/([^/]+)(?:\/messages)?$/);
  if (sessionMatch) {
    const sessionId = decodeURIComponent(sessionMatch[1]);
    const isMessages = route.endsWith('/messages');
    if (request.method === 'GET' && !isMessages) {
      const session = orchestrator.getSession(sessionId);
      if (!session) {
        sendJson(response, 404, { error: 'Session not found.' });
        return;
      }
      sendJson(response, 200, session);
      return;
    }
    if (request.method === 'GET' && isMessages) {
      const session = orchestrator.getSession(sessionId);
      if (!session) {
        sendJson(response, 404, { error: 'Session not found.' });
        return;
      }
      sendJson(response, 200, session.messages);
      return;
    }
    if (request.method === 'POST' && isMessages) {
      const body = await readJson(request);
      sendJson(response, 202, await orchestrator.sendMessage(sessionId, body));
      return;
    }
    if (request.method === 'PATCH' && !isMessages) {
      const body = await readJson(request);
      sendJson(response, 200, await orchestrator.updateSession(sessionId, body));
      return;
    }
    if (request.method === 'DELETE' && !isMessages) {
      const deleted = await orchestrator.deleteSession(sessionId);
      if (deleted) response.writeHead(204).end();
      else sendJson(response, 404, { error: 'Session not found.' });
      return;
    }
  }

  const cancelMatch = route.match(/^\/runs\/([^/]+)\/cancel$/);
  if (request.method === 'POST' && cancelMatch) {
    const cancelled = await orchestrator.cancelRun(decodeURIComponent(cancelMatch[1]));
    sendJson(response, cancelled ? 202 : 404, { cancelled });
    return;
  }

  if (request.method === 'GET' && route === '/events') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId || !orchestrator.getSession(sessionId)) {
      sendJson(response, 404, { error: 'Session not found.' });
      return;
    }
    openSse(request, response, sessionId);
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

function openSse(request, response, sessionId) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write(`event: connected\n`);
  response.write(`data: ${JSON.stringify({ sessionId, timestamp: new Date().toISOString() })}\n\n`);
  const heartbeat = setInterval(() => {
    response.write(`event: heartbeat\n`);
    response.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  }, 25_000);
  const unsubscribe = orchestrator.onSessionEvent(sessionId, (event) => {
    response.write(`event: ${event.type}\n`);
    response.write(`id: ${event.id}\n`);
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  });
  request.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk.toString('utf8');
    if (body.length > 128_000) {
      const error = new Error('Request body too large.');
      error.statusCode = 413;
      throw error;
    }
  }
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Invalid JSON body.');
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

function isTrustedRequest(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function serveStatic(response, pathname) {
  const decoded = decodeURIComponent(pathname);
  const filePath = decoded.startsWith('/generated/')
    ? path.join(repoRoot, '.generated', decoded.slice('/generated/'.length))
    : path.join(repoRoot, decoded.slice(1));
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }
  response.writeHead(200, { 'Cache-Control': 'no-cache' });
  response.end(await readFile(filePath));
}
