export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function normalizeRuntimeError(prefix, error) {
  const message = error?.message || error?.reason?.message || error?.reason || error || '未知错误';
  return `${prefix}：${message}`;
}
