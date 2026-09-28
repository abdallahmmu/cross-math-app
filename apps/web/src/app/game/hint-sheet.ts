import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NbButton } from '../ui/nb-button';
import { NbIcon } from '../ui/nb-icon';
import { NbModal } from '../ui/nb-modal';

/** Shown when the player asks for a hint with none left. */
@Component({
  selector: 'app-hint-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbButton, NbIcon, NbModal],
  template: `
    <nb-modal label="Out of hints" (dismiss)="dismiss.emit()">
      <div class="stack">
        <h3>Out of hints</h3>
        <p class="muted">Pick one up, or earn one.</p>

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
        <button nbButton variant="ghost" block (click)="dismiss.emit()">Keep trying</button>
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
  readonly coins = input.required<number>();
  readonly hintPrice = input.required<number>();
  readonly freeLeft = input.required<number>();

  readonly buy = output<void>();
  readonly watch = output<void>();
  readonly shop = output<void>();
  readonly dismiss = output<void>();
}
