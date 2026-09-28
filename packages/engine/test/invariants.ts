import {
  buildGrid,
  cellKey,
  compareCellKeys,
  countSolutions,
  DIFFICULTY_CONFIG,
  EQUATION_LENGTH,
  GENERATION,
  isValidEquation,
  numberCellsOf,
  type CellKey,
  type Direction,
  type Puzzle,
} from '../src/index.js';

interface NumberOwners {
  h?: number;
  v?: number;
}

function delta(dir: Direction): { dRow: number; dCol: number } {
  return dir === 'h' ? { dRow: 0, dCol: 1 } : { dRow: 1, dCol: 0 };
}

/**
 * Every rule a generated puzzle has to obey, reported as a list of readable
 * problems so a failing sweep names the seed and the broken rule.
 */
export function collectProblems(puzzle: Puzzle): string[] {
  const spec = DIFFICULTY_CONFIG[puzzle.difficulty];
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(`[${puzzle.seed}] ${message}`);
  };

  const numbers = new Map<CellKey, NumberOwners>();
  const symbols = new Map<CellKey, number>();
  let minRow = Number.POSITIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  if (puzzle.equations.length < spec.minEquations || puzzle.equations.length > spec.maxEquations) {
    fail(
      `has ${puzzle.equations.length} equations, expected ` +
        `${spec.minEquations}-${spec.maxEquations}`,
    );
  }

  for (const equation of puzzle.equations) {
    const { dRow, dCol } = delta(equation.dir);
    const at = (offset: number): CellKey =>
      cellKey(equation.row + dRow * offset, equation.col + dCol * offset);

    if (equation.row % 2 !== 0 || equation.col % 2 !== 0) {
      fail(`equation ${equation.id} starts off the parity lattice at ${equation.row},${equation.col}`);
    }
    if (!spec.operators.includes(equation.op)) {
      fail(`equation ${equation.id} uses "${equation.op}", which this difficulty forbids`);
    }
    if (equation.cells.join('|') !== [at(0), at(2), at(4)].join('|')) {
      fail(`equation ${equation.id} lists cells that do not match its position`);
    }
    if (equation.opCell !== at(1) || equation.equalsCell !== at(3)) {
      fail(`equation ${equation.id} has a misplaced operator or equals cell`);
    }

    for (let offset = 0; offset < EQUATION_LENGTH; offset += 1) {
      const key = at(offset);
      const row = equation.row + dRow * offset;
      const col = equation.col + dCol * offset;

      if (row < 0 || col < 0 || row >= puzzle.rows || col >= puzzle.cols) {
        fail(`equation ${equation.id} leaves the ${puzzle.rows}x${puzzle.cols} grid at ${key}`);
      }
      minRow = Math.min(minRow, row);
      minCol = Math.min(minCol, col);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);

      if (offset % 2 === 1) {
        if (numbers.has(key)) fail(`symbol cell ${key} sits on a number cell`);
        const other = symbols.get(key);
        if (other !== undefined) {
          fail(`equations ${other} and ${equation.id} share symbol cell ${key}`);
        }
        symbols.set(key, equation.id);
        continue;
      }

      if (symbols.has(key)) fail(`number cell ${key} sits on a symbol cell`);
      const owners = numbers.get(key) ?? {};
      const existing = owners[equation.dir];
      if (existing !== undefined) {
        fail(`equations ${existing} and ${equation.id} both run ${equation.dir} through ${key}`);
      }
      owners[equation.dir] = equation.id;
      numbers.set(key, owners);
    }

    const [a, b, r] = equation.cells.map((key) => puzzle.solution[key] ?? Number.NaN);
    if (a === undefined || b === undefined || r === undefined) {
      fail(`equation ${equation.id} is missing solution values`);
    } else if (!isValidEquation(equation.op, a, b, r, spec)) {
      fail(`equation ${equation.id} is not valid: ${a} ${equation.op} ${b} = ${r}`);
    }
  }

  // Same-direction equations must not touch: the cells just before and just
  // after an equation stay empty.
  for (const equation of puzzle.equations) {
    const { dRow, dCol } = delta(equation.dir);
    for (const offset of [-1, EQUATION_LENGTH]) {
      const key = cellKey(equation.row + dRow * offset, equation.col + dCol * offset);
      if (numbers.has(key) || symbols.has(key)) {
        fail(`equation ${equation.id} touches another equation at ${key}`);
      }
    }
  }

  if (puzzle.rows > spec.maxGrid || puzzle.cols > spec.maxGrid) {
    fail(`grid is ${puzzle.rows}x${puzzle.cols}, larger than ${spec.maxGrid}x${spec.maxGrid}`);
  }
  if (minRow !== 0 || minCol !== 0) {
    fail(`grid is not normalised to the origin (starts at ${minRow},${minCol})`);
  }
  if (maxRow !== puzzle.rows - 1 || maxCol !== puzzle.cols - 1) {
    fail(`grid declares ${puzzle.rows}x${puzzle.cols} but only fills up to ${maxRow},${maxCol}`);
  }

  const numberCells = numberCellsOf(puzzle);
  if (numberCells.length !== numbers.size) {
    fail(`number cell index disagrees with the layout (${numberCells.length} vs ${numbers.size})`);
  }
  if (Object.keys(puzzle.solution).length !== numbers.size) {
    fail(`solution covers ${Object.keys(puzzle.solution).length} cells, layout has ${numbers.size}`);
  }

  const blankSet = new Set<CellKey>(puzzle.blanks);
  if (blankSet.size !== puzzle.blanks.length) fail('blanks contain a duplicate');
  if ([...puzzle.blanks].sort(compareCellKeys).join('|') !== puzzle.blanks.join('|')) {
    fail('blanks are not in reading order');
  }
  for (const key of puzzle.blanks) {
    if (!numbers.has(key)) fail(`blank ${key} is not a number cell`);
  }

  const blanksPerEquation = new Map<number, number>();
  for (const equation of puzzle.equations) {
    const count = equation.cells.filter((key) => blankSet.has(key)).length;
    blanksPerEquation.set(equation.id, count);
    if (count > spec.maxBlanksPerEquation) {
      fail(`equation ${equation.id} has ${count} blanks, the cap is ${spec.maxBlanksPerEquation}`);
    }
  }

  const expectedTiles = puzzle.blanks
    .map((key) => puzzle.solution[key] ?? Number.NaN)
    .sort((x, y) => x - y);
  if (expectedTiles.join('|') !== [...puzzle.tiles].join('|')) {
    fail(`tiles [${puzzle.tiles.join(',')}] do not match the blank values [${expectedTiles.join(',')}]`);
  }

  const target = Math.max(1, Math.round(numberCells.length * spec.blankRatio));
  const minimum = Math.ceil(target * GENERATION.minBlankFraction);
  if (puzzle.blanks.length < minimum || puzzle.blanks.length > target) {
    fail(`has ${puzzle.blanks.length} blanks, expected ${minimum}-${target}`);
  }

  if (countSolutions(puzzle, 2) !== 1) fail('does not have exactly one solution');

  // The board has to be one connected shape, not separate islands.
  const componentOf = new Map<number, number>();
  for (const equation of puzzle.equations) componentOf.set(equation.id, equation.id);
  const rootOf = (id: number): number => {
    let root = id;
    let parent = componentOf.get(root);
    while (parent !== undefined && parent !== root) {
      root = parent;
      parent = componentOf.get(root);
    }
    return root;
  };
  for (const owners of numbers.values()) {
    if (owners.h === undefined || owners.v === undefined) continue;
    componentOf.set(rootOf(owners.h), rootOf(owners.v));
  }
  const components = new Set([...componentOf.keys()].map(rootOf));
  if (components.size !== 1) fail(`board falls into ${components.size} disconnected pieces`);

  const grid = buildGrid(puzzle);
  if (grid.length !== puzzle.rows) fail(`grid has ${grid.length} rows, expected ${puzzle.rows}`);
  let gridNumbers = 0;
  for (const [row, line] of grid.entries()) {
    if (line.length !== puzzle.cols) fail(`grid row ${row} has ${line.length} cells`);
    for (const cell of line) {
      if (cell.kind === 'number') {
        gridNumbers += 1;
        if (cell.blank !== blankSet.has(cell.key)) fail(`grid cell ${cell.key} has the wrong blank flag`);
        if (cell.given === cell.blank) fail(`grid cell ${cell.key} is both given and blank`);
        if (cell.given && cell.value !== puzzle.solution[cell.key]) {
          fail(`grid cell ${cell.key} shows the wrong value`);
        }
        if (cell.blank && cell.value !== null) fail(`grid cell ${cell.key} leaks its answer`);
      }
      if (cell.kind === 'op' && cell.operator === null) fail(`grid cell ${cell.key} has no operator`);
      if (cell.kind !== 'empty' && cell.equationIds.length === 0) {
        fail(`grid cell ${cell.key} belongs to no equation`);
      }
    }
  }
  if (gridNumbers !== numbers.size) {
    fail(`grid renders ${gridNumbers} number cells, layout has ${numbers.size}`);
  }

  return problems;
}

/** The puzzle's own solution, shaped like player answers. */
export function solvedAnswers(puzzle: Puzzle): Record<CellKey, number> {
  const answers: Record<CellKey, number> = {};
  for (const key of puzzle.blanks) answers[key] = puzzle.solution[key] ?? Number.NaN;
  return answers;
}
