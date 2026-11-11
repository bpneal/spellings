import { useEffect, useRef, useState } from 'react';

export type KeyPress = { kind: 'char'; char: string } | { kind: 'backspace' } | { kind: 'enter' };

/**
 * Listen for physical keyboard presses on the whole window, so children on a laptop can
 * type straight away without clicking into a box. Ignores typing inside form fields.
 */
export function useKeyInput(onKey: (key: KeyPress) => void, enabled = true): void {
  const handler = useRef(onKey);
  useEffect(() => {
    handler.current = onKey;
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        handler.current({ kind: 'backspace' });
      } else if (e.key === 'Enter') {
        // Let Enter activate a focused button normally.
        if (target?.closest('button')) return;
        e.preventDefault();
        handler.current({ kind: 'enter' });
      } else if (e.key.length === 1 && /[\p{L}'’\- ]/u.test(e.key)) {
        if (e.key === ' ' && target?.closest('button')) return;
        e.preventDefault();
        handler.current({ kind: 'char', char: e.key === '’' ? "'" : e.key });
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}

/** True on touch-first devices (tablets/phones), where we show the big on-screen keyboard. */
export function useIsTouch(): boolean {
  const query = '(pointer: coarse)';
  const [touch, setTouch] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const update = () => setTouch(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return touch;
}
