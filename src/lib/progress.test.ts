import { describe, expect, it } from 'vitest';
import {
  applyRound,
  bestStreak,
  currentStreak,
  dayKey,
  emptyProgress,
  firstTryPercent,
  levelRating,
  starsForOutcomes,
  trickyWords,
} from './progress';
import type { RoundResult } from './types';

describe('dayKey', () => {
  it('formats a local date', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('streaks', () => {
  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-11-09', '2026-11-10', '2026-11-11'], '2026-11-11')).toBe(3);
  });

  it("still counts yesterday's streak if they haven't practised yet today", () => {
    expect(currentStreak(['2026-11-09', '2026-11-10'], '2026-11-11')).toBe(2);
  });

  it('is zero once a whole day is missed', () => {
    expect(currentStreak(['2026-11-08'], '2026-11-11')).toBe(0);
  });

  it('works across month boundaries', () => {
    expect(currentStreak(['2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-01')).toBe(3);
  });

  it('finds the best streak in any order', () => {
    expect(bestStreak(['2026-11-05', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-06'])).toBe(
      3,
    );
    expect(bestStreak([])).toBe(0);
  });
});

describe('scoring', () => {
  const outcomes = { cat: 'first', dog: 'second', sun: 'later', hat: 'missed' } as const;

  it('gives 2 stars first time, 1 for second try or later, 0 for missed', () => {
    expect(starsForOutcomes(outcomes)).toBe(4);
  });

  it('calculates first-try percentage', () => {
    expect(firstTryPercent(outcomes)).toBe(25);
    expect(firstTryPercent({})).toBe(0);
  });

  it('rates levels from 0 to 3 stars', () => {
    expect(levelRating(undefined)).toBe(0);
    expect(levelRating(40)).toBe(1);
    expect(levelRating(70)).toBe(2);
    expect(levelRating(95)).toBe(3);
  });
});

const round = (overrides: Partial<RoundResult> = {}): RoundResult => ({
  level: 1,
  outcomes: { cat: 'first', dog: 'missed' },
  starsEarned: 2,
  date: '2026-11-11',
  ...overrides,
});

describe('applyRound', () => {
  it('adds stars, word stats, level stats and the practice day', () => {
    const { progress } = applyRound(emptyProgress(), round());
    expect(progress.stars).toBe(2);
    expect(progress.practiceDays).toEqual(['2026-11-11']);
    expect(progress.words.cat?.[1]).toEqual({ seen: 1, firstTry: 1, correct: 1 });
    expect(progress.words.dog?.[1]).toEqual({ seen: 1, firstTry: 0, correct: 0 });
    expect(progress.levels[1]).toEqual({ rounds: 1, bestPercent: 50, lastPercent: 50 });
  });

  it('does not mutate the input', () => {
    const before = emptyProgress();
    applyRound(before, round());
    expect(before).toEqual(emptyProgress());
  });

  it('awards the first-round trophy once', () => {
    const first = applyRound(emptyProgress(), round());
    expect(first.newTrophies).toContain('first-round');
    const second = applyRound(first.progress, round());
    expect(second.newTrophies).not.toContain('first-round');
  });

  it('awards perfect and champion trophies for a perfect spelling test', () => {
    const { newTrophies } = applyRound(
      emptyProgress(),
      round({ level: 5, outcomes: { cat: 'first', dog: 'first' }, starsEarned: 4 }),
    );
    expect(newTrophies).toEqual(expect.arrayContaining(['first-perfect', 'perfect-test']));
  });

  it('awards the explorer trophy after playing every level', () => {
    let p = emptyProgress();
    let earned: string[] = [];
    for (const level of [1, 2, 3, 4, 5] as const) {
      const r = applyRound(p, round({ level }));
      p = r.progress;
      earned = earned.concat(r.newTrophies);
    }
    expect(earned).toContain('all-levels');
  });

  it('awards a streak trophy after three days in a row', () => {
    let p = emptyProgress();
    let earned: string[] = [];
    for (const date of ['2026-11-09', '2026-11-10', '2026-11-11']) {
      const r = applyRound(p, round({ date }));
      p = r.progress;
      earned = earned.concat(r.newTrophies);
    }
    expect(earned).toContain('streak-3');
  });
});

describe('trickyWords', () => {
  it('lists words with the lowest first-try accuracy, needing at least two goes', () => {
    let p = emptyProgress();
    for (let i = 0; i < 2; i++) {
      p = applyRound(p, {
        level: 2,
        outcomes: { said: 'missed', because: i === 0 ? 'first' : 'second', cat: 'first' },
        starsEarned: 0,
        date: '2026-11-11',
      }).progress;
    }
    const tricky = trickyWords(p, ['said', 'because', 'cat', 'new']);
    expect(tricky.map((t) => t.word)).toEqual(['said', 'because']);
    expect(tricky[0]?.percent).toBe(0);
  });
});
