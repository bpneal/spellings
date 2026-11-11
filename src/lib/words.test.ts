import { describe, expect, it } from 'vitest';
import {
  chooseBlanks,
  extraKeysFor,
  isCorrect,
  letterIndices,
  markAttempt,
  parseWordList,
  shuffle,
} from './words';

/** Deterministic pseudo-random generator for repeatable tests. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('parseWordList', () => {
  it('splits on new lines and commas, trims and removes blanks', () => {
    expect(parseWordList(' rain\n\ntrain, wait ;snail\t')).toEqual([
      'rain',
      'train',
      'wait',
      'snail',
    ]);
  });

  it('removes duplicates case-insensitively, keeping the first spelling', () => {
    expect(parseWordList('Monday\nmonday\nMONDAY\nTuesday')).toEqual(['Monday', 'Tuesday']);
  });

  it('keeps apostrophes and hyphens, and drops entries with no letters', () => {
    expect(parseWordList("don't\nice-cream\n123\n--")).toEqual(["don't", 'ice-cream']);
  });
});

describe('letterIndices', () => {
  it('skips non-letters', () => {
    expect(letterIndices("can't")).toEqual([0, 1, 2, 4]);
  });
});

describe('chooseBlanks', () => {
  it('hides about a third of the letters for "few"', () => {
    const blanks = chooseBlanks('because', 'few', seeded(3));
    expect(blanks).toHaveLength(2);
  });

  it('hides most letters for "most" but always keeps the first letter', () => {
    for (let seed = 1; seed < 50; seed++) {
      const blanks = chooseBlanks('because', 'most', seeded(seed));
      expect(blanks).toHaveLength(5);
      expect(blanks).not.toContain(0);
    }
  });

  it('always leaves at least one letter visible', () => {
    for (let seed = 1; seed < 50; seed++) {
      expect(chooseBlanks('at', 'most', seeded(seed))).toHaveLength(1);
      expect(chooseBlanks('at', 'few', seeded(seed))).toHaveLength(1);
    }
  });

  it('blanks a one-letter word entirely', () => {
    expect(chooseBlanks('I', 'few')).toEqual([0]);
  });

  it('never blanks punctuation and returns sorted indices', () => {
    for (let seed = 1; seed < 50; seed++) {
      const blanks = chooseBlanks("don't", 'most', seeded(seed));
      expect(blanks).not.toContain(3);
      expect(blanks.toSorted((a, b) => a - b)).toEqual(blanks);
    }
  });
});

describe('isCorrect', () => {
  it('ignores case and surrounding spaces', () => {
    expect(isCorrect(' monday ', 'Monday')).toBe(true);
    expect(isCorrect('mondy', 'Monday')).toBe(false);
  });
});

describe('markAttempt', () => {
  it('marks letters that line up with the real word', () => {
    expect(markAttempt('frend', 'friend').map((m) => m.ok)).toEqual([true, true, true, true, true]);
    expect(markAttempt('becos', 'because')).toEqual([
      { char: 'b', ok: true },
      { char: 'e', ok: true },
      { char: 'c', ok: true },
      { char: 'o', ok: false },
      { char: 's', ok: true },
    ]);
  });

  it('handles an empty attempt', () => {
    expect(markAttempt('', 'cat')).toEqual([]);
  });
});

describe('shuffle', () => {
  it('keeps all items and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded(7));
    expect(out.toSorted()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('extraKeysFor', () => {
  it('collects non-letter characters needed on the keyboard', () => {
    expect(extraKeysFor(["don't", 'ice-cream', 'cat']).toSorted()).toEqual(["'", '-']);
  });
});
