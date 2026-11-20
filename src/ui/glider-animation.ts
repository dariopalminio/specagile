/**
 * SpecAgile: the welcome animation is a glider from John Horton Conway's Game
 * of Life, in place of OpenSpec's logo (`ascii-patterns.ts`, left as upstream
 * wrote it and no longer imported). See "Welcome screen" in FORK.md.
 *
 * The frames are not drawn by hand: they are the generations of a glider under
 * Life's rules (B3/S23) on a toroidal field, so the glider crosses the field
 * diagonally and comes back in through the opposite corner. Cells that died in
 * the last generation are drawn dim, as a trail.
 */

/** The characters a frame is drawn with: two per cell, so cells look square. */
export interface GliderChars {
  full: string;
  dim: string;
  empty: string;
}

export interface WelcomeAnimation {
  /** Milliseconds between frames. */
  interval: number;
  /** One frame per generation, each a list of lines of the same width. */
  frames: string[][];
  /** The glider at rest, without a trail, for the screen that does not animate. */
  staticFrame: string[];
}

/** The field the glider moves on. */
export const ROWS = 10;
export const COLS = 10;

const INTERVAL = 150;

/** The glider in its classic phase, as `[row, column]`: `.X. / ..X / XXX`. */
export const GLIDER: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
];

/** Where the glider starts, near the middle of the field. */
const GLIDER_START: readonly [number, number] = [3, 3];

/**
 * A glider moves one cell down and one to the right every four generations, so
 * on a square torus it is back where it started after `4 × side` generations.
 */
const GENERATIONS = 4 * ROWS;

// Same detection as upstream's `ascii-patterns.ts`.
const supportsUnicode =
  process.platform !== 'win32' ||
  !!process.env.WT_SESSION || // Windows Terminal
  !!process.env.TERM_PROGRAM; // Modern terminal

const CHARS: GliderChars = supportsUnicode
  ? { full: '██', dim: '░░', empty: '  ' }
  : { full: '##', dim: '..', empty: '  ' };

/** A cell's index in a field `cols` wide. */
export function cellIndex(row: number, col: number, cols: number): number {
  return row * cols + col;
}

/**
 * One generation of Life (B3/S23) on a torus of `rows × cols`: a live cell
 * with two or three live neighbours survives, a dead cell with exactly three
 * is born, and every other cell is dead. Edges wrap around.
 */
export function nextGeneration(alive: ReadonlySet<number>, rows: number, cols: number): Set<number> {
  const neighbours = new Map<number, number>();
  for (const cell of alive) {
    const row = Math.floor(cell / cols);
    const col = cell % cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const neighbour = cellIndex((row + dr + rows) % rows, (col + dc + cols) % cols, cols);
        neighbours.set(neighbour, (neighbours.get(neighbour) ?? 0) + 1);
      }
    }
  }

  const next = new Set<number>();
  for (const [cell, count] of neighbours) {
    if (count === 3 || (count === 2 && alive.has(cell))) next.add(cell);
  }
  return next;
}

function render(
  alive: ReadonlySet<number>,
  previous: ReadonlySet<number>,
  chars: GliderChars
): string[] {
  const lines: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    let line = '';
    for (let col = 0; col < COLS; col++) {
      const cell = cellIndex(row, col, COLS);
      line += alive.has(cell) ? chars.full : previous.has(cell) ? chars.dim : chars.empty;
    }
    lines.push(line);
  }
  return lines;
}

/** The glider's generations, from the starting one, for one full lap of the field. */
export function gliderGenerations(): Set<number>[] {
  const [startRow, startCol] = GLIDER_START;
  let alive = new Set(GLIDER.map(([row, col]) => cellIndex(startRow + row, startCol + col, COLS)));
  const generations: Set<number>[] = [];
  for (let generation = 0; generation < GENERATIONS; generation++) {
    generations.push(alive);
    alive = nextGeneration(alive, ROWS, COLS);
  }
  return generations;
}

/** The welcome animation drawn with `chars`. */
export function buildWelcomeAnimation(chars: GliderChars): WelcomeAnimation {
  const generations = gliderGenerations();
  const frames = generations.map((alive, generation) =>
    // The generation before the first is the last: the loop has no seam.
    render(alive, generations[(generation - 1 + generations.length) % generations.length], chars)
  );
  return {
    interval: INTERVAL,
    frames,
    staticFrame: render(generations[0], new Set(), chars),
  };
}

export const WELCOME_ANIMATION: WelcomeAnimation = buildWelcomeAnimation(CHARS);
