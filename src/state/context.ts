import { createContext } from 'react';
import type { AppData } from '../lib/types';
import type { Action } from './reducer';

export interface AppDataValue {
  data: AppData;
  dispatch: (action: Action) => void;
  /** False if the last save to localStorage failed (e.g. storage full or disabled). */
  saveOk: boolean;
}

export const AppDataContext = createContext<AppDataValue | null>(null);
