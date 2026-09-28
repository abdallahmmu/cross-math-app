import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  dailyPuzzle,
  generatePuzzle,
  getHint,
  journeyLevel,
  type Difficulty,
  type PuzzleRequest,
} from '@sumday/engine';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { HintOffer, type HintSource } from '../../core/hints/hint-offer.service';
import { SoundService } from '../../core/sound/sound.service';
import { ECONOMY, starsFor } from '../../core/config/economy';
import { Clock } from '../../core/time/clock';
import { formatDuration } from '../../core/time/local-date';
import { Board } from '../../game/board';
import { DragGhost } from '../../game/drag-ghost';
import { TileDragService } from '../../game/tile-drag.service';
import { Tray } from '../../game/tray';
import { WinModal } from '../../game/win-modal';
import type { WinSummary } from '../../game/win-summary';
import { GameStore } from '../../state/game.store';
import { ProgressStore } from '../../state/progress.store';
import { NbBadge } from '../../ui/nb-badge';
import { NbButton } from '../../ui/nb-button';
import { NbIcon } from '../../ui/nb-icon';
import { NbTopBar } from '../../ui/nb-top-bar';
import { ToastService } from '../../ui/toast.service';

type PlayMode = 'journey' | 'daily';

/** How long to wait for a second digit before committing what was typed. */
const TYPE_AHEAD_MS = 900;

@Component({
  selector: 'app-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameStore],
  imports: [Board, DragGhost, NbBadge, NbButton, NbIcon, NbTopBar, Tray, WinModal],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './play-page.html',
  styleUrl: './play-page.css',
})
export class PlayPage {
  /** Bound from the route's `data`. */
  readonly mode = input.required<PlayMode>();
  readonly level = input<string | undefined>(undefined);
  readonly date = input<string | undefined>(undefined);

