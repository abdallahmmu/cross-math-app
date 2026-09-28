/**
 * Print a puzzle to the terminal, to eyeball what the generator produces.
 *
 *   node scripts/print-puzzle.mjs --journey 12
 *   node scripts/print-puzzle.mjs --daily 2026-09-28
 *   node scripts/print-puzzle.mjs --difficulty expert --seed anything
 *   node scripts/print-puzzle.mjs --difficulty hard --count 3 --solved
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../dist/index.js', import.meta.url));
if (!existsSync(entry)) {
  console.error('dist/index.js is missing - run `npm run build` first.');
  process.exit(1);
}
const { generatePuzzle, buildGrid, journeyLevel, dailyPuzzle } = await import(entry);

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? (args[index + 1] ?? true) : undefined;
};

const count = Number(flag('count') ?? 1);
const solved = args.includes('--solved');

function requestFor(index) {
  const journey = flag('journey');
  if (journey !== undefined) return journeyLevel(Number(journey) + index);

  const daily = flag('daily');
  if (daily !== undefined) return dailyPuzzle(String(daily));

  const difficulty = String(flag('difficulty') ?? 'medium');
  const seed = flag('seed');
  return { seed: seed === undefined ? `print-${difficulty}-${index}` : `${seed}${index || ''}`, difficulty };
}

/** Widest number decides the column width, so columns stay aligned. */
function render(puzzle, width) {
  const pad = (text) => text.padStart(width, ' ');
  return buildGrid(puzzle)
    .map((row) =>
      row
        .map((cell) => {
          switch (cell.kind) {
            case 'empty':
              return pad('');
            case 'op':
              return pad(cell.operator);
            case 'equals':
              return pad('=');
            case 'number':
              return pad(cell.blank && !solved ? '_' : String(puzzle.solution[cell.key]));
          }
        })
        .join(' '),
    )
    .join('\n');
}

for (let index = 0; index < count; index += 1) {
  const request = requestFor(index);
  const started = process.hrtime.bigint();
  const puzzle = generatePuzzle(request);
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  const width = Math.max(...Object.values(puzzle.solution)).toString().length;

  console.log(
    `\n${puzzle.id}  seed "${puzzle.seed}"  ${puzzle.difficulty}  ` +
      `${puzzle.rows}x${puzzle.cols}  ${puzzle.equations.length} equations  ` +
      `${puzzle.blanks.length} blanks  ${ms.toFixed(2)} ms`,
  );
  console.log(`tiles: ${puzzle.tiles.join(' ')}\n`);
  console.log(render(puzzle, width));
}
console.log('');
