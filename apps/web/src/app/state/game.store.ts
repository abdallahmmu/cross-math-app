import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  buildGrid,
  isCorrectPlacement,
  sortCellKeys,
  validateSolution,
  type CellKey,
  type CellKind,
  type Operator,
  type Puzzle,
} from '@sumday/engine';

export type GameStatus = 'loading' | 'playing' | 'won';

/** A tile keeps its identity for the whole run, so animations can track it. */
export interface TrayTile {
  readonly id: number;
  readonly value: number;
  readonly placedAt: CellKey | null;
}

export type PlaceOutcome = 'correct' | 'wrong' | 'no-tile' | 'no-cell';

/** One cell, ready to render: no lookups left for the template to do. */
export interface BoardCell {
  readonly key: CellKey;
  readonly row: number;
  readonly col: number;
  readonly kind: CellKind;
  readonly text: string;
  readonly blank: boolean;
  readonly filled: boolean;
  readonly selected: boolean;
  readonly solved: boolean;
  readonly wrong: boolean;
  readonly popped: boolean;
  readonly label: string;
}

interface GameState {
  puzzle: Puzzle | null;
  answers: Record<CellKey, number | null>;
  tiles: readonly TrayTile[];
  selected: CellKey | null;
  mistakes: number;
  hintsUsed: number;
  status: GameStatus;
  elapsedMs: number;
  /** Cleared shortly after it is set, so the shake can replay. */
  wrong: { cellKey: CellKey; value: number } | null;
  /** Cells mid-pop: the one just filled, plus any equation it completed. */
  popped: readonly CellKey[];
}

const OPERATOR_NAMES: Readonly<Record<Operator, string>> = {
  '+': 'plus',
  '−': 'minus',
  '×': 'times',
  '÷': 'divided by',
};

const WRONG_MS = 400;
const POP_MS = 260;

function initialState(): GameState {
  return {
    puzzle: null,
    answers: {},
    tiles: [],
    selected: null,
    mistakes: 0,
    hintsUsed: 0,
    status: 'loading',
    elapsedMs: 0,
    wrong: null,
    popped: [],
  };
}

/**
 * One run of one puzzle. Provided by the Play page, so leaving the page throws
 * the whole run away and nothing leaks into the next one.
 */
