import { Injectable, signal } from '@angular/core';
import { todayISO } from './local-date';

/**
 * The app's single source of "now". Injecting it instead of calling `Date.now`
 * directly keeps the stores free of ambient state, and lets the daily roll over
 * without a reload.
 */
@Injectable({ providedIn: 'root' })
export class Clock {
  private readonly currentDate = signal(todayISO());

  /** Today, as `YYYY-MM-DD`, in the player's time zone. */
  readonly today = this.currentDate.asReadonly();

  now(): number {
    return Date.now();
  }

  /** Called when the tab regains focus, in case midnight has passed. */
  refresh(): void {
    const today = todayISO();
    if (today !== this.currentDate()) this.currentDate.set(today);
  }
}