  protected readonly game = inject(GameStore);
  protected readonly progress = inject(ProgressStore);
  private readonly analytics = inject(AnalyticsService);
  private readonly clock = inject(Clock);
  private readonly drag = inject(TileDragService);
  private readonly hintOffer = inject(HintOffer);
  private readonly sound = inject(SoundService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly summary = signal<WinSummary | null>(null);

  private readonly typed = signal('');
  private typeTimer: ReturnType<typeof setTimeout> | undefined;
  private startedAt = 0;
  private awarded = false;

  /** What to generate. Depends only on the route, never on progress. */
  private readonly request = computed<PuzzleRequest | null>(() => {
    if (this.mode() === 'daily') {
      const date = this.date();
      if (date === undefined) return null;
      try {
        return dailyPuzzle(date);
      } catch {
        return null;
      }
    }
    const level = this.levelNumber();
    return level === null ? null : journeyLevel(level);
  });

  protected readonly difficulty = computed<Difficulty | null>(() => this.request()?.difficulty ?? null);
  protected readonly heading = computed(() =>
    this.mode() === 'daily' ? 'Daily challenge' : `Level ${this.levelNumber() ?? ''}`,
  );
  protected readonly backTo = computed(() => (this.mode() === 'daily' ? '/daily' : '/levels'));
  protected readonly elapsed = computed(() => formatDuration(this.game.elapsedMs()));

  constructor() {
    effect(() => {
      const request = this.request();
      untracked(() => this.startRun(request));
    });

    effect(() => {
      const won = this.game.status() === 'won';
      untracked(() => {
        if (won && !this.awarded) this.finishRun();
      });
    });

    const ticker = setInterval(() => {
      this.game.tick(this.clock.now() - this.startedAt);
    }, 250);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(ticker);
      clearTimeout(this.typeTimer);
    });
  }

  private levelNumber(): number | null {
    const value = Number(this.level());
    return Number.isInteger(value) && value >= 1 ? value : null;
  }

  private runId(): string {
    return this.mode() === 'daily' ? (this.date() ?? '') : String(this.levelNumber() ?? '');
  }

  private startRun(request: PuzzleRequest | null): void {
    if (request === null) {
      void this.router.navigate(['/']);
      return;
    }
    const level = this.levelNumber();
    if (this.mode() === 'journey' && (level === null || !this.progress.isUnlocked(level))) {
      void this.router.navigate(['/levels']);
      return;
    }

    this.awarded = false;
    this.drag.cancel();
    this.hintOffer.close();
    this.summary.set(null);
    this.typed.set('');
    this.startedAt = this.clock.now();
    this.game.load(generatePuzzle(request));
    this.analytics.track({
      name: 'level_start',
      mode: this.mode(),
      id: this.runId(),
      difficulty: request.difficulty,
    });
  }

  private finishRun(): void {
    const request = this.request();
    if (request === null) return;

    this.awarded = true;
    const timeMs = this.clock.now() - this.startedAt;
    this.game.tick(timeMs);

    const mistakes = this.game.mistakes();
    const hintsUsed = this.game.hintsUsed();
    const stars = starsFor(mistakes, hintsUsed);

    if (this.mode() === 'daily') {
      const date = this.date() ?? this.clock.today();
      const reward = this.progress.completeDaily({ date, stars, timeMs });
      this.summary.set({
        mode: 'daily',
        stars,
        timeMs,
        mistakes,
        hintsUsed,
        coins: reward.coins,
        firstClear: !reward.alreadyDone,
        bestStars: stars,
        bestTimeMs: timeMs,
        streak: reward.streak,
        nextLevel: null,
      });
      this.announceReward(reward.coins);
      return;
    }

    const level = this.levelNumber();
    if (level === null) return;
    const reward = this.progress.completeJourneyLevel({
      level,
      difficulty: request.difficulty,
      stars,
      timeMs,
      mistakes,
      hintsUsed,
    });
    this.summary.set({
      mode: 'journey',
      stars,
      timeMs,
      mistakes,
      hintsUsed,
      coins: reward.coins,
      firstClear: reward.firstClear,
      bestStars: reward.bestStars,
      bestTimeMs: reward.bestTimeMs,
      streak: null,
      nextLevel: level < ECONOMY.journey.levelCount ? level + 1 : null,
    });
    this.announceReward(reward.coins);
  }

  private announceReward(coins: number): void {
    if (coins <= 0) return;
    this.toasts.show(`+${coins} coins`, { tone: 'mint', icon: 'coin' });
    setTimeout(() => this.sound.play('coin'), 420);
  }

  /* Input ----------------------------------------------------------------- */

  protected onKeydown(event: KeyboardEvent): void {
    if (this.game.status() !== 'playing' || event.metaKey || event.ctrlKey || event.altKey) return;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.pushDigit(event.key);
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Escape') {
      clearTimeout(this.typeTimer);
      this.typed.set('');
      return;
    }
    if (event.key === 'Enter') {
      this.commitTyped();
    }
  }

  /**
   * Typing "4" when the tray holds 4 and 45 has to wait for a second digit;
   * typing a digit no longer value starts with can be placed straight away.
   */
  private pushDigit(digit: string): void {
    const values = this.game.trayValues();
    const maxDigits = values.reduce((most, value) => Math.max(most, String(value).length), 1);
    const next = (this.typed() + digit).slice(0, maxDigits);
    this.typed.set(next);

    clearTimeout(this.typeTimer);
    const couldGrow = values.some(
      (value) => String(value).length > next.length && String(value).startsWith(next),
    );
    if (couldGrow) {
      this.typeTimer = setTimeout(() => this.commitTyped(), TYPE_AHEAD_MS);
      return;
    }
    this.commitTyped();
  }

  private commitTyped(): void {
    clearTimeout(this.typeTimer);
    const raw = this.typed();
    this.typed.set('');
    if (raw === '') return;

    if (this.game.placeValue(Number(raw)) === 'no-tile') {
      this.toasts.show(`No ${raw} tile left`, { tone: 'error' });
    }
  }

  /* Hints ----------------------------------------------------------------- */

  protected useHint(): void {
    if (this.game.status() !== 'playing') return;
    if (this.progress.hints() <= 0) {
      // Out of hints: offer one, and spend it as soon as it arrives.
      this.hintOffer.open((source) => this.spendHint(source));
      return;
    }
    this.spendHint('owned');
  }

  private spendHint(source: HintSource | 'owned'): void {
    const puzzle = this.game.puzzle();
    if (puzzle === null) return;

    const hint = getHint(puzzle, this.game.answers(), this.game.selected() ?? undefined);
    if (hint === null) return;
    if (this.progress.useHint() !== 'spent') return;

    this.sound.play('hint');
    this.game.applyHint(hint.cellKey, hint.value);
    this.analytics.track({ name: 'hint_used', id: this.runId(), source });
  }


  /* Win modal ------------------------------------------------------------- */

  protected replay(): void {
    this.startRun(this.request());
  }

  protected goToNextLevel(): void {
    const next = this.summary()?.nextLevel;
    if (next === undefined || next === null) return;
    void this.router.navigate(['/play/journey', next]);
  }

  protected leave(): void {
    void this.router.navigate([this.backTo()]);
  }
}
