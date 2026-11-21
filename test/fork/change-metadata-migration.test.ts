import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  describeChangeMetadataMigration,
  describeChangeMetadataPlan,
  migrateChangeMetadata,
} from '../../src/core/fork/change-metadata-migration.js';
import {
  DISK_LAYOUT_OPS,
  planLayoutOps,
  type LayoutMigrationOps,
} from '../../src/core/fork/layout-migration.js';
import { UpdatePlanRecorder } from '../../src/core/update-plan.js';
import { snapshotDirectory } from '../helpers/fs-snapshot.js';
import { getArchivedChangeDir, getChangeDir } from '../helpers/layout.js';

/**
 * src/core/fork/change-metadata-migration.ts: `.openspec.yaml` →
 * `.specagile.yaml` in each active change, with the ops injected.
 */

/** Disk ops whose rename always fails with `code`, counting the attempts. */
function busyOps(code: string, retryCodes: string[]): LayoutMigrationOps & { attempts: () => number } {
  let attempts = 0;
  return {
    ...DISK_LAYOUT_OPS,
    retryCodes,
    wait: async () => {},
    rename: async (from) => {
      attempts++;
      throw Object.assign(new Error(`${code}: resource busy or locked, rename '${from}'`), { code });
    },
    attempts: () => attempts,
  };
}

describe('migrateChangeMetadata', () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-metadata-migration-')));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function write(file: string, content: string): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  it('renames .openspec.yaml when the change has no .specagile.yaml, keeping its content', async () => {
    const content = 'schema: spec-driven\nskip_specs: true\nx-tracker: JIRA-1\n';
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), content);
    write(getChangeDir(root, 'add-login', 'proposal.md'), '# add-login\n');

    const result = await migrateChangeMetadata(root);

    expect(result).toEqual({
      renamed: [
        {
          change: 'changes/add-login',
          from: 'changes/add-login/.openspec.yaml',
          to: 'changes/add-login/.specagile.yaml',
        },
      ],
      kept: [],
      failed: [],
    });
    expect(fs.readFileSync(getChangeDir(root, 'add-login', '.specagile.yaml'), 'utf-8')).toBe(content);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.openspec.yaml'))).toBe(false);
  });

  it('leaves both files when the change has both, and reports it', async () => {
    write(getChangeDir(root, 'add-login', '.specagile.yaml'), 'schema: spec-driven\n');
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), 'schema: my-flow\n');

    const result = await migrateChangeMetadata(root);

    expect(result).toEqual({ renamed: [], kept: ['changes/add-login'], failed: [] });
    expect(fs.readFileSync(getChangeDir(root, 'add-login', '.specagile.yaml'), 'utf-8')).toBe('schema: spec-driven\n');
    expect(fs.readFileSync(getChangeDir(root, 'add-login', '.openspec.yaml'), 'utf-8')).toBe('schema: my-flow\n');
  });

  it('ignores changes/archive/ and hidden folders', async () => {
    write(getArchivedChangeDir(root, '2026-01-10-setup', '.openspec.yaml'), 'schema: spec-driven\n');
    write(getChangeDir(root, '.drafts', '.openspec.yaml'), 'schema: spec-driven\n');

    const result = await migrateChangeMetadata(root);

    expect(result).toEqual({ renamed: [], kept: [], failed: [] });
    expect(fs.existsSync(getArchivedChangeDir(root, '2026-01-10-setup', '.openspec.yaml'))).toBe(true);
    expect(fs.existsSync(getChangeDir(root, '.drafts', '.openspec.yaml'))).toBe(true);
  });

  it('only looks for the exact former name', async () => {
    write(getChangeDir(root, 'add-login', '.openspec.yml'), 'schema: spec-driven\n');
    write(getChangeDir(root, 'add-login', 'openspec.yaml'), 'schema: spec-driven\n');

    expect(await migrateChangeMetadata(root)).toEqual({ renamed: [], kept: [], failed: [] });
    expect(fs.readdirSync(getChangeDir(root, 'add-login')).sort()).toEqual(['.openspec.yml', 'openspec.yaml']);
  });

  it('does nothing without a changes/ folder', async () => {
    expect(await migrateChangeMetadata(root)).toEqual({ renamed: [], kept: [], failed: [] });
  });

  it('retries EBUSY and, when it persists, reports it in failed without throwing', async () => {
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), 'schema: spec-driven\n');
    write(getChangeDir(root, 'add-signup', '.openspec.yaml'), 'schema: spec-driven\n');
    const ops = busyOps('EBUSY', ['EBUSY']);

    const result = await migrateChangeMetadata(root, ops);

    // Five attempts per file: the first and the four retries.
    expect(ops.attempts()).toBe(10);
    expect(result.renamed).toEqual([]);
    expect(result.failed).toEqual([
      {
        change: 'changes/add-login',
        from: 'changes/add-login/.openspec.yaml',
        to: 'changes/add-login/.specagile.yaml',
        reason: 'EBUSY',
      },
      {
        change: 'changes/add-signup',
        from: 'changes/add-signup/.openspec.yaml',
        to: 'changes/add-signup/.specagile.yaml',
        reason: 'EBUSY',
      },
    ]);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.openspec.yaml'))).toBe(true);
  });

  it('completes a rename that is busy only once', async () => {
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), 'schema: spec-driven\n');
    let calls = 0;
    const ops: LayoutMigrationOps = {
      ...DISK_LAYOUT_OPS,
      retryCodes: ['EBUSY'],
      wait: async () => {},
      rename: async (from, to) => {
        if (++calls === 1) throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
        await fs.promises.rename(from, to);
      },
    };

    const result = await migrateChangeMetadata(root, ops);

    expect(result.renamed).toHaveLength(1);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.specagile.yaml'))).toBe(true);
  });

  it('plans the renames with planLayoutOps without touching the disk', async () => {
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), 'schema: spec-driven\n');
    write(getChangeDir(root, 'both', '.openspec.yaml'), 'schema: spec-driven\n');
    write(getChangeDir(root, 'both', '.specagile.yaml'), 'schema: spec-driven\n');
    const before = snapshotDirectory(root);
    const recorder = new UpdatePlanRecorder(root);

    const result = await migrateChangeMetadata(root, planLayoutOps(recorder));

    expect(snapshotDirectory(root)).toEqual(before);
    expect(result.renamed.map((rename) => rename.from)).toEqual(['changes/add-login/.openspec.yaml']);
    expect(result.kept).toEqual(['changes/both']);
    expect(recorder.view.exists(getChangeDir(root, 'add-login', '.specagile.yaml'))).toBe(true);
    expect(recorder.view.exists(getChangeDir(root, 'add-login', '.openspec.yaml'))).toBe(false);
    expect(describeChangeMetadataPlan(result)).toBe(
      'Update would rename change metadata: changes/add-login/.openspec.yaml → changes/add-login/.specagile.yaml. ' +
        'Update would keep both .specagile.yaml and .openspec.yaml in changes/both/; SpecAgile uses .specagile.yaml.'
    );
  });

  it('does nothing when run a second time', async () => {
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), 'schema: spec-driven\n');
    await migrateChangeMetadata(root);
    const after = snapshotDirectory(root);

    expect(await migrateChangeMetadata(root)).toEqual({ renamed: [], kept: [], failed: [] });
    expect(snapshotDirectory(root)).toEqual(after);
  });

  it('reports the paths with / on every platform', async () => {
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), 'schema: spec-driven\n');

    const result = await migrateChangeMetadata(root);

    for (const rename of result.renamed) {
      expect(rename.from).not.toContain('\\');
      expect(rename.to).not.toContain('\\');
    }
    expect(describeChangeMetadataMigration(result).info).toContain(
      'Renamed changes/add-login/.openspec.yaml → changes/add-login/.specagile.yaml'
    );
  });
});

