import { Injectable } from '@angular/core';
import type { Difficulty } from '@sumday/engine';

export type AnalyticsEvent =
  | { readonly name: 'level_start'; readonly mode: 'journey' | 'daily'; readonly id: string; readonly difficulty: Difficulty }
  | {
      readonly name: 'level_complete';
      readonly mode: 'journey' | 'daily';
      readonly id: string;
      readonly difficulty: Difficulty;
      readonly stars: number;
      readonly timeMs: number;
      readonly mistakes: number;
      readonly hintsUsed: number;
    }
  | { readonly name: 'hint_used'; readonly id: string; readonly source: 'owned' | 'purchased' | 'rewarded' }
  | { readonly name: 'purchase'; readonly item: string; readonly coins: number }
  | { readonly name: 'daily_complete'; readonly date: string; readonly streak: number };

/**
 * Gameplay events. The console implementation is a stand-in for a real sink
 * (Firebase, PostHog, our own API) - the call sites never change.
 */
export abstract class AnalyticsService {
  abstract track(event: AnalyticsEvent): void;
}

@Injectable()
export class ConsoleAnalyticsService extends AnalyticsService {
  override track(event: AnalyticsEvent): void {
    const { name, ...payload } = event;
    console.info(`[analytics] ${name}`, payload);
  }
}
