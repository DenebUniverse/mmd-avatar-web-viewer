export function isBrowserSpeechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
