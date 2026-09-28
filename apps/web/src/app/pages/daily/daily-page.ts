import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dailyPuzzle, type Difficulty } from '@sumday/engine';
import { dailyCoins, ECONOMY } from '../../core/config/economy';
import { Clock } from '../../core/time/clock';
import { dayOfMonth, formatLongDate, recentDays, weekdayInitial } from '../../core/time/local-date';
import { ProgressStore } from '../../state/progress.store';
import { NbBadge } from '../../ui/nb-badge';
import { NbButton } from '../../ui/nb-button';
import { NbCard } from '../../ui/nb-card';
import { NbIcon } from '../../ui/nb-icon';
import { NbStars } from '../../ui/nb-stars';
import { NbTopBar } from '../../ui/nb-top-bar';

interface DayCell {
  readonly date: string;
  readonly initial: string;
  readonly dayOfMonth: number;
  readonly stars: number;
  readonly done: boolean;
  readonly isToday: boolean;
  readonly difficulty: Difficulty;
}

@Component({
  selector: 'app-daily-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbBadge, NbButton, NbCard, NbIcon, NbStars, NbTopBar, RouterLink],
  templateUrl: './daily-page.html',
  styleUrl: './daily-page.css',
})
export class DailyPage {
  protected readonly progress = inject(ProgressStore);
  private readonly clock = inject(Clock);

  protected readonly today = this.clock.today;
  protected readonly todayLong = computed(() => formatLongDate(this.clock.today()));
  protected readonly difficulty = computed(() => dailyPuzzle(this.clock.today()).difficulty);
  protected readonly todayStars = computed(
    () => this.progress.dailyResult(this.clock.today())?.stars ?? 0,
  );

  /** What finishing today's puzzle would pay, streak included. */
  protected readonly reward = computed(() => dailyCoins(this.progress.currentStreak() + 1));

  protected readonly week = computed<readonly DayCell[]>(() =>
    recentDays(this.clock.today(), ECONOMY.daily.stripDays).map((date) => {
      const record = this.progress.dailyResult(date);
      return {
        date,
        initial: weekdayInitial(date),
        dayOfMonth: dayOfMonth(date),
        stars: record?.stars ?? 0,
        done: record !== undefined,
        isToday: date === this.clock.today(),
        difficulty: dailyPuzzle(date).difficulty,
      };
    }),
  );
}
