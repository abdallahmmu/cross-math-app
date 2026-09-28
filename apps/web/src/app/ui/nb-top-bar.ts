import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressStore } from '../state/progress.store';
import { NbButton } from './nb-button';
import { NbCounter } from './nb-counter';
import { NbIcon } from './nb-icon';

/** The app's fixed header: optional back link, title, coins and hints. */
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
    <nb-counter class="tone-hint" icon="hint" [value]="progress.hints()" label="hints" />
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
  `,
})
export class NbTopBar {
  readonly title = input<string | null>(null);
  readonly backTo = input<string | null>(null);
  protected readonly progress = inject(ProgressStore);
}
