import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Clock } from './core/time/clock';
import { AdOverlay } from './ui/ad-overlay';
import { HintOffer } from './ui/hint-offer';
import { NbToastHost } from './ui/nb-toast-host';
import { ProgressStore } from './state/progress.store';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NbToastHost, AdOverlay, HintOffer],
  host: { '(document:visibilitychange)': 'onVisibilityChange()' },
  template: `
    <a class="skip" href="#content">Skip to content</a>
    <main id="content" tabindex="-1">
      <router-outlet />
    </main>
    <nb-toast-host />
    <app-hint-offer />
    <app-ad-overlay />
  `,
  styles: `
    .skip {
      position: absolute;
      top: var(--space-2);
      left: 50%;
      transform: translate(-50%, -200%);
      z-index: 100;
      padding: var(--space-2) var(--space-4);
      border: var(--border);
      border-radius: var(--radius);
      background: var(--sunflower);
      color: var(--on-accent);
      font-weight: 700;
      transition: transform var(--dur) var(--ease-out);
    }
    .skip:focus {
      transform: translate(-50%, 0);
    }
    main:focus {
      outline: none;
    }
  `,
})
export class App {
  private readonly clock = inject(Clock);

  constructor() {
    // Touching the store here hydrates the save before the first page renders.
    inject(ProgressStore);
  }

  /** Coming back to the tab after midnight should roll the daily over. */
  protected onVisibilityChange(): void {
    this.clock.refresh();
  }
}
