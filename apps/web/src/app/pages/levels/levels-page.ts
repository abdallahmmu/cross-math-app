import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { journeyLevel, type Difficulty } from '@sumday/engine';
import { ECONOMY } from '../../core/config/economy';
import { ProgressStore } from '../../state/progress.store';
import { NbBadge } from '../../ui/nb-badge';
import { NbIcon } from '../../ui/nb-icon';
import { NbStars } from '../../ui/nb-stars';
import { NbTopBar } from '../../ui/nb-top-bar';

interface LevelTile {
  readonly level: number;
  readonly stars: number;
  readonly unlocked: boolean;
}

interface Tier {
  readonly difficulty: Difficulty;
  readonly levels: readonly LevelTile[];
  readonly stars: number;
  readonly maxStars: number;
}

@Component({
  selector: 'app-levels-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbBadge, NbIcon, NbStars, NbTopBar, RouterLink],
  templateUrl: './levels-page.html',
  styleUrl: './levels-page.css',
})
export class LevelsPage {
  protected readonly progress = inject(ProgressStore);

  /**
   * Tiers are read back from the engine rather than hard-coded, so the map can
   * never disagree with which difficulty a level actually generates.
   */
  protected readonly tiers = computed<readonly Tier[]>(() => {
    const groups = new Map<Difficulty, LevelTile[]>();

    for (let level = 1; level <= ECONOMY.journey.levelCount; level += 1) {
      const { difficulty } = journeyLevel(level);
      const tiles = groups.get(difficulty) ?? [];
      tiles.push({
        level,
        stars: this.progress.levelResult(level)?.stars ?? 0,
        unlocked: this.progress.isUnlocked(level),
      });
      groups.set(difficulty, tiles);
    }

    return [...groups].map(([difficulty, levels]) => ({
      difficulty,
      levels,
      stars: levels.reduce((sum, tile) => sum + tile.stars, 0),
      maxStars: levels.length * 3,
    }));
  });
}
