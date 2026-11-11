import { describe, expect, it } from 'vitest';
import { emptyData } from '../lib/storage';
import { reducer } from './reducer';

const withChild = () =>
  reducer(emptyData(), { type: 'addChild', id: 'c1', name: 'Sam', theme: 'boy', words: ['rain'] });

describe('reducer', () => {
  it('adds a child with empty progress', () => {
    const s = withChild();
    expect(s.children).toHaveLength(1);
    expect(s.progress.c1?.stars).toBe(0);
  });

  it('updates a child but refuses a blank name', () => {
    const s = reducer(withChild(), {
      type: 'updateChild',
      id: 'c1',
      changes: { name: '  ', words: ['wait'] },
    });
    expect(s.children[0]).toMatchObject({ name: 'Sam', words: ['wait'] });
  });

  it('records a round and resets progress', () => {
    let s = reducer(withChild(), {
      type: 'recordRound',
      childId: 'c1',
      round: { level: 1, outcomes: { rain: 'first' }, starsEarned: 2, date: '2026-11-11' },
    });
    expect(s.progress.c1?.stars).toBe(2);
    s = reducer(s, { type: 'resetProgress', childId: 'c1' });
    expect(s.progress.c1?.stars).toBe(0);
  });

  it('removes a child and their progress', () => {
    const s = reducer(withChild(), { type: 'removeChild', id: 'c1' });
    expect(s.children).toEqual([]);
    expect(s.progress).toEqual({});
  });
});
