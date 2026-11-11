import { applyRound, emptyProgress } from '../lib/progress';
import type { AppData, Child, RoundResult, Settings, Theme } from '../lib/types';

export type Action =
  | { type: 'addChild'; id: string; name: string; theme: Theme; words: string[] }
  | { type: 'updateChild'; id: string; changes: Partial<Pick<Child, 'name' | 'theme' | 'words'>> }
  | { type: 'removeChild'; id: string }
  | { type: 'recordRound'; childId: string; round: RoundResult }
  | { type: 'resetProgress'; childId: string }
  | { type: 'updateSettings'; changes: Partial<Settings> }
  | { type: 'replaceAll'; data: AppData };

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'addChild': {
      const child: Child = {
        id: action.id,
        name: action.name.trim() || 'Speller',
        theme: action.theme,
        words: action.words,
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        children: [...state.children, child],
        progress: { ...state.progress, [child.id]: emptyProgress() },
      };
    }
    case 'updateChild':
      return {
        ...state,
        children: state.children.map((c) =>
          c.id === action.id
            ? {
                ...c,
                ...action.changes,
                name: (action.changes.name ?? c.name).trim() || c.name,
              }
            : c,
        ),
      };
    case 'removeChild': {
      const progress = { ...state.progress };
      delete progress[action.id];
      return { ...state, children: state.children.filter((c) => c.id !== action.id), progress };
    }
    case 'recordRound': {
      const current = state.progress[action.childId] ?? emptyProgress();
      const { progress } = applyRound(current, action.round);
      return { ...state, progress: { ...state.progress, [action.childId]: progress } };
    }
    case 'resetProgress':
      return { ...state, progress: { ...state.progress, [action.childId]: emptyProgress() } };
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.changes } };
    case 'replaceAll':
      return action.data;
  }
}
