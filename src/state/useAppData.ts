import { useContext } from 'react';
import { AppDataContext, type AppDataValue } from './context';

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
