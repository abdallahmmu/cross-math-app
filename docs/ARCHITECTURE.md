# Architecture

## Principles

1. **The engine is the single source of truth.** Puzzle rules live in `@sumday/engine` and
   nowhere else. The Angular app renders and the future API validates; neither reimplements
   any math.
2. **Determinism over storage.** A puzzle is a pure function of `{ seed, difficulty }`. No
   puzzle ever needs to be stored or transmitted - only its seed.
3. **Platform-free core.** The engine imports nothing, touches no DOM, no `Date.now`, no
   `Math.random`. It is type-checked against `lib: ["es2022"]` with `types: []`, so a
   platform API cannot creep in unnoticed.

## `packages/engine`

### The grid model

Every equation is five cells along one direction:

```
offset   0     1     2     3     4
        [a]  [op]   [b]   [=]   [r]
```

Equations always start at an **even row and column**. That single rule - the parity lattice -
does a lot of work:

- Number cells (offsets 0, 2, 4) are always at `(even, even)`.
- A horizontal equation's operator and equals cells are at `(even, odd)`; a vertical
  equation's are at `(odd, even)`.
- So the symbol cells of the two directions can never collide, and **two equations can only
  ever meet at a number cell**.

A number cell belongs to at most one horizontal and one vertical equation. Two equations in
the same direction must not touch or read as one long equation, which is enforced by
requiring the cells at offsets `-1` and `+5` to be empty.

Cells are addressed by a `CellKey` string, `"row,col"`, so a `Puzzle` stays a plain
JSON-serialisable object.

### Generation pipeline

`generatePuzzle({ seed, difficulty })` runs four stages against one seeded generator
(`hashString` → `mulberry32`). A stage that fails returns `null` and the whole attempt
restarts - continuing from the *advanced* generator state, so retries explore new ground
while staying perfectly deterministic.

| Stage | File | What happens |
| --- | --- | --- |
| 1. Layout | `layout.ts` | Place the first equation horizontally, then repeatedly attach a perpendicular equation through an existing number cell, which lands at position 0, 2 or 4 of the new equation. Collision and separation rules are checked before each placement, and the bounding box is capped at the difficulty's max grid. Coordinates are normalised to start at `(0,0)`. |
| 2. Values | `fill.ts`, `candidates.ts` | Backtrack over the equations in placement order. Each equation gets a shuffled, capped candidate list of `(op, a, b, result)` tuples consistent with the cells its crossings already fixed. |
| 3. Blanks | `blanks.ts` | Shuffle the number cells and hide them one at a time, keeping a hide only while `countSolutions(puzzle, 2) === 1`, until the difficulty's blank ratio is reached. Per-equation blank caps are respected. |
| 4. Tiles | `generate.ts` | The values of the blank cells, as a multiset, sorted ascending. |

Because each equation after the first is attached *through* an existing cell, it always
arrives with at least one value already fixed. Candidate enumeration exploits that: two fixed
cells determine the equation outright, one costs a single loop, and the full double loop is
only ever reached by the very first equation of a puzzle.

#### Operator weighting

`×` and `÷` fit far fewer cells than `+` and `−` - a crossing that fixes a cell to 37 rules
out every product of two factors ≤ 12. With a plain shuffle they collapsed to ~8% of
equations, which made "hard" puzzles almost pure addition. Each operator is therefore
enumerated and capped on its own, and the lists are concatenated in a **weighted-random
operator order**. Operators with nothing to offer for a given cell drop out *before* the
draw, so weights only ever choose between operators that genuinely fit. `operatorWeights`
in `config.ts` tunes the mix; the current values give each allowed operator roughly an even
share.

### Solver

`countSolutions(puzzle, limit = 2)` is a DFS that assigns tile **values**, not tile
instances, so two identical tiles never look like two different solutions.

Each node first **propagates**: any equation with a single unknown has its value forced
rather than guessed, and any equation that is fully known is validated immediately. Only when
nothing is forced does it branch, on the blank whose tightest equation has the fewest
unknowns. A node limit bounds the search, and hitting it is reported as "at least `limit`"
so a caller checking `=== 1` treats an unfinished search as not unique.

