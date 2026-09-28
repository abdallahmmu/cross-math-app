import type { Difficulty, PuzzleRequest } from './types.js';

function journeyDifficulty(level: number): Difficulty {
  if (level <= 10) return 'easy';
  if (level <= 30) return 'medium';
  if (level <= 60) return 'hard';
  return 'expert';
}

/** The puzzle behind journey level `level` (1-based). */
export function journeyLevel(level: number): PuzzleRequest {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Journey levels start at 1, got ${level}`);
  }
  return { seed: `journey-${level}`, difficulty: journeyDifficulty(level) };
}

/** Mon/Tue easy, Wed/Thu medium, Fri/Sat hard, Sun expert. */
function dailyDifficulty(utcWeekday: number): Difficulty {
  switch (utcWeekday) {
    case 0:
      return 'expert';
    case 1:
    case 2:
      return 'easy';
    case 3:
    case 4:
      return 'medium';
    case 5:
    case 6:
      return 'hard';
    default:
      throw new Error(`Not a weekday index: ${utcWeekday}`);
  }
}

/**
 * The puzzle for one calendar day, keyed by its `YYYY-MM-DD` date.
 *
 * The weekday is read in UTC so a date string always maps to the same
 * difficulty, whatever the player's time zone.
 */
export function dailyPuzzle(dateISO: string): PuzzleRequest {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (match === null) throw new Error(`Expected a YYYY-MM-DD date, got "${dateISO}"`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Not a real calendar date: "${dateISO}"`);
  }

  return { seed: `daily-${dateISO}`, difficulty: dailyDifficulty(date.getUTCDay()) };
}
