import { applyOperator } from './candidates.js';
import { sortCellKeys } from './cell-key.js';
import { solutionValue } from './puzzle-index.js';
import type { Answers, CellKey, Hint, Puzzle, ValidationResult } from './types.js';

/**
 * Check a finished board: every equation has to hold, and the answers have to
 * use exactly the tiles the player was given - no substitutions, nothing left
 * over.
 *
 * `wrongCells` lists the filled blanks that sit in an equation which does not
 * add up, which is what the board shakes.
 */
export function validateSolution(puzzle: Puzzle, answers: Answers): ValidationResult {
  const blankSet = new Set<CellKey>(puzzle.blanks);
  const valueOf = (key: CellKey): number | null =>
    blankSet.has(key) ? (answers[key] ?? null) : solutionValue(puzzle, key);

  const wrongCells = new Set<CellKey>();
  let equationsHold = true;

  for (const equation of puzzle.equations) {
    const [keyA, keyB, keyR] = equation.cells;
    const a = valueOf(keyA);
    const b = valueOf(keyB);
    const r = valueOf(keyR);
    if (a === null || b === null || r === null) {
      equationsHold = false;
      continue;
    }
    if (applyOperator(equation.op, a, b) !== r) {
      equationsHold = false;
      for (const key of equation.cells) {
        if (blankSet.has(key) && valueOf(key) !== null) wrongCells.add(key);
      }
    }
  }

  const entered = puzzle.blanks.map((key) => answers[key] ?? null);
  const complete = entered.every((value) => value !== null);
  const used = entered.filter((value): value is number => value !== null).sort((x, y) => x - y);
  const tilesMatch =
    used.length === puzzle.tiles.length && used.every((value, i) => value === puzzle.tiles[i]);

  return {
    valid: complete && equationsHold && tilesMatch,
    wrongCells: sortCellKeys([...wrongCells]),
  };
}

/** Whether `value` is the value this blank is waiting for. */
export function isCorrectPlacement(puzzle: Puzzle, cellKey: CellKey, value: number): boolean {
  if (!puzzle.blanks.includes(cellKey)) return false;
  return puzzle.solution[cellKey] === value;
}

/**
 * The next cell to reveal: the preferred cell when it still needs help,
 * otherwise the first such blank in reading order. `null` once the board is
 * correctly filled.
 */
export function getHint(puzzle: Puzzle, answers: Answers, preferredCell?: CellKey): Hint | null {
  const needsHelp = (key: CellKey): boolean => (answers[key] ?? null) !== puzzle.solution[key];
  const blanks = sortCellKeys(puzzle.blanks);

  const target =
    preferredCell !== undefined && blanks.includes(preferredCell) && needsHelp(preferredCell)
      ? preferredCell
      : blanks.find(needsHelp);

  if (target === undefined) return null;
  return { cellKey: target, value: solutionValue(puzzle, target) };
}
