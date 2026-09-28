import { describe, expect, it } from 'vitest';
import { createRng, hashString, mulberry32 } from '../src/rng.js';

describe('hashString', () => {
  it('is stable for a given string', () => {
    expect(hashString('journey-1')).toBe(hashString('journey-1'));
    expect(hashString('daily-2026-09-28')).toBe(hashString('daily-2026-09-28'));
  });

  it('returns a uint32', () => {
    for (const input of ['', 'a', 'journey-99', 'daily-2026-01-01', '🎲']) {
      const hash = hashString(input);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('separates similar strings', () => {
    const hashes = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((n) => hashString(`journey-${n}`)));
    expect(hashes.size).toBe(8);
  });
});

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const first = mulberry32(12345);
    const second = mulberry32(12345);
    const a = [first(), first(), first(), first()];
    const b = [second(), second(), second(), second()];
    expect(a).toEqual(b);
  });

  it('stays inside [0, 1)', () => {
    const next = mulberry32(hashString('range-check'));
    for (let i = 0; i < 10_000; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('spreads values across the unit interval', () => {
    const next = mulberry32(7);
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 100_000; i += 1) {
      const bucket = Math.floor(next() * 10);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(9_000);
      expect(count).toBeLessThan(11_000);
    }
  });
});

describe('createRng', () => {
  it('is deterministic across instances', () => {
    const draw = (): number[] => {
      const rng = createRng('same-seed');
      return [rng.int(100), rng.range(1, 6), rng.pick([1, 2, 3, 4, 5]), ...rng.shuffle([1, 2, 3, 4, 5])];
    };
    expect(draw()).toEqual(draw());
  });

  it('keeps int and range inside their bounds', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 5_000; i += 1) {
      const value = rng.int(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);

      const ranged = rng.range(3, 9);
      expect(ranged).toBeGreaterThanOrEqual(3);
      expect(ranged).toBeLessThanOrEqual(9);
    }
  });

  it('shuffles into a permutation without touching the input', () => {
    const rng = createRng('shuffle');
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
  });

  it('refuses to pick from an empty list', () => {
    expect(() => createRng('empty').pick([])).toThrow(/empty/);
  });
});