This is what makes uniqueness cheap enough to test once per candidate blank during
generation.

### Difficulty

The whole curve lives in `DIFFICULTY_CONFIG` in `config.ts`:

| difficulty | equations | operators | maxValue | maxFactor | blank ratio | max blanks/eq | max grid |
| --- | --- | --- | --- | --- | --- | --- | --- |
| easy | 3–4 | `+ −` | 20 | – | 35% | 2 | 9×9 |
| medium | 5–6 | `+ − ×` | 50 | 10 | 45% | 2 | 11×11 |
| hard | 7–8 | `+ − × ÷` | 99 | 12 | 55% | 3 | 13×13 |
| expert | 9–11 | `+ − × ÷` | 99 | 12 | 65% | 3 | 13×13 |

All values are integers from 1 to `maxValue`: no zero, no negatives, division is always
exact, and the factors of `×` and the divisor and quotient of `÷` stay between 2 and
`maxFactor`, so no `×1` or `÷1` appears. Search budgets sit next to the table in
`GENERATION`.

### Public API

```ts
generatePuzzle({ seed, difficulty }): Puzzle
buildGrid(puzzle): GridCell[][]
validateSolution(puzzle, answers): { valid, wrongCells }
isCorrectPlacement(puzzle, cellKey, value): boolean
getHint(puzzle, answers, preferredCell?): { cellKey, value } | null
countSolutions(puzzle, limit?): number
journeyLevel(n): { seed: `journey-${n}`, difficulty }   // 1–10 easy, 11–30 medium, 31–60 hard, 61+ expert
dailyPuzzle(dateISO): { seed: `daily-${date}`, difficulty }  // Mon/Tue easy, Wed/Thu medium, Fri/Sat hard, Sun expert
```

`validateSolution` checks both halves of "solved": every equation holds, *and* the answers
use exactly the tile multiset the player was given. `wrongCells` lists the filled blanks
sitting in an equation that does not add up - the cells the board shakes.

`dailyPuzzle` reads the weekday in UTC, so a date string maps to the same difficulty in every
time zone.

### Consuming the engine

The package builds to ESM with declarations (`npm run build --workspace @sumday/engine`).
Relative imports in the source carry explicit `.js` extensions, so the emitted output is
valid Node ESM with no bundler and no loader - verified by
`npm run verify:node --workspace @sumday/engine`, which is how the future Express API will
import it.

The Angular app will instead map `@sumday/engine` to the engine's sources through
`tsconfig` paths, so day-to-day development needs no build step and the app still gets full
type checking and tree-shaking.

### Test strategy

| File | Covers |
| --- | --- |
| `rng.spec.ts` | Hash stability, generator distribution, shuffle is a permutation |
| `determinism.spec.ts` | Same seed → deep-equal puzzle, JSON round trip, no cross-talk between generations, different seeds differ |
| `candidates.spec.ts` | The arithmetic rules: ranges, exact division, the `×1`/`÷1` ban, factor bounds, candidates always agreeing with fixed cells |
| `generation.spec.ts` | 200 puzzles per difficulty against every structural invariant, plus the operator mix |
| `solver.spec.ts` | Forced values, identical tiles not double-counted, limits, unsolvable boards |
| `validate.spec.ts` | Real solution accepted; swaps, wrong values and tile substitutions rejected; hint behaviour |
| `schedule.spec.ts` | Tier and weekday boundaries, malformed dates, 100 journey levels and a month of dailies all generate |
| `perf.spec.ts` | 100 generations per difficulty, logs average/p95/worst |

`generation.spec.ts` checks, for all 800 puzzles: equation count in range, parity, operators
allowed, math correct and in range, no symbol/number collisions, one equation per direction
per number cell, the touch rule, grid within bounds and normalised, blank ordering and
per-equation caps, tiles matching the blank values, exactly one solution, a single connected
board, and agreement between `buildGrid` and the layout.

Measured on Node 24: expert generation averages **~1.4 ms** (p95 13 ms) against a 50 ms
budget.
