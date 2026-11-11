# ⭐ Spelling Stars

A friendly, offline spelling practice app for young children. It runs locally in the browser and keeps all data in `localStorage`.

## Getting started

Requires Node 24+ (with corepack) — Yarn 4 is pinned via `packageManager`.

```sh
corepack enable        # once per machine
yarn install
yarn dev               # http://localhost:5173
```

To use it on a tablet on the same Wi-Fi: `yarn dev --host`, then open the "Network" URL. Note that each device/browser has its own separate data — use **Settings → Backup** to move it.

## Scripts

| Command        | What it does                              |
| -------------- | ----------------------------------------- |
| `yarn dev`     | Start the dev server                      |
| `yarn build`   | Typecheck and build to `dist/`            |
| `yarn preview` | Serve the production build                |
| `yarn test`    | Run unit + UI tests (Vitest, jsdom)       |
| `yarn lint`    | Lint with OXLint (`yarn lint:fix` to fix) |
| `yarn format`  | Format with OXFmt (`yarn format:check`)   |
| `yarn check`   | Typecheck, lint, format check and tests   |

## Git hooks

[Husky](https://typicode.github.io/husky/) installs these automatically on `yarn install` (via the `postinstall` script):

- **pre-commit** – `yarn lint` and `yarn format:check` (run `yarn format` / `yarn lint:fix` to fix)
- **pre-push** – `yarn test`

Skip them in an emergency with `--no-verify`.

## How it works

**Grown-ups (⚙️ Grown-ups / Settings)**

- Add children (name + boy/girl theme) and type each child's current spelling list (one per line or comma-separated).
- Progress report: first-try accuracy per word per level, tricky words, streaks.
- Reset a child's progress, or remove a child.
- Choose the voice (British English preferred) and speaking speed; toggle sound effects.
- Download / restore a JSON backup.

**Children**

- **Learn my words** – see every word, tap to hear it spelled out.
- **Level 1 – Look & Build** – the word is shown; build it from scrambled letter tiles.
- **Level 2 – Missing Letters** – about a third of the letters are blank.
- **Level 3 – More Missing** – most letters are blank (the first letter stays as a clue).
- **Level 4 – Look, Cover, Write** – the word shows for a few seconds, then hides.
- **Level 5 – Spelling Test** – hear the word only, then spell it. (Falls back to Look, Cover, Write if the browser has no speech.)

All levels are open. A wrong answer gets "Nearly! Try again" with the correct letters kept/highlighted in green. After a second miss the spelling is shown and spoken letter by letter, and the word comes back at the end of the round.

Rewards: 2 ⭐ for a first-try word, 1 ⭐ for a second try; confetti and a fanfare at the end of each round; daily practice streaks; 11 trophies.

Answers are not case-sensitive. Typing works with a physical keyboard straight away; touch devices get a large on-screen keyboard (toggleable).

## Project layout

```
src/
  lib/          pure logic: words (blanks, checking), progress (stars, streaks, trophies),
                storage (localStorage + backup validation), speech, sounds, themes
  state/        reducer + context provider (persists to localStorage, syncs between tabs)
  hooks/        useSpeech, useKeyInput / useIsTouch
  exercises/    LetterTiles (L1), MissingLetters (L2–3), TypeWord (L4–5)
  screens/      ProfilePicker, ChildHome, Learn, Play, RoundComplete, Trophies, settings/
```

Data is stored under the `spelling-stars:v1` localStorage key.
