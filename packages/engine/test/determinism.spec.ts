import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CONFIG, generatePuzzle, type Difficulty } from '../src/index.js';

const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];

describe('generatePuzzle determinism', () => {
  it('returns a deep-equal puzzle for the same seed and difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const first = generatePuzzle({ seed: 'repeat-me', difficulty });
      const second = generatePuzzle({ seed: 'repeat-me', difficulty });
      expect(second).toEqual(first);
    }
  });

  it('survives a JSON round trip unchanged', () => {
    const puzzle = generatePuzzle({ seed: 'journey-42', difficulty: 'hard' });
    expect(JSON.parse(JSON.stringify(puzzle))).toEqual(puzzle);
    expect(JSON.stringify(generatePuzzle({ seed: 'journey-42', difficulty: 'hard' }))).toBe(
      JSON.stringify(puzzle),
    );
  });

  it('is not affected by other generations in between', () => {
    const before = generatePuzzle({ seed: 'isolated', difficulty: 'medium' });
    generatePuzzle({ seed: 'noise-1', difficulty: 'expert' });
    generatePuzzle({ seed: 'noise-2', difficulty: 'easy' });
    expect(generatePuzzle({ seed: 'isolated', difficulty: 'medium' })).toEqual(before);
  });

  it('gives different seeds different puzzles', () => {
    for (const difficulty of DIFFICULTIES) {
      const fingerprints = new Set<string>();
      for (let i = 0; i < 25; i += 1) {
        const puzzle = generatePuzzle({ seed: `spread-${i}`, difficulty });
        fingerprints.add(JSON.stringify([puzzle.equations, puzzle.solution, puzzle.blanks]));
      }
      expect(fingerprints.size).toBe(25);
    }
  });

  it('derives a stable id from the seed', () => {
    const puzzle = generatePuzzle({ seed: 'daily-2026-09-28', difficulty: 'easy' });
    expect(puzzle.id).toBe(generatePuzzle({ seed: 'daily-2026-09-28', difficulty: 'easy' }).id);
    expect(puzzle.id).toMatch(/^easy-[0-9a-z]+$/);
    expect(puzzle.seed).toBe('daily-2026-09-28');
  });

  it('rejects an unknown difficulty', () => {
    expect(() => generatePuzzle({ seed: 'x', difficulty: 'impossible' as Difficulty })).toThrow(
      /Unknown difficulty/,
    );
  });
});
