import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { emptyData, loadData } from './lib/storage';
import type { AppData } from './lib/types';
import { AppDataProvider } from './state/AppDataContext';

vi.mock('canvas-confetti', () => ({ default: vi.fn<() => void>() }));

function oneChild(words: string[]): AppData {
  const data = emptyData();
  data.children.push({ id: 'k1', name: 'Sam', theme: 'boy', words, createdAt: '2026-11-11' });
  return data;
}

const renderApp = (data: AppData) =>
  render(
    <AppDataProvider initial={data}>
      <App />
    </AppDataProvider>,
  );

const typeKeys = (text: string) => {
  for (const key of text) fireEvent.keyDown(window, { key });
};

describe('Spelling Stars', () => {
  it('lets a grown-up add a child and their spellings', async () => {
    const user = userEvent.setup();
    renderApp(emptyData());

    await user.click(screen.getByRole('button', { name: 'Set up Spelling Stars' }));
    await user.type(screen.getByLabelText('Name'), 'Ava');
    await user.click(screen.getByText('Girl: unicorns & rainbows'));
    await user.type(
      screen.getByRole('textbox', { name: /Spelling list/ }),
      'rain{enter}train{enter}rain',
    );
    expect(screen.getByText('(2 words)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add child' }));

    expect(loadData().children[0]).toMatchObject({
      name: 'Ava',
      theme: 'girl',
      words: ['rain', 'train'],
    });

    await user.click(screen.getByRole('button', { name: /Done/ }));
    expect(screen.getByText(/I'm Sparkle/)).toBeInTheDocument();
  });

  it('plays a Look & Build round and records stars', async () => {
    const user = userEvent.setup();
    renderApp(oneChild(['cat']));

    await user.click(screen.getByRole('button', { name: /Look & Build/ }));
    const tiles = screen.getAllByRole('button').filter((b) => b.classList.contains('tile'));
    for (const letter of 'cat') {
      // Tiles must be tapped in order.
      // oxlint-disable-next-line no-await-in-loop
      await user.click(tiles.find((t) => t.textContent === letter)!);
    }
    await user.click(screen.getByRole('button', { name: 'Check ✔' }));

    expect(screen.getByLabelText('2 stars')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Finish/ }));

    expect(screen.getByText(/Look & Build complete!/)).toBeInTheDocument();
    expect(screen.getByText('Off We Go!')).toBeInTheDocument();
    expect(loadData().progress.k1).toMatchObject({ stars: 2 });
  });

  it('gives a second try, then shows the word and brings it back later', async () => {
    const user = userEvent.setup();
    renderApp(oneChild(['said']));

    await user.click(screen.getByRole('button', { name: /Look, Cover, Write/ }));
    await user.click(screen.getByRole('button', { name: /I'm ready/ }));

    typeKeys('sed');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent(
      /try again|another go|green letters|almost/i,
    );
    expect(screen.getByText('Your last try:')).toBeInTheDocument();

    // Second try (word is shown again briefly first)
    await user.click(screen.getByRole('button', { name: /I'm ready/ }));
    typeKeys('sedd');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText("It's spelled:")).toBeInTheDocument();
    expect(screen.getByText(/try it again at the end/)).toBeInTheDocument();

    // The word comes back at the end of the round
    await user.click(screen.getByRole('button', { name: /Next word/ }));
    expect(screen.getByText(/Let's try this one again!/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /I'm ready/ }));
    typeKeys('said');
    fireEvent.keyDown(window, { key: 'Enter' });
    await user.click(screen.getByRole('button', { name: /Finish/ }));

    const results = screen.getByRole('list');
    expect(within(results).getByText('Got it in the end')).toBeInTheDocument();
    expect(loadData().progress.k1?.words.said?.[4]).toEqual({ seen: 1, firstTry: 0, correct: 1 });
  });
});
