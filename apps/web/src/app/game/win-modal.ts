import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatDuration } from '../core/time/local-date';
import { NbBadge } from '../ui/nb-badge';
import { NbButton } from '../ui/nb-button';
import { NbIcon } from '../ui/nb-icon';
import { NbModal } from '../ui/nb-modal';
import { NbStars } from '../ui/nb-stars';
import type { WinSummary } from './win-summary';

@Component({
  selector: 'app-win-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbBadge, NbButton, NbIcon, NbModal, NbStars],
  template: `
    <nb-modal label="Puzzle solved" variant="modal" [dismissible]="false">
      <div class="win">
        <h2>Solved!</h2>
        <nb-stars class="big" [value]="summary().stars" />

        @if (summary().mode === 'daily' && summary().streak !== null) {
          <nb-badge tone="primary">
            <nb-icon name="flame" />
            {{ summary().streak }} day streak
          </nb-badge>
        } @else if (!summary().firstClear) {
          <nb-badge tone="surface">Replay</nb-badge>
        }

        <dl class="facts">
          <div>
            <dt>Time</dt>
            <dd class="num">{{ time() }}</dd>
          </div>
          <div>
            <dt>Mistakes</dt>
            <dd class="num">{{ summary().mistakes }}</dd>
          </div>
          <div>
            <dt>Hints</dt>
            <dd class="num">{{ summary().hintsUsed }}</dd>
          </div>
        </dl>

        <p class="reward">
          <nb-icon name="coin" />
          <span><span class="num">+{{ summary().coins }}</span> coins</span>
        </p>

        @if (summary().mode === 'journey') {
          <p class="muted">Best: {{ summary().bestStars }}★ in {{ best() }}</p>
        }

        <div class="actions">
          @if (summary().nextLevel !== null) {
            <button nbButton variant="primary" size="lg" block (click)="next.emit()">
              Next level
            </button>
          }
          <button nbButton variant="secondary" block (click)="replay.emit()">Play again</button>
          <button nbButton variant="ghost" block (click)="leave.emit()">
            {{ summary().mode === 'daily' ? 'Back to daily' : 'Back to levels' }}
          </button>
        </div>
      </div>
    </nb-modal>
  `,
  styles: `
    .win {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      text-align: center;
    }
    h2 {
      font-size: var(--text-3xl);
      color: var(--primary);
      -webkit-text-stroke: 1.5px var(--ink);
    }
    nb-stars.big {
      --icon-size: 2.5rem;
      animation: nb-pop var(--dur-slow) var(--ease-spring);
    }
    .facts {
      display: flex;
      gap: var(--space-2);
      width: 100%;
    }
    .facts > div {
      flex: 1;
      padding: var(--space-2);
      border: 2px solid var(--ink);
      border-radius: var(--radius);
      background: var(--paper);
    }
    dt {
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-soft);
    }
    dd {
      font-size: var(--text-lg);
    }
    .reward {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border: var(--border);
      border-radius: var(--radius-pill);
      background: var(--sunflower);
      color: var(--on-accent);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--text-lg);
      --icon-size: 1.4rem;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: 100%;
      margin-top: var(--space-2);
    }
  `,
})
export class WinModal {
  readonly summary = input.required<WinSummary>();
  readonly next = output<void>();
  readonly replay = output<void>();
  readonly leave = output<void>();

  protected readonly time = computed(() => formatDuration(this.summary().timeMs));
  protected readonly best = computed(() => formatDuration(this.summary().bestTimeMs));
}
