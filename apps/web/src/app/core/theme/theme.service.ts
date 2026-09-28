import { DOCUMENT, Injectable, inject } from '@angular/core';
import { findTheme, type ThemeId } from '../config/themes';

/**
 * Themes are pure CSS: swapping `data-theme` on the root element re-points every
 * design token. The browser UI colour follows along so the address bar matches.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  apply(id: ThemeId): void {
    this.document.documentElement.setAttribute('data-theme', id);
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', findTheme(id).browserColor);
  }
}
