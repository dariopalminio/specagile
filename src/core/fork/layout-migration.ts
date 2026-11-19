/**
 * Migration from the former layout (`openspec/` with everything inside) to the
 * layout of layout.ts: `openspec/specs/` to `specs/`, `openspec/changes/` to
 * `changes/` and every other entry of `openspec/` to `specagile/<entry>`.
 *
 * `update` and `init` run it before anything else reads the project. It moves
 * all or nothing: the destinations are checked before the first move, each
 * entry moves with one `rename` recorded in a ledger, and a move that fails
 * undoes the ones before it. This file is the fork's own; see "Project layout"
 * in FORK.md.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { FileView } from '../file-view.js';
import {
  CHANGES_DIR_NAME,
  FORMER_TOOL_DIR_NAME,
  RELATIVE_CHANGES_DIR,
  RELATIVE_SPECS_DIR,
  RELATIVE_TOOL_DIR,
  SPECS_DIR_NAME,
  detectFormerLayout,
  getChangesDir,
  getFormerToolDir,
  getSpecsDir,
  getToolDir,
  isLayoutRoot,
} from './layout.js';

export type LayoutEntryKind = 'missing' | 'directory' | 'file' | 'link' | 'other';

/** What the migration does to the tree: the disk, or a dry run's plan. */
export interface LayoutMigrationOps {
  /** The entry at a path, without following a link there. */
  kind(target: string): LayoutEntryKind;
  list(dir: string): string[];
  mkdir(dir: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Removes an empty directory; fails on one that is not empty. */
  rmdir(dir: string): Promise<void>;
  wait(ms: number): Promise<void>;
  /** Error codes a rename is retried on: Windows reports these while a file is briefly held. */
  retryCodes: readonly string[];
  /** The file under `dir` another process holds, when that can be told. */
  findHeldFile?(dir: string): string | undefined;
}

/** One movement, as the CLI reports it: paths relative to the root, with `/`. */
export interface LayoutMove {
  from: string;
  to: string;
}

export type LayoutMigrationResult =
  /** No former layout here. */
  | { status: 'none' }
  /** The root already has the layout in force; `openspec/` stays untouched. */
  | { status: 'unused'; warning: string }
  | { status: 'migrated'; moves: LayoutMove[]; warning?: string };

export type LayoutMigrationErrorCode = 'destination_occupied' | 'move_failed' | 'undo_failed';

export class LayoutMigrationError extends Error {
  constructor(
    message: string,
    readonly code: LayoutMigrationErrorCode,
    readonly target?: string
  ) {
    super(message);
    this.name = 'LayoutMigrationError';
  }
}

const RETRY_DELAYS_MS = [50, 100, 200, 400];

interface PlannedMove {
  from: string;
  to: string;
  display: LayoutMove;
}

function posix(root: string, target: string, kind: LayoutEntryKind): string {
  const relative = path.relative(root, target).split(path.sep).join('/');
  return kind === 'directory' ? `${relative}/` : relative;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as NodeJS.ErrnoException).code)
    : undefined;
}

