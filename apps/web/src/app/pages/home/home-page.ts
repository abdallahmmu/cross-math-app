import { ChangeDetectionStrategy, Component, computed, inject, isDevMode } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dailyPuzzle } from '@sumday/engine';
import { Clock } from '../../core/time/clock';
import { ProgressStore } from '../../state/progress.store';
import { NbBadge } from '../../ui/nb-badge';
import { NbButton } from '../../ui/nb-button';
import { NbCard } from '../../ui/nb-card';
import { NbIcon } from '../../ui/nb-icon';
import { NbStars } from '../../ui/nb-stars';
import { NbTopBar } from '../../ui/nb-top-bar';

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbBadge, NbButton, NbCard, NbIcon, NbStars, NbTopBar, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  protected readonly progress = inject(ProgressStore);
  private readonly clock = inject(Clock);

  protected readonly isDev = isDevMode();
  protected readonly today = this.clock.today;
  protected readonly dailyDifficulty = computed(() => dailyPuzzle(this.clock.today()).difficulty);
  protected readonly dailyStars = computed(
    () => this.progress.dailyResult(this.clock.today())?.stars ?? 0,
  );
}
