import { chooseBlanks } from './blanks.js';
import { sortCellKeys } from './cell-key.js';
import { DIFFICULTY_CONFIG, GENERATION } from './config.js';
import { fillValues, type FilledLayout } from './fill.js';
import { buildLayout, slotCellAt, slotNumberCells, type Layout } from './layout.js';
import { solutionValue } from './puzzle-index.js';
import { createRng, hashString } from './rng.js';
import type { CellKey, Equation, Puzzle, PuzzleRequest } from './types.js';

function puzzleId(request: PuzzleRequest): string {
  return `${request.difficulty}-${hashString(request.seed).toString(36)}`;
}

function assemble(request: PuzzleRequest, layout: Layout, filled: FilledLayout): Puzzle {
  const equations: Equation[] = layout.slots.map((slot) => {
    const op = filled.ops[slot.id];
    if (op === undefined) throw new Error(`No operator was chosen for equation ${slot.id}`);
    return {
      id: slot.id,
      dir: slot.dir,
      row: slot.row,
      col: slot.col,
      op,
      cells: slotNumberCells(slot),
      opCell: slotCellAt(slot, 1),
      equalsCell: slotCellAt(slot, 3),
    };
  });

  // Written in reading order so the serialised puzzle is byte-stable.
  const solution: Record<CellKey, number> = {};
  for (const key of sortCellKeys([...filled.values.keys()])) {
    const value = filled.values.get(key);
    if (value === undefined) throw new Error(`Lost the value for cell ${key}`);
    solution[key] = value;
  }

  return {
    id: puzzleId(request),
    seed: request.seed,
    difficulty: request.difficulty,
    rows: layout.rows,
    cols: layout.cols,
    equations,
    solution,
    blanks: [],
    tiles: [],
  };
}

/**
 * Build the puzzle for a seed and difficulty.
 *
 * Deterministic by construction: one seeded generator drives layout, values and
 * blanks, and a failed attempt simply continues from the advanced generator
 * state. The same request therefore yields the same puzzle on every device and
 * on the server.
 */
export function generatePuzzle(request: PuzzleRequest): Puzzle {
  const spec = DIFFICULTY_CONFIG[request.difficulty];
  if (spec === undefined) throw new Error(`Unknown difficulty: ${String(request.difficulty)}`);

  const rng = createRng(request.seed);

  for (let attempt = 0; attempt < GENERATION.maxTries; attempt += 1) {
    const layout = buildLayout(rng, spec);
    if (layout === null) continue;

    const filled = fillValues(rng, layout.slots, spec);
    if (filled === null) continue;

    const draft = assemble(request, layout, filled);
    const blanks = chooseBlanks(rng, draft, spec);
    if (blanks === null) continue;

    const tiles = blanks.map((key) => solutionValue(draft, key)).sort((a, b) => a - b);
    return { ...draft, blanks, tiles };
  }

  throw new Error(
    `Could not generate a ${request.difficulty} puzzle for seed "${request.seed}" ` +
      `within ${GENERATION.maxTries} attempts`,
  );
}