describe('describeChangeMetadataMigration', () => {
  it('prints each rename and a reminder to commit them', () => {
    expect(
      describeChangeMetadataMigration({
        renamed: [
          {
            change: 'changes/add-login',
            from: 'changes/add-login/.openspec.yaml',
            to: 'changes/add-login/.specagile.yaml',
          },
        ],
        kept: [],
        failed: [],
      })
    ).toEqual({
      info: [
        'Renamed changes/add-login/.openspec.yaml → changes/add-login/.specagile.yaml',
        "Commit the renames: SpecAgile now keeps each change's metadata in .specagile.yaml.",
      ],
      warnings: [],
    });
  });

  it('warns about a change with both files and a file it could not rename', () => {
    const { info, warnings } = describeChangeMetadataMigration({
      renamed: [],
      kept: ['changes/add-login'],
      failed: [
        {
          change: 'changes/add-signup',
          from: 'changes/add-signup/.openspec.yaml',
          to: 'changes/add-signup/.specagile.yaml',
          reason: 'EBUSY',
        },
      ],
    });

    expect(info).toEqual([]);
    expect(warnings).toEqual([
      'changes/add-login/ has .specagile.yaml and .openspec.yaml: SpecAgile uses .specagile.yaml. ' +
        'Move what you still need from .openspec.yaml into .specagile.yaml, then delete .openspec.yaml.',
      'Could not rename changes/add-signup/.openspec.yaml to .specagile.yaml (EBUSY). SpecAgile keeps reading it. ' +
        'If another program has it open, close it, then run specagile update again.',
    ]);
  });

  it('prints nothing when nothing was found', () => {
    expect(describeChangeMetadataMigration({ renamed: [], kept: [], failed: [] })).toEqual({ info: [], warnings: [] });
    expect(describeChangeMetadataPlan({ renamed: [], kept: [], failed: [] })).toBeUndefined();
  });
});
