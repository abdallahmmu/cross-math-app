import type { CellKey } from './types.js';

export function cellKey(row: number, col: number): CellKey {
  return `${row},${col}`;
}

export interface CellPosition {
  readonly row: number;
  readonly col: number;
}

export function parseCellKey(key: CellKey): CellPosition {
  const comma = key.indexOf(',');
  const row = Number(key.slice(0, comma));
  const col = Number(key.slice(comma + 1));
  if (comma < 0 || !Number.isInteger(row) || !Number.isInteger(col)) {
    throw new Error(`Malformed cell key: "${key}"`);
  }
  return { row, col };
}

/** Reading order: top to bottom, then left to right. */
export function compareCellKeys(a: CellKey, b: CellKey): number {
  const left = parseCellKey(a);
  const right = parseCellKey(b);
  return left.row - right.row || left.col - right.col;
}

export function sortCellKeys(keys: readonly CellKey[]): CellKey[] {
  return [...keys].sort(compareCellKeys);
}
