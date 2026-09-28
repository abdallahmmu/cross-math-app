import { Injectable, signal } from '@angular/core';

/** How the hint was come by, for analytics. */
export type HintSource = 'purchased' | 'rewarded';

/**
 * The "get another hint" flow, hoisted out of the Play page so the hint counter
 * in the top bar can open it from anywhere.
 *
 * The caller optionally passes what to do once a hint has actually been
 * obtained - during play that is "use it right now", and from the top bar it is
 * nothing at all, because the hint just goes in the pocket.
 */
@Injectable({ providedIn: 'root' })
export class HintOffer {
  private readonly opened = signal(false);
  private onEarned: ((source: HintSource) => void) | null = null;

  readonly isOpen = this.opened.asReadonly();

  open(onEarned?: (source: HintSource) => void): void {
    this.onEarned = onEarned ?? null;
    this.opened.set(true);
  }

  /** Called by the sheet once the balance has actually gone up. */
  earned(source: HintSource): void {
    const callback = this.onEarned;
    this.close();
    callback?.(source);
  }

  /** Hide the sheet but keep the follow-up, for flows that open another overlay on top. */
  suspend(): void {
    this.opened.set(false);
  }

  close(): void {
    this.opened.set(false);
    this.onEarned = null;
  }
}
