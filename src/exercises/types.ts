import type { LevelId } from '../lib/types';

export interface ExerciseProps {
  word: string;
  level: LevelId;
  /** 1 for the first try, 2 for the second. */
  attempt: 1 | 2;
  /** The child's previous (wrong) answer, used to keep the letters they got right. */
  lastAnswer?: string;
  /** Hidden letter positions (levels 2 and 3), fixed for the whole presentation of the word. */
  blanks: number[];
  extraKeys: string[];
  showKeyboard: boolean;
  onSubmit: (answer: string) => void;
}
