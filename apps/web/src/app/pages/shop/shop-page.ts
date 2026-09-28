import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ECONOMY, type HintPack } from '../../core/config/economy';
import { PurchaseService } from '../../core/purchase/purchase.service';
import { THEMES, type ThemeId, type ThemeOption } from '../../core/config/themes';
import { ProgressStore } from '../../state/progress.store';
import { NbBadge } from '../../ui/nb-badge';
import { NbButton } from '../../ui/nb-button';
import { NbCard } from '../../ui/nb-card';
import { NbIcon } from '../../ui/nb-icon';
import { NbTopBar } from '../../ui/nb-top-bar';
import { ToastService } from '../../ui/toast.service';

interface ThemeRow {
  readonly theme: ThemeOption;
  readonly owned: boolean;
  readonly active: boolean;
  readonly affordable: boolean;
}

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
  private readonly toasts = inject(ToastService);

  protected readonly hintPacks = ECONOMY.shop.hintPacks;

  protected readonly themeRows = computed<readonly ThemeRow[]>(() =>
    THEMES.map((theme) => ({
      theme,
      owned: this.progress.ownedThemes().includes(theme.id),
      active: this.progress.activeTheme() === theme.id,
      affordable: this.progress.coins() >= theme.coins,
    })),
  );

  protected buyHints(pack: HintPack): void {
    if (this.progress.buyHints(pack)) {
      this.toasts.show(`+${pack.hints} hint${pack.hints > 1 ? 's' : ''}`, {
        tone: 'mint',
        icon: 'hint',
      });
      return;
    }
    this.toasts.show('Not enough coins', { tone: 'error' });
  }

  protected chooseTheme(row: ThemeRow): void {
    if (row.owned) {
      this.progress.setTheme(row.theme.id);
      this.toasts.show(`${row.theme.name} on`, { tone: 'mint' });
      return;
    }
    if (this.progress.buyTheme(row.theme.id)) {
      this.toasts.show(`${row.theme.name} unlocked`, { tone: 'mint' });
      return;
    }
    this.toasts.show('Not enough coins', { tone: 'error' });
  }

  protected themeButtonLabel(row: ThemeRow): string {
    if (row.active) return 'Active';
    if (row.owned) return 'Use';
    return `${row.theme.coins}`;
  }

  protected trackTheme(_index: number, row: ThemeRow): ThemeId {
    return row.theme.id;
  }
}
