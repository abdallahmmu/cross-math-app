import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { CellKey } from '@sumday/engine';
import { GameStore } from '../state/game.store';
import { Tile } from './tile';
import { TileDrag } from './tile-drag.directive';

/**
 * The tiles still waiting to be placed. Drag one onto a cell, or tap it to drop
 * it into the selected cell.
 */
@Component({
  selector: 'app-tray',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Tile, TileDrag],
  template: `
    <div class="tray" role="group" aria-label="Number tiles">
      @for (tile of store.tray(); track tile.id; let index = $index) {
        <button
          appTile
          appTileDrag
          [value]="tile.value"
          [tileId]="tile.id"
          [tileValue]="tile.value"
          [wrong]="shakeValue() === tile.value"
          [style.--enter-delay]="index * 40 + 'ms'"
          [attr.aria-label]="'Place ' + tile.value"
          (dropped)="dropOn($event, tile.id)"
          (tapped)="store.placeTile(tile.id)"
        ></button>
      } @empty {
        <p class="muted">Every tile is placed.</p>
      }
    </div>
  `,
  styles: `
    .tray {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      justify-content: center;
      align-items: center;
      min-height: calc(var(--tap-min) + var(--space-2));
      padding: var(--space-3);
      border: var(--border);
      border-radius: var(--radius);
      background: var(--paper);
      box-shadow: var(--shadow);
    }
  `,
})
export class Tray {
  protected readonly store = inject(GameStore);
  protected readonly shakeValue = computed(() => this.store.wrong()?.value ?? null);

  protected dropOn(cellKey: CellKey, tileId: number): void {
    this.store.placeTileAt(tileId, cellKey);
  }
}
