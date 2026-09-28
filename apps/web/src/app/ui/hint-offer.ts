import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdsService } from '../core/ads/ads.service';
import { ECONOMY } from '../core/config/economy';
import { HintOffer as HintOfferService } from '../core/hints/hint-offer.service';
import { SoundService } from '../core/sound/sound.service';
import { ProgressStore } from '../state/progress.store';
import { HintSheet } from './hint-sheet';
import { ToastService } from './toast.service';

const HINT_PACK = ECONOMY.shop.hintPacks[0];

/**
 * Mounted once in the shell, so the hint sheet is available on every screen -
 * from the Play page when a hint is asked for with none left, and from the hint
 * counter in the top bar at any other time.
 */
@Component({
  selector: 'app-hint-offer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HintSheet],
  template: `
    @if (offer.isOpen()) {
      <app-hint-sheet
        [title]="progress.hints() === 0 ? 'Out of hints' : 'More hints'"
        [dismissLabel]="progress.hints() === 0 ? 'Keep trying' : 'Not now'"
        [coins]="progress.coins()"
        [hintPrice]="price"
        [freeLeft]="progress.freeHintsLeftToday()"
        (buy)="buy()"
        (watch)="watch()"
        (shop)="openShop()"
        (dismiss)="offer.close()"
      />
    }
  `,
})
export class HintOffer {
  protected readonly offer = inject(HintOfferService);
  protected readonly progress = inject(ProgressStore);
  protected readonly price = HINT_PACK.coins;

  private readonly ads = inject(AdsService);
  private readonly router = inject(Router);
  private readonly sound = inject(SoundService);
  private readonly toasts = inject(ToastService);

  protected buy(): void {
    if (!this.progress.buyHints(HINT_PACK)) {
      this.toasts.show('Not enough coins', { tone: 'error' });
      return;
    }
    this.sound.play('coin');
    this.toasts.show('+1 hint', { tone: 'mint', icon: 'hint' });
    this.offer.earned('purchased');
  }

  protected async watch(): Promise<void> {
    // Hidden, not closed: the advert overlay takes the screen, and whatever the
    // opener wanted to do with the hint still has to happen afterwards.
    this.offer.suspend();
    const watched = await this.ads.showRewarded();
    if (!watched || !this.progress.grantRewardedHint()) {
      this.toasts.show('No free hints left today', { tone: 'error' });
      return;
    }
    this.sound.play('hint');
    this.toasts.show('+1 hint', { tone: 'mint', icon: 'hint' });
    this.offer.earned('rewarded');
  }

  protected openShop(): void {
    this.offer.close();
    void this.router.navigate(['/shop']);
  }
}
