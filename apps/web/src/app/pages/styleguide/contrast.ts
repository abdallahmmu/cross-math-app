/**
 * WCAG contrast, measured from the live CSS variables rather than from a table
 * written by hand - so the style guide tells the truth after a theme swap.
 */

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace('#', '');
  const full = hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(colour: Rgb): number {
  return 0.2126 * channel(colour.r) + 0.7152 * channel(colour.g) + 0.0722 * channel(colour.b);
}

/** `null` when either colour could not be read. */
export function contrastRatio(foreground: string, background: string): number | null {
  const fore = parseHex(foreground);
  const back = parseHex(background);
  if (fore === null || back === null) return null;

  const lighter = Math.max(luminance(fore), luminance(back));
  const darker = Math.min(luminance(fore), luminance(back));
  return (lighter + 0.05) / (darker + 0.05);
}

export function readToken(root: Element, name: string): string {
  return getComputedStyle(root).getPropertyValue(name).trim();
}
