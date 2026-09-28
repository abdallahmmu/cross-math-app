import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The one button in the game. An attribute selector on a real `<button>` (or
 * `<a>`) so callers keep native semantics - `type`, `disabled`, `aria-label`,
 * keyboard activation - and only opt into the look.
 *
 *     <button nbButton variant="primary" size="lg">Play</button>
 */
@Component({
  selector: 'button[nbButton], a[nbButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: var(--tap-min);
      min-width: var(--tap-min);
      padding: 0 var(--space-4);
      border: var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--text-base);
      line-height: 1;
      text-align: center;
      transition:
        transform var(--dur-fast) var(--ease-out),
        box-shadow var(--dur-fast) var(--ease-out);
    }

/* Sizes first: a variant must be able to drop the shadow a size added. */
    :host(.is-sm) {
      min-height: 2.25rem;
      padding: 0 var(--space-3);
      font-size: var(--text-sm);
      box-shadow: var(--shadow-sm);
      --press-offset: 2px;
    }

    :host(.is-lg) {
      min-height: 3.5rem;
      padding: 0 var(--space-5);
      font-size: var(--text-lg);
      box-shadow: var(--shadow-lg);
    }

    :host(.is-primary) {
      background: var(--primary);
      color: var(--on-accent);
    }

    :host(.is-secondary) {
      background: var(--sunflower);
      color: var(--on-accent);
    }

    :host(.is-ghost) {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host(.is-icon) {
      width: var(--tap-min);
      padding: 0;
      --icon-size: 1.4rem;
    }

    :host(.is-block) {
      width: 100%;
    }

    @media (hover: hover) {
      :host(:hover:not(:disabled)) {
        transform: translate(-2px, -2px);
        box-shadow: 6px 6px 0 var(--ink);
      }

      :host(.is-sm:hover:not(:disabled)) {
        box-shadow: 4px 4px 0 var(--ink);
      }

      :host(.is-ghost:hover:not(:disabled)) {
        transform: none;
        box-shadow: none;
        background: color-mix(in srgb, var(--ink) 8%, transparent);
      }
    }

    /* Pressed: the button slides into its own shadow. */
    :host(:active:not(:disabled)) {
      transform: translate(var(--press-offset), var(--press-offset));
      box-shadow: 0 0 0 var(--ink);
    }

    :host(.is-ghost:active:not(:disabled)) {
      transform: none;
      background: color-mix(in srgb, var(--ink) 8%, transparent);
    }

    :host(:disabled),
    :host(.is-disabled) {
      opacity: 0.45;
      box-shadow: var(--shadow-sm);
      transform: translate(2px, 2px);
    }

    :host(.is-ghost:disabled) {
      box-shadow: none;
      transform: none;
    }
  `,
})
export class NbButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => {
    const classes = ['nb-button', `is-${this.variant()}`, `is-${this.size()}`];
    if (this.block()) classes.push('is-block');
    return classes.join(' ');
  });
}
