import { buildCandidates, type FixedTriple } from './candidates.js';
import { GENERATION, type DifficultySpec } from './config.js';
import { slotNumberCells, type Slot } from './layout.js';
import type { Rng } from './rng.js';
import type { CellKey, Operator } from './types.js';

export interface FilledLayout {
  /** The operator chosen for each slot, indexed by slot id. */
  readonly ops: readonly Operator[];
  readonly values: ReadonlyMap<CellKey, number>;
}

/**
 * Choose an operator and three values for every slot, by backtracking over the
 * slots in placement order. Because each slot after the first was attached
 * through a cell of an earlier one, most slots arrive with at least one value
 * already fixed by a crossing, which keeps the candidate lists short.
 *
 * Returns `null` when the search budget runs out, so the caller can retry with
 * an advanced RNG state.
 */
export function fillValues(
  rng: Rng,
  slots: readonly Slot[],
  spec: DifficultySpec,
): FilledLayout | null {
  const values = new Map<CellKey, number>();
  const ops: Operator[] = [];
  let nodes = 0;

  const solve = (index: number): boolean => {
    if (index === slots.length) return true;
    const slot = slots[index];
    if (slot === undefined) throw new Error(`No slot at index ${index}`);

    const [keyA, keyB, keyR] = slotNumberCells(slot);
    const fixed: FixedTriple = [
      values.get(keyA) ?? null,
      values.get(keyB) ?? null,
      values.get(keyR) ?? null,
    ];

    for (const candidate of buildCandidates(rng, spec, fixed)) {
      nodes += 1;
      if (nodes > GENERATION.fillNodeBudget) return false;

      const written: CellKey[] = [];
      if (fixed[0] === null) {
        values.set(keyA, candidate.a);
        written.push(keyA);
      }
      if (fixed[1] === null) {
        values.set(keyB, candidate.b);
        written.push(keyB);
      }
      if (fixed[2] === null) {
        values.set(keyR, candidate.r);
        written.push(keyR);
      }
      ops[index] = candidate.op;

      if (solve(index + 1)) return true;

      for (const key of written) values.delete(key);
    }
    return false;
  };

  return solve(0) ? { ops, values } : null;
}
