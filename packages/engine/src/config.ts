import type { Difficulty, Operator } from './types.js';

/** Relative chance of an operator being used, among those that fit a cell. */
export type OperatorWeights = Readonly<Partial<Record<Operator, number>>>;

export interface DifficultySpec {
  readonly minEquations: number;
  readonly maxEquations: number;
  readonly operators: readonly Operator[];
  /**
   * `×` and `÷` fit far fewer cells than `+` and `−`, so without a nudge they
   * almost never survive candidate selection and a "hard" puzzle ends up being
   * all addition. Weights are relative; anything unlisted counts as 1.
   */
  readonly operatorWeights: OperatorWeights;
  /** Every number in the puzzle is an integer in `1..maxValue`. */
  readonly maxValue: number;
  /**
   * Bound on the two factors of `×`, and on the divisor and quotient of `÷`.
   * Both are at least 2, so no `×1` or `÷1` ever appears.
   */
  readonly maxFactor: number;
  /** Share of number cells that become blanks. */
  readonly blankRatio: number;
  readonly maxBlanksPerEquation: number;
  /** The grid is at most `maxGrid × maxGrid` cells. */
  readonly maxGrid: number;
}

/**
 * The whole difficulty curve lives here, so tuning the game never means
 * touching generation code.
 *
 * `easy.maxFactor` is unused because easy has no `×` or `÷`; it is kept so the
 * shape stays uniform.
 */
export const DIFFICULTY_CONFIG: Readonly<Record<Difficulty, DifficultySpec>> = {
  easy: {
    minEquations: 3,
    maxEquations: 4,
    operators: ['+', '−'],
    operatorWeights: {},
    maxValue: 20,
    maxFactor: 10,
    blankRatio: 0.35,
    maxBlanksPerEquation: 2,
    maxGrid: 9,
  },
  medium: {
    minEquations: 5,
    maxEquations: 6,
    operators: ['+', '−', '×'],
    operatorWeights: { '×': 2 },
    maxValue: 50,
    maxFactor: 10,
    blankRatio: 0.45,
    maxBlanksPerEquation: 2,
    maxGrid: 11,
  },
  hard: {
    minEquations: 7,
    maxEquations: 8,
    operators: ['+', '−', '×', '÷'],
    operatorWeights: { '×': 3, '÷': 3 },
    maxValue: 99,
    maxFactor: 12,
    blankRatio: 0.55,
    maxBlanksPerEquation: 3,
    maxGrid: 13,
  },
  expert: {
    minEquations: 9,
    maxEquations: 11,
    operators: ['+', '−', '×', '÷'],
    operatorWeights: { '×': 3, '÷': 3 },
    maxValue: 99,
    maxFactor: 12,
    blankRatio: 0.65,
    maxBlanksPerEquation: 3,
    maxGrid: 13,
  },
};

/** Search budgets. Generation stays deterministic: these are hard limits, not timeouts. */
export const GENERATION = {
  /** Full generation attempts before giving up on a seed. */
  maxTries: 64,
  /** Attachment attempts while growing one layout. */
  layoutAttempts: 400,
  /** Candidate equations kept per operator, before shuffling them together. */
  candidateCapPerOp: 16,
  /** Candidates tried across the whole value-filling backtrack. */
  fillNodeBudget: 30_000,
  /** Search nodes per `countSolutions` call. */
  solverNodeLimit: 50_000,
  /**
   * Uniqueness sometimes blocks the last few blanks. A puzzle is accepted once
   * it reaches this share of the target blank count.
   */
  minBlankFraction: 0.6,
} as const;
