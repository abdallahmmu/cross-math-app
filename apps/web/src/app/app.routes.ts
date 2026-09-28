import { isDevMode } from '@angular/core';
import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Sumday',
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'levels',
    title: 'Levels - Sumday',
    loadComponent: () => import('./pages/levels/levels-page').then((m) => m.LevelsPage),
  },
  {
    path: 'daily',
    title: 'Daily challenge - Sumday',
    loadComponent: () => import('./pages/daily/daily-page').then((m) => m.DailyPage),
  },
  {
    path: 'play/journey/:level',
    title: 'Playing - Sumday',
    data: { mode: 'journey' },
    loadComponent: () => import('./pages/play/play-page').then((m) => m.PlayPage),
  },
  {
    path: 'play/daily/:date',
    title: 'Daily challenge - Sumday',
    data: { mode: 'daily' },
    loadComponent: () => import('./pages/play/play-page').then((m) => m.PlayPage),
  },
  {
    path: 'shop',
    title: 'Shop - Sumday',
    loadComponent: () => import('./pages/shop/shop-page').then((m) => m.ShopPage),
  },
  {
    path: 'settings',
    title: 'Settings - Sumday',
    loadComponent: () => import('./pages/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    // Development only: the route simply does not match in a production build.
    path: 'styleguide',
    title: 'Style guide - Sumday',
    canMatch: [() => isDevMode()],
    loadComponent: () => import('./pages/styleguide/styleguide-page').then((m) => m.StyleguidePage),
  },
  { path: '**', redirectTo: '' },
];
