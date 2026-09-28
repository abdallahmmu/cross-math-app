import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HintOffer } from '../core/hints/hint-offer.service';
import { ProgressStore } from '../state/progress.store';
import { NbButton } from './nb-button';
import { NbCounter } from './nb-counter';
import { NbIcon } from './nb-icon';

/**
 * The app's fixed header: optional back link, title, coins and hints.
 *
 * The hint counter is a button, not a read-out - running low on hints is
 * exactly when a player wants to top up, and making them find the shop first
 * puts the shop between them and the thing they were doing.
 */
@Component({
  selector: 'nb-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbButton, NbCounter, NbIcon, RouterLink],
  template: `
    @if (backTo() !== null) {
      <a nbButton variant="icon" [routerLink]="backTo()" aria-label="Back">
        <nb-icon name="back" />
      </a>
    }

    @if (title() !== null) {
      <h2 class="title">{{ title() }}</h2>
    } @else {
      <span class="wordmark">Sumday</span>
    }

    <span class="spacer"></span>

    <nb-counter class="tone-coin" icon="coin" [value]="progress.coins()" label="coins" />

    <button
      class="hint-button"
      type="button"
      [attr.aria-label]="'Hints: ' + progress.hints() + '. Get more hints'"
      (click)="hints.open()"
    >
      <nb-counter class="tone-hint" icon="hint" [value]="progress.hints()" label="hints" decorative />
      <span class="plus" aria-hidden="true">+</span>
    </button>
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      max-width: var(--content-max);
      min-height: var(--top-bar-height);
      margin-inline: auto;
      padding: var(--space-2) var(--space-4);
      background: var(--paper);
      border-bottom: var(--border);
    }
    .title,
    .wordmark {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--text-xl);
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wordmark {
      color: var(--primary);
      -webkit-text-stroke: 1px var(--ink);
    }
    .spacer {
      flex: 1;
    }
    .hint-button {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      border-radius: var(--radius-pill);
      transition: transform var(--dur-fast) var(--ease-out);
    }
    .plus {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.15rem;
      height: 1.15rem;
      margin-left: -0.35rem;
      border: 2px solid var(--ink);
      border-radius: 50%;
      background: var(--primary);
      color: var(--on-accent);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.7rem;
      line-height: 1;
    }
    @media (hover: hover) {
      .hint-button:hover {
        transform: translate(-1px, -1px);
      }
    }
    .hint-button:active {
      transform: translate(1px, 1px);
    }
  `,
})
export class NbTopBar {
  readonly title = input<string | null>(null);
  readonly backTo = input<string | null>(null);
  protected readonly progress = inject(ProgressStore);
  protected readonly hints = inject(HintOffer);
}