async function renameWithRetry(ops: LayoutMigrationOps, from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await ops.rename(from, to);
      return;
    } catch (error) {
      const code = errorCode(error);
      if (attempt >= RETRY_DELAYS_MS.length || !code || !ops.retryCodes.includes(code)) throw error;
      await ops.wait(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/** The movements the migration would make, in order, from reading `openspec/`. */
function planMoves(root: string, ops: LayoutMigrationOps): PlannedMove[] {
  const former = getFormerToolDir(root);
  const names = ops.list(former).sort((a, b) => a.localeCompare(b));
  const destination = (name: string): string =>
    name === SPECS_DIR_NAME
      ? getSpecsDir(root)
      : name === CHANGES_DIR_NAME
        ? getChangesDir(root)
        : path.join(getToolDir(root), name);
  const rank = (name: string): number =>
    name === SPECS_DIR_NAME ? 0 : name === CHANGES_DIR_NAME ? 1 : 2;
  return names
    .sort((a, b) => rank(a) - rank(b))
    .map((name) => {
      const from = path.join(former, name);
      const to = destination(name);
      const kind = ops.kind(from) === 'directory' ? 'directory' : 'file';
      return { from, to, display: { from: posix(root, from, kind), to: posix(root, to, kind) } };
    });
}

/**
 * The destinations that stop the migration: `specs/`, `changes/` and
 * `specagile/` each have to be missing or an empty folder (a `.gitkeep`
 * counts as content, so the rule has no exceptions).
 */
function occupiedDestinations(root: string, ops: LayoutMigrationOps): string[] {
  return [getSpecsDir(root), getChangesDir(root), getToolDir(root)].filter((dir) => {
    const kind = ops.kind(dir);
    if (kind === 'missing') return false;
    if (kind !== 'directory') return true;
    return ops.list(dir).length > 0;
  });
}

function heldFileHint(root: string, ops: LayoutMigrationOps, from: string): string {
  const held = ops.kind(from) === 'directory' ? ops.findHeldFile?.(from) : undefined;
  return held ? ` ${posix(root, held, 'file')} is open in another program.` : '';
}

/**
 * Moves the former layout of `root` into the layout in force. Returns what it
 * did; throws a LayoutMigrationError, with the tree as it was, when a
 * destination is taken or a move fails.
 */
export async function migrateFormerLayout(
  root: string,
  ops: LayoutMigrationOps = DISK_LAYOUT_OPS
): Promise<LayoutMigrationResult> {
  if (!detectFormerLayout(root)) return { status: 'none' };
  const formerDir = `${FORMER_TOOL_DIR_NAME}/`;
  if (isLayoutRoot(root)) {
    return {
      status: 'unused',
      warning:
        `${formerDir} is not used: this project already has ${RELATIVE_TOOL_DIR}/. ` +
        `SpecAgile leaves ${formerDir} as it is; move what you still need from it and delete it.`,
    };
  }

  const occupied = occupiedDestinations(root, ops);
  if (occupied.length > 0) {
    const names = occupied.map((dir) => posix(root, dir, 'directory'));
    throw new LayoutMigrationError(
      `Cannot move ${formerDir} to the SpecAgile layout: ${names.join(', ')} already ` +
        `${names.length === 1 ? 'exists' : 'exist'} with content. Nothing was moved. ` +
        `Move or rename ${names.length === 1 ? 'it' : 'them'}, then run specagile update again.`,
      'destination_occupied',
      names[0]
    );
  }

  const plan = planMoves(root, ops);
  const toolDir = getToolDir(root);
  const ledger: PlannedMove[] = [];
  const removedEmpty: string[] = [];
  let createdToolDir = false;
  try {
    // rename over an existing folder fails on Windows, so an empty
    // destination goes first, noted so it can come back.
    for (const dir of [getSpecsDir(root), getChangesDir(root)]) {
      if (ops.kind(dir) === 'directory' && plan.some((move) => move.to === dir)) {
        await ops.rmdir(dir);
        removedEmpty.push(dir);
      }
    }
    // The tool folder is the root's mark, so it exists even with nothing to move into it.
    if (ops.kind(toolDir) === 'missing') {
      await ops.mkdir(toolDir);
      createdToolDir = true;
    }
    for (const move of plan) {
      try {
        await renameWithRetry(ops, move.from, move.to);
      } catch (error) {
        throw Object.assign(new Error(String(error)), { cause: error, move });
      }
      ledger.push(move);
    }
  } catch (failure) {
    const move = (failure as { move?: PlannedMove }).move;
    const cause = (failure as { cause?: unknown }).cause ?? failure;
    const hint = move ? heldFileHint(root, ops, move.from) : '';
    const left: string[] = [];
    for (const done of [...ledger].reverse()) {
      try {
        await renameWithRetry(ops, done.to, done.from);
      } catch {
        left.push(`${done.display.to} (was ${done.display.from})`);
      }
    }
    if (createdToolDir) await ops.rmdir(toolDir).catch(() => left.push(`${RELATIVE_TOOL_DIR}/ (new)`));
    for (const dir of removedEmpty) await ops.mkdir(dir).catch(() => undefined);
    const what = move ? `${move.display.from} to ${move.display.to}` : 'the former layout';
    const reason = errorCode(cause) ?? (cause instanceof Error ? cause.message : String(cause));
    if (left.length > 0) {
      throw new LayoutMigrationError(
        `Could not move ${what} (${reason}), and could not put everything back. ` +
          `Still in the new place: ${left.join(', ')}. Move ${left.length === 1 ? 'it' : 'them'} back into ${formerDir} by hand, ` +
          'then run specagile update again.',
        'undo_failed',
        move?.display.from
      );
    }
    throw new LayoutMigrationError(
      `Could not move ${what} (${reason}).${hint} Nothing was moved: ${formerDir} is as it was. ` +
        'Close any program that has a file there open, then run specagile update again.',
      'move_failed',
      move?.display.from
    );
  }

  let warning: string | undefined;
  try {
    await ops.rmdir(getFormerToolDir(root));
  } catch {
    // Something new appeared in openspec/ while moving: it stays, with that.
    warning = `${formerDir} was not removed: it still has ${ops.list(getFormerToolDir(root)).join(', ')}. Move it where it belongs and delete ${formerDir}.`;
  }
  return { status: 'migrated', moves: ledger.map((move) => move.display), ...(warning ? { warning } : {}) };
}

/** The lines `update` and `init` print for a migration. */
export function describeLayoutMigration(result: LayoutMigrationResult): string[] {
  if (result.status !== 'migrated') return [];
  return [
    ...result.moves.map((move) => `Moved ${move.from} → ${move.to}`),
    `Commit the move: SpecAgile now keeps ${RELATIVE_SPECS_DIR}/, ${RELATIVE_CHANGES_DIR}/ and ${RELATIVE_TOOL_DIR}/ at the project root.`,
  ];
}

function diskKind(target: string): LayoutEntryKind {
  try {
    const stats = fs.lstatSync(target);
    if (stats.isSymbolicLink()) return 'link';
    if (stats.isDirectory()) return 'directory';
    if (stats.isFile()) return 'file';
    return 'other';
  } catch (error) {
    const code = errorCode(error);
    if (code === 'ENOENT' || code === 'ENOTDIR') return 'missing';
    throw error;
  }
}

/** The first file under `dir` that cannot be opened because another process holds it. */
function findHeldFileOnDisk(dir: string): string | undefined {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const held = findHeldFileOnDisk(full);
      if (held) return held;
    } else if (entry.isFile()) {
      try {
        fs.closeSync(fs.openSync(full, 'r+'));
      } catch (error) {
        if (['EBUSY', 'EPERM', 'EACCES'].includes(errorCode(error) ?? '')) return full;
      }
    }
  }
  return undefined;
}

