import { DOCUMENT, Directive, ElementRef, inject, input, output } from '@angular/core';
import type { CellKey } from '@sumday/engine';
import { TileDragService } from './tile-drag.service';

/** How far the pointer has to travel before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 6;
/** Lift the floating tile clear of the finger on touch, so the target is visible. */
const TOUCH_LIFT_PX = 44;

/**
 * Makes a tile draggable with one code path for mouse, touch and pen.
 *
 * Pointer Events rather than HTML5 drag-and-drop, which does not fire on touch
 * at all. A press that never passes the threshold stays a tap, and a keyboard
 * activation still arrives as a click, so dragging is added without taking
 * either of the other two ways to play away.
 */
@Directive({
  selector: '[appTileDrag]',
  host: {
    '[class.is-dragging]': 'dragging',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel()',
    '(click)': 'onClick($event)',
  },
})
export class TileDrag {
  readonly tileId = input.required<number>();
  readonly tileValue = input.required<number>();

  /** Dropped onto a cell. Not emitted when a drag ends over nothing. */
  readonly dropped = output<CellKey>();
  /** Pressed without dragging, or activated from the keyboard. */
  readonly tapped = output<void>();

  private readonly drag = inject(TileDragService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected dragging = false;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private lift = 0;
  private suppressClick = false;

  protected onPointerDown(event: PointerEvent): void {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.pointerId = event.pointerId;
    this.originX = event.clientX;
    this.originY = event.clientY;
    this.lift = event.pointerType === 'mouse' ? 0 : TOUCH_LIFT_PX;
    this.dragging = false;
    this.suppressClick = false;
    this.host.nativeElement.setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;

    const x = event.clientX;
    const y = event.clientY - this.lift;
    if (!this.dragging) {
      const travelled = Math.hypot(event.clientX - this.originX, event.clientY - this.originY);
      if (travelled < DRAG_THRESHOLD_PX) return;
      this.dragging = true;
      this.drag.start(this.tileId(), this.tileValue(), x, y, this.lift > 0);
    }
    this.drag.move(x, y, this.cellAt(x, y));
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.release(event.pointerId);

    if (!this.dragging) return; // a plain press: the click handler takes it
    this.dragging = false;
    this.suppressClick = true;

    const target = this.drag.end();
    // Released over empty space or a filled cell: the tile simply goes back.
    if (target !== null) this.dropped.emit(target);
  }

  protected onPointerCancel(): void {
    if (this.pointerId !== null) this.release(this.pointerId);
    this.dragging = false;
    this.drag.cancel();
  }

  protected onClick(event: MouseEvent): void {
    // A click can follow a drag; a keyboard activation arrives as a click with
    // no pointer behind it (detail 0) and must always place.
    if (this.suppressClick && event.detail !== 0) {
      this.suppressClick = false;
      return;
    }
    this.suppressClick = false;
    this.tapped.emit();
  }

  private release(pointerId: number): void {
    this.pointerId = null;
    if (this.host.nativeElement.hasPointerCapture(pointerId)) {
      this.host.nativeElement.releasePointerCapture(pointerId);
    }
  }

  /** Only empty blanks carry `data-cell`, so anything else is not a target. */
  private cellAt(x: number, y: number): CellKey | null {
    const element = this.document.elementFromPoint(x, y);
    return element?.closest<HTMLElement>('[data-cell]')?.dataset['cell'] ?? null;
  }
}
