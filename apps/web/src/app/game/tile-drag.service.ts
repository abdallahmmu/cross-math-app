import { Injectable, signal } from '@angular/core';
import type { CellKey } from '@sumday/engine';

export interface DragState {
  readonly tileId: number;
  readonly value: number;
  /** Where the floating tile is drawn, and where the drop is tested. */
  readonly x: number;
  readonly y: number;
  /**
   * True for touch and pen, where the tile is carried above the finger. With a
   * mouse the cursor is the aim point and the tile is drawn just above it, so
   * it never covers the cell being targeted.
   */
  readonly lifted: boolean;
}

/**
 * The tile currently being dragged, and the cell it is over.
 *
 * Kept outside the components because three of them need it at once: the tray
 * dims the tile being dragged, the board highlights the target, and the ghost
 * layer draws the tile under the pointer.
 */
@Injectable({ providedIn: 'root' })
export class TileDragService {
  private readonly current = signal<DragState | null>(null);
  private readonly target = signal<CellKey | null>(null);

  readonly drag = this.current.asReadonly();
  readonly dropTarget = this.target.asReadonly();

  start(tileId: number, value: number, x: number, y: number, lifted: boolean): void {
    this.current.set({ tileId, value, x, y, lifted });
    this.target.set(null);
  }

  move(x: number, y: number, over: CellKey | null): void {
    const state = this.current();
    if (state === null) return;
    this.current.set({ ...state, x, y });
    this.target.set(over);
  }

  /** Finish the drag and report where it landed. */
  end(): CellKey | null {
    const over = this.target();
    this.cancel();
    return over;
  }

  cancel(): void {
    this.current.set(null);
    this.target.set(null);
  }
}
