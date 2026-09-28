import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NbButton } from './nb-button';
import { NbIcon } from './nb-icon';
import { NbModal } from './nb-modal';

/** The buy-or-earn sheet. Opened from the top bar, or when a hint is asked for and there are none left. */
@Component({
  selector: 'app-hint-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbButton, NbIcon, NbModal],
  template: `
    <nb-modal label="Out of hints" (dismiss)="dismiss.emit()">
      <div class="stack">
        <h3>{{ title() }}</h3>
        <p class="muted">Buy one with coins, or watch a video for a free one.</p>

        <button
          nbButton
          variant="primary"
          block
          [disabled]="coins() < hintPrice()"
          (click)="buy.emit()"
        >
          <nb-icon name="hint" />
          Buy 1 hint
          <span class="price num">
            <nb-icon name="coin" />
            {{ hintPrice() }}
          </span>
        </button>
        @if (coins() < hintPrice()) {
          <p class="muted">You have {{ coins() }} coins.</p>
        }

        <button nbButton variant="secondary" block [disabled]="freeLeft() === 0" (click)="watch.emit()">
          <nb-icon name="video" />
          Watch a video
          <span class="price num">{{ freeLeft() }} left today</span>
        </button>

        <button nbButton variant="ghost" block (click)="shop.emit()">Open the shop</button>
        <button nbButton variant="ghost" block (click)="dismiss.emit()">{{ dismissLabel() }}</button>
      </div>
    </nb-modal>
  `,
  styles: `
    h3 {
      font-size: var(--text-xl);
    }
    .price {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      margin-left: auto;
      font-size: var(--text-sm);
      --icon-size: 0.95rem;
    }
    button[nbButton] {
      justify-content: flex-start;
    }
  `,
})
export class HintSheet {
  readonly title = input('Out of hints');
  readonly dismissLabel = input('Keep trying');
  readonly coins = input.required<number>();
  readonly hintPrice = input.required<number>();
  readonly freeLeft = input.required<number>();

  readonly buy = output<void>();
  readonly watch = output<void>();
  readonly shop = output<void>();
  readonly dismiss = output<void>();
}
