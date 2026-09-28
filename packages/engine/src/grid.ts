import { cellKey } from './cell-key.js';
import { solutionValue } from './puzzle-index.js';
import type { CellKey, GridCell, Operator, Puzzle } from './types.js';

interface SymbolCell {
  readonly kind: 'op' | 'equals';
  readonly operator: Operator | null;
}

/**
 * A row-major grid of render-ready cells.
 *
 * Operator and equals cells carry their equation id too, so the board can light
 * up all five cells of an equation once it is solved.
 */
export function buildGrid(puzzle: Puzzle): GridCell[][] {
  const blankSet = new Set<CellKey>(puzzle.blanks);
  const numberCells = new Set<CellKey>();
  const symbols = new Map<CellKey, SymbolCell>();
  const equationIds = new Map<CellKey, number[]>();

  const attach = (key: CellKey, id: number): void => {
    const list = equationIds.get(key);
    if (list === undefined) equationIds.set(key, [id]);
    else list.push(id);
  };

  for (const equation of puzzle.equations) {
    for (const key of equation.cells) {
      numberCells.add(key);
      attach(key, equation.id);
    }
    symbols.set(equation.opCell, { kind: 'op', operator: equation.op });
    attach(equation.opCell, equation.id);
    symbols.set(equation.equalsCell, { kind: 'equals', operator: null });
    attach(equation.equalsCell, equation.id);
  }

  const grid: GridCell[][] = [];
  for (let row = 0; row < puzzle.rows; row += 1) {
    const line: GridCell[] = [];
    for (let col = 0; col < puzzle.cols; col += 1) {
      const key = cellKey(row, col);
      const ids: readonly number[] = equationIds.get(key) ?? [];
      const symbol = symbols.get(key);

      if (numberCells.has(key)) {
        const blank = blankSet.has(key);
        line.push({
          row,
          col,
          key,
          kind: 'number',
          value: blank ? null : solutionValue(puzzle, key),
          operator: null,
          given: !blank,
          blank,
          equationIds: ids,
        });
      } else if (symbol !== undefined) {
        line.push({
          row,
          col,
          key,
          kind: symbol.kind,
          value: null,
          operator: symbol.operator,
          given: false,
          blank: false,
          equationIds: ids,
        });
      } else {
        line.push({
          row,
          col,
          key,
          kind: 'empty',
          value: null,
          operator: null,
          given: false,
          blank: false,
          equationIds: [],
        });
      }
    }
    grid.push(line);
  }
  return grid;
}
