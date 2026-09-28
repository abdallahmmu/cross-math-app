import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameStore } from '../state/game.store';
import { Tile } from './tile';

/** The tiles still waiting to be placed. Tapping one drops it in the selected cell. */
@Component({
  selector: 'app-tray',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Tile],
  template: `
    <div class="tray" role="group" aria-label="Number tiles">
      @for (tile of store.tray(); track tile.id) {
        <button
          appTile
          [value]="tile.value"
          [wrong]="shakeValue() === tile.value"
          [attr.aria-label]="'Place ' + tile.value"
          (click)="store.placeTile(tile.id)"
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
}
