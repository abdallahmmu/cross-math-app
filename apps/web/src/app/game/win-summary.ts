export interface WinSummary {
  readonly mode: 'journey' | 'daily';
  readonly stars: number;
  readonly timeMs: number;
  readonly mistakes: number;
  readonly hintsUsed: number;
  readonly coins: number;
  /** False on a replay, when only the small consolation reward is paid. */
  readonly firstClear: boolean;
  readonly bestStars: number;
  readonly bestTimeMs: number;
  /** Daily only. */
  readonly streak: number | null;
  /** Journey only: the level the "Next" button should open. */
  readonly nextLevel: number | null;
}
