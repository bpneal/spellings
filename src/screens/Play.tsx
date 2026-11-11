import { useMemo, useState } from 'react';
import { BackButton, Mascot, SpeakButton, TopBar } from '../components/common';
import { LetterTiles } from '../exercises/LetterTiles';
import { MissingLetters } from '../exercises/MissingLetters';
import { TypeWord } from '../exercises/TypeWord';
import type { ExerciseProps } from '../exercises/types';
import { useIsTouch, useKeyInput } from '../hooks/useKeyInput';
import { useSpeech, useStopSpeechOnExit } from '../hooks/useSpeech';
import { LEVELS } from '../lib/levels';
import { CORRECT_FIRST, CORRECT_SECOND, REVEAL, TRY_AGAIN, pick } from '../lib/praise';
import { STARS_FOR, applyRound, dayKey, starsForOutcomes } from '../lib/progress';
import type { Child, LevelId, Progress, RoundResult, WordOutcome } from '../lib/types';
import { chooseBlanks, extraKeysFor, isCorrect, normalise, shuffle } from '../lib/words';
import { useAppData } from '../state/useAppData';
import { RoundComplete } from './RoundComplete';

interface Item {
  word: string;
  blanks: number[];
  /** True when this is a word coming back after being revealed. */
  isRepeat: boolean;
}

type Phase =
  | { kind: 'answer' }
  | { kind: 'correct'; message: string; stars: number }
  | { kind: 'reveal'; message: string };

const blanksFor = (word: string, level: LevelId) =>
  level === 2 ? chooseBlanks(word, 'few') : level === 3 ? chooseBlanks(word, 'most') : [];

