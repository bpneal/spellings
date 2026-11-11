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
 * Browser speech engines (Chrome on macOS and Safari especially) can get stuck and go
 * silent until the page is reloaded. To keep speech working:
 * - keep a reference to the current utterance (Chrome can garbage-collect one mid-speech,
 *   which stalls the queue);
 * - leave a short gap after cancel() before speaking (Chrome can silently drop an utterance
 *   queued straight after a cancel);
 * - always call resume() first: Chrome can leave the engine paused (e.g. after the tab was in
 *   the background) while still reporting `paused === false`;
 * - if speech errors or hasn't started within a moment, reset the engine and retry once with
 *   the default voice (covers a stuck engine or a voice that has stopped working);
 * - if requests keep failing, report the engine as "stuck" so the UI can offer a reload,
 *   which is the only thing that revives Chrome's engine once it has died.
 * A short in-memory log of what happened is kept for the troubleshooting panel in Settings.
 */
const CANCEL_GAP_MS = 150;
export const START_TIMEOUT_MS = 1500;
/** Requests that fail (including their retry) in a row before speech is reported stuck. */
export const STUCK_AFTER_FAILURES = 2;
const LOG_MAX = 30;

/** Error codes caused by our own cancel() calls; not real failures. */
const CANCEL_ERRORS = new Set(['interrupted', 'canceled']);

export type SpeechHealth = 'ok' | 'stuck';

export interface SpeechLogEntry {
  at: number;
  event: 'speak' | 'start' | 'end' | 'error' | 'timeout' | 'retry' | 'failed' | 'stuck' | 'reset';
  text: string;
  detail?: string;
}

let current: SpeechSynthesisUtterance | null = null;
let queued: ReturnType<typeof setTimeout> | undefined;
let watchdog: ReturnType<typeof setTimeout> | undefined;
let failuresInARow = 0;
let health: SpeechHealth = 'ok';
let log: readonly SpeechLogEntry[] = [];
let visibilityHooked = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function record(event: SpeechLogEntry['event'], text: string, detail?: string): void {
  log = [...log.slice(-(LOG_MAX - 1)), { at: Date.now(), event, text: text.slice(0, 40), detail }];
  emit();
}

function setHealth(next: SpeechHealth): void {
  if (health === next) return;
  health = next;
  emit();
}

export function subscribeSpeech(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSpeechHealth = (): SpeechHealth => health;
export const getSpeechLog = (): readonly SpeechLogEntry[] => log;

function clearTimers(): void {
  clearTimeout(queued);
  clearTimeout(watchdog);
  queued = undefined;
  watchdog = undefined;
}

/** When the tab comes back into view, give an idle engine a fresh start. */
function hookVisibility(): void {
  if (visibilityHooked || typeof document === 'undefined') return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || current !== null) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  });
}

function requestFailed(text: string): void {
  failuresInARow++;
  record('failed', text, `${failuresInARow} in a row`);
  if (failuresInARow >= STUCK_AFTER_FAILURES && health !== 'stuck') {
    record('stuck', text);
    setHealth('stuck');
  }
}

export function speak(text: string, opts: SpeakOptions = {}, retry = false): void {
  if (!speechSupported() || !text) return;
  const synth = window.speechSynthesis;
  hookVisibility();
  clearTimers();

  const busy = synth.speaking || synth.pending || current !== null;
  if (busy) {
    current = null;
    synth.cancel();
  }
  synth.resume();

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
    let settled = false;
    // This utterance's own watchdog. Events from an earlier, cancelled utterance can arrive
    // late, so each utterance only ever clears its own timer.
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Give up on this attempt: retry once, or count the request as failed.
    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (current === u) current = null;
      synth.cancel();
      if (retry) {
        requestFailed(text);
      } else {
        record('retry', text, reason);
        speak(text, opts, true);
      }
    };

    u.addEventListener('start', () => {
      started = true;
      clearTimeout(timer);
      failuresInARow = 0;
      setHealth('ok');
      record('start', text, voice?.name ?? 'default voice');
    });
    u.addEventListener('end', () => {
      settled = true;
      if (current === u) current = null;
      clearTimeout(timer);
      record('end', text);
    });
    u.addEventListener('error', (e) => {
      const code = (e as SpeechSynthesisErrorEvent).error ?? 'unknown';
      record('error', text, code);
      if (CANCEL_ERRORS.has(code) || started) {
        settled = true;
        if (current === u) current = null;
        clearTimeout(timer);
        return;
      }
      fail(`error: ${code}`);
    });

    current = u;
    record('speak', text, retry ? 'retry, default voice' : (voice?.name ?? 'default voice'));
    synth.speak(u);

    timer = setTimeout(() => {
      if (started || current !== u) return;
      record('timeout', text);
      fail('did not start');
    }, START_TIMEOUT_MS);
    watchdog = timer;
  };

  // A retry always follows a cancel(), so it needs the same gap.
  if (busy || retry) queued = setTimeout(start, CANCEL_GAP_MS);
  else start();
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  clearTimers();
  current = null;
  window.speechSynthesis.cancel();
}

/** Clear any stuck state (used by the troubleshooting panel). */
export function resetSpeech(): void {
  stopSpeaking();
  if (speechSupported()) window.speechSynthesis.resume();
  failuresInARow = 0;
  setHealth('ok');
  record('reset', '');
}

/**
 * The pause between spelled-out letters for a speaking speed. Punctuation is used because
 * every voice pauses at it, including voices that ignore the speed setting (common with the
 * built-in Mac voices in Chrome), so slower settings always give slower letters.
 */
export function letterPause(rate: number): string {
  if (rate >= 1) return ', ';
  if (rate >= 0.7) return '. ';
  return '… ';
}

/**
 * "cat" → "cat. c. a. t. cat." — used to model the spelling. The gap between letters
 * follows the speaking speed (see letterPause).
 */
export function spellOut(word: string, rate = 0.85): string {
  const letters = [...word].filter((ch) => /\p{L}/u.test(ch)).join(letterPause(rate));
  return `${word}. ${letters}. ${word}.`;
}
