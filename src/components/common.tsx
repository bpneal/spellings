import type { CSSProperties, ReactNode } from 'react';
import { THEMES } from '../lib/themes';
import type { Theme } from '../lib/types';
import { useSpeech, useSpeechStatus } from '../hooks/useSpeech';
import { reloadForSpeech, triedReloadForSpeech } from '../lib/speech';

export function Mascot({
  theme,
  message,
  size = 'md',
  mood = 'happy',
}: {
  theme: Theme;
  message?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  mood?: 'happy' | 'cheer' | 'think';
}) {
  const info = THEMES[theme];
  return (
    <div className={`mascot mascot--${size}`}>
      <div className={`mascot__face mascot__face--${mood}`} role="img" aria-label={info.mascotName}>
        {info.mascot}
      </div>
      {message && (
        <div className="mascot__bubble" aria-live="polite">
          {message}
        </div>
      )}
    </div>
  );
}

/** Floating background emoji for the current theme. Purely decorative. */
const NEUTRAL_DECORATIONS = ['⭐', '🌈', '🚀', '🦄', '✏️', '📚'];

export function Decorations({ theme }: { theme: Theme | 'neutral' }) {
  const items = theme === 'neutral' ? NEUTRAL_DECORATIONS : THEMES[theme].decorations;
  return (
    <div className="decorations" aria-hidden="true">
      {items.concat(items).map((e, i) => (
        <span key={i} className="decorations__item" style={{ '--i': i } as CSSProperties}>
          {e}
        </span>
      ))}
    </div>
  );
}

export function SpeakButton({
  text,
  mode = 'word',
  label,
  big = false,
}: {
  text: string;
  mode?: 'word' | 'spell';
  label?: string;
  big?: boolean;
}) {
  const { sayWord, spell, supported } = useSpeech();
  if (!supported) return null;
  return (
    <button
      type="button"
      className={`speak-btn${big ? ' speak-btn--big' : ''}`}
      onClick={() => (mode === 'spell' ? spell(text) : sayWord(text))}
      aria-label={label ?? `Hear the word`}
      title={label ?? 'Hear the word'}
    >
      🔊
    </button>
  );
}

export function StarCount({ stars }: { stars: number }) {
  return (
    <span className="pill pill--stars" title="Stars">
      ⭐ <strong>{stars}</strong>
    </span>
  );
}

export function StreakCount({ streak }: { streak: number }) {
  return (
    <span className="pill pill--streak" title="Days in a row">
      🔥 <strong>{streak}</strong> <span className="pill__label">day{streak === 1 ? '' : 's'}</span>
    </span>
  );
}

export function Rating({ value }: { value: 0 | 1 | 2 | 3 }) {
  return (
    <span className="rating" aria-label={`${value} out of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= value ? 'rating__on' : 'rating__off'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function TopBar({
  left,
  right,
  title,
}: {
  left?: ReactNode;
  right?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar__side">{left}</div>
      {title && <h1 className="topbar__title">{title}</h1>}
      <div className="topbar__side topbar__side--right">{right}</div>
    </header>
  );
}

export function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="btn btn--ghost" onClick={onClick}>
      ← {label}
    </button>
  );
}

export function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Choose your theme">
      {(['boy', 'girl'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          className={`theme-switch__opt${theme === t ? ' is-on' : ''}`}
          onClick={() => onChange(t)}
          title={THEMES[t].label}
        >
          <span aria-hidden="true">{THEMES[t].mascot}</span>
          <span className="sr-only">{THEMES[t].label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Shown when the browser's speech engine has stopped responding. A page reload often revives
 * it (saved data is kept; a round in progress restarts). If a reload has already been tried,
 * Chrome or the computer's speech service needs restarting, which a grown-up has to do.
 */
export function SpeechStuckBanner() {
  const { health } = useSpeechStatus();
  if (health !== 'stuck') return null;
  if (triedReloadForSpeech()) {
    return (
      <div className="speech-stuck" role="status">
        <span aria-hidden="true">🔇</span> The talking still isn't working. Please ask a grown-up to
        help.
      </div>
    );
  }
  return (
    <button type="button" className="speech-stuck" onClick={reloadForSpeech}>
      <span aria-hidden="true">🔇</span> The talking has stopped. Tap here to fix it!
    </button>
  );
}
