export type Theme = 'boy' | 'girl';

export type LevelId = 1 | 2 | 3 | 4 | 5;

export const LEVEL_IDS: readonly LevelId[] = [1, 2, 3, 4, 5];

export interface Child {
  id: string;
  name: string;
  theme: Theme;
  /** The child's single current spelling list. */
  words: string[];
  createdAt: string;
}

/** How a child has done on one word at one level. */
export interface WordLevelStat {
  /** Times the word has been presented (once per round). */
  seen: number;
  /** Times it was spelled correctly on the first try. */
  firstTry: number;
  /** Times it was spelled correctly at all (first or second try). */
  correct: number;
}

export interface LevelStat {
  rounds: number;
  /** Best first-try percentage, 0–100. */
  bestPercent: number;
  lastPercent: number;
}

export interface Progress {
  stars: number;
  /** Local dates (YYYY-MM-DD) on which the child finished at least one round. */
  practiceDays: string[];
  levels: Partial<Record<LevelId, LevelStat>>;
  /** Keyed by lower-cased word. */
  words: Record<string, Partial<Record<LevelId, WordLevelStat>>>;
  /** Earned trophy ids mapped to the date they were earned. */
  trophies: Record<string, string>;
}

export interface Settings {
  /** SpeechSynthesisVoice.voiceURI; undefined means "pick a British voice automatically". */
  voiceURI?: string;
  /** Speech rate, 0.5–1.5. */
  rate: number;
  soundEffects: boolean;
  /** Optional 4-digit passcode that locks the Settings area; undefined means no lock. */
  passcode?: string;
}

export interface AppData {
  version: 1;
  children: Child[];
  progress: Record<string, Progress>;
  settings: Settings;
}

/** Result of one word within a round. */
export type WordOutcome = 'first' | 'second' | 'later' | 'missed';

export interface RoundResult {
  level: LevelId;
  /** Outcome per word (lower-cased), using the word's first presentation in the round. */
  outcomes: Record<string, WordOutcome>;
  starsEarned: number;
  date: string;
}
