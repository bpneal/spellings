import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  START_TIMEOUT_MS,
  STUCK_AFTER_FAILURES,
  getSpeechHealth,
  getSpeechLog,
  resetSpeech,
  speak,
  spellOut,
  stopSpeaking,
} from './speech';

/** Longer than the gap speak() leaves after a cancel(). */
const GAP = 200;

class FakeUtterance {
  text: string;
  voice: unknown = null;
  lang = '';
  rate = 1;
  pitch = 1;
  private listeners = new Map<string, ((e: unknown) => void)[]>();
  constructor(text: string) {
    this.text = text;
  }
  addEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, props: Record<string, unknown> = {}) {
    for (const fn of this.listeners.get(type) ?? []) fn({ type, ...props });
  }
}

/** How the fake engine reacts to speak(): start normally, do nothing (stuck), or error. */
type Behaviour = 'start' | 'stuck' | 'error';

function fakeSynth() {
  const synth = {
    behaviour: 'start' as Behaviour,
    speaking: false,
    pending: false,
    paused: false,
    spoken: [] as FakeUtterance[],
    voices: [
      { voiceURI: 'daniel', name: 'Daniel', lang: 'en-GB', localService: true, default: false },
    ],
    getVoices: () => synth.voices,
    speak: vi.fn<(u: FakeUtterance) => void>((u) => {
      synth.spoken.push(u);
      if (synth.behaviour === 'start') {
        synth.speaking = true;
        u.fire('start');
      } else if (synth.behaviour === 'error') {
        u.fire('error', { error: 'synthesis-failed' });
      }
    }),
    cancel: vi.fn<() => void>(() => {
      synth.speaking = false;
    }),
    resume: vi.fn<() => void>(() => {
      synth.paused = false;
    }),
  };
  return synth;
}

let synth: ReturnType<typeof fakeSynth>;

function install(behaviour: Behaviour = 'start') {
  synth = fakeSynth();
  synth.behaviour = behaviour;
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
}

const texts = () => synth.spoken.map((u) => u.text);

/** Long enough for an attempt to time out, wait the gap, and for the retry to time out. */
const WHOLE_FAILURE = START_TIMEOUT_MS + GAP + START_TIMEOUT_MS;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  resetSpeech();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('speak', () => {
  it('speaks straight away when the engine is idle, using the chosen voice', () => {
    install();
    speak('cat', { voiceURI: 'daniel', rate: 0.8 });
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.spoken[0]).toMatchObject({ text: 'cat', lang: 'en-GB', rate: 0.8 });
    expect(synth.spoken[0]?.voice).toMatchObject({ name: 'Daniel' });
  });

  it('always calls resume(), since Chrome can be paused without saying so', () => {
    install();
    speak('cat');
    expect(synth.resume).toHaveBeenCalled();
  });

  it('cancels current speech and waits a moment before speaking again', () => {
    install();
    speak('cat');
    speak('dog');
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(GAP);
    expect(texts()).toEqual(['cat', 'dog']);
  });

  it('only speaks the last of several quick taps', () => {
    install();
    speak('one');
    speak('two');
    speak('three');
    vi.advanceTimersByTime(GAP);
    expect(texts()).toEqual(['one', 'three']);
  });

  it('keeps working after speech finishes', () => {
    install();
    speak('cat');
    synth.speaking = false;
    synth.spoken[0]?.fire('end');
    speak('dog');
    expect(texts()).toEqual(['cat', 'dog']);
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('stopSpeaking cancels anything queued', () => {
    install();
    speak('cat');
    speak('dog');
    stopSpeaking();
    vi.advanceTimersByTime(START_TIMEOUT_MS * 2);
    expect(texts()).toEqual(['cat']);
  });
});

describe('recovering from a stuck engine', () => {
  it('resets and retries once with the default voice if speech never starts', () => {
    install('stuck');
    speak('cat', { voiceURI: 'daniel' });
    vi.advanceTimersByTime(START_TIMEOUT_MS);
    expect(synth.cancel).toHaveBeenCalled();
    // The retry waits for the gap after cancel() too.
    expect(synth.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(GAP);
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.spoken[1]?.voice).toBeNull();

    // Still stuck: no endless retrying.
    vi.advanceTimersByTime(START_TIMEOUT_MS * 3);
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });

  it('retries when the engine reports an error before speaking', () => {
    install('error');
    speak('cat', { voiceURI: 'daniel' });
    synth.behaviour = 'start';
    vi.advanceTimersByTime(GAP);
    expect(texts()).toEqual(['cat', 'cat']);
    expect(synth.spoken[1]?.voice).toBeNull();
    const errors = getSpeechLog().filter((e) => e.event === 'error');
    expect(errors.map((e) => e.detail)).toContain('synthesis-failed');
  });

  it('does not retry speech that was interrupted by our own cancel', () => {
    install();
    speak('cat');
    synth.spoken[0]?.fire('error', { error: 'interrupted' });
    vi.advanceTimersByTime(START_TIMEOUT_MS * 2);
    expect(texts()).toEqual(['cat']);
  });

  it('ignores late events from an earlier, cancelled utterance', () => {
    install('stuck');
    speak('cat');
    speak('dog');
    vi.advanceTimersByTime(GAP);
    // The cancelled "cat" reports its interruption only after "dog" has been queued.
    synth.spoken[0]?.fire('error', { error: 'interrupted' });
    vi.advanceTimersByTime(START_TIMEOUT_MS + GAP);
    // "dog" never started, so its watchdog must still have fired and retried it.
    expect(texts()).toEqual(['cat', 'dog', 'dog']);
  });

  it('reports speech as stuck after repeated failures, and recovers when it works again', () => {
    install('stuck');
    for (let i = 0; i < STUCK_AFTER_FAILURES; i++) {
      speak(`word ${i}`);
      vi.advanceTimersByTime(WHOLE_FAILURE);
    }
    expect(getSpeechHealth()).toBe('stuck');

    synth.behaviour = 'start';
    speak('cat');
    vi.advanceTimersByTime(GAP);
    expect(getSpeechHealth()).toBe('ok');
  });

  it('one failure on its own does not count as stuck', () => {
    install('stuck');
    speak('cat');
    vi.advanceTimersByTime(WHOLE_FAILURE);
    expect(getSpeechHealth()).toBe('ok');
  });

  it('resetSpeech clears the stuck state', () => {
    install('stuck');
    for (let i = 0; i < STUCK_AFTER_FAILURES; i++) {
      speak(`word ${i}`);
      vi.advanceTimersByTime(WHOLE_FAILURE);
    }
    resetSpeech();
    expect(getSpeechHealth()).toBe('ok');
  });
});

describe('spellOut', () => {
  it('says the word, its letters, then the word again (skipping punctuation)', () => {
    expect(spellOut("can't")).toBe("can't. c. a. n. t. can't.");
  });

  it('leaves longer gaps between letters at slower speeds', () => {
    expect(spellOut('cat', 1.2)).toBe('cat. c, a, t. cat.');
    expect(spellOut('cat', 1)).toBe('cat. c, a, t. cat.');
    expect(spellOut('cat', 0.85)).toBe('cat. c. a. t. cat.');
    expect(spellOut('cat', 0.7)).toBe('cat. c. a. t. cat.');
    expect(spellOut('cat', 0.6)).toBe('cat. c… a… t. cat.');
  });
});
