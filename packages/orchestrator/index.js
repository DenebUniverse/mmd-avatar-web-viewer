import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SAFE_PERMISSION_MODES = ['plan', 'acceptEdits', 'auto', 'dontAsk'];

export class AgentStageOrchestrator {
  constructor(options) {
    this.config = normalizeOrchestratorConfig(options);
    this.store = new FileSessionStore(this.config.dataDir);
    this.adapter = new ClaudeCodeAdapter(this.config);
    this.beforeRun = typeof options.beforeRun === 'function' ? options.beforeRun : null;
    this.activeRuns = new Map();
    this.listeners = new Map();
  }

  async init() {
    await this.store.init();
    await this.prepareClaudeConfigDir();
  }

  // 为 claude CLI 准备一个与 ~/.claude 隔离的配置目录。
  // CLAUDE_CONFIG_DIR 会把 settings、session 记录、history、日志等全部重定向到此目录，
  // 因此本项目不会读到机器全局的 ~/.claude/settings.json。
  // 同时把 config/ 中声明的 env（强制走 CCR、清掉 glm 残留）写入隔离 settings.json 的 env 块——
  // 实测该 env 块优先级高于 claude 进程继承的环境变量，是确保走 OpenRouter 而不被覆盖的关键。
  async prepareClaudeConfigDir() {
    if (!this.config.claudeConfigDir) return;
    try {
      await mkdir(this.config.claudeConfigDir, { recursive: true });
      if (this.config.claudeDebug) {
        await mkdir(path.join(this.config.claudeConfigDir, 'logs'), { recursive: true });
      }
      const settingsPath = path.join(this.config.claudeConfigDir, 'settings.json');
      const settings = { includeCoAuthoredBy: false };
      if (Object.keys(this.config.claudeEnv).length) {
        // 仅保留字符串值；空字符串用于显式清除本机残留变量。
        settings.env = Object.fromEntries(
          Object.entries(this.config.claudeEnv).map(([key, value]) => [key, value == null ? '' : String(value)]),
        );
      }
      await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    } catch (err) {
      // 隔离目录准备失败不阻塞启动，回退到默认 ~/.claude 行为。
      console.warn(`Failed to prepare CLAUDE_CONFIG_DIR (${this.config.claudeConfigDir}): ${err?.message || err}`);
    }
  }

  onSessionEvent(sessionId, listener) {
    const listeners = this.listeners.get(sessionId) || new Set();
    listeners.add(listener);
    this.listeners.set(sessionId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(sessionId);
    };
  }

  listSessions(includeDeleted = false) {
    return this.store.list(
      new Set([...this.activeRuns.keys()].map((key) => key.split(':')[0])),
      includeDeleted,
    );
  }

  getSession(id) {
    return this.store.get(id);
  }

  async createSession(input = {}) {
    return this.store.create({
      title: input.title,
      characterId: input.characterId || this.config.defaultCharacterId,
      actorId: input.actorId || 'actor_main',
      permissionMode: this.validatePermissionMode(input.permissionMode || this.config.defaultPermissionMode),
    });
  }

  async deleteSession(id) {
    if ([...this.activeRuns.keys()].some((key) => key.startsWith(`${id}:`))) {
      throw createHttpError(409, 'Stop the running task before deleting the session.');
    }
    return this.store.delete(id);
  }

  async updateSession(id, patch) {
    // 白名单：仅允许重命名、软删除标记、权限模式。
    const next = {};
    if (typeof patch.title === 'string') next.title = patch.title.trim() || '新会话';
    if (typeof patch.deleted === 'boolean') next.deleted = patch.deleted;
    if (patch.permissionMode) next.permissionMode = this.validatePermissionMode(patch.permissionMode);
    return this.store.update(id, next);
  }

