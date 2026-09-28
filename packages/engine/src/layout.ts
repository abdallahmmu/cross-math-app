import { cellKey, parseCellKey } from './cell-key.js';
import { GENERATION, type DifficultySpec } from './config.js';
import type { Rng } from './rng.js';
import type { CellKey, Direction } from './types.js';

/** Every equation occupies five cells along its direction. */
export const EQUATION_LENGTH = 5;

/** Offsets of the three number cells: `a`, `b`, `result`. */
export const NUMBER_OFFSETS = [0, 2, 4] as const;

export type NumberOffset = (typeof NUMBER_OFFSETS)[number];

/** An equation's position, before an operator and values are chosen for it. */
export interface Slot {
  readonly id: number;
  readonly dir: Direction;
  readonly row: number;
  readonly col: number;
}

export interface Layout {
  readonly slots: readonly Slot[];
  readonly rows: number;
  readonly cols: number;
}

export function step(dir: Direction): CellPositionDelta {
  return dir === 'h' ? { dRow: 0, dCol: 1 } : { dRow: 1, dCol: 0 };
}

interface CellPositionDelta {
  readonly dRow: number;
  readonly dCol: number;
}

export function slotCellAt(slot: Slot, offset: number): CellKey {
  const { dRow, dCol } = step(slot.dir);
  return cellKey(slot.row + dRow * offset, slot.col + dCol * offset);
}

export function slotNumberCells(slot: Slot): readonly [CellKey, CellKey, CellKey] {
  return [slotCellAt(slot, 0), slotCellAt(slot, 2), slotCellAt(slot, 4)];
}

/** What sits on a cell. Operator and equals cells are both `symbol`. */
type Occupant = 'number' | 'symbol';

/** The equation using a number cell in each direction, if any. */
interface Owners {
  h?: number;
  v?: number;
}

interface Board {
  readonly occupied: Map<CellKey, Occupant>;
  readonly owners: Map<CellKey, Owners>;
  /** Every number cell placed so far, used to pick attachment points. */
  readonly numberCells: CellKey[];
}

interface Box {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
}

function boxRows(box: Box): number {
  return box.maxRow - box.minRow + 1;
}

function boxCols(box: Box): number {
  return box.maxCol - box.minCol + 1;
}

/**
 * Grow the bounding box around a slot. Only the two endpoints matter: they are
 * number cells at even coordinates, and every other cell of the equation lies
 * between them. That also means `minRow` and `minCol` stay even, so
 * normalising to the origin preserves the parity lattice.
 */
function growBox(box: Box, slot: Slot): Box {
  const end = parseCellKey(slotCellAt(slot, EQUATION_LENGTH - 1));
  return {
    minRow: Math.min(box.minRow, slot.row),
    maxRow: Math.max(box.maxRow, end.row),
    minCol: Math.min(box.minCol, slot.col),
    maxCol: Math.max(box.maxCol, end.col),
  };
}

function canPlace(board: Board, slot: Slot, spec: DifficultySpec, box: Box): boolean {
  // Two equations in the same direction must not touch or read as one long
  // equation: the cells just before and just after this one stay empty.
  if (board.occupied.has(slotCellAt(slot, -1))) return false;
  if (board.occupied.has(slotCellAt(slot, EQUATION_LENGTH))) return false;

  for (let offset = 0; offset < EQUATION_LENGTH; offset += 1) {
    const key = slotCellAt(slot, offset);
    const occupant = board.occupied.get(key);
    if (offset % 2 === 1) {
      // Operator and equals cells are never shared.
      if (occupant !== undefined) return false;
      continue;
    }
    if (occupant === 'symbol') return false;
    if (occupant === 'number' && board.owners.get(key)?.[slot.dir] !== undefined) {
      // That cell already belongs to an equation running our way.
      return false;
    }
  }

  const grown = growBox(box, slot);
  return boxRows(grown) <= spec.maxGrid && boxCols(grown) <= spec.maxGrid;
}

function place(board: Board, slot: Slot, box: Box): Box {
  for (let offset = 0; offset < EQUATION_LENGTH; offset += 1) {
    const key = slotCellAt(slot, offset);
    if (offset % 2 === 1) {
      board.occupied.set(key, 'symbol');
      continue;
    }
    if (!board.occupied.has(key)) {
      board.occupied.set(key, 'number');
      board.numberCells.push(key);
    }
    const owners = board.owners.get(key) ?? {};
    owners[slot.dir] = slot.id;
    board.owners.set(key, owners);
  }
  return growBox(box, slot);
}

function normalize(slots: readonly Slot[], box: Box): Layout {
  const shifted = slots.map((slot) => ({
    id: slot.id,
    dir: slot.dir,
    row: slot.row - box.minRow,
    col: slot.col - box.minCol,
  }));
  return { slots: shifted, rows: boxRows(box), cols: boxCols(box) };
}

/**
 * Grow a crossword-shaped layout: start with one horizontal equation, then keep
 * attaching perpendicular equations through an existing number cell, which can
 * land at position 0, 2 or 4 of the new equation.
 *
 * Returns `null` when the target equation count is out of reach, so the caller
 * can retry with an advanced RNG state.
 */
export function buildLayout(rng: Rng, spec: DifficultySpec): Layout | null {
  const target = rng.range(spec.minEquations, spec.maxEquations);
  const board: Board = { occupied: new Map(), owners: new Map(), numberCells: [] };
  const slots: Slot[] = [];

  const first: Slot = { id: 0, dir: 'h', row: 0, col: 0 };
  let box: Box = place(board, first, { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 });
  slots.push(first);

  for (let attempt = 0; attempt < GENERATION.layoutAttempts && slots.length < target; attempt += 1) {
    const anchor = rng.pick(board.numberCells);
    const owners = board.owners.get(anchor);
    const free: Direction[] = [];
    if (owners?.h === undefined) free.push('h');
    if (owners?.v === undefined) free.push('v');
    if (free.length === 0) continue;

    const dir = rng.pick(free);
    const { dRow, dCol } = step(dir);
    const { row, col } = parseCellKey(anchor);

    for (const shared of rng.shuffle(NUMBER_OFFSETS)) {
      const slot: Slot = {
        id: slots.length,
        dir,
        row: row - dRow * shared,
        col: col - dCol * shared,
      };
      if (!canPlace(board, slot, spec, box)) continue;
      box = place(board, slot, box);
      slots.push(slot);
      break;
    }
  }

  return slots.length === target ? normalize(slots, box) : null;
}
