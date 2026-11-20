import { describe, expect, it } from 'vitest';
import {
  COLS,
  GLIDER,
  ROWS,
  WELCOME_ANIMATION,
  buildWelcomeAnimation,
  cellIndex,
  gliderGenerations,
  nextGeneration,
} from '../../src/ui/glider-animation.js';

// Characters that tell the three kinds of cell apart when reading a frame back.
const TEST_CHARS = { full: '##', dim: '++', empty: '..' };

const cells = (points: ReadonlyArray<readonly [number, number]>, cols = COLS) =>
  new Set(points.map(([row, col]) => cellIndex(row, col, cols)));

const sorted = (set: ReadonlySet<number>) => [...set].sort((a, b) => a - b);

/** Reads a frame drawn with TEST_CHARS back into its live and dim cells. */
function readFrame(frame: string[]): { full: Set<number>; dim: Set<number> } {
  const full = new Set<number>();
  const dim = new Set<number>();
  frame.forEach((line, row) => {
    for (let col = 0; col < line.length / 2; col++) {
      const cell = line.slice(col * 2, col * 2 + 2);
      if (cell === TEST_CHARS.full) full.add(cellIndex(row, col, COLS));
      else if (cell === TEST_CHARS.dim) dim.add(cellIndex(row, col, COLS));
      else expect(cell).toBe(TEST_CHARS.empty);
    }
  });
  return { full, dim };
}

describe('nextGeneration', () => {
  it('makes a blinker oscillate with period 2', () => {
    const horizontal = cells([[2, 1], [2, 2], [2, 3]], 5);
    const vertical = cells([[1, 2], [2, 2], [3, 2]], 5);

    expect(sorted(nextGeneration(horizontal, 5, 5))).toEqual(sorted(vertical));
    expect(sorted(nextGeneration(vertical, 5, 5))).toEqual(sorted(horizontal));
  });

  it('leaves a block as it is', () => {
    const block = cells([[1, 1], [1, 2], [2, 1], [2, 2]], 5);

    expect(sorted(nextGeneration(block, 5, 5))).toEqual(sorted(block));
  });

  it('moves a glider one cell down and one to the right every four generations', () => {
    let alive = cells(GLIDER);
    for (let i = 0; i < 4; i++) alive = nextGeneration(alive, ROWS, COLS);

    expect(sorted(alive)).toEqual(sorted(cells(GLIDER.map(([row, col]) => [row + 1, col + 1]))));
  });

  it('wraps a glider at the bottom-right corner around to the top-left', () => {
    // The glider's last row and column sit on the field's last row and column.
    let alive = cells(GLIDER.map(([row, col]) => [row + ROWS - 3, col + COLS - 3]));
    for (let i = 0; i < 4; i++) alive = nextGeneration(alive, ROWS, COLS);

    const wrapped = GLIDER.map(([row, col]) => [(row + ROWS - 2) % ROWS, (col + COLS - 2) % COLS] as const);
    expect(sorted(alive)).toEqual(sorted(cells(wrapped)));
    expect(alive.has(cellIndex(0, 0, COLS))).toBe(true);
  });
});

describe('welcome animation', () => {
  const animation = buildWelcomeAnimation(TEST_CHARS);
  const generations = gliderGenerations();

  it('has one frame per generation of a full lap of the field', () => {
    expect(animation.frames).toHaveLength(4 * ROWS);
    // A full lap brings the glider back to where it started.
    const afterLap = nextGeneration(generations[generations.length - 1], ROWS, COLS);
    expect(sorted(afterLap)).toEqual(sorted(generations[0]));
  });

  it('draws every frame with the same size, inside the art column', () => {
    for (const frame of [...animation.frames, animation.staticFrame]) {
      expect(frame).toHaveLength(ROWS);
      for (const line of frame) {
        expect(line).toHaveLength(COLS * 2);
      }
    }
    // welcome-screen.ts pads the art to ART_COLUMN_WIDTH (24).
    expect(COLS * 2).toBeLessThanOrEqual(24);
  });

  it('draws the five live cells of each generation and, dim, the ones that just died', () => {
    animation.frames.forEach((frame, generation) => {
      const { full, dim } = readFrame(frame);
      const previous = generations[(generation - 1 + generations.length) % generations.length];

      expect(full.size).toBe(5);
      expect(sorted(full)).toEqual(sorted(generations[generation]));
      expect(sorted(dim)).toEqual(sorted(new Set([...previous].filter((cell) => !full.has(cell)))));
    });
  });

  it('shows the glider in its classic phase, without a trail, when it does not animate', () => {
    const { full, dim } = readFrame(animation.staticFrame);

    expect(dim.size).toBe(0);
    const rows = [...full].map((cell) => Math.floor(cell / COLS));
    const cols = [...full].map((cell) => cell % COLS);
    const top = Math.min(...rows);
    const left = Math.min(...cols);
    expect(sorted(full)).toEqual(sorted(cells(GLIDER.map(([row, col]) => [row + top, col + left]))));
  });

  it('draws the animation used on screen with the same frames', () => {
    expect(WELCOME_ANIMATION.frames).toHaveLength(animation.frames.length);
    expect(WELCOME_ANIMATION.interval).toBe(animation.interval);
  });
});