  async sendMessage(sessionId, input) {
    const session = this.store.get(sessionId);
    if (!session) throw createHttpError(404, 'Session not found.');
    if ([...this.activeRuns.keys()].some((key) => key.startsWith(`${sessionId}:`))) {
      throw createHttpError(409, 'This session already has a running task.');
    }

    const text = String(input.content || input.text || '').trim();
    if (!text) throw createHttpError(400, 'Message content cannot be empty.');
    if (text.length > this.config.maxPromptChars) {
      throw createHttpError(400, `Message content exceeds ${this.config.maxPromptChars} characters.`);
    }

    const permissionMode = this.validatePermissionMode(input.permissionMode || session.permissionMode);
    const runId = randomUUID();
    const clientMessageId = typeof input.clientMessageId === 'string' && input.clientMessageId.trim()
      ? input.clientMessageId.trim().slice(0, 128)
      : undefined;
    const userMessage = {
      id: randomUUID(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
      status: 'completed',
      ...(clientMessageId ? { clientMessageId } : {}),
    };
    let updated = await this.store.appendMessage(sessionId, userMessage);
    updated = await this.store.update(sessionId, {
      permissionMode,
      characterId: input.characterId || session.characterId,
      actorId: input.actorId || session.actorId,
    });
    this.emit(sessionId, 'message.created', {
      runId,
      message: userMessage,
      session: summarize(updated, true),
    });

    const controller = new AbortController();
    this.activeRuns.set(`${sessionId}:${runId}`, controller);
    this.emit(sessionId, 'agent.run.started', {
      runId,
      sessionId,
      permissionMode,
    });

    void this.runClaude(sessionId, runId, text, permissionMode, controller).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.emit(sessionId, 'agent.run.failed', { runId, error: message });
      await this.persistAssistantError(sessionId, runId, message);
    });

