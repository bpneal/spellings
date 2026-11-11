import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, emptyData, loadData, parseAppData, saveData } from './storage';

describe('parseAppData', () => {
  it('rejects things that are not a backup', () => {
    expect(() => parseAppData(null)).toThrow('does not look like a Spelling Stars backup');
    expect(() => parseAppData({ version: 2, children: [] })).toThrow('does not look like');
    expect(() => parseAppData([1, 2, 3])).toThrow('does not look like');
  });

  it('fills in defaults and cleans up words', () => {
    const data = parseAppData({
      version: 1,
      children: [{ id: 'a', name: ' Sam ', theme: 'purple', words: ['rain', 'Rain', '', 42] }],
      settings: { rate: 9 },
    });
    expect(data.children[0]).toMatchObject({ id: 'a', name: 'Sam', theme: 'boy', words: ['rain'] });
    expect(data.progress.a).toEqual({
      stars: 0,
      practiceDays: [],
      levels: {},
      words: {},
      trophies: {},
    });
    expect(data.settings.rate).toBe(1.5);
    expect(data.settings.soundEffects).toBe(true);
  });

  it('drops progress for children that do not exist', () => {
    const data = parseAppData({ version: 1, children: [], progress: { ghost: { stars: 5 } } });
    expect(data.progress).toEqual({});
  });
});

describe('load/save', () => {
  it('round-trips through localStorage', () => {
    const data = emptyData();
    data.children.push({
      id: 'x',
      name: 'Ava',
      theme: 'girl',
      words: ['said'],
      createdAt: '2026-11-11',
    });
    data.progress.x = {
      stars: 3,
      practiceDays: ['2026-11-11'],
      levels: {},
      words: {},
      trophies: {},
    };
    expect(saveData(data, localStorage)).toBe(true);
    expect(loadData(localStorage)).toEqual(data);
  });

  it('starts fresh if stored data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadData(localStorage)).toEqual(emptyData());
  });
});
