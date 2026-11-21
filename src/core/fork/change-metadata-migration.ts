/**
 * Migration of each active change's metadata file from `.openspec.yaml`, which
 * OpenSpec and SpecAgile 4.0.0 wrote, to `.specagile.yaml`
 * (CHANGE_METADATA_FILE_NAME in layout.ts).
 *
 * `update` and `init` run it after the layout migration. It looks at each
 * folder directly under `changes/` (not `changes/archive/`, not hidden ones)
 * for the exact former name, and renames the file without touching its
 * content. Unlike the layout it is not all or nothing: a change left with
 * `.openspec.yaml` keeps working, because the CLI still reads that name. So a
 * rename that fails is reported and the run goes on. This file is the fork's
 * own; see "Project layout" in FORK.md.
 */

import * as path from 'node:path';

import {
  ARCHIVE_DIR_NAME,
  CHANGE_METADATA_FILE_NAME,
  FORMER_CHANGE_METADATA_FILE_NAME,
  getChangesDir,
  relativeChangeDir,
} from './layout.js';
import { DISK_LAYOUT_OPS, renameWithRetry, type LayoutMigrationOps } from './layout-migration.js';

/** One rename, as the CLI reports it: paths relative to the root, with `/`. */
export interface ChangeMetadataRename {
  /** `changes/<change>`. */
  change: string;
  from: string;
  to: string;
}

/** A rename that failed after the retries: the file stays and is still read. */
export interface ChangeMetadataRenameFailure extends ChangeMetadataRename {
  /** The error code (EBUSY, EPERM, …), or the message when there is none. */
  reason: string;
}

export interface ChangeMetadataMigrationResult {
  renamed: ChangeMetadataRename[];
  /** `changes/<change>` folders that have both files: both stay, `.specagile.yaml` rules. */
  kept: string[];
  failed: ChangeMetadataRenameFailure[];
}

function reasonOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as NodeJS.ErrnoException).code);
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Renames `.openspec.yaml` to `.specagile.yaml` in each active change of
 * `root`. Never throws on a rename that fails; it is reported in `failed`.
 * Running it again does nothing.
 */
export async function migrateChangeMetadata(
  root: string,
  ops: LayoutMigrationOps = DISK_LAYOUT_OPS
): Promise<ChangeMetadataMigrationResult> {
  const result: ChangeMetadataMigrationResult = { renamed: [], kept: [], failed: [] };
  const changesDir = getChangesDir(root);
  if (ops.kind(changesDir) !== 'directory') return result;

  // The same changes getActiveChangeIds lists: folders, without archive/ and hidden ones.
  const changes = ops
    .list(changesDir)
    .filter((name) => name !== ARCHIVE_DIR_NAME && !name.startsWith('.'))
    .filter((name) => ops.kind(path.join(changesDir, name)) === 'directory')
    .sort((a, b) => a.localeCompare(b));

  for (const name of changes) {
    const changeDir = path.join(changesDir, name);
    const former = path.join(changeDir, FORMER_CHANGE_METADATA_FILE_NAME);
    const current = path.join(changeDir, CHANGE_METADATA_FILE_NAME);
    if (ops.kind(former) !== 'file') continue;

    const change = relativeChangeDir(name);
    if (ops.kind(current) !== 'missing') {
      // rename would replace it, on Windows and POSIX alike.
      result.kept.push(change);
      continue;
    }

    const rename: ChangeMetadataRename = {
      change,
      from: `${change}/${FORMER_CHANGE_METADATA_FILE_NAME}`,
      to: `${change}/${CHANGE_METADATA_FILE_NAME}`,
    };
    try {
      await renameWithRetry(ops, former, current);
      result.renamed.push(rename);
    } catch (error) {
      result.failed.push({ ...rename, reason: reasonOf(error) });
    }
  }
  return result;
}

/** What `update` and `init` print: the renames, and the warnings for what stayed. */
export interface ChangeMetadataMigrationReport {
  info: string[];
  warnings: string[];
}

/** The lines `update` and `init` print for a metadata migration. */
export function describeChangeMetadataMigration(
  result: ChangeMetadataMigrationResult
): ChangeMetadataMigrationReport {
  const info = result.renamed.map((rename) => `Renamed ${rename.from} → ${rename.to}`);
  if (result.renamed.length > 0) {
    info.push(
      `Commit the renames: SpecAgile now keeps each change's metadata in ${CHANGE_METADATA_FILE_NAME}.`
    );
  }
  const warnings = [
    ...result.kept.map(
      (change) =>
        `${change}/ has ${CHANGE_METADATA_FILE_NAME} and ${FORMER_CHANGE_METADATA_FILE_NAME}: SpecAgile uses ` +
        `${CHANGE_METADATA_FILE_NAME}. Move what you still need from ${FORMER_CHANGE_METADATA_FILE_NAME} into ` +
        `${CHANGE_METADATA_FILE_NAME}, then delete ${FORMER_CHANGE_METADATA_FILE_NAME}.`
    ),
    ...result.failed.map(
      (failure) =>
        `Could not rename ${failure.from} to ${CHANGE_METADATA_FILE_NAME} (${failure.reason}). ` +
        `SpecAgile keeps reading it. If another program has it open, close it, then run specagile update again.`
    ),
  ];
  return { info, warnings };
}

/** The dry run's account of the same migration, for the plan's `layout-migration` note. */
export function describeChangeMetadataPlan(result: ChangeMetadataMigrationResult): string | undefined {
  const parts: string[] = [];
  if (result.renamed.length > 0) {
    parts.push(
      `Update would rename change metadata: ${result.renamed.map((rename) => `${rename.from} → ${rename.to}`).join(', ')}.`
    );
  }
  if (result.kept.length > 0) {
    parts.push(
      `Update would keep both ${CHANGE_METADATA_FILE_NAME} and ${FORMER_CHANGE_METADATA_FILE_NAME} in ` +
        `${result.kept.map((change) => `${change}/`).join(', ')}; SpecAgile uses ${CHANGE_METADATA_FILE_NAME}.`
    );
  }
  if (result.failed.length > 0) {
    parts.push(
      `Update could not rename ${result.failed.map((failure) => `${failure.from} (${failure.reason})`).join(', ')}; ` +
        'SpecAgile keeps reading it.'
    );
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}
