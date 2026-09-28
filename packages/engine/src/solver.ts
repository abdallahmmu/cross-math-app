import { applyOperator, solveLeft, solveRight } from './candidates.js';
import { GENERATION } from './config.js';
import { equationsByCell } from './puzzle-index.js';
import type { CellKey, Puzzle } from './types.js';

/**
 * How many ways the tiles can be laid out so every equation holds, counted up
 * to `limit`.
 *
 * The search assigns tile *values*, not tile instances, so two identical tiles
 * never produce two "different" solutions. Whenever an equation has a single
 * unknown left, its value is forced rather than guessed, which is what makes
 * uniqueness checking cheap enough to run once per candidate blank.
 *
 * If the node limit is reached the count is reported as at least `limit`, so a
 * caller checking `=== 1` treats an unfinished search as not unique.
 */
export function countSolutions(puzzle: Puzzle, limit = 2): number {
  const blankSet = new Set<CellKey>(puzzle.blanks);
  const known = new Map<CellKey, number>();
  for (const [key, value] of Object.entries(puzzle.solution)) {
    if (!blankSet.has(key)) known.set(key, value);
  }

  const pool = new Map<number, number>();
  for (const tile of puzzle.tiles) pool.set(tile, (pool.get(tile) ?? 0) + 1);
  const poolValues = [...pool.keys()].sort((left, right) => left - right);
  const eqsByCell = equationsByCell(puzzle);

  let nodes = 0;
  let limitHit = false;
  let found = 0;

  const take = (key: CellKey, value: number): boolean => {
    const count = pool.get(value) ?? 0;
    if (count <= 0) return false;
    pool.set(value, count - 1);
    known.set(key, value);
    return true;
  };

  const giveBack = (key: CellKey): void => {
    const value = known.get(key);
    if (value === undefined) return;
    known.delete(key);
    pool.set(value, (pool.get(value) ?? 0) + 1);
  };

  /** Fill everything that is forced, and reject contradictions. */
  const propagate = (trail: CellKey[]): boolean => {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const equation of puzzle.equations) {
        const [keyA, keyB, keyR] = equation.cells;
        const a = known.get(keyA);
        const b = known.get(keyB);
        const r = known.get(keyR);

        let key: CellKey;
        let forced: number | null;
        if (a !== undefined && b !== undefined && r !== undefined) {
          if (applyOperator(equation.op, a, b) !== r) return false;
          continue;
        }
        if (a === undefined && b !== undefined && r !== undefined) {
          key = keyA;
          forced = solveLeft(equation.op, b, r);
        } else if (b === undefined && a !== undefined && r !== undefined) {
          key = keyB;
          forced = solveRight(equation.op, a, r);
        } else if (r === undefined && a !== undefined && b !== undefined) {
          key = keyR;
          forced = applyOperator(equation.op, a, b);
        } else {
          continue; // two or more unknowns: nothing is forced yet
        }

        if (forced === null || !Number.isInteger(forced) || forced < 1) return false;
        if (!take(key, forced)) return false;
        trail.push(key);
        progressed = true;
      }
    }
    return true;
  };

  const unknownsIn = (cells: readonly CellKey[]): number => {
    let count = 0;
    for (const key of cells) if (!known.has(key)) count += 1;
    return count;
  };

  /** The unfilled blank whose tightest equation has the fewest unknowns. */
  const selectBlank = (): CellKey | null => {
    let best: CellKey | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const key of puzzle.blanks) {
      if (known.has(key)) continue;
      let score = Number.POSITIVE_INFINITY;
      for (const equation of eqsByCell.get(key) ?? []) {
        score = Math.min(score, unknownsIn(equation.cells));
      }
      if (score < bestScore) {
        bestScore = score;
        best = key;
      }
    }
    return best;
  };

  const search = (): void => {
    if (found >= limit || limitHit) return;
    if (nodes >= GENERATION.solverNodeLimit) {
      limitHit = true;
      return;
    }
    nodes += 1;

    const trail: CellKey[] = [];
    if (propagate(trail)) {
      const target = selectBlank();
      if (target === null) {
        // Propagation validated every equation on its way here.
        found += 1;
      } else {
        for (const value of poolValues) {
          if (!take(target, value)) continue;
          search();
          giveBack(target);
          if (found >= limit || limitHit) break;
        }
      }
    }
    for (let i = trail.length - 1; i >= 0; i -= 1) {
      const key = trail[i];
      if (key !== undefined) giveBack(key);
    }
  };

  search();
  return limitHit ? Math.max(found, limit) : found;
}