export function Play({
  child,
  progress,
  level,
  onExit,
  onLevel,
}: {
  child: Child;
  progress: Progress;
  level: LevelId;
  onExit: () => void;
  onLevel: (level: LevelId) => void;
}) {
  const { dispatch } = useAppData();
  const { say, spell, sfx } = useSpeech();
  useStopSpeechOnExit();
  const isTouch = useIsTouch();
  // Default to the on-screen keyboard on touch devices until the child toggles it.
  const [keyboardPref, setKeyboardPref] = useState<boolean>();
  const keyboardOn = keyboardPref ?? isTouch;

  const [round, setRound] = useState(0);
  const [queue, setQueue] = useState<Item[]>(() => newQueue(child.words, level));
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState<1 | 2>(1);
  const [lastAnswer, setLastAnswer] = useState<string>();
  const [phase, setPhase] = useState<Phase>({ kind: 'answer' });
  const [banner, setBanner] = useState<string>();
  const [outcomes, setOutcomes] = useState<Record<string, WordOutcome>>({});
  const [result, setResult] = useState<{ round: RoundResult; newTrophies: string[] }>();

  const extraKeys = useMemo(() => extraKeysFor(child.words), [child.words]);
  const item = queue[index];
  const totalWords = child.words.length;
  const doneWords = Object.keys(outcomes).length;
  const roundStars = starsForOutcomes(outcomes);

  const restart = () => {
    setRound((r) => r + 1);
    setQueue(newQueue(child.words, level));
    setIndex(0);
    setAttempt(1);
    setLastAnswer(undefined);
    setPhase({ kind: 'answer' });
    setBanner(undefined);
    setOutcomes({});
    setResult(undefined);
  };

  const handleSubmit = (answer: string) => {
    if (!item || phase.kind !== 'answer') return;
    const key = normalise(item.word);

    if (isCorrect(answer, item.word)) {
      const outcome: WordOutcome = item.isRepeat ? 'later' : attempt === 1 ? 'first' : 'second';
      // A repeat can only upgrade a missed word; it never overwrites the first result otherwise.
      const counted = !item.isRepeat || outcomes[key] === 'missed';
      if (counted) setOutcomes((o) => ({ ...o, [key]: outcome }));
      const message = pick(attempt === 1 && !item.isRepeat ? CORRECT_FIRST : CORRECT_SECOND);
      setBanner(undefined);
      setPhase({ kind: 'correct', message, stars: counted ? STARS_FOR[outcome] : 0 });
      sfx('correct');
      say(message);
      return;
    }

    if (attempt === 1) {
      const message = pick(TRY_AGAIN);
      setAttempt(2);
      setLastAnswer(answer);
      setBanner(message);
      sfx('tryAgain');
      say(message);
      return;
    }

    // Second miss: show the spelling, and bring the word back at the end of the round (once).
    if (!item.isRepeat) {
      setOutcomes((o) => ({ ...o, [key]: 'missed' }));
      setQueue((q) => [
        ...q,
        { word: item.word, blanks: blanksFor(item.word, level), isRepeat: true },
      ]);
    }
    const message = pick(REVEAL);
    setBanner(undefined);
    setPhase({ kind: 'reveal', message });
    spell(item.word);
  };

  const next = () => {
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
      setAttempt(1);
      setLastAnswer(undefined);
      setPhase({ kind: 'answer' });
      return;
    }
    const finished: RoundResult = {
      level,
      outcomes,
      starsEarned: starsForOutcomes(outcomes),
      date: dayKey(),
    };
    const { newTrophies } = applyRound(progress, finished);
    dispatch({ type: 'recordRound', childId: child.id, round: finished });
    setResult({ round: finished, newTrophies });
  };

  useKeyInput(
    (k) => {
      if (k.kind === 'enter') next();
    },
    phase.kind !== 'answer' && !result,
  );

  if (result) {
    return (
      <RoundComplete
        child={child}
        result={result.round}
        newTrophies={result.newTrophies}
        onAgain={restart}
        onNextLevel={level < 5 ? () => onLevel((level + 1) as LevelId) : undefined}
        onHome={onExit}
      />
    );
  }

  if (!item) return null;

  const info = LEVELS[level];
  const exerciseProps: ExerciseProps = {
    word: item.word,
    level,
    attempt,
    lastAnswer,
    blanks: item.blanks,
    extraKeys,
    showKeyboard: keyboardOn,
    onSubmit: handleSubmit,
  };
  const exerciseKey = `${round}-${index}-${attempt}`;

  return (
    <div className="screen screen--play">
      <TopBar
        left={<BackButton onClick={onExit} label="Stop" />}
        title={
          <>
            <span aria-hidden="true">{info.emoji}</span> {info.name}
          </>
        }
        right={
          <span className="pill pill--stars" aria-label={`${roundStars} stars this round`}>
            ⭐ <strong>{roundStars}</strong>
          </span>
        }
      />

      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalWords}
        aria-valuenow={doneWords}
        aria-label="Words done"
      >
        <div
          className="progress__fill"
          style={{ width: `${(doneWords / Math.max(1, totalWords)) * 100}%` }}
        />
        <span className="progress__label">
          {Math.min(doneWords, totalWords)} / {totalWords}
        </span>
      </div>

      <main className="play">
        {phase.kind === 'answer' && (
          <>
            <p className="instruction">
              {item.isRepeat ? "Let's try this one again! " : ''}
              {info.instruction}
            </p>
            {banner && (
              <div className="banner banner--retry" role="status">
                <span aria-hidden="true">💪</span> {banner}
              </div>
            )}
            {level === 1 ? (
              <LetterTiles key={exerciseKey} {...exerciseProps} />
            ) : level <= 3 ? (
              <MissingLetters key={exerciseKey} {...exerciseProps} />
            ) : (
              <TypeWord key={exerciseKey} {...exerciseProps} />
            )}
            {level > 1 && (
              <button
                type="button"
                className="link-btn keyboard-toggle"
                onClick={() => setKeyboardPref(!keyboardOn)}
              >
                {keyboardOn ? 'Hide on-screen keyboard' : 'Show on-screen keyboard ⌨️'}
              </button>
            )}
          </>
        )}

        {phase.kind === 'correct' && (
          <div className="feedback feedback--correct" role="status">
            <Mascot theme={child.theme} mood="cheer" size="lg" message={phase.message} />
            <div className="feedback__word">
              {item.word} <SpeakButton text={item.word} />
            </div>
            {phase.stars > 0 && (
              <div className="star-pop" aria-label={`${phase.stars} stars`}>
                {'⭐'.repeat(phase.stars)} <span>+{phase.stars}</span>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--big" onClick={next}>
              {index + 1 < queue.length ? 'Next word →' : 'Finish 🎉'}
            </button>
          </div>
        )}

        {phase.kind === 'reveal' && (
          <div className="feedback feedback--reveal" role="status">
            <Mascot theme={child.theme} mood="think" size="md" message={phase.message} />
            <p className="feedback__label">It's spelled:</p>
            <div className="feedback__word feedback__word--spelled">
              {[...item.word].map((ch, i) => (
                <span key={i} className="spelled-letter" style={{ animationDelay: `${i * 120}ms` }}>
                  {ch}
                </span>
              ))}
              <SpeakButton text={item.word} mode="spell" label="Hear it spelled out" />
            </div>
            {!item.isRepeat && <p className="feedback__note">We'll try it again at the end. 👍</p>}
            <button type="button" className="btn btn--primary btn--big" onClick={next}>
              {index + 1 < queue.length ? 'Next word →' : 'Finish 🎉'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function newQueue(words: readonly string[], level: LevelId): Item[] {
  return shuffle(words).map((word) => ({ word, blanks: blanksFor(word, level), isRepeat: false }));
}
