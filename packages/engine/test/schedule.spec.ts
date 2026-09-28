import { describe, expect, it } from 'vitest';
import { dailyPuzzle, generatePuzzle, journeyLevel } from '../src/index.js';

describe('journeyLevel', () => {
  it('names its seed after the level', () => {
    expect(journeyLevel(1)).toEqual({ seed: 'journey-1', difficulty: 'easy' });
    expect(journeyLevel(137).seed).toBe('journey-137');
  });

  it('follows the tier boundaries', () => {
    const tiers: ReadonlyArray<readonly [number, string]> = [
      [1, 'easy'],
      [10, 'easy'],
      [11, 'medium'],
      [30, 'medium'],
      [31, 'hard'],
      [60, 'hard'],
      [61, 'expert'],
      [500, 'expert'],
    ];
    for (const [level, difficulty] of tiers) {
      expect(journeyLevel(level).difficulty, `level ${level}`).toBe(difficulty);
    }
  });

  it('rejects levels below 1 and fractions', () => {
    expect(() => journeyLevel(0)).toThrow(/start at 1/);
    expect(() => journeyLevel(-4)).toThrow(/start at 1/);
    expect(() => journeyLevel(2.5)).toThrow(/start at 1/);
  });

  it('produces a playable puzzle for the first hundred levels', () => {
    for (let level = 1; level <= 100; level += 1) {
      const puzzle = generatePuzzle(journeyLevel(level));
      expect(puzzle.blanks.length, `level ${level}`).toBeGreaterThan(0);
      expect(puzzle.tiles.length).toBe(puzzle.blanks.length);
    }
  });
});

describe('dailyPuzzle', () => {
  it('names its seed after the date', () => {
    expect(dailyPuzzle('2026-09-28').seed).toBe('daily-2026-09-28');
  });

  it('maps weekdays to difficulties', () => {
    // 2026-09-28 is a Monday, so this covers one full week.
    const week: ReadonlyArray<readonly [string, string]> = [
      ['2026-09-28', 'easy'], // Monday
      ['2026-09-29', 'easy'], // Tuesday
      ['2026-09-30', 'medium'], // Wednesday
      ['2026-10-01', 'medium'], // Thursday
      ['2026-10-02', 'hard'], // Friday
      ['2026-10-03', 'hard'], // Saturday
      ['2026-10-04', 'expert'], // Sunday
    ];
    for (const [date, difficulty] of week) {
      expect(dailyPuzzle(date).difficulty, date).toBe(difficulty);
    }
  });

  it('rejects malformed and impossible dates', () => {
    expect(() => dailyPuzzle('2026-9-28')).toThrow(/YYYY-MM-DD/);
    expect(() => dailyPuzzle('28-09-2026')).toThrow(/YYYY-MM-DD/);
    expect(() => dailyPuzzle('')).toThrow(/YYYY-MM-DD/);
    expect(() => dailyPuzzle('2026-02-30')).toThrow(/real calendar date/);
    expect(() => dailyPuzzle('2026-13-01')).toThrow(/real calendar date/);
  });

  it('generates a playable puzzle for a full month', () => {
    for (let day = 1; day <= 31; day += 1) {
      const date = `2026-01-${String(day).padStart(2, '0')}`;
      const puzzle = generatePuzzle(dailyPuzzle(date));
      expect(puzzle.seed, date).toBe(`daily-${date}`);
      expect(puzzle.blanks.length).toBeGreaterThan(0);
    }
  });
});
