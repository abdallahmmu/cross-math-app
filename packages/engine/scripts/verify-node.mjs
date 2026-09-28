/**
 * Proves the built package runs under plain Node with no bundler, which is how
 * the backend will reuse it to re-generate and validate puzzles.
 *
 * Run with: npm run verify:node --workspace @sumday/engine
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../dist/index.js', import.meta.url));
if (!existsSync(entry)) {
  console.error('dist/index.js is missing - run `npm run build` first.');
  process.exit(1);
}

const { generatePuzzle, buildGrid, countSolutions, validateSolution, journeyLevel, dailyPuzzle } =
  await import(entry);

let failures = 0;
const check = (label, condition) => {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}`);
  }
};

for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
  const puzzle = generatePuzzle({ seed: `node-${difficulty}`, difficulty });
  const answers = Object.fromEntries(puzzle.blanks.map((key) => [key, puzzle.solution[key]]));

  check(`${difficulty}: unique solution`, countSolutions(puzzle, 2) === 1);
  check(`${difficulty}: solution validates`, validateSolution(puzzle, answers).valid === true);
  check(`${difficulty}: grid matches the declared size`, buildGrid(puzzle).length === puzzle.rows);
  check(`${difficulty}: json round trip`, JSON.stringify(JSON.parse(JSON.stringify(puzzle))) === JSON.stringify(puzzle));

  console.log(
    `  ${difficulty.padEnd(7)} ${puzzle.id.padEnd(14)} ${puzzle.rows}x${puzzle.cols}  ` +
      `${puzzle.equations.length} equations  ${puzzle.blanks.length} blanks`,
  );
}

check('journeyLevel(1) is easy', journeyLevel(1).difficulty === 'easy');
check('dailyPuzzle maps Sunday to expert', dailyPuzzle('2026-10-04').difficulty === 'expert');

if (failures > 0) {
  console.error(`\n${failures} check(s) failed in Node.`);
  process.exit(1);
}
console.log('\nengine runs correctly under plain Node.');
