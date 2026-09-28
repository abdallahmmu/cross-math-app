/**
 * Dates are handled as `YYYY-MM-DD` strings in the player's own time zone: the
 * daily puzzle should roll over at the player's midnight, not UTC's.
 *
 * The engine reads the weekday of that string in UTC, which keeps a given date
 * on the same difficulty everywhere.
 */

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

function parseISODate(dateISO: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (match === null) throw new Error(`Expected a YYYY-MM-DD date, got "${dateISO}"`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addDays(dateISO: string, days: number): string {
  const date = parseISODate(dateISO);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function daysBetween(fromISO: string, toISOValue: string): number {
  const from = parseISODate(fromISO).getTime();
  const to = parseISODate(toISOValue).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** The `count` days ending on `dateISO`, oldest first. */
export function recentDays(dateISO: string, count: number): string[] {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) days.push(addDays(dateISO, -offset));
  return days;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Single letter for the day-of-week strip. */
export function weekdayInitial(dateISO: string): string {
  return WEEKDAY_INITIALS[parseISODate(dateISO).getDay()] ?? '?';
}

export function dayOfMonth(dateISO: string): number {
  return parseISODate(dateISO).getDate();
}

/** `m:ss`, or `h:mm:ss` once a run goes past an hour. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function formatLongDate(dateISO: string): string {
  const date = parseISODate(dateISO);
  return `${MONTHS[date.getMonth()] ?? ''} ${date.getDate()}, ${date.getFullYear()}`;
}
