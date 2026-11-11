import { useEffect, useMemo, useReducer, useSyncExternalStore, type ReactNode } from 'react';
import { STORAGE_KEY, loadData, saveData } from '../lib/storage';
import type { AppData } from '../lib/types';
import { AppDataContext } from './context';
import { reducer } from './reducer';

/** Whether the most recent write to localStorage succeeded (an external fact, so kept outside React). */
function createSaveStatus() {
  let ok = true;
  const listeners = new Set<() => void>();
  return {
    get: () => ok,
    set(next: boolean) {
      if (next === ok) return;
      ok = next;
      for (const l of listeners) l();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const saveStatus = createSaveStatus();

/** Holds all app data in memory and mirrors every change to localStorage. */
export function AppDataProvider({ children, initial }: { children: ReactNode; initial?: AppData }) {
  const [data, dispatch] = useReducer(reducer, initial, (init) => init ?? loadData());
  const saveOk = useSyncExternalStore(saveStatus.subscribe, saveStatus.get);

  useEffect(() => {
    saveStatus.set(saveData(data));
  }, [data]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: 'replaceAll', data: loadData() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ data, dispatch, saveOk }), [data, saveOk]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
