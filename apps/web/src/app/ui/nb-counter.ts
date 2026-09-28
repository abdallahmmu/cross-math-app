import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { NbIcon, type IconName } from './nb-icon';

/** Icon plus a tabular number: the coin and hint counters in the top bar. */
@Component({
  selector: 'nb-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbIcon],
  host: {
    '[attr.aria-label]': 'decorative() ? null : ariaLabel()',
    '[attr.aria-hidden]': 'decorative() ? true : null',
  },
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
  /** Set when a wrapping button provides the accessible name instead. */
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly ariaLabel = computed(() => `${this.value()} ${this.label()}`);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private previous: number | null = null;

  constructor() {
    effect(() => {
      const value = this.value();
      const previous = this.previous;
      this.previous = value;
      if (previous !== null && previous !== value) this.bump(value > previous);
    });
  }

  /**
   * Driven from script rather than by toggling a class: two changes in quick
   * succession have to restart the animation, and re-adding a class that is
   * already there does not. This path is outside CSS, so the reduced-motion
   * preference is checked here rather than inherited from the global rule.
   */
  private bump(up: boolean): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.host.nativeElement.animate(
      [
        { transform: 'scale(1)' },
        { transform: `scale(${up ? 1.2 : 0.92})` },
        { transform: 'scale(1)' },
      ],
      { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
  }
}
