import { describe, expect, it } from 'vitest';
import { countSolutions, generatePuzzle, type Puzzle } from '../src/index.js';

/** `a + b = r` laid out horizontally at the origin. */
function singleEquation(a: number, b: number, r: number, blanks: readonly string[]): Puzzle {
  const solution: Record<string, number> = { '0,0': a, '0,2': b, '0,4': r };
  return {
    id: 'test',
    seed: 'test',
    difficulty: 'easy',
    rows: 1,
    cols: 5,
    equations: [
      {
        id: 0,
        dir: 'h',
        row: 0,
        col: 0,
        op: '+',
        cells: ['0,0', '0,2', '0,4'],
        opCell: '0,1',
        equalsCell: '0,3',
      },
    ],
    solution,
    blanks,
    tiles: blanks.map((key) => solution[key] ?? 0).sort((x, y) => x - y),
  };
}

describe('countSolutions', () => {
  it('counts one solution when the last cell is forced', () => {
    expect(countSolutions(singleEquation(4, 5, 9, ['0,4']))).toBe(1);
  });

  it('counts both orderings of two distinct tiles', () => {
    // 4 + 5 = 9 with both operands blank: tiles 4 and 5 could go either way,
    // so this deliberately has two solutions.
    expect(countSolutions(singleEquation(4, 5, 9, ['0,0', '0,2']), 2)).toBe(2);
  });

  it('does not double-count identical tiles', () => {
    // 6 + 6 = 12 with both operands blank: the two 6s are interchangeable, so
    // there is still only one solution.
    expect(countSolutions(singleEquation(6, 6, 12, ['0,0', '0,2']), 5)).toBe(1);
  });

  it('reports zero when the tiles cannot satisfy the equation', () => {
    const puzzle = singleEquation(4, 5, 9, ['0,4']);
    expect(countSolutions({ ...puzzle, tiles: [8] })).toBe(0);
  });

  it('honours the limit it is given', () => {
    // 2 + 2 = 4, 3 + 1 = 4, ... many ways to fill three blanks from these tiles.
    const puzzle = singleEquation(1, 2, 3, ['0,0', '0,2', '0,4']);
    const wide = { ...puzzle, tiles: [1, 2, 3] };
    expect(countSolutions(wide, 1)).toBe(1);
    expect(countSolutions(wide, 2)).toBe(2);
  });

  it('sees exactly one solution in every generated puzzle', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
      for (let i = 0; i < 10; i += 1) {
        const puzzle = generatePuzzle({ seed: `unique-${difficulty}-${i}`, difficulty });
        expect(countSolutions(puzzle, 2)).toBe(1);
      }
    }
  });

  it('counts nothing when an equation does not hold', () => {
    expect(countSolutions(singleEquation(4, 5, 10, []))).toBe(0);
  });

  it('counts a fully given, correct board once', () => {
    expect(countSolutions(singleEquation(4, 5, 9, []))).toBe(1);
  });
});
