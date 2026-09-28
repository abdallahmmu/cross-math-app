import { computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  watchState,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { Difficulty } from '@sumday/engine';
import { AnalyticsService } from '../core/analytics/analytics.service';
import { dailyCoins, ECONOMY, journeyCoins, type HintPack } from '../core/config/economy';
import { findTheme, THEMES, type ThemeId, type ThemeOption } from '../core/config/themes';
import { SaveAdapter } from '../core/save/save-adapter';
import { createSave, SAVE_VERSION, type DailyRecord, type LevelResult, type SaveData } from '../core/save/save-schema';
import { ThemeService } from '../core/theme/theme.service';
import { Clock } from '../core/time/clock';
import { daysBetween } from '../core/time/local-date';

/** The persisted part of the store: exactly `SaveData` without its version. */
type ProgressState = Omit<SaveData, 'version'>;

export interface JourneyRunResult {
  readonly level: number;
  readonly difficulty: Difficulty;
  readonly stars: number;
  readonly timeMs: number;
  readonly mistakes: number;
  readonly hintsUsed: number;
}

export interface JourneyReward {
  readonly coins: number;
  readonly firstClear: boolean;
  readonly bestStars: number;
  readonly bestTimeMs: number;
  readonly improved: boolean;
}

export interface DailyReward {
  readonly coins: number;
  readonly streak: number;
  readonly alreadyDone: boolean;
}

export type HintSpend = 'spent' | 'none-left';

function toSave(state: ProgressState): SaveData {
  return { version: SAVE_VERSION, ...state };
}

function initialState(): ProgressState {
  const { version: _version, ...rest } = createSave();
  return rest;
}

/**
 * Everything the player keeps: coins, hints, level results, the daily streak,
 * themes and settings.
 *
 * Every change is written straight through to the `SaveAdapter` by a single
 * `watchState` subscription, so no method can forget to persist.
 */
export const ProgressStore = signalStore(
  { providedIn: 'root' },
  withState<ProgressState>(initialState()),

  withComputed((store) => {
    const clock = inject(Clock);
    return {
      /** Highest journey level with a recorded clear. */
      highestCleared: computed(() =>
        Object.keys(store.levels()).reduce((best, key) => Math.max(best, Number(key)), 0),
      ),
      totalStars: computed(() =>
        Object.values(store.levels()).reduce((sum, result) => sum + result.stars, 0),
      ),
      /** The streak as it stands today: a missed day has already broken it. */
      currentStreak: computed(() => {
        const last = store.lastDailyDate();
        if (last === null) return 0;
        return daysBetween(last, clock.today()) <= 1 ? store.streak() : 0;
      }),
      dailyDoneToday: computed(() => store.daily()[clock.today()] !== undefined),
      freeHintsLeftToday: computed(() =>
        store.freeHintsDate() === clock.today()
          ? Math.max(0, ECONOMY.rewardedAd.maxPerDay - store.freeHintsUsed())
          : ECONOMY.rewardedAd.maxPerDay,
      ),
      ownedThemeOptions: computed((): readonly ThemeOption[] =>
        THEMES.filter((theme) => store.ownedThemes().includes(theme.id)),
      ),
    };
  }),

  withComputed((store) => ({
    /** The level the "Play" button should open. */
    nextLevel: computed(() =>
      Math.min(ECONOMY.journey.levelCount, store.highestCleared() + 1),
    ),
  })),

  withMethods((store) => {
    const analytics = inject(AnalyticsService);
    const clock = inject(Clock);

    return {
      levelResult(level: number): LevelResult | undefined {
        return store.levels()[String(level)];
      },

      dailyResult(date: string): DailyRecord | undefined {
        return store.daily()[date];
      },

      /** Level 1 is always open; after that, clear the level before it. */
      isUnlocked(level: number): boolean {
        return level <= 1 || store.levels()[String(level - 1)] !== undefined;
      },

      completeJourneyLevel(run: JourneyRunResult): JourneyReward {
        const key = String(run.level);
        const existing = store.levels()[key];
        const firstClear = existing === undefined;
        const improved = run.stars > (existing?.stars ?? 0);
        const keepNewRun = firstClear || improved;

        const best: LevelResult = {
          stars: Math.max(existing?.stars ?? 0, run.stars),
          bestTimeMs: existing === undefined ? run.timeMs : Math.min(existing.bestTimeMs, run.timeMs),
          mistakes: keepNewRun ? run.mistakes : existing.mistakes,
          hintsUsed: keepNewRun ? run.hintsUsed : existing.hintsUsed,
        };

        const coins = journeyCoins(run.difficulty, run.stars, firstClear);
        patchState(store, {
          coins: store.coins() + coins,
          levels: { ...store.levels(), [key]: best },
        });

        analytics.track({
          name: 'level_complete',
          mode: 'journey',
          id: key,
          difficulty: run.difficulty,
          stars: run.stars,
          timeMs: run.timeMs,
          mistakes: run.mistakes,
          hintsUsed: run.hintsUsed,
        });

        return { coins, firstClear, bestStars: best.stars, bestTimeMs: best.bestTimeMs, improved };
      },

      completeDaily(run: { date: string; stars: number; timeMs: number }): DailyReward {
        if (store.daily()[run.date] !== undefined) {
          return { coins: 0, streak: store.streak(), alreadyDone: true };
        }

        const last = store.lastDailyDate();
        const continues = last !== null && daysBetween(last, run.date) === 1;
        const streak = continues ? store.streak() + 1 : 1;
        const coins = dailyCoins(streak);

        patchState(store, {
          coins: store.coins() + coins,
          streak,
          lastDailyDate: run.date,
          daily: { ...store.daily(), [run.date]: { stars: run.stars, timeMs: run.timeMs } },
        });

        analytics.track({ name: 'daily_complete', date: run.date, streak });
        return { coins, streak, alreadyDone: false };
      },

      /** Consume one owned hint. */
      useHint(): HintSpend {
        if (store.hints() <= 0) return 'none-left';
        patchState(store, { hints: store.hints() - 1 });
        return 'spent';
      },

      buyHints(pack: HintPack): boolean {
        if (store.coins() < pack.coins) return false;
        patchState(store, {
          coins: store.coins() - pack.coins,
          hints: store.hints() + pack.hints,
        });
        analytics.track({ name: 'purchase', item: pack.id, coins: pack.coins });
        return true;
      },

      /** A hint earned by watching the placeholder ad, capped per day. */
      grantRewardedHint(): boolean {
        const today = clock.today();
        const usedToday = store.freeHintsDate() === today ? store.freeHintsUsed() : 0;
        if (usedToday >= ECONOMY.rewardedAd.maxPerDay) return false;

        patchState(store, {
          hints: store.hints() + ECONOMY.rewardedAd.hintsPerWatch,
          freeHintsDate: today,
          freeHintsUsed: usedToday + 1,
        });
        return true;
      },

      buyTheme(id: ThemeId): boolean {
        if (store.ownedThemes().includes(id)) return false;
        const theme = findTheme(id);
        if (store.coins() < theme.coins) return false;

        patchState(store, {
          coins: store.coins() - theme.coins,
          ownedThemes: [...store.ownedThemes(), id],
          activeTheme: id,
        });
        analytics.track({ name: 'purchase', item: `theme-${id}`, coins: theme.coins });
        return true;
      },

      setTheme(id: ThemeId): void {
        if (!store.ownedThemes().includes(id)) return;
        patchState(store, { activeTheme: id });
      },

      setSound(on: boolean): void {
        patchState(store, { sound: on });
      },

      resetProgress(): void {
        patchState(store, initialState());
      },
    };
  }),

  withHooks({
    onInit(store) {
      const adapter = inject(SaveAdapter);
      const themes = inject(ThemeService);
      const clock = inject(Clock);

      const stored = adapter.load();
      if (stored !== null) {
        const { version: _version, ...rest } = stored;
        patchState(store, rest);
      }

      // A new day resets the free-hint allowance.
      if (store.freeHintsDate() !== clock.today()) {
        patchState(store, { freeHintsDate: clock.today(), freeHintsUsed: 0 });
      }

      effect(() => themes.apply(store.activeTheme()));
      watchState(store, (state) => adapter.save(toSave(state)));
    },
  }),
);
