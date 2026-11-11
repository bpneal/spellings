import { useMemo, useState } from 'react';
import { SpeakButton } from '../components/common';
import { useKeyInput, type KeyPress } from '../hooks/useKeyInput';
import { useSpeech } from '../hooks/useSpeech';
import { isLetter, letterIndices, normalise, shuffle } from '../lib/words';
import type { ExerciseProps } from './types';

interface Tile {
  id: number;
  char: string;
}

function makeTiles(word: string): Tile[] {
  const letters = letterIndices(word).map((pos, id) => ({ id, char: [...word][pos] as string }));
  if (letters.length < 2) return letters;
  // Make sure the tiles aren't already in the right order.
  let tiles = shuffle(letters);
  for (
    let i = 0;
    i < 6 && tiles.map((t) => t.char).join('') === letters.map((t) => t.char).join('');
    i++
  ) {
    tiles = shuffle(letters);
  }
  return tiles;
}

/** Level 1: the word is visible; build it by tapping scrambled letter tiles. */
export function LetterTiles({ word, attempt, lastAnswer, onSubmit }: ExerciseProps) {
  const { sfx } = useSpeech();
  const chars = useMemo(() => [...word], [word]);
  const positions = useMemo(() => letterIndices(word), [word]);

  const [tiles] = useState(() => makeTiles(word));

  // slot position -> tile id
  const [slots, setSlots] = useState<Record<number, number>>(() => {
    if (attempt === 1 || !lastAnswer) return {};
    // Keep tiles that were in the right place last time.
    const prev = [...lastAnswer];
    const used = new Set<number>();
    const kept: Record<number, number> = {};
    for (const pos of positions) {
      const want = normalise(chars[pos] ?? '');
      if (normalise(prev[pos] ?? '') !== want) continue;
      const tile = tiles.find((t) => !used.has(t.id) && normalise(t.char) === want);
      if (tile) {
        used.add(tile.id);
        kept[pos] = tile.id;
      }
    }
    return kept;
  });
  const [locked] = useState<Set<number>>(() => new Set(Object.keys(slots).map(Number)));
  const [order, setOrder] = useState<number[]>([]);

  const usedTiles = new Set(Object.values(slots));
  const full = positions.every((p) => slots[p] !== undefined);

  const place = (tile: Tile) => {
    const pos = positions.find((p) => slots[p] === undefined);
    if (pos === undefined || usedTiles.has(tile.id)) return;
    sfx('tap');
    setSlots((s) => ({ ...s, [pos]: tile.id }));
    setOrder((o) => [...o, pos]);
  };

  const removeAt = (pos: number) => {
    if (locked.has(pos) || slots[pos] === undefined) return;
    setSlots((s) => {
      const next = { ...s };
      delete next[pos];
      return next;
    });
    setOrder((o) => o.filter((p) => p !== pos));
  };

  const submit = () => {
    if (!full) return;
    const tileById = new Map(tiles.map((t) => [t.id, t.char]));
    onSubmit(
      chars.map((ch, i) => (isLetter(ch) ? (tileById.get(slots[i] ?? -1) ?? '') : ch)).join(''),
    );
  };

  useKeyInput((k: KeyPress) => {
    if (k.kind === 'enter') submit();
    else if (k.kind === 'backspace') {
      const last = order.at(-1);
      if (last !== undefined) removeAt(last);
    } else {
      const tile = tiles.find(
        (t) => !usedTiles.has(t.id) && normalise(t.char) === normalise(k.char),
      );
      if (tile) place(tile);
    }
  });

  return (
    <div className="exercise">
      <div className="target-word">
        <span className="target-word__text">{word}</span>
        <SpeakButton text={word} />
      </div>

      <div className="slots" aria-label="Your word">
        {chars.map((ch, i) => {
          if (!isLetter(ch)) {
            return (
              <span key={i} className="slot slot--fixed">
                {ch}
              </span>
            );
          }
          const tileId = slots[i];
          const tile = tiles.find((t) => t.id === tileId);
          return (
            <button
              key={i}
              type="button"
              className={`slot${tile ? ' slot--filled' : ''}${locked.has(i) ? ' slot--locked' : ''}`}
              onClick={() => removeAt(i)}
              aria-label={tile ? `Letter ${tile.char}, tap to remove` : 'Empty space'}
              disabled={locked.has(i)}
            >
              {tile?.char ?? ''}
            </button>
          );
        })}
      </div>

      <div className="tiles">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tile${usedTiles.has(t.id) ? ' tile--used' : ''}`}
            onClick={() => place(t)}
            disabled={usedTiles.has(t.id)}
          >
            {t.char}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--big" onClick={submit} disabled={!full}>
        Check ✔
      </button>
    </div>
  );
}
