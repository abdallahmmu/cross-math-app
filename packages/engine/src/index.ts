/**
 * Sumday puzzle engine.
 *
 * Pure TypeScript, no dependencies, no platform APIs: the same package runs in
 * the browser and in Node, so the server can regenerate any puzzle from its
 * seed to validate a submitted answer.
 */

export type {
  Answers,
  CellKey,
  CellKind,
  Difficulty,
  Direction,
  Equation,
  GridCell,
  Hint,
  Operator,
  Puzzle,
  PuzzleRequest,
  ValidationResult,
} from './types.js';

export { DIFFICULTY_CONFIG, GENERATION, type DifficultySpec } from './config.js';
export { cellKey, compareCellKeys, parseCellKey, sortCellKeys, type CellPosition } from './cell-key.js';
export { createRng, hashString, mulberry32, type Rng } from './rng.js';
export { generatePuzzle } from './generate.js';
export { buildGrid } from './grid.js';
export { countSolutions } from './solver.js';
export { getHint, isCorrectPlacement, validateSolution } from './validate.js';
export { dailyPuzzle, journeyLevel } from './schedule.js';
export { equationsByCell, numberCellsOf, solutionValue } from './puzzle-index.js';
export { applyOperator, isValidEquation, solveLeft, solveRight } from './candidates.js';
export { EQUATION_LENGTH, NUMBER_OFFSETS } from './layout.js';
