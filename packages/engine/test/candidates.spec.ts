import { describe, expect, it } from 'vitest';
import {
  applyOperator,
  DIFFICULTY_CONFIG,
  isValidEquation,
  solveLeft,
  solveRight,
} from '../src/index.js';
import { buildCandidates } from '../src/candidates.js';
import { createRng } from '../src/rng.js';

const hard = DIFFICULTY_CONFIG.hard;

describe('applyOperator', () => {
  it('computes the four operations', () => {
    expect(applyOperator('+', 7, 5)).toBe(12);
    expect(applyOperator('−', 7, 5)).toBe(2);
    expect(applyOperator('×', 7, 5)).toBe(35);
    expect(applyOperator('÷', 35, 5)).toBe(7);
  });

  it('refuses inexact division', () => {
    expect(applyOperator('÷', 7, 5)).toBeNull();
    expect(applyOperator('÷', 7, 0)).toBeNull();
  });
});

describe('solveLeft and solveRight', () => {
  it('invert each operation', () => {
    for (const [op, a, b, r] of [
      ['+', 8, 9, 17],
      ['−', 15, 6, 9],
      ['×', 6, 7, 42],
      ['÷', 42, 6, 7],
    ] as const) {
      expect(solveLeft(op, b, r), `${op} left`).toBe(a);
      expect(solveRight(op, a, r), `${op} right`).toBe(b);
    }
  });

  it('returns null where no whole number fits', () => {
    expect(solveLeft('×', 5, 12)).toBeNull();
    expect(solveRight('×', 5, 12)).toBeNull();
    expect(solveRight('÷', 7, 2)).toBeNull();
  });
});

describe('isValidEquation', () => {
  it('keeps numbers inside 1..maxValue', () => {
    expect(isValidEquation('+', 1, 98, 99, hard)).toBe(true);
    expect(isValidEquation('+', 1, 99, 100, hard)).toBe(false);
    expect(isValidEquation('−', 5, 5, 0, hard)).toBe(false);
    expect(isValidEquation('−', 5, 9, -4, hard)).toBe(false);
  });

  it('bans ×1 and ÷1 through the factor bounds', () => {
    expect(isValidEquation('×', 1, 9, 9, hard)).toBe(false);
    expect(isValidEquation('×', 9, 1, 9, hard)).toBe(false);
    expect(isValidEquation('÷', 9, 1, 9, hard)).toBe(false);
    expect(isValidEquation('÷', 9, 9, 1, hard)).toBe(false);
    expect(isValidEquation('×', 2, 2, 4, hard)).toBe(true);
  });

  it('keeps factors at or below maxFactor', () => {
    expect(isValidEquation('×', 12, 8, 96, hard)).toBe(true);
    expect(isValidEquation('×', 13, 7, 91, hard)).toBe(false);
    expect(isValidEquation('÷', 96, 12, 8, hard)).toBe(true);
    expect(isValidEquation('÷', 91, 13, 7, hard)).toBe(false);
  });

  it('requires exact division', () => {
    expect(isValidEquation('÷', 7, 2, 3, hard)).toBe(false);
  });

  it('rejects fractions and non-integers', () => {
    expect(isValidEquation('+', 1.5, 2, 3.5, hard)).toBe(false);
  });
});

describe('buildCandidates', () => {
  it('only proposes equations that agree with the fixed cells', () => {
    const rng = createRng('candidates');
    for (const fixed of [
      [null, null, null],
      [12, null, null],
      [null, 7, null],
      [null, null, 36],
      [9, null, 45],
      [null, 6, 42],
      [6, 7, null],
    ] as const) {
      for (const candidate of buildCandidates(rng, hard, fixed)) {
        expect(isValidEquation(candidate.op, candidate.a, candidate.b, candidate.r, hard)).toBe(true);
        if (fixed[0] !== null) expect(candidate.a).toBe(fixed[0]);
        if (fixed[1] !== null) expect(candidate.b).toBe(fixed[1]);
        if (fixed[2] !== null) expect(candidate.r).toBe(fixed[2]);
        expect(hard.operators).toContain(candidate.op);
      }
    }
  });

  it('finds nothing when the fixed cells contradict every operator', () => {
    const rng = createRng('contradiction');
    expect(buildCandidates(rng, hard, [2, 3, 99])).toEqual([]);
  });

  it('offers every operator when nothing is fixed', () => {
    const rng = createRng('variety');
    const ops = new Set(buildCandidates(rng, hard, [null, null, null]).map((c) => c.op));
    expect([...ops].sort()).toEqual([...hard.operators].sort());
  });

  it('is deterministic for a given generator state', () => {
    const first = buildCandidates(createRng('same'), hard, [null, 6, null]);
    const second = buildCandidates(createRng('same'), hard, [null, 6, null]);
    expect(second).toEqual(first);
  });
});
