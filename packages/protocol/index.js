export const protocolVersion = 1;

export function createStageCommand(type, payload = {}) {
  return {
    version: protocolVersion,
    id: crypto.randomUUID(),
    source: 'web',
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}
