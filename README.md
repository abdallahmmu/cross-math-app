# Sumday

A crossword-style math puzzle game. A grid of crossing equations - `12 + 7 = 19` across,
`19 − 4 = 15` down - with some numbers missing. Drop the right tiles into the blanks until
every equation holds.

Journey levels with stars, a daily challenge with streaks, coins and a shop. Built web-first
and mobile-ready, with an architecture that can go online later without reshaping the game.

## Requirements

- Node 20 or newer (developed on Node 24)
- npm 10 or newer (npm workspaces)

## Setup

```bash
npm install
```

## Commands

Run from the repository root:

| Command | What it does |
| --- | --- |
| `npm test` | Runs every workspace's tests (currently the engine's Vitest suite) |
| `npm run build` | Builds every workspace |
| `npm run typecheck` | Type-checks every workspace |

Engine-specific:

```bash
npm run test --workspace @sumday/engine          # Vitest, single run
npm run test:watch --workspace @sumday/engine    # Vitest, watch mode
npm run build --workspace @sumday/engine         # emit dist/ (ESM + .d.ts)
npm run verify:node --workspace @sumday/engine   # prove the build runs in plain Node
```

## Layout

```
packages/engine    @sumday/engine - the puzzle engine. Pure TypeScript, zero dependencies.
apps/web           the Angular game (Phase 2)
docs               architecture and the plan for going online
```

## Status

- **Phase 1 - engine: done.** Deterministic generation, a uniqueness solver, validation,
  hints, and the journey/daily schedules. 70 tests.
- **Phase 2 - the game:** not started.
- **Phase 3 - online plan:** not started.

## How the engine works, briefly

A puzzle is fully determined by its seed and difficulty, and nothing in the engine touches
`Math.random`, the clock, or any platform API. The same call returns the same puzzle on every
device - and on a server, which is what will later let the backend re-generate a puzzle from
its seed to check a submitted answer instead of storing puzzles at all.

```ts
import { generatePuzzle, buildGrid, journeyLevel } from '@sumday/engine';

const puzzle = generatePuzzle(journeyLevel(12)); // { seed: 'journey-12', difficulty: 'medium' }
const grid = buildGrid(puzzle);                  // rows × cols of render-ready cells
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the model, the generation pipeline and
the public API.