    return { runId, session: updated };
  }

  async cancelRun(runId) {
    for (const [key, controller] of this.activeRuns) {
      if (key.endsWith(`:${runId}`)) {
        controller.abort();
        return true;
      }
    }
    return false;
  }

  async health() {
    return this.adapter.health();
  }

  validatePermissionMode(mode) {
    const allowed = this.config.enableBypassPermissions
      ? [...SAFE_PERMISSION_MODES, 'bypassPermissions']
      : SAFE_PERMISSION_MODES;
    if (!allowed.includes(mode)) throw createHttpError(400, `Permission mode is not enabled: ${mode}`);
    return mode;
  }

  async runClaude(sessionId, runId, prompt, permissionMode, controller) {
    const startedSession = this.store.get(sessionId);
    const adapterSessionId = startedSession?.adapter?.adapterSessionId || sessionId;
    const assistantMessageId = randomUUID();
    const liveTools = new Map();
    let streamedText = '';

    try {
      if (this.beforeRun) {
        this.emit(sessionId, 'agent.status', {
          runId,
          message: '检查 Claude Code Router',
          phase: 'ccr_check',
        });
        await this.beforeRun();
        this.emit(sessionId, 'agent.status', {
          runId,
          message: 'Claude Code Router 已就绪',
          phase: 'ccr_ready',
        });
      }
      const result = await this.adapter.send({
        sessionId,
        adapterSessionId,
        resume: Boolean(startedSession?.adapter?.claudeStarted),
        prompt,
        permissionMode,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === 'text_delta') {
            streamedText += event.text;
            this.emit(sessionId, 'message.delta', {
              runId,
              messageId: assistantMessageId,
              text: event.text,
            });
          } else if (event.type === 'text_replace') {
            streamedText = event.text;
            this.emit(sessionId, 'message.replace', {
              runId,
              messageId: assistantMessageId,
              text: event.text,
            });
          } else if (event.type === 'tool_start') {
            liveTools.set(event.tool.id, event.tool);
            this.emit(sessionId, 'tool.started', { runId, tool: event.tool });
          } else if (event.type === 'tool_input_delta') {
            const tool = liveTools.get(event.toolId);
            if (tool) tool.inputText = `${tool.inputText || ''}${event.partialJson}`;
            this.emit(sessionId, 'tool.input.delta', {
              runId,
              toolId: event.toolId,
              partialJson: event.partialJson,
            });
          } else if (event.type === 'tool_result') {
            const tool = liveTools.get(event.toolId);
            if (tool) {
              tool.result = event.result;
              tool.isError = event.isError;
              tool.status = event.isError ? 'error' : 'completed';
            }
            this.emit(sessionId, 'tool.finished', {
              runId,
              toolId: event.toolId,
              result: event.result,
              isError: event.isError,
            });
          } else if (event.type === 'status') {
            this.emit(sessionId, 'agent.status', {
              runId,
              message: event.message,
              phase: event.phase,
              retryCount: event.retryCount,
            });
          }
        },
      });

      let session = this.store.get(sessionId);
      if (result.sessionId && result.sessionId !== adapterSessionId) {
        this.emit(sessionId, 'agent.status', {
          runId,
          message: `Claude Code session_id mismatch: expected ${adapterSessionId}, got ${result.sessionId}`,
        });
      }
      const observedAdapterSessionId = adapterSessionId;
      const shouldBindClaudeSession = result.sessionId || result.sessionObserved || !result.error;
      if (session && shouldBindClaudeSession && (session.adapter?.adapterSessionId !== observedAdapterSessionId || !session.adapter?.claudeStarted)) {
        session = await this.store.update(sessionId, {
          adapter: {
            ...(session.adapter || {}),
            name: 'claude_code',
            adapterSessionId: observedAdapterSessionId,
            claudeStarted: true,
          },
        });
      }

      const finalTools = mergeTools(liveTools, result.tools);
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        text: result.text || streamedText,
        createdAt: new Date().toISOString(),
        status: result.stopped ? 'stopped' : result.error ? 'error' : 'completed',
        ...(finalTools.length ? { toolCalls: finalTools } : {}),
        ...(result.error ? { error: result.error } : {}),
      };
      session = await this.store.appendMessage(sessionId, assistantMessage);

      if (result.stopped) {
        this.emit(sessionId, 'agent.run.cancelled', { runId, message: assistantMessage, session });
      } else if (result.error) {
        this.emit(sessionId, 'agent.run.failed', {
          runId,
          message: assistantMessage,
          session,
          error: result.error,
        });
      } else {
        this.emit(sessionId, 'message.completed', { runId, message: assistantMessage });
        this.emit(sessionId, 'agent.run.completed', { runId, message: assistantMessage, session });
        if (assistantMessage.text) {
          this.emit(sessionId, 'voice.enqueue', {
            runId,
            messageId: assistantMessage.id,
            text: assistantMessage.text,
          });
        }
      }
    } finally {
      this.activeRuns.delete(`${sessionId}:${runId}`);
    }
  }

  async persistAssistantError(sessionId, runId, error) {
    const message = {
      id: randomUUID(),
      role: 'assistant',
      text: '',
      createdAt: new Date().toISOString(),
      status: 'error',
      error,
    };
    const session = await this.store.appendMessage(sessionId, message);
    this.emit(sessionId, 'agent.run.failed', { runId, message, session, error });
  }

  emit(sessionId, type, payload) {
    const event = createEvent(type, sessionId, payload);
    const listeners = this.listeners.get(sessionId);
    if (!listeners) return;
    for (const listener of listeners) listener(event);
  }
}

