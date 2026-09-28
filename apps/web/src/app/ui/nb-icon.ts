import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'back'
  | 'calendar'
  | 'check'
  | 'close'
  | 'coin'
  | 'flame'
  | 'hint'
  | 'levels'
  | 'lock'
  | 'play'
  | 'settings'
  | 'shop'
  | 'star'
  | 'video';

interface IconDef {
  readonly paths: readonly string[];
  readonly filled?: boolean;
}

/** Chunky 24px line icons, drawn to match the 3px border weight. */
const ICONS: Readonly<Record<IconName, IconDef>> = {
  back: { paths: ['M15 4 7 12l8 8'] },
  calendar: { paths: ['M4 7h16v13H4z', 'M8 4v4', 'M16 4v4', 'M4 12h16'] },
  check: { paths: ['M5 13l5 5L19 6'] },
  close: { paths: ['M6 6l12 12', 'M18 6L6 18'] },
  coin: { paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v10', 'M9.5 9.5h5'] },
  flame: { paths: ['M12 3c4 4 6 6.5 6 10a6 6 0 0 1-12 0c0-2 1-3.8 2.5-5 0 2 1 3 2 3 .8-2.5-.5-6-.5-8z'] },
  hint: { paths: ['M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z', 'M10 19h4', 'M10.5 22h3'] },
  levels: { paths: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'] },
  lock: { paths: ['M5 11h14v9H5z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'] },
  play: { paths: ['M8 4.5 19 12 8 19.5z'], filled: true },
  settings: { paths: ['M4 7h16', 'M4 17h16', 'M9 7v0', 'M15 17v0', 'M9 4v6', 'M15 14v6'] },
  shop: { paths: ['M5 8h14l-1.3 12H6.3z', 'M9 8V6a3 3 0 0 1 6 0v2'] },
  star: { paths: ['M12 3.5l2.7 5.6 6.1.8-4.4 4.3 1.1 6.1-5.5-3-5.5 3 1.1-6.1L3.2 9.9l6.1-.8z'], filled: true },
  video: { paths: ['M3 6h13v12H3z', 'M16 10l5-3v10l-5-3', 'M8 10l4 2-4 2z'] },
};

@Component({
  selector: 'nb-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      [attr.fill]="def().filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @for (d of def().paths; track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: var(--icon-size, 1.25rem);
      height: var(--icon-size, 1.25rem);
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class NbIcon {
  readonly name = input.required<IconName>();
  protected readonly def = computed<IconDef>(() => ICONS[this.name()]);
}