export const DISK_LAYOUT_OPS: LayoutMigrationOps = {
  kind: diskKind,
  list: (dir) => fs.readdirSync(dir),
  mkdir: (dir) => fs.promises.mkdir(dir),
  rename: (from, to) => fs.promises.rename(from, to),
  rmdir: (dir) => fs.promises.rmdir(dir),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  retryCodes: process.platform === 'win32' ? ['EPERM', 'EBUSY', 'EACCES'] : [],
  findHeldFile: (dir) => (process.platform === 'win32' ? findHeldFileOnDisk(dir) : undefined),
};

/** What `update --dry-run` records into: UpdatePlanRecorder, by shape. */
export interface LayoutPlanRecorder {
  readonly view: FileView;
  moveFile(source: string, destination: string, tool: string): Promise<void>;
  removeEmptyDirectory(dirPath: string): Promise<void>;
}

/**
 * Ops over a dry run's plan: every move is planned with the recorder and read
 * back through its view, so the steps after the migration see the tree moved.
 */
export function planLayoutOps(recorder: LayoutPlanRecorder): LayoutMigrationOps {
  const { view } = recorder;
  return {
    kind: (target) =>
      view.linkTarget?.(target) !== undefined
        ? 'link'
        : view.isDirectory(target)
          ? 'directory'
          : view.exists(target)
            ? 'file'
            : 'missing',
    list: (dir) => view.listDirectory?.(dir) ?? [],
    mkdir: async () => {},
    rename: (from, to) => recorder.moveFile(from, to, 'openspec'),
    rmdir: (dir) => recorder.removeEmptyDirectory(dir),
    wait: async () => {},
    retryCodes: [],
  };
}
