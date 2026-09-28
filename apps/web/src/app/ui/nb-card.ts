import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardTone = 'surface' | 'paper' | 'primary' | 'sunflower' | 'mint' | 'sky' | 'lilac';

/** A bordered panel with the hard shadow. The workhorse container. */
@Component({
  selector: 'nb-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
  styles: `
    :host {
      display: block;
      padding: var(--space-4);
      border: var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow);
    }
    :host(.tone-paper) {
      background: var(--paper);
    }
    :host(.tone-primary) {
      background: var(--primary);
      color: var(--on-accent);
    }
    :host(.tone-sunflower) {
      background: var(--sunflower);
      color: var(--on-accent);
    }
    :host(.tone-mint) {
      background: var(--mint);
      color: var(--on-accent);
    }
    :host(.tone-sky) {
      background: var(--sky);
      color: var(--on-accent);
    }
    :host(.tone-lilac) {
      background: var(--lilac);
      color: var(--on-accent);
    }
    :host(.is-flat) {
      box-shadow: none;
    }
  `,
})
export class NbCard {
  readonly tone = input<CardTone>('surface');
  readonly flat = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(
    () => `nb-card tone-${this.tone()}${this.flat() ? ' is-flat' : ''}`,
  );
}
