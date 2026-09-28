import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdsService } from '../core/ads/ads.service';
import { NbBadge } from './nb-badge';
import { NbIcon } from './nb-icon';
import { NbModal } from './nb-modal';

/**
 * The stand-in for a rewarded video. Deliberately looks like scaffolding: there
 * is no ad network in the web build, and nobody should mistake this for one.
 */
@Component({
  selector: 'app-ad-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbBadge, NbIcon, NbModal],
  template: `
    @if (ads.state() === 'playing') {
      <nb-modal label="Placeholder advert" variant="modal" [dismissible]="false">
        <div class="stack">
          <nb-badge tone="ink">Placeholder</nb-badge>
          <div class="screen">
            <nb-icon name="video" />
            <p>No real ad here.</p>
            <p class="muted">A rewarded video plugin goes here in the mobile build.</p>
          </div>
          <div class="bar" role="progressbar" aria-label="Advert progress">
            <span [style.width.%]="ads.progress() * 100"></span>
          </div>
        </div>
      </nb-modal>
    }
  `,
  styles: `
    .screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-4);
      border: var(--border-width) dashed var(--cell-blank-border);
      border-radius: var(--radius);
      background: var(--paper);
      text-align: center;
      font-family: var(--font-display);
      font-weight: 800;
      --icon-size: 2.5rem;
    }
    .screen .muted {
      font-family: var(--font-body);
      font-weight: 400;
    }
    .bar {
      height: 0.9rem;
      border: var(--border);
      border-radius: var(--radius-pill);
      background: var(--paper);
      overflow: hidden;
    }
    .bar span {
      display: block;
      height: 100%;
      background: var(--primary);
      transition: width 60ms linear;
    }
  `,
})
export class AdOverlay {
  protected readonly ads = inject(AdsService);
}
