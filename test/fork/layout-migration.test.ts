import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DISK_LAYOUT_OPS,
  LayoutMigrationError,
  describeLayoutMigration,
  migrateFormerLayout,
  type LayoutMigrationOps,
} from '../../src/core/fork/layout-migration.js';
import { snapshotDirectory } from '../helpers/fs-snapshot.js';
import { createFormerLayout } from '../helpers/layout.js';

/** Disk ops whose rename fails (with `code`) on the calls `failOn` lists, counted from 1. */
function failingOps(failOn: number[], code = 'EPERM', overrides: Partial<LayoutMigrationOps> = {}): LayoutMigrationOps {
  let calls = 0;
  return {
    ...DISK_LAYOUT_OPS,
    retryCodes: [],
    wait: async () => {},
    rename: async (from, to) => {
      calls++;
      if (failOn.includes(calls)) {
        throw Object.assign(new Error(`${code}: operation not permitted, rename '${from}'`), { code });
      }
      await fs.promises.rename(from, to);
    },
    ...overrides,
  };
}

/** A real directory link: a junction on Windows (no privilege needed), a symlink elsewhere. */
function linkDirectory(target: string, link: string): boolean {
  try {
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    return true;
  } catch {
    return false;
  }
}

describe('migrateFormerLayout', () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-layout-migration-')));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('moves a 2.1 project, with its schemas and explorations, and reports each move', async () => {
    createFormerLayout(root, {
      'config.yaml': 'schema: spec-driven\n',
      'specs/auth/spec.md': '# auth\n',
      'changes/add-login/proposal.md': '# add-login\n',
      'changes/add-login/.openspec.yaml': 'schema: spec-driven\nskip_specs: true\n',
      'changes/archive/2026-01-10-setup/proposal.md': '# setup\n',
      'schemas/my-flow/schema.yaml': 'name: my-flow\n',
      'explorations/notes.md': 'notes\n',
    });

    const result = await migrateFormerLayout(root);

    expect(result).toEqual({
      status: 'migrated',
      moves: [
        { from: 'openspec/specs/', to: 'specs/' },
        { from: 'openspec/changes/', to: 'changes/' },
        { from: 'openspec/config.yaml', to: 'specagile/config.yaml' },
        { from: 'openspec/explorations/', to: 'specagile/explorations/' },
        { from: 'openspec/schemas/', to: 'specagile/schemas/' },
      ],
    });
    expect(Object.fromEntries(snapshotDirectory(root))).toEqual({
      'specs/': '',
      'specs/auth/': '',
      'specs/auth/spec.md': '# auth\n',
      'changes/': '',
      'changes/add-login/': '',
      'changes/add-login/proposal.md': '# add-login\n',
      'changes/add-login/.openspec.yaml': 'schema: spec-driven\nskip_specs: true\n',
      'changes/archive/': '',
      'changes/archive/2026-01-10-setup/': '',
      'changes/archive/2026-01-10-setup/proposal.md': '# setup\n',
      'specagile/': '',
      'specagile/config.yaml': 'schema: spec-driven\n',
      'specagile/explorations/': '',
      'specagile/explorations/notes.md': 'notes\n',
      'specagile/schemas/': '',
      'specagile/schemas/my-flow/': '',
      'specagile/schemas/my-flow/schema.yaml': 'name: my-flow\n',
    });
    expect(describeLayoutMigration(result)).toEqual([
      'Moved openspec/specs/ → specs/',
      'Moved openspec/changes/ → changes/',
      'Moved openspec/config.yaml → specagile/config.yaml',
      'Moved openspec/explorations/ → specagile/explorations/',
      'Moved openspec/schemas/ → specagile/schemas/',
      'Commit the move: SpecAgile now keeps specs/, changes/ and specagile/ at the project root.',
    ]);
  });

  it('moves a repo whose only planning is a config that declares a store', async () => {
    createFormerLayout(root, { 'config.yaml': 'store: team\n' });

    await migrateFormerLayout(root);

    expect(Object.fromEntries(snapshotDirectory(root))).toEqual({
      'specagile/': '',
      'specagile/config.yaml': 'store: team\n',
    });
  });

  it('moves nothing when specs/ already has content, and names it', async () => {
    createFormerLayout(root);
    fs.mkdirSync(path.join(root, 'specs'));
    fs.writeFileSync(path.join(root, 'specs', 'login.test.ts'), 'test\n');
    const before = snapshotDirectory(root);

    const error = await migrateFormerLayout(root).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LayoutMigrationError);
    expect((error as LayoutMigrationError).code).toBe('destination_occupied');
    expect((error as LayoutMigrationError).message).toContain('specs/ already exists with content');
    expect((error as LayoutMigrationError).message).toContain('run specagile update again');
    expect(snapshotDirectory(root)).toEqual(before);
  });

  it('counts a .gitkeep as content', async () => {
    createFormerLayout(root);
    fs.mkdirSync(path.join(root, 'specagile'));
    fs.writeFileSync(path.join(root, 'specagile', '.gitkeep'), '');

    await expect(migrateFormerLayout(root)).rejects.toThrow('specagile/ already exists with content');
  });

  it('moves into an empty destination folder', async () => {
    createFormerLayout(root, { 'config.yaml': 'schema: spec-driven\n', 'changes/add-login/proposal.md': '# add-login\n' });
    fs.mkdirSync(path.join(root, 'changes'));

    const result = await migrateFormerLayout(root);

    expect(result.status).toBe('migrated');
    expect(fs.readFileSync(path.join(root, 'changes', 'add-login', 'proposal.md'), 'utf-8')).toBe('# add-login\n');
    expect(fs.existsSync(path.join(root, 'openspec'))).toBe(false);
  });

  it('leaves the tree exactly as it was when the second move fails', async () => {
    createFormerLayout(root, {
      'config.yaml': 'schema: spec-driven\n',
      'specs/auth/spec.md': '# auth\n',
      'changes/add-login/proposal.md': '# add-login\n',
    });
    fs.mkdirSync(path.join(root, 'changes'));
    const before = snapshotDirectory(root);

    const error = await migrateFormerLayout(root, failingOps([2])).catch((caught: unknown) => caught);

    expect((error as LayoutMigrationError).code).toBe('move_failed');
    expect((error as LayoutMigrationError).message).toContain('Could not move openspec/changes/ to changes/ (EPERM)');
    expect((error as LayoutMigrationError).message).toContain('Nothing was moved');
    expect(snapshotDirectory(root)).toEqual(before);
  });

  it('names the file another program holds', async () => {
    createFormerLayout(root, { 'config.yaml': 'schema: spec-driven\n', 'changes/add-login/tasks.md': '- [ ] 1\n' });
    const held = path.join(root, 'openspec', 'changes', 'add-login', 'tasks.md');

    const error = await migrateFormerLayout(root, failingOps([1], 'EBUSY', { findHeldFile: () => held })).catch(
      (caught: unknown) => caught
    );

    expect((error as LayoutMigrationError).message).toContain('openspec/changes/add-login/tasks.md is open in another program');
    expect((error as LayoutMigrationError).message).toContain('Close any program');
  });

  it('lists what stayed where when undoing fails too', async () => {
    createFormerLayout(root, {
      'config.yaml': 'schema: spec-driven\n',
      'specs/auth/spec.md': '# auth\n',
      'changes/add-login/proposal.md': '# add-login\n',
    });

    // 1: specs moves, 2: changes fails, 3: moving specs back fails.
    const error = await migrateFormerLayout(root, failingOps([2, 3])).catch((caught: unknown) => caught);

    expect((error as LayoutMigrationError).code).toBe('undo_failed');
    expect((error as LayoutMigrationError).message).toContain('Still in the new place: specs/ (was openspec/specs/)');
    expect(fs.existsSync(path.join(root, 'specs', 'auth', 'spec.md'))).toBe(true);
  });

  it('retries a rename Windows reports as busy, then completes', async () => {
    createFormerLayout(root);
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

    const result = await migrateFormerLayout(root, ops);

    expect(result.status).toBe('migrated');
    expect(fs.existsSync(path.join(root, 'specagile', 'config.yaml'))).toBe(true);
  });

  it('moves openspec/specs as a link, never what it points to', async (context) => {
    const elsewhere = path.join(root, 'docs-repo', 'specs');
    fs.mkdirSync(path.join(elsewhere, 'auth'), { recursive: true });
    fs.writeFileSync(path.join(elsewhere, 'auth', 'spec.md'), '# auth\n');
    const project = path.join(root, 'project');
    createFormerLayout(project, { 'config.yaml': 'schema: spec-driven\n' });
    if (!linkDirectory(elsewhere, path.join(project, 'openspec', 'specs'))) context.skip();

    await migrateFormerLayout(project);

    expect(fs.lstatSync(path.join(project, 'specs')).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync.native(path.join(project, 'specs'))).toBe(fs.realpathSync.native(elsewhere));
    expect(fs.readFileSync(path.join(elsewhere, 'auth', 'spec.md'), 'utf-8')).toBe('# auth\n');
  });

  it('leaves openspec/ untouched beside the layout in force, with a warning', async () => {
    createFormerLayout(root, { 'changes/old-change/proposal.md': '# old\n' });
    fs.mkdirSync(path.join(root, 'specagile'));
    fs.writeFileSync(path.join(root, 'specagile', 'config.yaml'), 'schema: spec-driven\n');
    const before = snapshotDirectory(root);

    const result = await migrateFormerLayout(root);

    expect(result.status).toBe('unused');
    expect(result.status === 'unused' && result.warning).toContain('openspec/ is not used');
    expect(snapshotDirectory(root)).toEqual(before);
  });

  it('never takes a home folder that holds stores for a project to migrate', async () => {
    fs.mkdirSync(path.join(root, 'openspec', 'team', '.openspec-store'), { recursive: true });
    fs.mkdirSync(path.join(root, 'openspec', 'specs', '.openspec-store'), { recursive: true });
    fs.writeFileSync(path.join(root, 'openspec', 'specs', '.openspec-store', 'store.yaml'), 'id: specs\n');
    const before = snapshotDirectory(root);

    expect(await migrateFormerLayout(root)).toEqual({ status: 'none' });
    expect(snapshotDirectory(root)).toEqual(before);
  });
});
