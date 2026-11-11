import { useMemo, useState } from 'react';
import { OnScreenKeyboard } from '../components/OnScreenKeyboard';
import { SpeakButton } from '../components/common';
import { useKeyInput, type KeyPress } from '../hooks/useKeyInput';
import { useSpeech } from '../hooks/useSpeech';
import { normalise } from '../lib/words';
import type { ExerciseProps } from './types';

/** Levels 2 & 3: some letters are shown, the child fills in the blanks. */
export function MissingLetters({
  word,
  attempt,
  lastAnswer,
  blanks,
  extraKeys,
  showKeyboard,
  onSubmit,
}: ExerciseProps) {
  const { sfx } = useSpeech();
  const chars = useMemo(() => [...word], [word]);

  const [values, setValues] = useState<Record<number, string>>(() => {
    if (attempt === 1 || !lastAnswer) return {};
    const prev = [...lastAnswer];
    const kept: Record<number, string> = {};
    for (const pos of blanks) {
      if (normalise(prev[pos] ?? '') === normalise(chars[pos] ?? '')) kept[pos] = chars[pos] ?? '';
    }
    return kept;
  });
  const [locked] = useState(() => new Set(Object.keys(values).map(Number)));
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const open = blanks.filter((p) => !locked.has(p));
  const firstEmpty = open.find((p) => !values[p]);
  const active = selected !== undefined && !locked.has(selected) ? selected : firstEmpty;
  const full = blanks.every((p) => values[p]);

  const submit = () => {
    if (!full) return;
    onSubmit(chars.map((ch, i) => (blanks.includes(i) ? (values[i] ?? '') : ch)).join(''));
  };

  const onKey = (k: KeyPress) => {
    if (k.kind === 'enter') return submit();
    if (k.kind === 'backspace') {
      const target =
        active !== undefined && values[active]
          ? active
          : open.toReversed().find((p) => values[p] && (active === undefined || p < active));
      if (target === undefined) return;
      setValues((v) => {
        const next = { ...v };
        delete next[target];
        return next;
      });
      setSelected(target);
      return;
    }
    if (active === undefined || k.char === ' ') return;
    sfx('tap');
    const filled = { ...values, [active]: k.char.toLocaleLowerCase('en-GB') };
    setValues(filled);
    setSelected(open.find((p) => p > active && !filled[p]) ?? open.find((p) => !filled[p]));
  };

  useKeyInput(onKey);

  return (
    <div className="exercise">
      <div className="target-word">
        <SpeakButton text={word} big />
      </div>

      <div className="slots slots--word" aria-label="Fill in the missing letters">
        {chars.map((ch, i) => {
          if (!blanks.includes(i)) {
            return (
              <span key={i} className="slot slot--fixed">
                {ch}
              </span>
            );
          }
          const isLocked = locked.has(i);
          const needsFix = attempt === 2 && !isLocked;
          return (
            <button
              key={i}
              type="button"
              className={[
                'slot slot--blank',
                values[i] ? 'slot--filled' : '',
                isLocked ? 'slot--locked' : '',
                needsFix ? 'slot--fix' : '',
                active === i ? 'slot--active' : '',
              ].join(' ')}
              onClick={() => !isLocked && setSelected(i)}
              disabled={isLocked}
              aria-label={values[i] ? `Letter ${values[i]}` : 'Missing letter'}
            >
              {values[i] ?? ''}
            </button>
          );
        })}
      </div>

      {showKeyboard ? (
        <OnScreenKeyboard onKey={onKey} extraKeys={extraKeys} canSubmit={full} />
      ) : (
        <button
          type="button"
          className="btn btn--primary btn--big"
          onClick={submit}
          disabled={!full}
        >
          Check ✔
        </button>
      )}
    </div>
  );
}
