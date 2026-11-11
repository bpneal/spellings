import { useState } from 'react';
import { LEVELS } from '../../lib/levels';
import { bestStreak, currentStreak, emptyProgress, trickyWords } from '../../lib/progress';
import { THEMES } from '../../lib/themes';
import { LEVEL_IDS } from '../../lib/types';
import { normalise } from '../../lib/words';
import { useAppData } from '../../state/useAppData';

function cellClass(percent: number) {
  if (percent >= 80) return 'cell--good';
  if (percent >= 50) return 'cell--ok';
  return 'cell--low';
}

export function ProgressReport({ initialChildId }: { initialChildId?: string }) {
  const { data } = useAppData();
  const [childId, setChildId] = useState(initialChildId ?? data.children[0]?.id);
  const child = data.children.find((c) => c.id === childId) ?? data.children[0];

  if (!child) return <p>Add a child first to see their progress.</p>;
  const progress = data.progress[child.id] ?? emptyProgress();
  const tricky = trickyWords(progress, child.words);
  const rounds = LEVEL_IDS.reduce((s, l) => s + (progress.levels[l]?.rounds ?? 0), 0);

  return (
    <div className="report">
      {data.children.length > 1 && (
        <div className="chip-row">
          {data.children.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip${c.id === child.id ? ' is-on' : ''}`}
              onClick={() => setChildId(c.id)}
            >
              {THEMES[c.theme].mascot} {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="stat-row">
        <Stat label="Stars" value={progress.stars} />
        <Stat label="Rounds played" value={rounds} />
        <Stat label="Current streak" value={`${currentStreak(progress.practiceDays)} days`} />
        <Stat label="Best streak" value={`${bestStreak(progress.practiceDays)} days`} />
        <Stat label="Days practised" value={progress.practiceDays.length} />
      </div>

      <h3>Tricky words</h3>
      {tricky.length === 0 ? (
        <p className="muted">
          Nothing tricky yet. Words appear here once they've been practised a couple of times.
        </p>
      ) : (
        <ul className="tricky">
          {tricky.map((t) => (
            <li key={t.word}>
              <strong>{t.word}</strong>{' '}
              <span className="muted">
                {t.percent}% first-try ({t.seen} goes)
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>Words × levels</h3>
      <p className="muted">
        Each cell shows how often the word was spelled correctly <em>first time</em> on that level
        (and how many times it was attempted).
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Word</th>
              {LEVEL_IDS.map((l) => (
                <th key={l} scope="col" title={LEVELS[l].name}>
                  {LEVELS[l].emoji} L{l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {child.words.map((w) => {
              const stats = progress.words[normalise(w)] ?? {};
              return (
                <tr key={w}>
                  <th scope="row">{w}</th>
                  {LEVEL_IDS.map((l) => {
                    const s = stats[l];
                    if (!s || s.seen === 0) {
                      return (
                        <td key={l} className="cell--none">
                          –
                        </td>
                      );
                    }
                    const pct = Math.round((s.firstTry / s.seen) * 100);
                    return (
                      <td key={l} className={cellClass(pct)}>
                        {pct}% <span className="muted">({s.seen})</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="table__summary">
              <th scope="row">Best round</th>
              {LEVEL_IDS.map((l) => {
                const s = progress.levels[l];
                return <td key={l}>{s ? `${s.bestPercent}% (${s.rounds} played)` : '–'}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
