import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { Mascot } from '../components/common';
import { useSpeech } from '../hooks/useSpeech';
import { LEVELS } from '../lib/levels';
import { roundMessage } from '../lib/praise';
import { TROPHIES, firstTryPercent } from '../lib/progress';
import { THEMES } from '../lib/themes';
import type { Child, RoundResult, WordOutcome } from '../lib/types';

const OUTCOME_LABEL: Record<WordOutcome, { emoji: string; text: string }> = {
  first: { emoji: '🌟', text: 'First try!' },
  second: { emoji: '👍', text: 'Second try' },
  later: { emoji: '💪', text: 'Got it in the end' },
  missed: { emoji: '📚', text: 'Keep practising' },
};

export function RoundComplete({
  child,
  result,
  newTrophies,
  onAgain,
  onNextLevel,
  onHome,
}: {
  child: Child;
  result: RoundResult;
  newTrophies: string[];
  onAgain: () => void;
  onNextLevel?: () => void;
  onHome: () => void;
}) {
  const { say, sfx } = useSpeech();
  const percent = firstTryPercent(result.outcomes);
  const message = roundMessage(percent);
  const trophies = TROPHIES.filter((t) => newTrophies.includes(t.id));

  useEffect(() => {
    sfx('fanfare');
    const colors = THEMES[child.theme].confetti;
    const fire = (x: number) =>
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { x, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
    fire(0.25);
    fire(0.75);
    const t = setTimeout(() => fire(0.5), 450);
    const s = setTimeout(
      () =>
        say(
          `${message} You earned ${result.starsEarned} stars, ${child.name}!` +
            (trophies.length ? ' And you won a new trophy!' : ''),
        ),
      600,
    );
    return () => {
      clearTimeout(t);
      clearTimeout(s);
    };
    // Celebrate once when the screen appears.
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  return (
    <div className="screen screen--complete">
      <main className="complete">
        <Mascot theme={child.theme} mood="cheer" size="lg" message={message} />
        <h1 className="complete__title">
          {LEVELS[result.level].emoji} {LEVELS[result.level].name} complete!
        </h1>

        <div className="complete__stars">
          <span className="complete__star-icon" aria-hidden="true">
            ⭐
          </span>
          <span>
            <strong>+{result.starsEarned}</strong> stars
          </span>
        </div>

        {trophies.length > 0 && (
          <section className="new-trophies" aria-label="New trophies">
            <h2>New trophy!</h2>
            <div className="trophy-grid">
              {trophies.map((t) => (
                <div key={t.id} className="trophy trophy--earned trophy--new">
                  <span className="trophy__emoji">{t.emoji}</span>
                  <strong>{t.name}</strong>
                  <span>{t.description}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <ul className="word-results">
          {Object.entries(result.outcomes).map(([key, outcome]) => {
            const word = child.words.find((w) => w.toLocaleLowerCase('en-GB') === key) ?? key;
            const o = OUTCOME_LABEL[outcome];
            return (
              <li key={key} className={`word-result word-result--${outcome}`}>
                <span aria-hidden="true">{o.emoji}</span>
                <strong>{word}</strong>
                <span className="word-result__text">{o.text}</span>
              </li>
            );
          })}
        </ul>

        <div className="row row--center">
          <button type="button" className="btn btn--secondary btn--big" onClick={onAgain}>
            🔁 Play again
          </button>
          {onNextLevel && (
            <button type="button" className="btn btn--primary btn--big" onClick={onNextLevel}>
              Next level →
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--big" onClick={onHome}>
            🏠 Home
          </button>
        </div>
      </main>
    </div>
  );
}
