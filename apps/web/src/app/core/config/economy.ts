import type { Difficulty } from '@sumday/engine';

/**
 * Every number the economy runs on. Nothing else in the app hard-codes a price,
 * a reward or a cap - tuning the game means editing this file.
 */
export const ECONOMY = {
  /** What a brand new player starts with. */
  newPlayer: {
    coins: 100,
    hints: 3,
  },

  journey: {
    /** How many journey levels the map shows. */
    levelCount: 100,
    /** Coins for clearing a level the first time. */
    firstClear: {
      easy: 10,
      medium: 15,
      hard: 20,
      expert: 30,
    } satisfies Record<Difficulty, number>,
    /** Extra coins per star above the first. */
    coinsPerExtraStar: 5,
    /** Coins for replaying a level that was already cleared. */
    replay: 2,
  },

  daily: {
    base: 25,
    coinsPerStreakDay: 5,
    /** Cap on the streak part of the reward. */
    streakBonusCap: 50,
    /** Days shown in the strip on the Daily page. */
    stripDays: 7,
  },

  /** 3 stars: clean run. 2 stars: a couple of mistakes or a single hint. */
  stars: {
    twoStarMaxMistakes: 2,
    twoStarMaxHints: 1,
  },

  shop: {
    hintPacks: [
      { id: 'hints-1', hints: 1, coins: 40 },
      { id: 'hints-5', hints: 5, coins: 150 },
    ],
  },

  /** Rewarded ads: a free hint, a few times a day. */
  rewardedAd: {
    hintsPerWatch: 1,
    maxPerDay: 3,
    /** How long the placeholder "ad" runs. */
    durationMs: 2000,
  },
} as const;

export type HintPack = (typeof ECONOMY.shop.hintPacks)[number];

/** 3 = no mistakes and no hints, 2 = up to 2 mistakes or 1 hint, 1 = otherwise. */
export function starsFor(mistakes: number, hintsUsed: number): number {
  if (mistakes === 0 && hintsUsed === 0) return 3;
  if (mistakes <= ECONOMY.stars.twoStarMaxMistakes && hintsUsed <= ECONOMY.stars.twoStarMaxHints) {
    return 2;
  }
  return 1;
}

export function journeyCoins(difficulty: Difficulty, stars: number, firstClear: boolean): number {
  if (!firstClear) return ECONOMY.journey.replay;
  const base = ECONOMY.journey.firstClear[difficulty];
  return base + Math.max(0, stars - 1) * ECONOMY.journey.coinsPerExtraStar;
}

export function dailyCoins(streak: number): number {
  const bonus = Math.min(ECONOMY.daily.streakBonusCap, streak * ECONOMY.daily.coinsPerStreakDay);
  return ECONOMY.daily.base + bonus;
}
