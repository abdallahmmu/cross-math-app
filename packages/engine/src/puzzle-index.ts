import { sortCellKeys } from './cell-key.js';
import type { CellKey, Equation, Puzzle } from './types.js';

/** Every number cell of the puzzle, deduplicated, in reading order. */
export function numberCellsOf(puzzle: Puzzle): CellKey[] {
  const seen = new Set<CellKey>();
  for (const equation of puzzle.equations) {
    for (const key of equation.cells) seen.add(key);
  }
  return sortCellKeys([...seen]);
}

/** The one or two equations that use each number cell. */
export function equationsByCell(puzzle: Puzzle): Map<CellKey, Equation[]> {
  const byCell = new Map<CellKey, Equation[]>();
  for (const equation of puzzle.equations) {
    for (const key of equation.cells) {
      const list = byCell.get(key);
      if (list === undefined) byCell.set(key, [equation]);
      else list.push(equation);
    }
  }
  return byCell;
}

export function solutionValue(puzzle: Puzzle, key: CellKey): number {
  const value = puzzle.solution[key];
  if (value === undefined) {
    throw new Error(`Puzzle ${puzzle.id} has no solution value for cell ${key}`);
  }
  return value;
}
