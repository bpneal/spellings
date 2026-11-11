import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { START_TIMEOUT_MS, speak, spellOut, stopSpeaking } from './speech';

class FakeUtterance {
  text: string;
  voice: unknown = null;
  lang = '';
  rate = 1;
  pitch = 1;
  private listeners = new Map<string, (() => void)[]>();
  constructor(text: string) {
    this.text = text;
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
}

/** A fake engine: `autoStart` decides whether speech actually starts (false = stuck). */
function fakeSynth(autoStart = true) {
  const synth = {
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
      if (autoStart) {
        synth.speaking = true;
        u.fire('start');
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

function install(autoStart = true) {
  synth = fakeSynth(autoStart);
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  stopSpeaking();
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

  it('cancels current speech and waits a moment before speaking again', () => {
    install();
    speak('cat');
    speak('dog');
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.spoken[1]?.text).toBe('dog');
  });

  it('only speaks the last of several quick taps', () => {
    install();
    speak('one');
    speak('two');
    speak('three');
    vi.advanceTimersByTime(100);
    expect(synth.spoken.map((u) => u.text)).toEqual(['one', 'three']);
  });

  it('resumes a paused engine', () => {
    install();
    synth.paused = true;
    speak('cat');
    expect(synth.resume).toHaveBeenCalled();
  });

  it('resets a stuck engine and retries once with the default voice', () => {
    install(false);
    speak('cat', { voiceURI: 'daniel' });
    expect(synth.speak).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(START_TIMEOUT_MS);
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.spoken[1]?.voice).toBeNull();

    // Still stuck: no endless retrying.
    vi.advanceTimersByTime(START_TIMEOUT_MS * 3);
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });

  it('does not retry speech that started normally', () => {
    install();
    speak('cat');
    vi.advanceTimersByTime(START_TIMEOUT_MS * 2);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it('keeps working after speech finishes', () => {
    install();
    speak('cat');
    synth.speaking = false;
    synth.spoken[0]?.fire('end');
    speak('dog');
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('stopSpeaking cancels anything queued', () => {
    install();
    speak('cat');
    speak('dog');
    stopSpeaking();
    vi.advanceTimersByTime(START_TIMEOUT_MS * 2);
    expect(synth.spoken.map((u) => u.text)).toEqual(['cat']);
  });
});

describe('spellOut', () => {
  it('says the word, its letters, then the word again', () => {
    expect(spellOut("can't")).toBe("can't. c, a, n, t. can't.");
  });
});
