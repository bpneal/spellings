import { useEffect, useState } from 'react';
import { OnScreenKeyboard } from '../components/OnScreenKeyboard';
import { SpeakButton } from '../components/common';
import { useKeyInput, type KeyPress } from '../hooks/useKeyInput';
import { useSpeech } from '../hooks/useSpeech';
import { lookTimeMs, markAttempt } from '../lib/words';
import type { ExerciseProps } from './types';

/**
 * Level 4 (Look, Cover, Write): see the word briefly, then type it from memory.
 * Level 5 (Spelling Test): hear the word only, then type it.
 */
export function TypeWord({
  word,
  level,
  attempt,
  lastAnswer,
  extraKeys,
  showKeyboard,
  onSubmit,
}: ExerciseProps) {
  const { sayWord, sfx, supported } = useSpeech();
  // Without speech, the test falls back to Look, Cover, Write so it's still possible.
  const mode = level === 5 && supported ? 'listen' : 'look';
  const [phase, setPhase] = useState<'look' | 'write'>(mode === 'look' ? 'look' : 'write');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (mode === 'listen') {
      const t = setTimeout(() => sayWord(word), 350);
      return () => clearTimeout(t);
    }
    // Look, Cover, Write: no automatic speech; children tap 🔊 if they want to hear it.
    const t = setTimeout(() => setPhase('write'), lookTimeMs(word));
    return () => clearTimeout(t);
  }, [mode, word, sayWord]);

  const max = word.length + 6;
  const submit = () => {
    if (phase === 'write' && answer.trim()) onSubmit(answer);
  };

  const onKey = (k: KeyPress) => {
    if (phase === 'look') {
      if (k.kind === 'enter') setPhase('write');
      return;
    }
    if (k.kind === 'enter') submit();
    else if (k.kind === 'backspace') setAnswer((a) => a.slice(0, -1));
    else if (answer.length < max) {
      sfx('tap');
      setAnswer((a) => a + k.char.toLocaleLowerCase('en-GB'));
    }
  };
  useKeyInput(onKey);

  const lastTry = attempt === 2 && lastAnswer && (
    <div className="last-try">
      <span className="last-try__label">Your last try:</span>
      <span className="last-try__letters">
        {markAttempt(lastAnswer, word).map((m, i) => (
          <span key={i} className={m.ok ? 'mark-ok' : 'mark-fix'}>
            {m.char}
          </span>
        ))}
      </span>
    </div>
  );

  if (phase === 'look') {
    return (
      <div className="exercise">
        <p className="look-hint">Look carefully at the word…</p>
        <div className="target-word target-word--look">
          <span className="target-word__text">{word}</span>
          <SpeakButton text={word} big />
        </div>
        {lastTry}
        <div className="countdown" aria-hidden="true">
          <div className="countdown__bar" style={{ animationDuration: `${lookTimeMs(word)}ms` }} />
        </div>
        <button
          type="button"
          className="btn btn--primary btn--big"
          onClick={() => setPhase('write')}
        >
          I'm ready! 🙈
        </button>
      </div>
    );
  }

  return (
    <div className="exercise">
      {mode === 'listen' ? (
        <div className="target-word">
          <SpeakButton text={word} big label="Hear the word again" />
        </div>
      ) : (
        // The word is covered, but children can still listen to it.
        <div className="target-word">
          <div className="covered" aria-hidden="true">
            🙈 The word is hiding!
          </div>
          <SpeakButton text={word} big label="Hear the word" />
        </div>
      )}

      {lastTry}

      <div className={`answer-box${answer ? '' : ' answer-box--empty'}`} aria-live="polite">
        {answer || 'type here'}
        <span className="answer-box__caret" aria-hidden="true" />
      </div>

      {showKeyboard ? (
        <OnScreenKeyboard onKey={onKey} extraKeys={extraKeys} canSubmit={!!answer.trim()} />
      ) : (
        <div className="row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setAnswer((a) => a.slice(0, -1))}
            disabled={!answer}
          >
            ⌫ Delete
          </button>
          <button
            type="button"
            className="btn btn--primary btn--big"
            onClick={submit}
            disabled={!answer.trim()}
          >
            Check ✔
          </button>
        </div>
      )}
    </div>
  );
}
