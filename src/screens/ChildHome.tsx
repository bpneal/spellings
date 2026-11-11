import { useState } from 'react';
import { pick } from '../lib/praise';
import {
  BackButton,
  Mascot,
  Rating,
  StarCount,
  StreakCount,
  ThemeSwitch,
  TopBar,
} from '../components/common';
import { LEVELS } from '../lib/levels';
import { TROPHIES, currentStreak, levelRating } from '../lib/progress';
import { THEMES } from '../lib/themes';
import { LEVEL_IDS, type Child, type LevelId, type Progress } from '../lib/types';
import { useAppData } from '../state/useAppData';

const GREETINGS = [
  'Ready to practise your spellings?',
  "Let's be spelling superstars today!",
  'Which game shall we play?',
  'I love learning words with you!',
];

export function ChildHome({
  child,
  progress,
  onBack,
  onLearn,
  onPlay,
  onTrophies,
  onSettings,
}: {
  child: Child;
  progress: Progress;
  onBack: () => void;
  onLearn: () => void;
  onPlay: (level: LevelId) => void;
  onTrophies: () => void;
  onSettings: () => void;
}) {
  const { dispatch } = useAppData();
  const streak = currentStreak(progress.practiceDays);
  const trophyCount = Object.keys(progress.trophies).length;
  const hasWords = child.words.length > 0;
  const [greeting] = useState(() => pick(GREETINGS));

  return (
    <div className="screen">
      <TopBar
        left={<BackButton onClick={onBack} label="Who's playing?" />}
        right={
          <>
            <StarCount stars={progress.stars} />
            <StreakCount streak={streak} />
            <ThemeSwitch
              theme={child.theme}
              onChange={(theme) =>
                dispatch({ type: 'updateChild', id: child.id, changes: { theme } })
              }
            />
          </>
        }
      />

      <main className="home">
        <Mascot
          theme={child.theme}
          size="lg"
          message={
            hasWords ? (
              <>
                Hi <strong>{child.name}</strong>! I'm {THEMES[child.theme].mascotName}. {greeting}
              </>
            ) : (
              <>
                Hi <strong>{child.name}</strong>! Ask a grown-up to add your spellings in Settings
                ⚙️
              </>
            )
          }
        />

        {hasWords && (
          <>
            <button type="button" className="card card--learn" onClick={onLearn}>
              <span className="card__emoji" aria-hidden="true">
                📖
              </span>
              <span className="card__body">
                <strong>Learn my words</strong>
                <span>
                  {child.words.length} word{child.words.length === 1 ? '' : 's'} to learn
                </span>
              </span>
            </button>

            <h2 className="section-title">Choose a game</h2>
            <div className="level-grid">
              {LEVEL_IDS.map((id) => {
                const info = LEVELS[id];
                const stat = progress.levels[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={`card card--level card--level-${id}`}
                    onClick={() => onPlay(id)}
                  >
                    <span className="card__badge">Level {id}</span>
                    <span className="card__emoji" aria-hidden="true">
                      {info.emoji}
                    </span>
                    <strong>{info.name}</strong>
                    <span className="card__desc">{info.description}</span>
                    <Rating value={levelRating(stat?.bestPercent)} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="row row--center home__footer">
          <button type="button" className="btn btn--secondary" onClick={onTrophies}>
            🏆 My trophies ({trophyCount}/{TROPHIES.length})
          </button>
          <button type="button" className="btn btn--ghost" onClick={onSettings}>
            ⚙️ Grown-ups
          </button>
        </div>
      </main>
    </div>
  );
}
