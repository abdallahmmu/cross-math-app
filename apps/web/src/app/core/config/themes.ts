export type ThemeId = 'classic' | 'mint' | 'grape' | 'night';

export interface ThemeOption {
  readonly id: ThemeId;
  readonly name: string;
  readonly blurb: string;
  readonly coins: number;
  readonly dark: boolean;
  /** Preview swatches, in the order they are drawn on the shop card. */
  readonly swatches: readonly [string, string, string, string];
  /** Drives the browser UI colour while the theme is active. */
  readonly browserColor: string;
}

export const THEMES: readonly ThemeOption[] = [
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'Cream paper, tomato ink.',
    coins: 0,
    dark: false,
    swatches: ['#FFF4E0', '#FF6B4A', '#FFC93C', '#7ED6A5'],
    browserColor: '#FFF4E0',
  },
  {
    id: 'mint',
    name: 'Mint Pop',
    blurb: 'Cool and fizzy.',
    coins: 300,
    dark: false,
    swatches: ['#DFF7EC', '#35C98B', '#FFD84D', '#6ED8FF'],
    browserColor: '#DFF7EC',
  },
  {
    id: 'grape',
    name: 'Grape Soda',
    blurb: 'Purple, loud, fun.',
    coins: 500,
    dark: false,
    swatches: ['#F3E8FF', '#B673F9', '#FFD166', '#8DE8B9'],
    browserColor: '#F3E8FF',
  },
  {
    id: 'night',
    name: 'Night Market',
    blurb: 'Dark mode with neon.',
    coins: 800,
    dark: true,
    swatches: ['#12131A', '#FF7A5C', '#FFD24D', '#6FE0A8'],
    browserColor: '#12131A',
  },
];

export const DEFAULT_THEME: ThemeId = 'classic';

export function findTheme(id: ThemeId): ThemeOption {
  const theme = THEMES.find((option) => option.id === id);
  if (theme === undefined) throw new Error(`Unknown theme: ${id}`);
  return theme;
}

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((option) => option.id === value);
}
