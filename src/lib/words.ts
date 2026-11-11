/** Pure helpers for parsing, blanking and checking spellings. */

export type Rng = () => number;

const LETTER = /\p{L}/u;

export function isLetter(ch: string): boolean {
  return LETTER.test(ch);
}

export function normalise(word: string): string {
  return word.trim().toLocaleLowerCase('en-GB');
}

/**
 * Parse an adult's pasted list into unique, tidy words.
 * Accepts one word per line, or words separated by commas, semicolons or tabs.
 */
export function parseWordList(text: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of text.split(/[\n,;\t]+/)) {
    const word = raw.trim().replace(/\s+/g, ' ');
    if (!word || !LETTER.test(word)) continue;
    const key = normalise(word);
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(word);
  }
  return words;
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Indices of the characters in `word` that are letters (apostrophes, hyphens and spaces are not). */
export function letterIndices(word: string): number[] {
  const out: number[] = [];
  [...word].forEach((ch, i) => {
    if (isLetter(ch)) out.push(i);
  });
  return out;
}

/**
 * Choose which letters to hide for the "missing letters" levels.
 * - `few`: about a third of the letters (at least one).
 * - `most`: about 70% of the letters, always leaving the first letter as a clue.
 * At least one letter is always left visible when the word has two or more letters.
 */
export function chooseBlanks(
  word: string,
  amount: 'few' | 'most',
  rng: Rng = Math.random,
): number[] {
  const letters = letterIndices(word);
  const n = letters.length;
  if (n === 0) return [];
  if (n === 1) return [...letters];

  const ratio = amount === 'few' ? 0.34 : 0.7;
  const count = Math.min(n - 1, Math.max(1, Math.round(n * ratio)));
  const pool = amount === 'most' && n >= 3 ? letters.slice(1) : letters;
  return shuffle(pool, rng)
    .slice(0, count)
    .toSorted((a, b) => a - b);
}

export function isCorrect(answer: string, word: string): boolean {
  return normalise(answer) === normalise(word);
}

export interface MarkedLetter {
  char: string;
  ok: boolean;
}

/**
 * Mark each letter of the child's attempt as matching (part of the longest common
 * subsequence with the target word) or not. Used to highlight the letters they got right.
 */
export function markAttempt(answer: string, word: string): MarkedLetter[] {
  const a = [...normalise(answer)];
  const b = [...normalise(word)];
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const row = dp[i] as number[];
      row[j] =
        a[i] === b[j]
          ? (dp[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  const ok = Array.from({ length: a.length }, () => false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ok[i] = true;
      i++;
      j++;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      i++;
    } else {
      j++;
    }
  }
  return a.map((char, k) => ({ char, ok: ok[k] ?? false }));
}

/** Extra keys (apostrophe, hyphen, space…) the on-screen keyboard needs for a list of words. */
export function extraKeysFor(words: readonly string[]): string[] {
  const extras = new Set<string>();
  for (const w of words) {
    for (const ch of w) {
      if (!isLetter(ch)) extras.add(ch);
    }
  }
  return [...extras];
}

/** How long the word stays visible in Look, Cover, Write. */
export const lookTimeMs = (word: string): number => Math.min(8000, 2500 + word.length * 400);
