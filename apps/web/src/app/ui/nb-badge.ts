import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'surface' | 'ink' | 'primary' | 'sunflower' | 'mint' | 'sky' | 'lilac' | 'error';

/** A small pill for labels: difficulty, tier, "done", counters. */
@Component({
  selector: 'nb-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0.15rem var(--space-2);
      border: 2px solid var(--ink);
      border-radius: var(--radius-pill);
      background: var(--surface);
      color: var(--ink);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
      --icon-size: 0.85rem;
    }
    :host(.tone-ink) {
      background: var(--ink);
      color: var(--paper);
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
    /* Error text sits on paper rather than on the red fill: #E5484D with ink
       text is 4.45:1, which clears AA for large bold text but not for a small
       pill like this one. */
    :host(.tone-error) {
      background: var(--paper);
      border-color: var(--error);
      color: var(--error-ink);
    }
  `,
})
export class NbBadge {
  readonly tone = input<BadgeTone>('surface');
  protected readonly classes = computed(() => `nb-badge tone-${this.tone()}`);
}
