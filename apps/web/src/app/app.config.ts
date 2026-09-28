import {
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  type ApplicationConfig,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { AdsService, FakeAdsService } from './core/ads/ads.service';
import { AnalyticsService, ConsoleAnalyticsService } from './core/analytics/analytics.service';
import { PurchaseService, UnavailablePurchaseService } from './core/purchase/purchase.service';
import { LocalSaveAdapter } from './core/save/local-save.adapter';
import { SaveAdapter } from './core/save/save-adapter';
import { routes } from './app.routes';

/**
 * Every swappable part of the app is bound here. Going online, or going mobile,
 * means changing this list - not the game.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    { provide: SaveAdapter, useClass: LocalSaveAdapter },
    { provide: AnalyticsService, useClass: ConsoleAnalyticsService },
    { provide: AdsService, useClass: FakeAdsService },
    { provide: PurchaseService, useClass: UnavailablePurchaseService },
  ],
};
