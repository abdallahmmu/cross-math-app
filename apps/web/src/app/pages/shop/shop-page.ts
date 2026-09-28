import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ECONOMY, type HintPack } from '../../core/config/economy';
import { PurchaseService } from '../../core/purchase/purchase.service';
import { SoundService } from '../../core/sound/sound.service';
import { ProgressStore } from '../../state/progress.store';
import { NbBadge } from '../../ui/nb-badge';
import { NbButton } from '../../ui/nb-button';
import { NbCard } from '../../ui/nb-card';
import { NbIcon } from '../../ui/nb-icon';
import { NbTopBar } from '../../ui/nb-top-bar';
import { ToastService } from '../../ui/toast.service';


@Component({
  selector: 'app-shop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbBadge, NbButton, NbCard, NbIcon, NbTopBar],
  templateUrl: './shop-page.html',
  styleUrl: './shop-page.css',
})
export class ShopPage {
  protected readonly progress = inject(ProgressStore);
  protected readonly purchases = inject(PurchaseService);
  private readonly sound = inject(SoundService);
  private readonly toasts = inject(ToastService);

  protected readonly hintPacks = ECONOMY.shop.hintPacks;


  protected buyHints(pack: HintPack): void {
    if (this.progress.buyHints(pack)) {
      this.sound.play('coin');
      this.toasts.show(`+${pack.hints} hint${pack.hints > 1 ? 's' : ''}`, {
        tone: 'mint',
        icon: 'hint',
      });
      return;
    }
    this.toasts.show('Not enough coins', { tone: 'error' });
  }



}
