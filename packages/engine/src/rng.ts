/**
 * Seeded randomness. The engine never calls `Math.random`, so a seed always
 * produces the same puzzle - on any device, and on the server.
 */

/** xmur3-style string hash, returning a uint32. */
export function hashString(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32: a small, fast, well-distributed 32-bit generator. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** A float in `[0, 1)`. */
  next(): number;
  /** An integer in `[0, maxExclusive)`. */
  int(maxExclusive: number): number;
  /** An integer in `[min, max]`. */
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy; the input is left alone. */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: string | number): Rng {
  const next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);

  return {
    next,
    int,
    range: (min, max) => min + int(max - min + 1),
    pick: <T,>(items: readonly T[]): T => {
      const item = items[int(items.length)];
      if (item === undefined) {
        throw new Error('Rng.pick received an empty list');
      }
      return item;
    },
    shuffle: <T,>(items: readonly T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = int(i + 1);
        const a = out[i];
        const b = out[j];
        if (a === undefined || b === undefined) {
          throw new Error('Rng.shuffle received a sparse list');
        }
        out[i] = b;
        out[j] = a;
      }
      return out;
    },
  };
}
