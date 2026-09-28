import { describe, expect, it } from 'vitest';
import {
  generatePuzzle,
  getHint,
  isCorrectPlacement,
  validateSolution,
  type Answers,
} from '../src/index.js';
import { solvedAnswers } from './invariants.js';

const puzzle = generatePuzzle({ seed: 'validate-me', difficulty: 'medium' });

describe('validateSolution', () => {
  it('accepts the real solution', () => {
    const result = validateSolution(puzzle, solvedAnswers(puzzle));
    expect(result.valid).toBe(true);
    expect(result.wrongCells).toEqual([]);
  });

  it('rejects an empty board without blaming any cell', () => {
    const result = validateSolution(puzzle, {});
    expect(result.valid).toBe(false);
    expect(result.wrongCells).toEqual([]);
  });

  it('rejects a swap of two answers and names the cells', () => {
    const answers = solvedAnswers(puzzle);
    const [first, second] = puzzle.blanks;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;
    if (answers[first] === answers[second]) return; // equal values: nothing to swap

    const swapped: Answers = {
      ...answers,
      [first]: answers[second] ?? 0,
      [second]: answers[first] ?? 0,
    };
    const result = validateSolution(puzzle, swapped);
    expect(result.valid).toBe(false);
    expect(result.wrongCells.length).toBeGreaterThan(0);
    expect(result.wrongCells).toEqual([...result.wrongCells].sort());
  });

  it('rejects answers that hold together but do not use the given tiles', () => {
    // Every equation still adds up, but a tile was conjured out of thin air.
    const single = generatePuzzle({ seed: 'tiles-check', difficulty: 'easy' });
    const answers = solvedAnswers(single);
    const key = single.blanks[0];
    expect(key).toBeDefined();
    if (key === undefined) return;

    const fake = { ...single, tiles: single.tiles.map((tile, i) => (i === 0 ? tile + 1 : tile)) };
    const result = validateSolution(fake, answers);
    expect(result.valid).toBe(false);
  });

  it('rejects a wrong value in one cell', () => {
    const answers = solvedAnswers(puzzle);
    const key = puzzle.blanks[0];
    expect(key).toBeDefined();
    if (key === undefined) return;

    const result = validateSolution(puzzle, { ...answers, [key]: (answers[key] ?? 0) + 7 });
    expect(result.valid).toBe(false);
    expect(result.wrongCells).toContain(key);
  });
});

describe('isCorrectPlacement', () => {
  it('accepts the value a blank is waiting for', () => {
    for (const key of puzzle.blanks) {
      expect(isCorrectPlacement(puzzle, key, puzzle.solution[key] ?? -1)).toBe(true);
      expect(isCorrectPlacement(puzzle, key, (puzzle.solution[key] ?? 0) + 1)).toBe(false);
    }
  });

  it('refuses cells that are not blanks', () => {
    const given = Object.keys(puzzle.solution).find((key) => !puzzle.blanks.includes(key));
    expect(given).toBeDefined();
    if (given === undefined) return;
    expect(isCorrectPlacement(puzzle, given, puzzle.solution[given] ?? -1)).toBe(false);
    expect(isCorrectPlacement(puzzle, '99,99', 1)).toBe(false);
  });
});

describe('getHint', () => {
  it('starts at the first blank in reading order', () => {
    const hint = getHint(puzzle, {});
    expect(hint).not.toBeNull();
    expect(hint?.cellKey).toBe(puzzle.blanks[0]);
    expect(hint?.value).toBe(puzzle.solution[puzzle.blanks[0] ?? '']);
  });

  it('honours a preferred cell that still needs help', () => {
    const preferred = puzzle.blanks[2] ?? puzzle.blanks[0];
    expect(preferred).toBeDefined();
    if (preferred === undefined) return;
    expect(getHint(puzzle, {}, preferred)?.cellKey).toBe(preferred);
  });

  it('ignores a preferred cell that is already right', () => {
    const preferred = puzzle.blanks[0];
    expect(preferred).toBeDefined();
    if (preferred === undefined) return;
    const answers = { [preferred]: puzzle.solution[preferred] ?? 0 };
    const hint = getHint(puzzle, answers, preferred);
    expect(hint?.cellKey).not.toBe(preferred);
  });

  it('offers to fix a cell that was filled wrongly', () => {
    const key = puzzle.blanks[1] ?? puzzle.blanks[0];
    expect(key).toBeDefined();
    if (key === undefined) return;
    const hint = getHint(puzzle, { [key]: (puzzle.solution[key] ?? 0) + 3 });
    expect(hint).not.toBeNull();
  });

  it('returns null once the board is solved', () => {
    expect(getHint(puzzle, solvedAnswers(puzzle))).toBeNull();
  });
});
