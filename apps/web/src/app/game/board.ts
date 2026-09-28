import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { CellKey } from '@sumday/engine';
import { GameStore } from '../state/game.store';

/**
 * The board is a single CSS grid. Number cells sit on even rows and columns and
 * operator cells on odd ones - the engine's parity lattice - so the track list
 * alternates a wide number track with a narrow symbol track. That is what makes
 * a 13x13 expert grid fit a 360px phone without scrolling: the six symbol
 * columns only take 56% of a number column.
 *
 * Empty cells are not rendered at all; every cell places itself with
 * grid-row/grid-column.
 */
@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--cols]': 'store.cols()',
    '[style.--number-cols]': 'numberCols()',
    '[style.--symbol-cols]': 'symbolCols()',
  },
  template: `
    <div
      class="board"
      role="group"
      aria-label="Puzzle board"
      [style.grid-template-columns]="columnTracks()"
      [style.grid-template-rows]="rowTracks()"
    >
      @for (cell of store.cells(); track cell.key) {
        @if (cell.blank) {
          <button
            class="cell is-blank"
            type="button"
            [class.is-filled]="cell.filled"
            [class.is-selected]="cell.selected"
            [class.is-solved]="cell.solved && !cell.selected"
            [class.is-wrong]="cell.wrong"
            [class.is-popped]="cell.popped"
            [style.grid-row]="cell.row + 1"
            [style.grid-column]="cell.col + 1"
            [attr.aria-label]="cell.label"
            [attr.aria-pressed]="cell.selected"
            (click)="select(cell.key)"
          >
            <span class="num">{{ cell.text }}</span>
          </button>
        } @else if (cell.kind === 'number') {
          <span
            class="cell is-given"
            [class.is-solved]="cell.solved"
            [style.grid-row]="cell.row + 1"
            [style.grid-column]="cell.col + 1"
            [attr.aria-label]="cell.label"
            role="img"
          >
            <span class="num">{{ cell.text }}</span>
          </span>
        } @else {
          <span
            class="cell is-symbol"
            [class.is-solved]="cell.solved"
            [style.grid-row]="cell.row + 1"
            [style.grid-column]="cell.col + 1"
            [attr.aria-label]="cell.label"
            role="img"
          >
            {{ cell.text }}
          </span>
        }
      }
    </div>
  `,
  styleUrl: './board.css',
})
export class Board {
  protected readonly store = inject(GameStore);

  protected readonly numberCols = computed(() => Math.ceil(this.store.cols() / 2));
  protected readonly symbolCols = computed(() => Math.floor(this.store.cols() / 2));

  /** Rows and columns always have odd length, so the pattern is N S N S ... N. */
  protected readonly columnTracks = computed(() => tracks(this.store.cols()));
  protected readonly rowTracks = computed(() => tracks(this.store.rows()));

  protected select(key: CellKey): void {
    this.store.select(key);
  }
}

function tracks(count: number): string {
  return Array.from({ length: count }, (_unused, index) =>
    index % 2 === 0 ? 'var(--cell)' : 'var(--symbol)',
  ).join(' ');
}
