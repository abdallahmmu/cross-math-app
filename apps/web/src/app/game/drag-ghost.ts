import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TileDragService } from './tile-drag.service';

/** The tile that follows the pointer while it is being dragged. */
@Component({
  selector: 'app-drag-ghost',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (drag.drag(); as state) {
      <span
        class="ghost num"
        [class.is-lifted]="state.lifted"
        [style.left.px]="state.x"
        [style.top.px]="state.y"
        aria-hidden="true"
      >
        {{ state.value }}
      </span>
    }
  `,
  styles: `
    .ghost {
      position: fixed;
      z-index: 70;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: var(--tap-min);
      min-height: var(--tap-min);
      padding: 0 var(--space-2);
      border: var(--border);
      border-radius: var(--radius-tile);
      background: var(--sunflower);
      color: var(--on-accent);
      box-shadow: var(--shadow-lg);
      font-size: var(--text-lg);
      line-height: 1;
      /* The ghost must never be the element under the pointer, or the drop
         target can never be found. */
      pointer-events: none;
      /* Sits just above the cursor, so the cell it is aimed at stays visible. */
      transform: translate(-50%, calc(-100% - 0.5rem)) rotate(-3deg) scale(1.08);
    }

    /* Carried under the finger's aim point on touch. */
    .ghost.is-lifted {
      transform: translate(-50%, -50%) rotate(-3deg) scale(1.08);
    }
  `,
})
export class DragGhost {
  protected readonly drag = inject(TileDragService);
}
