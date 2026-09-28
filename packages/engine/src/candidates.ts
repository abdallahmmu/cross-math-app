import { GENERATION, type DifficultySpec, type OperatorWeights } from './config.js';
import type { Rng } from './rng.js';
import type { Operator } from './types.js';

/** One concrete equation: `a op b = r`. */
export interface Candidate {
  readonly op: Operator;
  readonly a: number;
  readonly b: number;
  readonly r: number;
}

/** The three number cells of an equation; `null` marks one that is still free. */
export type FixedTriple = readonly [number | null, number | null, number | null];

/** `a op b`, or `null` when the operation is not a whole number. */
export function applyOperator(op: Operator, a: number, b: number): number | null {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

/** The left operand, given the right one and the result. */
export function solveLeft(op: Operator, b: number, r: number): number | null {
  switch (op) {
    case '+':
      return r - b;
    case '−':
      return r + b;
    case '×':
      return b !== 0 && r % b === 0 ? r / b : null;
    case '÷':
      return b * r;
  }
}

/** The right operand, given the left one and the result. */
export function solveRight(op: Operator, a: number, r: number): number | null {
  switch (op) {
    case '+':
      return r - a;
    case '−':
      return a - r;
    case '×':
      return a !== 0 && r % a === 0 ? r / a : null;
    case '÷':
      return r !== 0 && a % r === 0 ? a / r : null;
  }
}

function inRange(value: number, spec: DifficultySpec): boolean {
  return Number.isInteger(value) && value >= 1 && value <= spec.maxValue;
}

function isFactor(value: number, spec: DifficultySpec): boolean {
  return Number.isInteger(value) && value >= 2 && value <= spec.maxFactor;
}

/**
 * Whether `a op b = r` is a legal equation for this difficulty: whole numbers
 * from 1 to `maxValue`, no negatives, exact division, and factors of `×` and `÷`
 * kept between 2 and `maxFactor`.
 */
export function isValidEquation(
  op: Operator,
  a: number,
  b: number,
  r: number,
  spec: DifficultySpec,
): boolean {
  if (!inRange(a, spec) || !inRange(b, spec) || !inRange(r, spec)) return false;
  switch (op) {
    case '+':
      return a + b === r;
    case '−':
      return a - b === r;
    case '×':
      return isFactor(a, spec) && isFactor(b, spec) && a * b === r;
    case '÷':
      return isFactor(b, spec) && isFactor(r, spec) && b * r === a;
  }
}

interface Bounds {
  readonly min: number;
  readonly max: number;
}

/** Domain of the left operand. `÷` puts its dividend here, so it spans the full range. */
function leftBounds(op: Operator, spec: DifficultySpec): Bounds {
  return op === '×' ? { min: 2, max: spec.maxFactor } : { min: 1, max: spec.maxValue };
}

/** Domain of the right operand: a factor for `×`, the divisor for `÷`. */
function rightBounds(op: Operator, spec: DifficultySpec): Bounds {
  return op === '×' || op === '÷' ? { min: 2, max: spec.maxFactor } : { min: 1, max: spec.maxValue };
}

/**
 * Every legal equation for one operator that agrees with the already-fixed
 * cells. The number of fixed cells decides the work: two or three fixed cells
 * determine the equation outright, one fixed cell costs a single loop, and the
 * double loop is only ever reached by the first equation of a puzzle.
 */
function enumerateOperator(op: Operator, spec: DifficultySpec, fixed: FixedTriple): Candidate[] {
  const [fa, fb, fr] = fixed;
  const out: Candidate[] = [];
  const add = (a: number, b: number, r: number): void => {
    if (isValidEquation(op, a, b, r, spec)) out.push({ op, a, b, r });
  };

  if (fa !== null && fb !== null) {
    const r = applyOperator(op, fa, fb);
    if (r !== null && (fr === null || fr === r)) add(fa, fb, r);
    return out;
  }
  if (fa !== null && fr !== null) {
    const b = solveRight(op, fa, fr);
    if (b !== null) add(fa, b, fr);
    return out;
  }
  if (fb !== null && fr !== null) {
    const a = solveLeft(op, fb, fr);
    if (a !== null) add(a, fb, fr);
    return out;
  }

  const left = leftBounds(op, spec);
  const right = rightBounds(op, spec);

  if (fa !== null) {
    for (let b = right.min; b <= right.max; b += 1) {
      const r = applyOperator(op, fa, b);
      if (r !== null) add(fa, b, r);
    }
    return out;
  }
  if (fb !== null) {
    for (let a = left.min; a <= left.max; a += 1) {
      const r = applyOperator(op, a, fb);
      if (r !== null) add(a, fb, r);
    }
    return out;
  }
  if (fr !== null) {
    for (let b = right.min; b <= right.max; b += 1) {
      const a = solveLeft(op, b, fr);
      if (a !== null) add(a, b, fr);
    }
    return out;
  }

  for (let a = left.min; a <= left.max; a += 1) {
    for (let b = right.min; b <= right.max; b += 1) {
      const r = applyOperator(op, a, b);
      if (r !== null) add(a, b, r);
    }
  }
  return out;
}

/** Operators in the order they should be tried, drawn by weight. */
function weightedOrder(rng: Rng, operators: readonly Operator[], weights: OperatorWeights): Operator[] {
  const pool = [...operators];
  const order: Operator[] = [];
  while (pool.length > 0) {
    const total = pool.reduce((sum, op) => sum + (weights[op] ?? 1), 0);
    let roll = rng.next() * total;
    let index = pool.length - 1;
    for (const [i, op] of pool.entries()) {
      roll -= weights[op] ?? 1;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    const picked = pool.splice(index, 1)[0];
    if (picked !== undefined) order.push(picked);
  }
  return order;
}

/**
 * The candidate equations to try for one cell, in order.
 *
 * Each operator is enumerated, shuffled and capped on its own, then the lists
 * are concatenated in a weighted-random operator order. Operators with nothing
 * to offer here drop out before the draw, so the weights only decide between
 * operators that genuinely fit - which is what keeps `×` and `÷` present in the
 * harder tiers without ever forcing an impossible equation.
 */
export function buildCandidates(rng: Rng, spec: DifficultySpec, fixed: FixedTriple): Candidate[] {
  const byOperator = new Map<Operator, Candidate[]>();
  for (const op of spec.operators) {
    const list = rng.shuffle(enumerateOperator(op, spec, fixed)).slice(0, GENERATION.candidateCapPerOp);
    if (list.length > 0) byOperator.set(op, list);
  }

  const candidates: Candidate[] = [];
  for (const op of weightedOrder(rng, [...byOperator.keys()], spec.operatorWeights)) {
    candidates.push(...(byOperator.get(op) ?? []));
  }
  return candidates;
}
