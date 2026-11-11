import type { LevelId, Progress, RoundResult, WordOutcome } from './types';
import { LEVEL_IDS } from './types';

export function emptyProgress(): Progress {
  return { stars: 0, practiceDays: [], levels: {}, words: {}, trophies: {} };
}

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, d + delta));
}

/**
 * Consecutive practice days ending today, or ending yesterday if the child
 * hasn't practised yet today (so the streak isn't shown as broken in the morning).
 */
export function currentStreak(days: readonly string[], today: string = dayKey()): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(days: readonly string[]): number {
  const sorted = [...new Set(days)].toSorted();
  let best = 0;
  let run = 0;
  let prev: string | undefined;
  for (const day of sorted) {
    run = prev !== undefined && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export const STARS_FOR: Record<WordOutcome, number> = { first: 2, second: 1, later: 1, missed: 0 };

export function starsForOutcomes(outcomes: Record<string, WordOutcome>): number {
  return Object.values(outcomes).reduce((sum, o) => sum + STARS_FOR[o], 0);
}

export function firstTryPercent(outcomes: Record<string, WordOutcome>): number {
  const all = Object.values(outcomes);
  if (all.length === 0) return 0;
  return Math.round((all.filter((o) => o === 'first').length / all.length) * 100);
}

/** 1–3 star rating for a level card, based on the best first-try percentage. */
export function levelRating(percent: number | undefined): 0 | 1 | 2 | 3 {
  if (percent === undefined) return 0;
  if (percent >= 90) return 3;
  if (percent >= 70) return 2;
  return 1;
}

export interface TrophyDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: (p: Progress, round: RoundResult) => boolean;
}

const isPerfect = (r: RoundResult) =>
  Object.values(r.outcomes).length > 0 && Object.values(r.outcomes).every((o) => o === 'first');

export const TROPHIES: readonly TrophyDef[] = [
  {
    id: 'first-round',
    emoji: '🎉',
    name: 'Off We Go!',
    description: 'Finish your very first round',
    earned: () => true,
  },
  {
    id: 'first-perfect',
    emoji: '💯',
    name: 'Perfect!',
    description: 'Get every word right first time in a round',
    earned: (_p, r) => isPerfect(r),
  },
  {
    id: 'perfect-test',
    emoji: '🏆',
    name: 'Spelling Champion',
    description: 'Get every word right first time in the Spelling Test',
    earned: (_p, r) => r.level === 5 && isPerfect(r),
  },
  {
    id: 'all-levels',
    emoji: '🗺️',
    name: 'Explorer',
    description: 'Finish a round on every level',
    earned: (p) => LEVEL_IDS.every((l) => (p.levels[l]?.rounds ?? 0) > 0),
  },
  {
    id: 'stars-50',
    emoji: '⭐',
    name: 'Star Collector',
    description: 'Collect 50 stars',
    earned: (p) => p.stars >= 50,
  },
  {
    id: 'stars-200',
    emoji: '🌟',
    name: 'Superstar',
    description: 'Collect 200 stars',
    earned: (p) => p.stars >= 200,
  },
  {
    id: 'stars-500',
    emoji: '✨',
    name: 'Galaxy of Stars',
    description: 'Collect 500 stars',
    earned: (p) => p.stars >= 500,
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    name: 'On Fire',
    description: 'Practise 3 days in a row',
    earned: (p) => bestStreak(p.practiceDays) >= 3,
  },
  {
    id: 'streak-7',
    emoji: '📅',
    name: 'Whole Week',
    description: 'Practise 7 days in a row',
    earned: (p) => bestStreak(p.practiceDays) >= 7,
  },
  {
    id: 'streak-14',
    emoji: '💪',
    name: 'Unstoppable',
    description: 'Practise 14 days in a row',
    earned: (p) => bestStreak(p.practiceDays) >= 14,
  },
  {
    id: 'streak-30',
    emoji: '👑',
    name: 'Spelling Royalty',
    description: 'Practise 30 days in a row',
    earned: (p) => bestStreak(p.practiceDays) >= 30,
  },
];

/** Apply a finished round to a child's progress. Returns the new progress and any newly earned trophy ids. */
export function applyRound(
  progress: Progress,
  round: RoundResult,
): { progress: Progress; newTrophies: string[] } {
  const words = { ...progress.words };
  for (const [word, outcome] of Object.entries(round.outcomes)) {
    const perLevel = { ...words[word] };
    const prev = perLevel[round.level] ?? { seen: 0, firstTry: 0, correct: 0 };
    perLevel[round.level] = {
      seen: prev.seen + 1,
      firstTry: prev.firstTry + (outcome === 'first' ? 1 : 0),
      correct: prev.correct + (outcome === 'missed' ? 0 : 1),
    };
    words[word] = perLevel;
  }

  const percent = firstTryPercent(round.outcomes);
  const prevLevel = progress.levels[round.level];
  const levels = {
    ...progress.levels,
    [round.level]: {
      rounds: (prevLevel?.rounds ?? 0) + 1,
      bestPercent: Math.max(prevLevel?.bestPercent ?? 0, percent),
      lastPercent: percent,
    },
  };

  const practiceDays = progress.practiceDays.includes(round.date)
    ? progress.practiceDays
    : [...progress.practiceDays, round.date];

  const next: Progress = {
    stars: progress.stars + round.starsEarned,
    practiceDays,
    levels,
    words,
    trophies: { ...progress.trophies },
  };

  const newTrophies: string[] = [];
  for (const t of TROPHIES) {
    if (!next.trophies[t.id] && t.earned(next, round)) {
      next.trophies[t.id] = round.date;
      newTrophies.push(t.id);
    }
  }
  return { progress: next, newTrophies };
}

export interface TrickyWord {
  word: string;
  seen: number;
  percent: number;
}

/** Words with the lowest first-try accuracy across all levels (only words seen at least twice). */
export function trickyWords(progress: Progress, words: readonly string[], limit = 5): TrickyWord[] {
  const out: TrickyWord[] = [];
  for (const w of words) {
    const stats = Object.values(progress.words[w.toLocaleLowerCase('en-GB')] ?? {});
    const seen = stats.reduce((s, x) => s + x.seen, 0);
    const first = stats.reduce((s, x) => s + x.firstTry, 0);
    if (seen >= 2) out.push({ word: w, seen, percent: Math.round((first / seen) * 100) });
  }
  return out
    .filter((t) => t.percent < 100)
    .toSorted((a, b) => a.percent - b.percent || b.seen - a.seen)
    .slice(0, limit);
}

export function levelOf(n: number): LevelId {
  return (LEVEL_IDS.includes(n as LevelId) ? n : 1) as LevelId;
}