export const GameStore = signalStore(
  withState<GameState>(initialState()),

  withComputed((store) => {
    /** Every number cell's current value: givens plus what the player entered. */
    const values = computed<Readonly<Record<CellKey, number | null>>>(() => {
      const puzzle = store.puzzle();
      if (puzzle === null) return {};
      const blanks = new Set<CellKey>(puzzle.blanks);
      const answers = store.answers();
      const out: Record<CellKey, number | null> = {};
      for (const [key, value] of Object.entries(puzzle.solution)) {
        out[key] = blanks.has(key) ? (answers[key] ?? null) : value;
      }
      return out;
    });

    /**
     * Equations the player finished. An equation with no blanks was complete
     * from the start, so it is left out: nothing should look solved before a
     * single tile has been placed.
     */
    const solvedEquations = computed<ReadonlySet<number>>(() => {
      const puzzle = store.puzzle();
      if (puzzle === null) return new Set<number>();
      const blanks = new Set<CellKey>(puzzle.blanks);
      const current = values();
      const solved = new Set<number>();
      for (const equation of puzzle.equations) {
        const hasBlank = equation.cells.some((key) => blanks.has(key));
        const complete = equation.cells.every((key) => (current[key] ?? null) !== null);
        if (hasBlank && complete) solved.add(equation.id);
      }
      return solved;
    });

    /** How many equations the run is scored against. */
    const solvableEquations = computed(() => {
      const puzzle = store.puzzle();
      if (puzzle === null) return 0;
      const blanks = new Set<CellKey>(puzzle.blanks);
      return puzzle.equations.filter((equation) => equation.cells.some((key) => blanks.has(key)))
        .length;
    });

    const grid = computed(() => {
      const puzzle = store.puzzle();
      return puzzle === null ? [] : buildGrid(puzzle);
    });

    const tray = computed(() => store.tiles().filter((tile) => tile.placedAt === null));

    return {
      values,
      solvedEquations,
      solvableEquations,

      tray,
      trayValues: computed(() => tray().map((tile) => tile.value)),
      rows: computed(() => store.puzzle()?.rows ?? 0),
      cols: computed(() => store.puzzle()?.cols ?? 0),

      /** A flat list: the board is one CSS grid, not nested rows. */
      cells: computed<readonly BoardCell[]>(() => {
        const current = values();
        const solved = solvedEquations();
        const selected = store.selected();
        const wrong = store.wrong();
        const popped = new Set(store.popped());

        return grid()
          .flat()
          .filter((cell) => cell.kind !== 'empty')
          .map((cell): BoardCell => {
            const value = current[cell.key] ?? null;
            const isSolved = cell.equationIds.some((id) => solved.has(id));
            const human = `Row ${cell.row + 1}, column ${cell.col + 1}`;

            switch (cell.kind) {
              case 'op':
                return {
                  ...baseCell(cell),
                  kind: 'op',
                  text: cell.operator ?? '',
                  solved: isSolved,
                  label: cell.operator === null ? '' : OPERATOR_NAMES[cell.operator],
                };
              case 'equals':
                return { ...baseCell(cell), kind: 'equals', text: '=', solved: isSolved, label: 'equals' };
              case 'number':
                return {
                  ...baseCell(cell),
                  kind: 'number',
                  text: value === null ? '' : String(value),
                  blank: cell.blank,
                  filled: value !== null,
                  selected: cell.blank && selected === cell.key,
                  solved: isSolved,
                  wrong: wrong?.cellKey === cell.key,
                  popped: popped.has(cell.key),
                  label: `${human}, ${value === null ? 'empty' : String(value)}`,
                };
              case 'empty':
                return { ...baseCell(cell), kind: 'empty', text: '', label: '' };
            }
          });
      }),
    };
  }),

  withComputed((store) => ({
    solvedCount: computed(() => store.solvedEquations().size),
    equationCount: store.solvableEquations,
  })),

  withMethods((store) => {
    /** The next blank that still needs a value, in reading order, after `from`. */
    const nextEmptyBlank = (from: CellKey | null): CellKey | null => {
      const puzzle = store.puzzle();
      if (puzzle === null) return null;
      const order = sortCellKeys(puzzle.blanks);
      const answers = store.answers();
      const startIndex = from === null ? 0 : order.indexOf(from) + 1;

      for (let step = 0; step < order.length; step += 1) {
        const key = order[(startIndex + step) % order.length];
        if (key !== undefined && (answers[key] ?? null) === null) return key;
      }
      return null;
    };

    /** Set a flag, then clear it once the animation has had time to run. */
    const flash = (set: Partial<GameState>, clear: Partial<GameState>, ms: number): void => {
      patchState(store, set);
      setTimeout(() => patchState(store, clear), ms);
    };

    /** Write a value into a cell, consume its tile, and move on. */
    const commit = (cellKey: CellKey, value: number, tileId: number): void => {
      const solvedBefore = store.solvedEquations();
      const answers = { ...store.answers(), [cellKey]: value };
      patchState(store, {
        answers,
        tiles: store
          .tiles()
          .map((tile) => (tile.id === tileId ? { ...tile, placedAt: cellKey } : tile)),
      });

      // The filled cell pops, and so does every cell of an equation this just
      // completed.
      const puzzle = store.puzzle();
      const finished = [...store.solvedEquations()].filter((id) => !solvedBefore.has(id));
      const equationCells = (puzzle?.equations ?? [])
        .filter((equation) => finished.includes(equation.id))
        .flatMap((equation) => [equation.opCell, equation.equalsCell, ...equation.cells]);
      flash({ popped: [cellKey, ...equationCells] }, { popped: [] }, POP_MS);

      const nextSelection = nextEmptyBlank(cellKey);
      patchState(store, { selected: nextSelection });

      if (puzzle !== null && nextSelection === null && validateSolution(puzzle, answers).valid) {
        patchState(store, { status: 'won' });
      }
    };

    const freeTile = (value: number): TrayTile | undefined =>
      store.tiles().find((item) => item.placedAt === null && item.value === value);

    /** The one place a tile ever lands, however it was moved there. */
    const put = (tile: TrayTile, cellKey: CellKey): PlaceOutcome => {
      const puzzle = store.puzzle();
      if (puzzle === null || store.status() !== 'playing') return 'no-cell';

      if (!isCorrectPlacement(puzzle, cellKey, tile.value)) {
        patchState(store, { mistakes: store.mistakes() + 1, selected: cellKey });
        flash({ wrong: { cellKey, value: tile.value } }, { wrong: null }, WRONG_MS);
        return 'wrong';
      }

      commit(cellKey, tile.value, tile.id);
      return 'correct';
    };

    /** Place the first free tile with this value into the selected cell. */
    const placeValue = (value: number): PlaceOutcome => {
      const tile = freeTile(value);
      if (tile === undefined) return 'no-tile';

      const cellKey = store.selected() ?? nextEmptyBlank(null);
      if (cellKey === null) return 'no-cell';
      return put(tile, cellKey);
    };

    return {
      load(puzzle: Puzzle): void {
        patchState(store, {
          ...initialState(),
          puzzle,
          tiles: puzzle.tiles.map((value, id) => ({ id, value, placedAt: null })),
          status: 'playing',
          selected: sortCellKeys(puzzle.blanks)[0] ?? null,
        });
      },

      select(cellKey: CellKey): void {
        const puzzle = store.puzzle();
        if (puzzle === null || !puzzle.blanks.includes(cellKey)) return;
        patchState(store, { selected: cellKey });
      },

      placeValue,

      placeTile(tileId: number): PlaceOutcome {
        const tile = store.tiles().find((item) => item.id === tileId);
        if (tile === undefined || tile.placedAt !== null) return 'no-tile';

        const cellKey = store.selected() ?? nextEmptyBlank(null);
        if (cellKey === null) return 'no-cell';
        return put(tile, cellKey);
      },

      /** Drop a tile straight onto a cell, bypassing the selection. */
      placeTileAt(tileId: number, cellKey: CellKey): PlaceOutcome {
        const tile = store.tiles().find((item) => item.id === tileId);
        if (tile === undefined || tile.placedAt !== null) return 'no-tile';
        return put(tile, cellKey);
      },

      /** Reveal one cell. Costs a hint, never a mistake. */
      applyHint(cellKey: CellKey, value: number): boolean {
        const tile = freeTile(value);
        if (tile === undefined) return false;
        patchState(store, { hintsUsed: store.hintsUsed() + 1 });
        commit(cellKey, value, tile.id);
        return true;
      },

      tick(elapsedMs: number): void {
        if (store.status() === 'playing') patchState(store, { elapsedMs });
      },
    };
  }),
);

/** Shared defaults for a render cell, so each branch only states what differs. */
function baseCell(cell: { key: CellKey; row: number; col: number }): BoardCell {
  return {
    key: cell.key,
    row: cell.row,
    col: cell.col,
    kind: 'empty',
    text: '',
    blank: false,
    filled: false,
    selected: false,
    solved: false,
    wrong: false,
    popped: false,
    label: '',
  };
}
