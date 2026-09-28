import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CONFIG, generatePuzzle, type Difficulty } from '../src/index.js';
import { collectProblems } from './invariants.js';

const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];
const SAMPLE_SIZE = 200;

describe.each(DIFFICULTIES)('%s puzzles', (difficulty) => {
  it(`satisfies every invariant across ${SAMPLE_SIZE} puzzles`, () => {
    const problems: string[] = [];
    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      const puzzle = generatePuzzle({ seed: `sweep-${difficulty}-${i}`, difficulty });
      problems.push(...collectProblems(puzzle));
    }
    expect(problems).toEqual([]);
  });

  it('gives every allowed operator a fair share of the equations', () => {
    const spec = DIFFICULTY_CONFIG[difficulty];
    const counts = new Map<string, number>();
    let total = 0;
    for (let i = 0; i < 120; i += 1) {
      const puzzle = generatePuzzle({ seed: `mix-${difficulty}-${i}`, difficulty });
      for (const equation of puzzle.equations) {
        counts.set(equation.op, (counts.get(equation.op) ?? 0) + 1);
        total += 1;
      }
    }
    // Without weighting, × and ÷ collapse to a few percent because they fit far
    // fewer cells than + and −, and a "hard" puzzle turns into all addition.
    const fairShare = 1 / spec.operators.length;
    for (const op of spec.operators) {
      const share = (counts.get(op) ?? 0) / total;
      expect(share, `${op} share`).toBeGreaterThan(fairShare * 0.5);
      expect(share, `${op} share`).toBeLessThan(fairShare * 1.8);
    }
  });

  it('uses the operators its difficulty allows', () => {
    const spec = DIFFICULTY_CONFIG[difficulty];
    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const puzzle = generatePuzzle({ seed: `ops-${difficulty}-${i}`, difficulty });
      for (const equation of puzzle.equations) seen.add(equation.op);
    }
    // Every allowed operator should actually show up over 60 puzzles.
    expect([...seen].sort()).toEqual([...spec.operators].sort());
  });
});
