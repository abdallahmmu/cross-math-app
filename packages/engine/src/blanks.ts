import { compareCellKeys, sortCellKeys } from './cell-key.js';
import { GENERATION, type DifficultySpec } from './config.js';
import { equationsByCell, numberCellsOf, solutionValue } from './puzzle-index.js';
import type { Rng } from './rng.js';
import { countSolutions } from './solver.js';
import type { CellKey, Puzzle } from './types.js';

/**
 * Hide number cells one at a time, keeping a hide only while the puzzle still
 * has exactly one solution, until the difficulty's blank ratio is reached.
 *
 * Returns `null` when too few cells could be hidden, so the caller can retry
 * with an advanced RNG state.
 */
export function chooseBlanks(rng: Rng, draft: Puzzle, spec: DifficultySpec): CellKey[] | null {
  const numberCells = numberCellsOf(draft);
  const target = Math.max(1, Math.round(numberCells.length * spec.blankRatio));
  const eqsByCell = equationsByCell(draft);

  const blanks: CellKey[] = [];
  const blanksPerEquation = new Map<number, number>();

  for (const key of rng.shuffle(numberCells)) {
    if (blanks.length >= target) break;

    const equations = eqsByCell.get(key) ?? [];
    const atCap = equations.some(
      (equation) => (blanksPerEquation.get(equation.id) ?? 0) >= spec.maxBlanksPerEquation,
    );
    if (atCap) continue;

    const trial = [...blanks, key].sort(compareCellKeys);
    const tiles = trial.map((cell) => solutionValue(draft, cell)).sort((a, b) => a - b);
    if (countSolutions({ ...draft, blanks: trial, tiles }, 2) !== 1) continue;

    blanks.push(key);
    for (const equation of equations) {
      blanksPerEquation.set(equation.id, (blanksPerEquation.get(equation.id) ?? 0) + 1);
    }
  }

  const minimum = Math.ceil(target * GENERATION.minBlankFraction);
  return blanks.length >= minimum ? sortCellKeys(blanks) : null;
}
