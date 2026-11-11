import { Decorations, TopBar } from '../components/common';
import { THEMES } from '../lib/themes';
import { useAppData } from '../state/useAppData';

export function ProfilePicker({
  onPick,
  onSettings,
}: {
  onPick: (id: string) => void;
  onSettings: () => void;
}) {
  const { data } = useAppData();
  return (
    <div className="screen screen--profiles">
      <Decorations theme="neutral" />
      <TopBar
        right={
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onSettings}
            aria-label="Settings for grown-ups"
          >
            ⚙️ Grown-ups
          </button>
        }
      />
      <main className="profiles">
        <h1 className="logo">
          <span aria-hidden="true">⭐</span> Spelling Stars <span aria-hidden="true">⭐</span>
        </h1>
        {data.children.length === 0 ? (
          <div className="empty">
            <p className="empty__big">👋 Welcome!</p>
            <p>A grown-up needs to add a child and their spellings first.</p>
            <button type="button" className="btn btn--primary btn--big" onClick={onSettings}>
              Set up Spelling Stars
            </button>
          </div>
        ) : (
          <>
            <h2 className="profiles__ask">Who's practising today?</h2>
            <div className="profile-grid">
              {data.children.map((c) => {
                const stars = data.progress[c.id]?.stars ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`profile-card profile-card--${c.theme}`}
                    onClick={() => onPick(c.id)}
                  >
                    <span className="profile-card__mascot" aria-hidden="true">
                      {THEMES[c.theme].mascot}
                    </span>
                    <strong className="profile-card__name">{c.name}</strong>
                    <span className="profile-card__stars">⭐ {stars}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
