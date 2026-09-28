import { Injectable, signal, type Signal } from '@angular/core';
import { ECONOMY } from '../config/economy';

export type RewardedAdState = 'idle' | 'playing';

/**
 * Rewarded video, behind an interface so the Capacitor AdMob plugin can drop in
 * later without touching the hint flow.
 */
export abstract class AdsService {
  abstract readonly state: Signal<RewardedAdState>;
  /** 0 to 1, for the placeholder progress bar. */
  abstract readonly progress: Signal<number>;
  /** Resolves true when the reward has been earned. */
  abstract showRewarded(): Promise<boolean>;
}

/**
 * A two-second stand-in. The overlay it drives is clearly labelled a
 * placeholder - there is no real ad network in the web build.
 */
@Injectable()
export class FakeAdsService extends AdsService {
  private readonly currentState = signal<RewardedAdState>('idle');
  private readonly currentProgress = signal(0);

  override readonly state = this.currentState.asReadonly();
  override readonly progress = this.currentProgress.asReadonly();

  override showRewarded(): Promise<boolean> {
    if (this.currentState() === 'playing') return Promise.resolve(false);

    const duration = ECONOMY.rewardedAd.durationMs;
    const startedAt = Date.now();
    this.currentState.set('playing');
    this.currentProgress.set(0);

    return new Promise<boolean>((resolve) => {
      const ticker = setInterval(() => {
        this.currentProgress.set(Math.min(1, (Date.now() - startedAt) / duration));
      }, 50);

      setTimeout(() => {
        clearInterval(ticker);
        this.currentProgress.set(1);
        this.currentState.set('idle');
        resolve(true);
      }, duration);
    });
  }
}
