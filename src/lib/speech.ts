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

/**
 * Browser speech engines (Chrome and Safari especially) can get stuck and go silent
 * until the page is reloaded. To avoid that:
 * - keep a reference to the current utterance (Chrome can garbage-collect one mid-speech,
 *   which stalls the queue);
 * - leave a short gap after cancel() before speaking (Chrome can silently drop an utterance
 *   queued straight after a cancel);
 * - resume() if the engine has been left paused (e.g. Safari after switching apps);
 * - if speech hasn't started within a moment, reset the engine and retry once with the
 *   default voice (covers a stuck engine or a voice that has stopped working).
 */
const CANCEL_GAP_MS = 80;
export const START_TIMEOUT_MS = 1500;

let current: SpeechSynthesisUtterance | null = null;
let queued: ReturnType<typeof setTimeout> | undefined;
let watchdog: ReturnType<typeof setTimeout> | undefined;

function clearTimers(): void {
  clearTimeout(queued);
  clearTimeout(watchdog);
  queued = undefined;
  watchdog = undefined;
}

export function speak(text: string, opts: SpeakOptions = {}, retry = false): void {
  if (!speechSupported() || !text) return;
  const synth = window.speechSynthesis;
  clearTimers();

  const busy = synth.speaking || synth.pending || current !== null;
  if (busy) synth.cancel();
  if (synth.paused) synth.resume();

  const start = () => {
    queued = undefined;
    const u = new SpeechSynthesisUtterance(text);
    // On a retry, let the browser use its default voice in case the chosen one is broken.
    const voice = retry ? undefined : pickVoice(opts.voiceURI);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'en-GB';
    }
    u.rate = opts.rate ?? 0.85;
    u.pitch = 1.05;

    let started = false;
    const finished = () => {
      if (current === u) current = null;
      clearTimeout(watchdog);
    };
    u.addEventListener('start', () => {
      started = true;
      clearTimeout(watchdog);
    });
    u.addEventListener('end', finished);
    u.addEventListener('error', finished);

    current = u;
    synth.speak(u);

    watchdog = setTimeout(() => {
      if (started || current !== u) return;
      current = null;
      synth.cancel();
      if (!retry) speak(text, opts, true);
    }, START_TIMEOUT_MS);
  };

  if (busy) queued = setTimeout(start, CANCEL_GAP_MS);
  else start();
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  clearTimers();
  current = null;
  window.speechSynthesis.cancel();
}

/** "cat" → "cat. c, a, t. cat." — used to model the spelling after a reveal. */
export function spellOut(word: string): string {
  const letters = [...word].filter((ch) => /\p{L}/u.test(ch)).join(', ');
  return `${word}. ${letters}. ${word}.`;
}
