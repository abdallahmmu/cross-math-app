import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  signal,
} from '@angular/core';
import { generatePuzzle } from '@sumday/engine';
import { THEMES, type ThemeId } from '../../core/config/themes';
import { ThemeService } from '../../core/theme/theme.service';
import { Board } from '../../game/board';
import { HintSheet } from '../../game/hint-sheet';
import { Tile } from '../../game/tile';
import { Tray } from '../../game/tray';
import { WinModal } from '../../game/win-modal';
import type { WinSummary } from '../../game/win-summary';
import { GameStore } from '../../state/game.store';
import { NbBadge, type BadgeTone } from '../../ui/nb-badge';
import { NbButton, type ButtonVariant } from '../../ui/nb-button';
import { NbCard, type CardTone } from '../../ui/nb-card';
import { NbCounter } from '../../ui/nb-counter';
import { NbIcon, type IconName } from '../../ui/nb-icon';
import { NbModal } from '../../ui/nb-modal';
import { NbStars } from '../../ui/nb-stars';
import { NbTopBar } from '../../ui/nb-top-bar';
import { ToastService } from '../../ui/toast.service';
import { contrastRatio, readToken } from './contrast';

interface ContrastRow {
  readonly label: string;
  readonly ratio: number | null;
  readonly foreground: string;
  readonly background: string;
}

const PAIRS: ReadonlyArray<readonly [string, string, string]> = [
  ['Body text on page', '--ink', '--paper'],
  ['Body text on card', '--ink', '--surface'],
  ['Muted text on page', '--ink-soft', '--paper'],
  ['Label on primary', '--on-accent', '--primary'],
  ['Label on sunflower', '--on-accent', '--sunflower'],
  ['Label on mint', '--on-accent', '--mint'],
  ['Label on sky', '--on-accent', '--sky'],
  ['Label on lilac', '--on-accent', '--lilac'],
  ['Number on error fill', '--on-accent', '--error'],
  ['Error text on page', '--error-ink', '--paper'],
];

const WIN_SUMMARY: WinSummary = {
  mode: 'journey',
  stars: 3,
  timeMs: 74_000,
  mistakes: 0,
  hintsUsed: 0,
  coins: 20,
  firstClear: true,
  bestStars: 3,
  bestTimeMs: 74_000,
  streak: null,
  nextLevel: 5,
};

/** Dev-only gallery: every component, every state, and the real contrast numbers. */
@Component({
  selector: 'app-styleguide-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameStore],
  imports: [
    Board,
    HintSheet,
    NbBadge,
    NbButton,
    NbCard,
    NbCounter,
    NbIcon,
    NbModal,
    NbStars,
    NbTopBar,
    Tile,
    Tray,
    WinModal,
  ],
  templateUrl: './styleguide-page.html',
  styleUrl: './styleguide-page.css',
})
export class StyleguidePage {
  protected readonly game = inject(GameStore);
  private readonly themes = inject(ThemeService);
  private readonly toasts = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  protected readonly themeOptions = THEMES;
  protected readonly buttonVariants: readonly ButtonVariant[] = [
    'primary',
    'secondary',
    'ghost',
    'icon',
  ];
  protected readonly cardTones: readonly CardTone[] = [
    'surface',
    'paper',
    'primary',
    'sunflower',
    'mint',
    'sky',
    'lilac',
  ];
  protected readonly badgeTones: readonly BadgeTone[] = [
    'surface',
    'ink',
    'primary',
    'sunflower',
    'mint',
    'sky',
    'lilac',
    'error',
  ];
  protected readonly iconNames: readonly IconName[] = [
    'back',
    'calendar',
    'check',
    'close',
    'coin',
    'flame',
    'hint',
    'levels',
    'lock',
    'play',
    'settings',
    'shop',
    'star',
    'video',
  ];

  protected readonly winSummary = WIN_SUMMARY;
  protected readonly showModal = signal(false);
  protected readonly showSheet = signal(false);
  protected readonly showWin = signal(false);
  protected readonly showHintSheet = signal(false);
  protected readonly previewTheme = signal<ThemeId | null>(null);

  private readonly contrastTick = signal(0);
  protected readonly contrast = computed<readonly ContrastRow[]>(() => {
    this.contrastTick();
    const root = this.document.documentElement;
    return PAIRS.map(([label, foreground, background]) => {
      const fore = readToken(root, foreground);
      const back = readToken(root, background);
      return { label, foreground: fore, background: back, ratio: contrastRatio(fore, back) };
    });
  });

  constructor() {
    this.game.load(generatePuzzle({ seed: 'styleguide', difficulty: 'easy' }));

    afterNextRender(() => this.contrastTick.update((tick) => tick + 1));
    effect(() => {
      const theme = this.previewTheme();
      if (theme !== null) {
        this.themes.apply(theme);
        this.contrastTick.update((tick) => tick + 1);
      }
    });
  }

  protected fireToast(tone: 'ink' | 'mint' | 'error'): void {
    this.toasts.show(`A ${tone} toast`, { tone, icon: tone === 'error' ? 'close' : 'coin' });
  }

  /** Drop a correct value, so the solved state can be seen. */
  protected placeCorrect(): void {
    const puzzle = this.game.puzzle();
    const cell = this.game.selected();
    if (puzzle === null || cell === null) return;
    const value = puzzle.solution[cell];
    if (value !== undefined) this.game.placeValue(value);
  }

  protected placeWrong(): void {
    const tile = this.game.tray()[0];
    const puzzle = this.game.puzzle();
    const cell = this.game.selected();
    if (tile === undefined || puzzle === null || cell === null) return;
    // Any value that is not the answer will do.
    const wrong = this.game.trayValues().find((value) => value !== puzzle.solution[cell]);
    if (wrong !== undefined) this.game.placeValue(wrong);
  }

  protected resetBoard(): void {
    this.game.load(generatePuzzle({ seed: 'styleguide', difficulty: 'easy' }));
  }

  protected ratioLabel(row: ContrastRow): string {
    return row.ratio === null ? 'n/a' : `${row.ratio.toFixed(2)}:1`;
  }

  protected ratioVerdict(row: ContrastRow): string {
    if (row.ratio === null) return '';
    if (row.ratio >= 4.5) return 'AA';
    if (row.ratio >= 3) return 'AA large';
    return 'fails';
  }
}
