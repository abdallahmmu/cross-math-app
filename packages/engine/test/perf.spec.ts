import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CONFIG, generatePuzzle, type Difficulty } from '../src/index.js';

const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];
const RUNS = 100;

interface Timing {
  readonly average: number;
  readonly p95: number;
  readonly worst: number;
}

function measure(difficulty: Difficulty): Timing {
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const started = Date.now();
    generatePuzzle({ seed: `perf-${difficulty}-${i}`, difficulty });
    samples.push(Date.now() - started);
  }
  samples.sort((a, b) => a - b);
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    average: total / samples.length,
    p95: samples[Math.floor(samples.length * 0.95)] ?? 0,
    worst: samples[samples.length - 1] ?? 0,
  };
}

describe('generation performance', () => {
  it(`generates ${RUNS} puzzles per difficulty well under the budget`, () => {
    const report: string[] = [];
    const timings = new Map<Difficulty, Timing>();

    for (const difficulty of DIFFICULTIES) {
      const timing = measure(difficulty);
      timings.set(difficulty, timing);
      report.push(
        `${difficulty.padEnd(7)} avg ${timing.average.toFixed(2)} ms  ` +
          `p95 ${timing.p95} ms  worst ${timing.worst} ms`,
      );
    }

    console.log(`\ngeneration timings over ${RUNS} puzzles each:\n${report.join('\n')}\n`);

    // The budget that matters: the hardest difficulty has to stay snappy,
    // because the web app generates on the main thread.
    expect(timings.get('expert')?.average ?? Infinity).toBeLessThan(50);
    for (const difficulty of DIFFICULTIES) {
      expect(timings.get(difficulty)?.average ?? Infinity, difficulty).toBeLessThan(50);
    }
  });
});
