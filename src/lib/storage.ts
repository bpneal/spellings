import { emptyProgress } from './progress';
import type { AppData, Child, Progress, Settings, Theme } from './types';
import { parseWordList } from './words';

export const STORAGE_KEY = 'spelling-stars:v1';

export const DEFAULT_SETTINGS: Settings = { rate: 0.85, soundEffects: true };

export function emptyData(): AppData {
  return { version: 1, children: [], progress: {}, settings: { ...DEFAULT_SETTINGS } };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

function toChild(v: unknown): Child | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null;
  const theme: Theme = v.theme === 'girl' ? 'girl' : 'boy';
  const words = Array.isArray(v.words)
    ? parseWordList(v.words.filter((w): w is string => typeof w === 'string').join('\n'))
    : [];
  return {
    id: v.id,
    name: v.name.trim() || 'Speller',
    theme,
    words,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date().toISOString(),
  };
}

function toProgress(v: unknown): Progress {
  const base = emptyProgress();
  if (!isObj(v)) return base;
  return {
    stars: Math.max(0, num(v.stars)),
    practiceDays: Array.isArray(v.practiceDays)
      ? v.practiceDays.filter(
          (d): d is string => typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d),
        )
      : [],
    levels: isObj(v.levels) ? (v.levels as Progress['levels']) : {},
    words: isObj(v.words) ? (v.words as Progress['words']) : {},
    trophies: isObj(v.trophies) ? (v.trophies as Progress['trophies']) : {},
  };
}

/**
 * Validate untrusted data (from localStorage or an imported backup file) and fill in defaults.
 * Throws if the value isn't recognisably Spelling Stars data.
 */
export function parseAppData(value: unknown): AppData {
  if (!isObj(value) || value.version !== 1 || !Array.isArray(value.children)) {
    throw new Error('This file does not look like a Spelling Stars backup.');
  }
  const children = value.children.map(toChild).filter((c): c is Child => c !== null);
  const rawProgress = isObj(value.progress) ? value.progress : {};
  const progress: Record<string, Progress> = {};
  for (const c of children) progress[c.id] = toProgress(rawProgress[c.id]);

  const s = isObj(value.settings) ? value.settings : {};
  const settings: Settings = {
    voiceURI: typeof s.voiceURI === 'string' && s.voiceURI ? s.voiceURI : undefined,
    rate: Math.min(1.5, Math.max(0.5, num(s.rate, DEFAULT_SETTINGS.rate))),
    soundEffects: typeof s.soundEffects === 'boolean' ? s.soundEffects : true,
  };
  return { version: 1, children, progress, settings };
}

export function loadData(storage: Storage | undefined = safeStorage()): AppData {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? parseAppData(JSON.parse(raw)) : emptyData();
  } catch (err) {
    console.warn('Could not read saved data; starting fresh.', err);
    return emptyData();
  }
}

export function saveData(data: AppData, storage: Storage | undefined = safeStorage()): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Could not save data.', err);
    return false;
  }
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
