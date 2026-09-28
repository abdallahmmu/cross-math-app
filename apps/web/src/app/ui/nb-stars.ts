import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NbIcon } from './nb-icon';

/** Star rating, 0 to `total`. Empty stars stay visible as outlines. */
@Component({
  selector: 'nb-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbIcon],
  host: { role: 'img', '[attr.aria-label]': 'label()' },
  template: `
    @for (slot of slots(); track slot) {
      <nb-icon
        name="star"
        [class.is-earned]="slot <= value()"
        [style.--star-delay]="(slot - 1) * 90 + 'ms'"
      />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.1rem;
      color: var(--ink);
    }
    nb-icon {
      color: var(--cell-blank-border);
      opacity: 0.45;
    }
    nb-icon.is-earned {
      color: var(--sunflower);
      opacity: 1;
      stroke: var(--ink);
      animation: nb-pop var(--dur-slow) var(--ease-spring) backwards;
      animation-delay: var(--star-delay, 0ms);
    }
  `,
})
export class NbStars {
  readonly value = input.required<number>();
  readonly total = input(3);

  protected readonly slots = computed(() =>
    Array.from({ length: this.total() }, (_unused, index) => index + 1),
  );
  protected readonly label = computed(() => `${this.value()} of ${this.total()} stars`);
}
