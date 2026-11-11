/** Thin wrapper around the browser's built-in (offline) speech synthesis. */

export const speechSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window;

export function getVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
    .toSorted((a, b) => rankVoice(b) - rankVoice(a) || a.name.localeCompare(b.name));
}

/** Prefer British English, then other English; prefer local (offline) voices. */
function rankVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase().replace('_', '-');
  let score = 0;
  if (lang === 'en-gb') score += 10;
  else if (lang.startsWith('en')) score += 5;
  if (v.localService) score += 2;
  if (v.default) score += 1;
  return score;
}

export function pickVoice(voiceURI: string | undefined): SpeechSynthesisVoice | undefined {
  const voices = getVoices();
  return voices.find((v) => v.voiceURI === voiceURI) ?? voices[0];
}

export interface SpeakOptions {
  voiceURI?: string;
  rate?: number;
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!speechSupported() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(opts.voiceURI);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = 'en-GB';
  }
  u.rate = opts.rate ?? 0.85;
  u.pitch = 1.05;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** "cat" → "cat. c, a, t. cat." — used to model the spelling after a reveal. */
export function spellOut(word: string): string {
  const letters = [...word].filter((ch) => /\p{L}/u.test(ch)).join(', ');
  return `${word}. ${letters}. ${word}.`;
}
