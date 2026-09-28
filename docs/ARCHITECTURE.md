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

---

## `apps/web`

Angular 22: standalone components everywhere, signals for all state, zoneless change
detection, the new control flow, and plain CSS with custom properties. No component
library, no CSS framework.

The engine is reached through the workspace name `@sumday/engine`, mapped by `tsconfig`
paths to the engine's **sources**. The app therefore needs no build step for the engine, and
still gets full type checking and tree shaking - a level page pulls in generation but not
the solver.

### State

Two stores, both `@ngrx/signals`.

**`ProgressStore`** (root) is everything the player keeps: coins, hints, level results, the
daily history and streak, the free-hint allowance, and settings. Its state is exactly the save file minus its version, which makes persistence a
one-liner: a single `watchState` subscription writes through to the `SaveAdapter` on every
change, so no method can forget to save.

**`GameStore`** is provided by the Play page, so leaving the page throws the run away.
It holds the puzzle, the answers, the tray, the selection, mistakes, hints used and the
timer, and exposes the board as one flat `cells` array of fully-resolved render cells -
text, state flags and aria-label included - so templates never call a function to work out
what a cell looks like.

Two details worth knowing:

- An equation with **no blanks** is complete from the moment it loads. Those are excluded
  from "solved", so nothing is mint before the player has placed a tile, and the HUD counts
  only the equations the run is actually scored against.
- A cell is mint when **any** of its equations is solved, which is what makes a crossing
  cell light up with the row it completed.

### Persistence

`SaveAdapter` is an abstract class (so it doubles as the DI token) with `load`, `save`,
`clear` and `writable`. `LocalSaveAdapter` wraps every `localStorage` call in try/catch:
private browsing, a full quota and disabled storage all throw on access rather than
returning null. When storage turns out to be unusable the game keeps running from memory and
Settings says so.

The save is versioned. `migrate()` treats stored data as untrusted input - every field is
read with a fallback and clamped, corrupt JSON starts fresh, and nothing in that path
throws. Adding a field means adding one step to `MIGRATIONS`, keyed by the version it
upgrades from.

`ApiSaveAdapter` will slot in behind the same interface once accounts exist.

### Swappable services

Bound in `app.config.ts`, which is the only file that changes when the app goes online or
mobile:

| Interface | Today | Later |
| --- | --- | --- |
| `SaveAdapter` | `LocalSaveAdapter` | `ApiSaveAdapter` |
| `AdsService` | `FakeAdsService` - a two-second overlay marked a placeholder | Capacitor AdMob, or a portal SDK on web ([ADS.md](ADS.md)) |
| `PurchaseService` | `UnavailablePurchaseService` - products listed, all disabled | Capacitor IAP |
| `AnalyticsService` | `ConsoleAnalyticsService` | a real sink |

### Design system

`tokens.css` holds every colour, border, radius, shadow, space, type, motion and layout
value. Nothing else in the app names a colour, so a second palette would be another block
of these variables and no component changes.

Two tokens carry the contrast rule. `--ink` is the border, shadow and body-text colour;
`--on-accent` is the text colour on top of a filled accent. They are the same value today;
keeping them apart is what would let a dark palette keep bright accents without any pair
failing AA. `/styleguide` measures the ratios from the live tokens at runtime, so the table
cannot drift from the CSS.

Every accent pair clears AA. The one exception is by design: ink on the error red is
4.45:1, which passes AA for large bold text - the only thing ever drawn on it - while
smaller error text uses `--error-ink` on the page background at 8.15:1.

### The board

The board is a single CSS grid, and it exploits the engine's parity lattice: number cells
are always on even rows and columns, symbol cells always on odd ones. So the track list
alternates a wide number track with a narrow symbol one:

```
grid-template-columns: var(--cell) var(--symbol) var(--cell) ... var(--cell)
```

Symbol tracks take 56% of a number track, which is what makes a 13-wide expert grid fit a
360px phone with no horizontal scrolling - an even grid would leave the numbers unreadably
small. Cell size is pure CSS:

```
--cell: min(3.25rem, (available - gaps) / (numberCols + 0.56 * symbolCols))
```

Rows and columns always have odd length (equations start and end on even coordinates), so
the alternating pattern always ends on a number track. Empty cells are not rendered at all;
every cell places itself with `grid-row` / `grid-column`.

### Input

Three ways to place a tile, all landing in the same `put()` in `GameStore`, so the pop, the
shake, the mistake count and the win check cannot drift apart.

