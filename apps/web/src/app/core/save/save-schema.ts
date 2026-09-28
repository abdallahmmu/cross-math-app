import { DEFAULT_THEME, isThemeId, type ThemeId } from '../config/themes';
import { ECONOMY } from '../config/economy';
import { todayISO } from '../time/local-date';

/** Bump this whenever the shape changes, and add a step to `MIGRATIONS`. */
export const SAVE_VERSION = 1;

export interface LevelResult {
  /** Best stars earned on this level, 1-3. */
  readonly stars: number;
  readonly bestTimeMs: number;
  /** Mistakes and hints from the run that set the best stars. */
  readonly mistakes: number;
  readonly hintsUsed: number;
}

export interface DailyRecord {
  readonly stars: number;
  readonly timeMs: number;
}

export interface SaveData {
  readonly version: number;
  readonly coins: number;
  readonly hints: number;
  /** Keyed by journey level number. */
  readonly levels: Readonly<Record<string, LevelResult>>;
  /** Keyed by `YYYY-MM-DD`. */
  readonly daily: Readonly<Record<string, DailyRecord>>;
  readonly streak: number;
  readonly lastDailyDate: string | null;
  readonly ownedThemes: readonly ThemeId[];
  readonly activeTheme: ThemeId;
  /** Free (ad-funded) hints are capped per calendar day. */
  readonly freeHintsDate: string;
  readonly freeHintsUsed: number;
  readonly sound: boolean;
}

export function createSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: ECONOMY.newPlayer.coins,
    hints: ECONOMY.newPlayer.hints,
    levels: {},
    daily: {},
    streak: 0,
    lastDailyDate: null,
    ownedThemes: [DEFAULT_THEME],
    activeTheme: DEFAULT_THEME,
    freeHintsDate: todayISO(),
    freeHintsUsed: 0,
    sound: true,
  };
}

/* Readers -----------------------------------------------------------------
   A save file is untrusted input: it may be from an older version, hand-edited,
   or truncated. Every field is read with a fallback and nothing here throws. */

type Unknowns = Record<string, unknown>;

function isRecord(value: unknown): value is Unknowns {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readInt(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function readBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function readLevels(value: unknown): Record<string, LevelResult> {
  if (!isRecord(value)) return {};
  const levels: Record<string, LevelResult> = {};
  for (const [key, entry] of Object.entries(value)) {
    const level = Number(key);
    if (!Number.isInteger(level) || level < 1 || !isRecord(entry)) continue;
    levels[key] = {
      stars: readInt(entry['stars'], 1, 1, 3),
      bestTimeMs: readInt(entry['bestTimeMs'], 0),
      mistakes: readInt(entry['mistakes'], 0),
      hintsUsed: readInt(entry['hintsUsed'], 0),
    };
  }
  return levels;
}

function readDaily(value: unknown): Record<string, DailyRecord> {
  if (!isRecord(value)) return {};
  const daily: Record<string, DailyRecord> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isRecord(entry)) continue;
    daily[key] = {
      stars: readInt(entry['stars'], 1, 1, 3),
      timeMs: readInt(entry['timeMs'], 0),
    };
  }
  return daily;
}

function readThemes(value: unknown): ThemeId[] {
  const owned = Array.isArray(value) ? value.filter(isThemeId) : [];
  return owned.includes(DEFAULT_THEME) ? owned : [DEFAULT_THEME, ...owned];
}

/**
 * One step per version bump: `MIGRATIONS[n]` upgrades a version-`n` save to
 * version `n + 1`. Adding a field usually means adding its default here.
 */
const MIGRATIONS: Readonly<Record<number, (data: Unknowns) => Unknowns>> = {
  // 1: (data) => ({ ...data, someNewField: false }),
};

/** Turn whatever was in storage into a usable save. Never throws. */
export function migrate(raw: unknown): SaveData {
  let data: Unknowns = isRecord(raw) ? { ...raw } : {};
  let version = readInt(data['version'], 0);

  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (step === undefined) break;
    data = step(data);
    version += 1;
  }

  const defaults = createSave();
  const activeTheme = data['activeTheme'];
  const ownedThemes = readThemes(data['ownedThemes']);
  const lastDailyDate = data['lastDailyDate'];

  return {
    version: SAVE_VERSION,
    coins: readInt(data['coins'], defaults.coins),
    hints: readInt(data['hints'], defaults.hints),
    levels: readLevels(data['levels']),
    daily: readDaily(data['daily']),
    streak: readInt(data['streak'], 0),
    lastDailyDate: typeof lastDailyDate === 'string' ? readDate(lastDailyDate, '') || null : null,
    ownedThemes,
    activeTheme:
      isThemeId(activeTheme) && ownedThemes.includes(activeTheme) ? activeTheme : DEFAULT_THEME,
    freeHintsDate: readDate(data['freeHintsDate'], defaults.freeHintsDate),
    freeHintsUsed: readInt(data['freeHintsUsed'], 0),
    sound: readBool(data['sound'], true),
  };
}
