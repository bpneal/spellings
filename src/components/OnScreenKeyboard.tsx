import type { KeyPress } from '../hooks/useKeyInput';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** A big, touch-friendly lower-case keyboard. */
export function OnScreenKeyboard({
  onKey,
  extraKeys,
  canSubmit,
}: {
  onKey: (k: KeyPress) => void;
  extraKeys: string[];
  canSubmit: boolean;
}) {
  return (
    <div className="osk" aria-label="Keyboard">
      {ROWS.map((row, i) => (
        <div className="osk__row" key={row}>
          {[...row].map((ch) => (
            <button
              key={ch}
              type="button"
              className="osk__key"
              onClick={() => onKey({ kind: 'char', char: ch })}
            >
              {ch}
            </button>
          ))}
          {i === 2 && (
            <button
              type="button"
              className="osk__key osk__key--wide"
              onClick={() => onKey({ kind: 'backspace' })}
              aria-label="Delete"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="osk__row">
        {extraKeys.map((ch) => (
          <button
            key={ch}
            type="button"
            className="osk__key"
            onClick={() => onKey({ kind: 'char', char: ch })}
            aria-label={ch === ' ' ? 'Space' : ch}
          >
            {ch === ' ' ? '␣' : ch}
          </button>
        ))}
        <button
          type="button"
          className="osk__key osk__key--go"
          onClick={() => onKey({ kind: 'enter' })}
          disabled={!canSubmit}
        >
          Check ✔
        </button>
      </div>
    </div>
  );
}