export class FileSessionStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.sessionsDir = path.join(dataDir, 'sessions');
    this.sessions = new Map();
  }

  async init() {
    await mkdir(this.sessionsDir, { recursive: true });
    const files = await readdir(this.sessionsDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      try {
        const raw = await readFile(path.join(this.sessionsDir, file.name), 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.id && Array.isArray(parsed.messages)) this.sessions.set(parsed.id, parsed);
      } catch (error) {
        console.warn(`Skipping unreadable session file ${file.name}:`, error);
      }
    }
  }

  list(runningIds = new Set(), includeDeleted = false) {
    return [...this.sessions.values()]
      .filter((session) => includeDeleted || !session.deleted)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((session) => summarize(session, runningIds.has(session.id)));
  }

  get(id) {
    const session = this.sessions.get(id);
    return session ? structuredClone(session) : undefined;
  }

  async create(input) {
    const now = new Date().toISOString();
    const session = {
      id: randomUUID(),
      title: input.title || '新会话',
      createdAt: now,
      updatedAt: now,
      characterId: input.characterId,
      actorId: input.actorId,
      permissionMode: input.permissionMode,
      adapter: {
        name: 'claude_code',
        adapterSessionId: null,
        claudeStarted: false,
      },
      messages: [],
    };
    this.sessions.set(session.id, session);
    await this.persist(session);
    return structuredClone(session);
  }

  async appendMessage(id, message) {
    const session = this.require(id);
    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    if (message.role === 'user' && session.messages.filter((item) => item.role === 'user').length === 1) {
      session.title = createTitle(message.text);
    }
    await this.persist(session);
    return structuredClone(session);
  }

  async update(id, patch) {
    const session = this.require(id);
    Object.assign(session, patch);
    session.updatedAt = new Date().toISOString();
    await this.persist(session);
    return structuredClone(session);
  }

  async delete(id) {
    if (!this.sessions.delete(id)) return false;
    await rm(path.join(this.sessionsDir, `${id}.json`), { force: true });
    return true;
  }

  require(id) {
    const session = this.sessions.get(id);
    if (!session) throw createHttpError(404, `Session not found: ${id}`);
    return session;
  }

  async persist(session) {
    await mkdir(this.sessionsDir, { recursive: true });
    const target = path.join(this.sessionsDir, `${session.id}.json`);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
    await rename(temporary, target);
  }
}

export class ClaudeCodeAdapter {
  constructor(config) {
    this.config = config;
  }

  async health() {
    return new Promise((resolve) => {
      const child = spawn(this.config.cliCommand, ['--version'], {
        cwd: this.config.workspace,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString('utf8');
      });
      child.on('error', (error) => {
        resolve({
          claudeAvailable: false,
          error: error.message,
        });
      });
      child.on('close', (code) => {
        resolve({
          claudeAvailable: code === 0,
          claudeVersion: output.trim() || undefined,
          error: code === 0 ? undefined : output.trim() || `claude --version exited with code ${code}`,
        });
      });
    });
  }

