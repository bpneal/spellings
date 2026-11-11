import type { LevelId } from './types';

export interface LevelInfo {
  id: LevelId;
  emoji: string;
  name: string;
  description: string;
  /** Short instruction shown on each question. */
  instruction: string;
}

export const LEVELS: Record<LevelId, LevelInfo> = {
  1: {
    id: 1,
    emoji: '🧩',
    name: 'Look & Build',
    description: 'See the word and build it with letter tiles',
    instruction: 'Tap the letters to build the word',
  },
  2: {
    id: 2,
    emoji: '🔍',
    name: 'Missing Letters',
    description: 'Fill in a few missing letters',
    instruction: 'Fill in the missing letters',
  },
  3: {
    id: 3,
    emoji: '🕵️',
    name: 'More Missing',
    description: 'Most of the letters are hiding!',
    instruction: 'Lots of letters are hiding. Fill them in!',
  },
  4: {
    id: 4,
    emoji: '👀',
    name: 'Look, Cover, Write',
    description: 'Look at the word, then spell it from memory',
    instruction: 'Look carefully… then spell it!',
  },
  5: {
    id: 5,
    emoji: '🎧',
    name: 'Spelling Test',
    description: 'Listen to the word and spell it',
    instruction: 'Listen, then spell the word',
  },
};