**Drag** is the primary one, and it is built on Pointer Events rather than HTML5
drag-and-drop, which does not fire on touch at all. One code path covers mouse, touch and
pen:

- A press only becomes a drag after 6px of travel, so a press that does not move stays a
  tap. The click that follows a real drag is swallowed; a click with `detail === 0` is a
  keyboard activation and always places.
- The pointer is captured, so the drag survives leaving the tile.
- Hit testing is `elementFromPoint` against `[data-cell]`, which is only present on *empty*
  blanks. The floating tile is `pointer-events: none`, or it would always be the element
  under the pointer. Dropping over anything else simply returns the tile - no mistake.
- On touch the tile is carried 44px above the finger and the drop is tested there, so you
  aim with the tile you can see. With a mouse the cursor is the aim point and the tile is
  drawn just above it, so it never covers the cell being targeted.
- Tiles are `touch-action: none`, which is what stops a drag from scrolling the page.

**Tap** a cell, then a tile. Selection starts on the first empty blank and moves to the next
one in reading order after every correct placement.

**Typing** handles multi-digit values: a digit is committed as soon as no remaining tile
value has it as a prefix, otherwise it waits 900ms for a second digit. With tiles `2` and
`26` on the board, typing `2` waits and `26` commits immediately. Typing a value with no
matching tile is ignored with a toast - it is a typo, not a mistake, and never costs a
life.

### Sound

Synthesised with the Web Audio API - a handful of oscillators and gain envelopes in
`core/sound/sound.service.ts`. No audio files, so the bundle is unchanged, there is nothing
to download, and a sound is tuned by editing numbers.

The whole kit sits on a C major pentatonic, which matters more than it sounds: a placement
that also completes an equation fires two sounds at once, and on that scale they cannot
clash.

Browsers refuse to start audio outside a user gesture, so the `AudioContext` is created
lazily on the first sound - which is always a tap, a click or a keypress. If Web Audio is
unavailable the service marks itself dead and the game is simply silent.

Placement sounds are played from `GameStore.put()` and `commit()`, not from the components,
so dragging, tapping, typing and hints all sound the same without four call sites. One
sound per placement: the biggest thing that just happened wins - win over solved-equation
over placed.

### Hints

The offer sheet lives in the shell, not the Play page, because the hint counter in the top
bar opens it from anywhere. `HintOffer` carries an optional follow-up: during play that is
"use it as soon as it arrives", and from the top bar there is none, because the hint just
goes in the pocket. `suspend()` exists for the rewarded-video path, which has to hide the
sheet while the advert takes the screen without forgetting what to do afterwards.

### Motion

Screens are not static on arrival. One global rule gives every page's blocks a staggered
rise, the board deals its cells in one at a time in reading order, tray tiles and stars
arrive in sequence, and the coin and hint counters bump when their number changes. Presses
sink into their own shadow and, where there is a real pointer, buttons and tiles lift on
hover.

The counter bump is the one animation driven from script rather than CSS: two coin changes
in quick succession have to restart it, and re-adding a class that is already there does
not. That path checks `prefers-reduced-motion` itself, since it does not inherit the global
rule.

Everything else is disabled by one block in `animations.css` under
`prefers-reduced-motion: reduce` - which also means that with "Reduce motion" enabled in
the OS, the game is deliberately still.

### Accessibility

Everything interactive is a real `<button>` or `<a>`; `nbButton` is an attribute selector
precisely so native semantics are kept rather than recreated. Board cells carry labels like
`Row 3, column 5, empty`, operators read as "plus" and "divided by", locked levels announce
themselves as locked. Dialogs trap focus and restore page scrolling on destroy. All motion
is disabled under `prefers-reduced-motion`.

### Tuning

- Economy: `core/config/economy.ts` - every reward, price, cap and the star thresholds.
- Colour, spacing, type, motion: `styles/tokens.css`.
- Difficulty: `DIFFICULTY_CONFIG` in the engine.

---

## Where this is going

[ONLINE.md](ONLINE.md) covers accounts, cloud save, leaderboards, leagues, duels and the
mobile build. The short version: because a puzzle is a pure function of its seed, the
backend regenerates puzzles instead of storing them, and verifies submitted answers with
this same engine package. The one rule that protects all of it is that **a published seed
must generate the same puzzle forever** - so a change to generation means a new seed
namespace, not an edit to the old one.