  async send(input) {
    const args = buildClaudeArgs(input, this.config);
    const child = spawn(this.config.cliCommand, args, {
      cwd: this.config.workspace,
      env: {
        ...process.env,
        ...this.config.claudeEnv,
        ...(this.config.claudeConfigDir ? { CLAUDE_CONFIG_DIR: this.config.claudeConfigDir } : {}),
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const parserState = createParserState();
    const tools = new Map();
    let finalText = '';
    let resultError;
    let sessionObserved = false;
    let sessionId;
    let retryCount = 0;
    let stopped = false;
    let stderr = '';

    const abort = () => {
      stopped = true;
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 2_000);
      timer.unref();
    };
    if (input.signal.aborted) abort();
    else input.signal.addEventListener('abort', abort, { once: true });

    const stdout = createInterface({ input: child.stdout, crlfDelay: Infinity });
    stdout.on('line', (line) => {
      for (const event of parseClaudeLine(line, parserState)) {
        if (event.type === 'session') {
          sessionObserved = true;
          sessionId = event.sessionId || sessionId;
        }
        if (event.type === 'text_delta') finalText += event.text;
        if (event.type === 'text_replace') finalText = event.text;
        if (event.type === 'tool_start') {
          const existing = tools.get(event.tool.id);
          tools.set(event.tool.id, existing ? { ...existing, ...event.tool } : { ...event.tool });
        }
        if (event.type === 'tool_input_delta') {
          const existing = tools.get(event.toolId);
          if (existing) {
            existing.inputText = `${existing.inputText || ''}${event.partialJson}`;
            existing.input = tryParseJson(existing.inputText);
          }
        }
        if (event.type === 'tool_result') {
          const existing = tools.get(event.toolId);
          if (existing) {
            existing.result = event.result;
            existing.isError = event.isError;
            existing.status = event.isError ? 'error' : 'completed';
          }
        }
        if (event.type === 'result') {
          if (event.text) finalText = event.text;
          if (event.isError) resultError = event.text || 'Claude Code returned an error result.';
        }
        input.onEvent(event);
      }
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      stderr = `${stderr}${text}`.slice(-12_000);
      for (const line of text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
        if (/\bretry\b|retrying|api_retry/i.test(line)) retryCount += 1;
        input.onEvent({
          type: 'status',
          message: line,
          phase: /api|connect|retry/i.test(line) ? 'api_retry' : 'stderr',
          retryCount,
        });
      }
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    }).finally(() => {
      input.signal.removeEventListener('abort', abort);
      stdout.close();
    });

    if (stopped) {
      return {
        text: finalText,
        tools: [...tools.values()],
        sessionObserved,
        sessionId,
        stopped: true,
      };
    }

    if (exitCode !== 0 || resultError) {
      return {
        text: finalText,
        tools: [...tools.values()],
        sessionObserved,
        sessionId,
        stopped: false,
        error: resultError || stderr.trim() || `Claude Code exited with code ${exitCode ?? 'unknown'}.`,
      };
    }

    return {
      text: finalText,
      tools: [...tools.values()].map((tool) =>
        tool.status === 'running' ? { ...tool, status: 'completed' } : tool,
      ),
      sessionObserved,
      sessionId,
      stopped: false,
    };
  }
}

export function buildClaudeArgs(input, config) {
  const args = [
    '-p',
    '--output-format',
    config.outputFormat,
    '--verbose',
  ];
  if (config.includePartialMessages) args.push('--include-partial-messages');
  if (config.claudeDebug && config.claudeConfigDir) {
    args.push('--debug-file', path.join(config.claudeConfigDir, 'logs', 'claude-debug.log'));
  }
  args.push('--permission-mode', input.permissionMode);
  if (config.maxTurns) args.push('--max-turns', String(config.maxTurns));
  const claudeSessionId = input.adapterSessionId || input.sessionId;
  if (input.resume) args.push('--resume', claudeSessionId);
  else args.push('--session-id', claudeSessionId);
  args.push(input.prompt.startsWith('-') ? ` ${input.prompt}` : input.prompt);
  return args;
}

export function createParserState() {
  return {
    sawTextDelta: false,
    text: '',
    blockToolIds: new Map(),
  };
}

export function parseClaudeLine(line, state) {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let value;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return [{ type: 'status', message: trimmed }];
  }

  const events = [];
  const topType = stringValue(value.type);
  const topSessionId = stringValue(value.session_id);
  if (topSessionId) events.push({ type: 'session', sessionId: topSessionId });

  if (topType === 'system') {
    const subtype = stringValue(value.subtype);
    if (subtype) events.push({ type: 'status', message: `Claude Code: ${subtype}` });
    return events;
  }

  if (topType === 'stream_event') {
    const streamEvent = objectValue(value.event);
    if (!streamEvent) return events;
    const eventType = stringValue(streamEvent.type);
    const index = numberValue(streamEvent.index) ?? -1;

    if (eventType === 'content_block_start') {
      const block = objectValue(streamEvent.content_block);
      if (block?.type === 'tool_use' && block.id && block.name) {
        state.blockToolIds.set(index, block.id);
        events.push({
          type: 'tool_start',
          tool: {
            id: block.id,
            name: block.name,
            input: block.input ?? {},
            inputText: '',
            status: 'running',
          },
        });
      }
      return events;
    }

    if (eventType === 'content_block_delta') {
      const delta = objectValue(streamEvent.delta);
      const deltaType = stringValue(delta?.type);
      if (deltaType === 'text_delta') {
        const text = stringValue(delta?.text) || '';
        if (text) {
          state.sawTextDelta = true;
          state.text += text;
          events.push({ type: 'text_delta', text });
        }
      } else if (deltaType === 'input_json_delta') {
        const partialJson = stringValue(delta?.partial_json) || '';
        const toolId = state.blockToolIds.get(index);
        if (toolId && partialJson) events.push({ type: 'tool_input_delta', toolId, partialJson });
      }
      return events;
    }
  }

  if (topType === 'assistant') {
    const message = objectValue(value.message);
    const content = Array.isArray(message?.content) ? message.content : [];
    const text = content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('');
    if (text && !state.sawTextDelta) {
      state.text = text;
      events.push({ type: 'text_replace', text });
    }
    for (const block of content) {
      if (block.type === 'tool_use' && block.id && block.name) {
        events.push({
          type: 'tool_start',
          tool: {
            id: block.id,
            name: block.name,
            input: block.input ?? {},
            inputText: block.input === undefined ? '' : JSON.stringify(block.input, null, 2),
            status: 'running',
          },
        });
      }
    }
    return events;
  }

  if (topType === 'user') {
    const message = objectValue(value.message);
    const content = Array.isArray(message?.content) ? message.content : [];
    for (const block of content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        events.push({
          type: 'tool_result',
          toolId: block.tool_use_id,
          result: contentToText(block.content),
          isError: Boolean(block.is_error),
        });
      }
    }
    return events;
  }

