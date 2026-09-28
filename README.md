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
| `npm start` | Runs the game at http://localhost:4200 |
| `npm test` | Runs every workspace's tests (the engine's Vitest suite) |
| `npm run build` | Builds the engine, then the production web bundle |
| `npm run typecheck` | Type-checks every workspace |

Engine-specific:

```bash
npm run test --workspace @sumday/engine          # Vitest, single run
npm run test:watch --workspace @sumday/engine    # Vitest, watch mode
npm run build --workspace @sumday/engine         # emit dist/ (ESM + .d.ts)
npm run verify:node --workspace @sumday/engine   # prove the build runs in plain Node
```

To look at what the generator actually produces:

```bash
npm run print --workspace @sumday/engine -- --journey 12
npm run print --workspace @sumday/engine -- --daily 2026-09-28
npm run print --workspace @sumday/engine -- --difficulty expert --count 3
npm run print --workspace @sumday/engine -- --difficulty hard --solved
```

```
medium-4x0du4  seed "journey-12"  medium  7x9  5 equations  5 blanks  1.69 ms
tiles: 5 5 8 45 45

                         _
                         +
 _           8  ×  _  = 40
 −           +           =
42  − 34  =  _           _
 =           =
 3          16
```

## Layout

```
packages/engine    @sumday/engine - the puzzle engine. Pure TypeScript, zero dependencies.
apps/web           the game: Angular 22, standalone, signals, zoneless, plain CSS.
docs               architecture and the plan for going online
```

## Playing it

```bash
npm start     # http://localhost:4200
```

- **Home** - today's daily, the next journey level, coins and hints.
- **Levels** - 100 levels in four tiers, stars per level, each one unlocked by the last.
- **Play** - drag a tile onto a cell, tap a cell and then a tile, or type the number.
  `Backspace` clears what you typed, `Enter` commits it early.
- **Daily** - one puzzle a day, a seven-day strip and the streak.
- **Shop** - hint packs and the real-money section that arrives with the mobile build.
- **Settings** - sound on/off and a reset with a confirmation.
- **/styleguide** - development only: every component and state, plus contrast ratios
  measured from the live tokens.

## Status

- **Phase 1 - engine: done.** Deterministic generation, a uniqueness solver, validation,
  hints, and the journey/daily schedules. 70 tests.
- **Phase 2 - the game: done.** All seven screens, the Neubrutalism design system, the
  coin and hint economy, local saves with migration, and stubbed ads, purchases and
  analytics behind interfaces.
- **Phase 3 - online plan: done.** [docs/ONLINE.md](docs/ONLINE.md) - how the seed-determinism
  makes a backend cheap, the anti-cheat model, guest-first accounts, the cloud-save merge
  rules, the order to ship the online features in, a validated Prisma schema, the REST
  surface, and the mobile monetisation path.

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
the public API, [docs/ONLINE.md](docs/ONLINE.md) for the plan to go online, and
[docs/ADS.md](docs/ADS.md) for how the ad money would actually work.
