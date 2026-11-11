import { BackButton, Mascot, StarCount, StreakCount, TopBar } from '../components/common';
import { TROPHIES, bestStreak, currentStreak } from '../lib/progress';
import type { Child, Progress } from '../lib/types';

export function Trophies({
  child,
  progress,
  onBack,
}: {
  child: Child;
  progress: Progress;
  onBack: () => void;
}) {
  const earned = Object.keys(progress.trophies).length;
  return (
    <div className="screen">
      <TopBar left={<BackButton onClick={onBack} />} title="🏆 My trophies" />
      <main className="trophies">
        <Mascot
          theme={child.theme}
          size="sm"
          message={
            earned === 0
              ? 'Play a game to win your first trophy!'
              : `You've won ${earned} troph${earned === 1 ? 'y' : 'ies'}! Amazing!`
          }
        />
        <div className="row row--center">
          <StarCount stars={progress.stars} />
          <StreakCount streak={currentStreak(progress.practiceDays)} />
          <span className="pill">
            Best streak: <strong>{bestStreak(progress.practiceDays)}</strong>
          </span>
        </div>
        <div className="trophy-grid">
          {TROPHIES.map((t) => {
            const date = progress.trophies[t.id];
            return (
              <div key={t.id} className={`trophy${date ? ' trophy--earned' : ''}`}>
                <span className="trophy__emoji" aria-hidden="true">
                  {date ? t.emoji : '🔒'}
                </span>
                <strong>{t.name}</strong>
                <span>{t.description}</span>
                {date && (
                  <span className="trophy__date">Won {date.split('-').toReversed().join('/')}</span>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
