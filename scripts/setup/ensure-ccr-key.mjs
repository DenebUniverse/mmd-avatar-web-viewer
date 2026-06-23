#!/usr/bin/env node
// 把 OPENROUTER_API_KEY 同步进 claude-code-router 的 config.json。
//
// 背景：CCR 是独立进程，只读 ~/.claude-code-router/config.json 里 provider 的 api_key 字面值，
// 不会在运行时展开 ${OPENROUTER_API_KEY}，也不读 apps/server 的 process.env。
// 因此本项目约定「唯一填 key 的地方是 config/secrets.local.env（或 shell 导出）」，
// 由本脚本在 install / start 时把它写进 CCR config，实现「填了就生效」。
//
// 用法：
//   node scripts/setup/ensure-ccr-key.mjs
// 行为：
//   - 读环境变量 OPENROUTER_API_KEY；
//   - 若 CCR config 不存在则跳过（交给 install.sh 生成）；
//   - 把 openrouter provider 的 api_key 设为该值；
//   - 不存在 key 时只告警、不报错（允许用户用 ccr ui 等其他方式配置）；
//   - 永不打印 key 本身。

import { readFile, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const CCR_CONFIG_PATH = process.env.CCR_CONFIG_PATH
  || path.join(homedir(), '.claude-code-router', 'config.json');

const PLACEHOLDER_PATTERNS = [/^\$\{.*\}$/, /replace-me/i, /^\s*$/];

function isPlaceholder(value) {
  return typeof value !== 'string' || PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function maskKey(value) {
  if (typeof value !== 'string' || value.length < 8) return '(set)';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  let raw;
  try {
    raw = await readFile(CCR_CONFIG_PATH, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') {
      console.warn(`[ensure-ccr-key] CCR config 不存在：${CCR_CONFIG_PATH}（跳过，install.sh 会生成）。`);
      return;
    }
    throw err;
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    console.warn(`[ensure-ccr-key] CCR config 不是合法 JSON，已跳过：${err?.message || err}`);
    return;
  }

  const providers = Array.isArray(config.Providers) ? config.Providers : [];
  const openrouter = providers.find((p) => p?.name === 'openrouter');

  if (!openrouter) {
    console.warn('[ensure-ccr-key] CCR config 中未找到 openrouter provider，已跳过。');
    return;
  }

  if (!apiKey) {
    if (isPlaceholder(openrouter.api_key)) {
      console.warn('[ensure-ccr-key] 未设置 OPENROUTER_API_KEY，且 CCR config 仍是占位符。');
      console.warn('  请在 config/secrets.local.env 写入 OPENROUTER_API_KEY=sk-or-v1-...（去 https://openrouter.ai 注册获取），');
      console.warn('  或直接编辑 ' + CCR_CONFIG_PATH + ' 的 openrouter.api_key。');
    } else {
      console.log(`[ensure-ccr-key] 未提供新 key，保留 CCR 现有 key：${maskKey(openrouter.api_key)}`);
    }
    return;
  }

  if (openrouter.api_key === apiKey) {
    console.log(`[ensure-ccr-key] CCR openrouter key 已是最新：${maskKey(apiKey)}`);
    return;
  }

  openrouter.api_key = apiKey;
  await writeFile(CCR_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  await chmod(CCR_CONFIG_PATH, 0o600).catch(() => {});
  console.log(`[ensure-ccr-key] 已把 OPENROUTER_API_KEY 写入 CCR config：${maskKey(apiKey)}`);
}

main().catch((err) => {
  console.error(`[ensure-ccr-key] 失败：${err?.message || err}`);
  process.exitCode = 1;
});
