import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A number tile. An attribute on a real `<button>`, so the tray gets keyboard
 * and screen-reader behaviour for free.
 */
@Component({
  selector: 'button[appTile]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tile num',
    type: 'button',
    '[class.is-wrong]': 'wrong()',
  },
  template: '{{ value() }}',
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--tap-min);
      min-height: var(--tap-min);
      padding: 0 var(--space-2);
      border: var(--border);
      border-radius: var(--radius-tile);
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow);
      font-size: var(--text-lg);
      line-height: 1;
      /* A drag must not scroll the page or select the digits underneath. */
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      transition:
        transform var(--dur-fast) var(--ease-out),
        box-shadow var(--dur-fast) var(--ease-out);
      animation: nb-pop var(--dur-slow) var(--ease-spring);
    }
    :host(:active) {
      transform: translate(var(--press-offset), var(--press-offset));
      box-shadow: 0 0 0 var(--ink);
    }
    :host(.is-dragging) {
      opacity: 0.35;
      transform: translate(2px, 2px);
      box-shadow: 0 0 0 var(--ink);
    }

    :host(.is-wrong) {
      background: var(--error);
      color: var(--on-accent);
      animation: nb-shake var(--dur-slow) var(--ease-out);
    }
  `,
})
export class Tile {
  readonly value = input.required<number>();
  readonly wrong = input(false, { transform: booleanAttribute });
}
