import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NbIcon, type IconName } from './nb-icon';

/** Icon plus a tabular number: the coin and hint counters in the top bar. */
@Component({
  selector: 'nb-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbIcon],
  host: { '[attr.aria-label]': 'ariaLabel()' },
  template: `
    <nb-icon [name]="icon()" />
    <span class="num" aria-hidden="true">{{ value() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0.2rem var(--space-2) 0.2rem var(--space-1);
      border: 2px solid var(--ink);
      border-radius: var(--radius-pill);
      background: var(--surface);
      box-shadow: var(--shadow-sm);
      font-size: var(--text-sm);
      --icon-size: 1.1rem;
    }
    :host(.tone-coin) nb-icon {
      color: var(--sunflower);
      stroke: var(--ink);
    }
    :host(.tone-hint) nb-icon {
      color: var(--sky);
      stroke: var(--ink);
    }
  `,
})
export class NbCounter {
  readonly icon = input.required<IconName>();
  readonly value = input.required<number>();
  readonly label = input.required<string>();

  protected readonly ariaLabel = computed(() => `${this.value()} ${this.label()}`);
}
