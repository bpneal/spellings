import { useCallback, useEffect, useState } from 'react';
import { getVoices, speak, speechSupported, spellOut, stopSpeaking } from '../lib/speech';

/** Stop any speech when the calling screen closes (e.g. leaving a game mid-word). */
export function useStopSpeechOnExit(): void {
  useEffect(() => stopSpeaking, []);
}
import { playCorrect, playFanfare, playTap, playTryAgain } from '../lib/sounds';
import { useAppData } from '../state/useAppData';

/** Speech and sound effects using the adult's chosen voice, speed and sound setting. */
export function useSpeech() {
  const { data } = useAppData();
  const { voiceURI, rate, soundEffects } = data.settings;

  const say = useCallback((text: string) => speak(text, { voiceURI, rate }), [voiceURI, rate]);
  const sayWord = useCallback(
    (word: string) => speak(word, { voiceURI, rate: Math.max(0.5, rate - 0.1) }),
    [voiceURI, rate],
  );
  const spell = useCallback(
    (word: string) => speak(spellOut(word), { voiceURI, rate: Math.max(0.5, rate - 0.15) }),
    [voiceURI, rate],
  );

  const sfx = useCallback(
    (kind: 'correct' | 'tryAgain' | 'fanfare' | 'tap') => {
      if (!soundEffects) return;
      ({ correct: playCorrect, tryAgain: playTryAgain, fanfare: playFanfare, tap: playTap })[
        kind
      ]();
    },
    [soundEffects],
  );

  return { say, sayWord, spell, sfx, supported: speechSupported() };
}

/** Voices load asynchronously in most browsers. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getVoices());
  useEffect(() => {
    if (!speechSupported()) return;
    const update = () => setVoices(getVoices());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}
