import type { Theme } from './types';

export interface ThemeInfo {
  label: string;
  mascot: string;
  mascotName: string;
  decorations: string[];
  confetti: string[];
}

export const THEMES: Record<Theme, ThemeInfo> = {
  boy: {
    label: 'Boy: rockets & dinosaurs',
    mascot: '🦖',
    mascotName: 'Rex',
    decorations: ['🚀', '🪐', '⭐', '🦕', '☄️', '🛸'],
    confetti: ['#2563eb', '#16a34a', '#facc15', '#06b6d4', '#f97316'],
  },
  girl: {
    label: 'Girl: unicorns & rainbows',
    mascot: '🦄',
    mascotName: 'Sparkle',
    decorations: ['🌈', '⭐', '💖', '🦋', '🌸', '✨'],
    confetti: ['#ec4899', '#a855f7', '#facc15', '#f472b6', '#38bdf8'],
  },
};