  if (topType === 'result') {
    const resultText = stringValue(value.result) || state.text;
    events.push({
      type: 'result',
      text: resultText,
      isError:
        Boolean(value.is_error) ||
        (stringValue(value.subtype) !== undefined && stringValue(value.subtype) !== 'success'),
      ...(topSessionId ? { sessionId: topSessionId } : {}),
      ...(numberValue(value.duration_ms) !== undefined ? { durationMs: numberValue(value.duration_ms) } : {}),
      ...(numberValue(value.total_cost_usd) !== undefined ? { totalCostUsd: numberValue(value.total_cost_usd) } : {}),
    });
  }

  return events;
}

function normalizeOrchestratorConfig(options) {
  return {
    workspace: options.workspace,
    dataDir: options.dataDir,
    defaultCharacterId: options.defaultCharacterId || 'hiying',
    defaultPermissionMode: options.defaultPermissionMode || 'acceptEdits',
    enableBypassPermissions: Boolean(options.enableBypassPermissions),
    maxPromptChars: options.maxPromptChars || 50_000,
    maxTurns: options.maxTurns,
    cliCommand: options.cliCommand || 'claude',
    outputFormat: options.outputFormat || 'stream-json',
    includePartialMessages: options.includePartialMessages !== false,
    claudeConfigDir: options.claudeConfigDir || null,
    claudeDebug: Boolean(options.claudeDebug),
    claudeEnv: options.claudeEnv && typeof options.claudeEnv === 'object' ? { ...options.claudeEnv } : {},
  };
}

function createEvent(type, sessionId, payload) {
  return {
    version: '1.0',
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    source: 'orchestrator',
    target: 'web',
    sessionId,
    sequence: Date.now(),
    payload,
  };
}

function summarize(session, running) {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    characterId: session.characterId,
    actorId: session.actorId,
    permissionMode: session.permissionMode,
    messageCount: session.messages.length,
    deleted: Boolean(session.deleted),
    running,
  };
}

function mergeTools(live, finalTools) {
  for (const tool of finalTools) {
    const previous = live.get(tool.id);
    live.set(tool.id, previous ? { ...previous, ...tool } : tool);
  }
  return [...live.values()];
}

function createTitle(text) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '新会话';
  return compact.length > 36 ? `${compact.slice(0, 36)}...` : compact;
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function objectValue(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function stringValue(value) {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        const object = objectValue(item);
        return stringValue(object?.text) || JSON.stringify(item);
      })
      .join('\n');
  }
  if (content === undefined || content === null) return '';
  return JSON.stringify(content, null, 2);
}
