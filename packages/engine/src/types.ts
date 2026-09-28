/**
 * A cell address, encoded as `${row},${col}`.
 *
 * Cell keys are used instead of nested arrays so a puzzle stays a plain
 * JSON-serialisable object that can travel between the client and the server.
 */
export type CellKey = string;

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** Typographic characters, not the ASCII `-` and `*`. */
export type Operator = '+' | '−' | '×' | '÷';

/** `h` runs left to right, `v` runs top to bottom. */
export type Direction = 'h' | 'v';

/** What a puzzle is asked for: a seed plus a difficulty. */
export interface PuzzleRequest {
  readonly seed: string;
  readonly difficulty: Difficulty;
}

/**
 * One equation, five cells long along a single direction:
 *
 * ```
 * offset 0    1    2    3    4
 *        a   op    b   "="   r
 * ```
 *
 * The start cell is always at an even row and column (see `layout.ts`), which
 * keeps every number cell on even coordinates and every operator/equals cell on
 * an odd coordinate in exactly one axis. Horizontal and vertical equations can
 * therefore only ever meet at a number cell.
 */
export interface Equation {
  readonly id: number;
  readonly dir: Direction;
  /** Start row of the equation. Always even. */
  readonly row: number;
  /** Start column of the equation. Always even. */
  readonly col: number;
  readonly op: Operator;
  /** Number cells at offsets 0, 2 and 4: `[a, b, result]`. */
  readonly cells: readonly [CellKey, CellKey, CellKey];
  /** Operator cell, at offset 1. */
  readonly opCell: CellKey;
  /** Equals cell, at offset 3. */
  readonly equalsCell: CellKey;
}

/** A generated puzzle. Plain data: safe to `JSON.stringify` and store. */
export interface Puzzle {
  /** Stable, derived from the seed and difficulty. */
  readonly id: string;
  readonly seed: string;
  readonly difficulty: Difficulty;
  readonly rows: number;
  readonly cols: number;
  readonly equations: readonly Equation[];
  /** Every number cell's value, including the hidden ones. Keyed by cell key. */
  readonly solution: Readonly<Record<CellKey, number>>;
  /** Hidden number cells, in reading order. */
  readonly blanks: readonly CellKey[];
  /** The values of the hidden cells as a multiset, sorted ascending. */
  readonly tiles: readonly number[];
}

export type CellKind = 'empty' | 'number' | 'op' | 'equals';

/** A render-ready description of one grid cell. */
export interface GridCell {
  readonly row: number;
  readonly col: number;
  readonly key: CellKey;
  readonly kind: CellKind;
  /**
   * The number to display. `null` for blanks (the answer stays in
   * `Puzzle.solution`) and for non-number cells.
   */
  readonly value: number | null;
  /** Set only on operator cells. */
  readonly operator: Operator | null;
  /** A number cell that is shown from the start. */
  readonly given: boolean;
  /** A number cell the player has to fill. */
  readonly blank: boolean;
  /** Ids of the equations this cell belongs to: one, or two where they cross. */
  readonly equationIds: readonly number[];
}

/** What the player has entered so far, keyed by cell key. */
export type Answers = Readonly<Record<CellKey, number | null>>;

export interface ValidationResult {
  readonly valid: boolean;
  /** Filled blanks that sit in an equation which does not add up. */
  readonly wrongCells: readonly CellKey[];
}

export interface Hint {
  readonly cellKey: CellKey;
  readonly value: number;
}
