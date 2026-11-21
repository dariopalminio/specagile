import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { DISK_LAYOUT_OPS } from '../../src/core/fork/layout-migration.js';
import { UpdateCommand } from '../../src/core/update.js';
import { snapshotDirectory } from '../helpers/fs-snapshot.js';
import { runCLI } from '../helpers/run-cli.js';
import { createFormerLayout, getArchivedChangeDir, getChangeDir } from '../helpers/layout.js';

/**
 * `specagile update` and `specagile init` rename each active change's
 * `.openspec.yaml` to `.specagile.yaml` (src/core/fork/change-metadata-migration.ts),
 * after moving the former layout, in the same run.
 */

const RENAMED = 'changes/add-login/.openspec.yaml → changes/add-login/.specagile.yaml';

describe('migrating change metadata from the CLI', () => {
  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-metadata-migration-cli-')));
    env = {
      XDG_CONFIG_HOME: path.join(dir, 'config'),
      XDG_DATA_HOME: path.join(dir, 'data'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function write(file: string, content: string): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  /** A project set up by SpecAgile 4.0.0: the layout, with a change that has `.openspec.yaml`. */
  async function project400(metadata = 'schema: spec-driven\nskip_specs: true\n'): Promise<string> {
    const root = path.join(dir, 'project');
    fs.mkdirSync(root, { recursive: true });
    const init = await runCLI(['init', '--tools', 'none'], { cwd: root, env });
    expect(init.exitCode, init.stderr).toBe(0);
    write(getChangeDir(root, 'add-login', '.openspec.yaml'), metadata);
    write(getChangeDir(root, 'add-login', 'proposal.md'), '# add-login\n');
    return root;
  }

  it('update renames .openspec.yaml in a project made with SpecAgile 4.0.0, and reports it', async () => {
    const content = 'schema: spec-driven\nskip_specs: true\nx-tracker: JIRA-1\n';
    const root = await project400(content);

    const result = await runCLI(['update'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.readFileSync(getChangeDir(root, 'add-login', '.specagile.yaml'), 'utf-8')).toBe(content);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.openspec.yaml'))).toBe(false);
    expect(result.stdout).toContain(`Renamed ${RENAMED}`);
    expect(result.stdout).toContain('Commit the renames');
  });

  it('update moves the former layout and renames the metadata in one run', async () => {
    const root = path.join(dir, 'project');
    fs.mkdirSync(root, { recursive: true });
    createFormerLayout(root, {
      'config.yaml': 'schema: spec-driven\n',
      'specs/.gitkeep': '',
      'changes/add-login/.openspec.yaml': 'schema: spec-driven\nskip_specs: true\n',
      'changes/add-login/proposal.md': '# add-login\n',
      'changes/archive/2026-01-10-setup/.openspec.yaml': 'schema: spec-driven\n',
    });

    const result = await runCLI(['update'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.readFileSync(getChangeDir(root, 'add-login', '.specagile.yaml'), 'utf-8')).toContain('skip_specs: true');
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.openspec.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'openspec'))).toBe(false);
    expect(fs.existsSync(getArchivedChangeDir(root, '2026-01-10-setup', '.openspec.yaml'))).toBe(true);
    const moved = result.stdout.indexOf('Moved openspec/changes/ → changes/');
    expect(moved).toBeGreaterThanOrEqual(0);
    expect(result.stdout.indexOf(`Renamed ${RENAMED}`)).toBeGreaterThan(moved);
  });

  it('update leaves archived changes with .openspec.yaml', async () => {
    const root = await project400();
    const archived = getArchivedChangeDir(root, '2026-01-10-setup', '.openspec.yaml');
    write(archived, 'schema: spec-driven\n');

    const result = await runCLI(['update'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.readFileSync(archived, 'utf-8')).toBe('schema: spec-driven\n');
    expect(fs.existsSync(getArchivedChangeDir(root, '2026-01-10-setup', '.specagile.yaml'))).toBe(false);
  });

  it('update in a store folder renames its changes', async () => {
    const storeRoot = path.join(dir, 'stores', 'team');
    const setup = await runCLI(['store', 'setup', 'team', '--path', storeRoot, '--no-init-git', '--json'], {
      cwd: dir,
      env,
    });
    expect(setup.exitCode, setup.stderr).toBe(0);
    write(getChangeDir(storeRoot, 'add-login', '.openspec.yaml'), 'schema: spec-driven\n');

    const result = await runCLI(['update'], { cwd: storeRoot, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(getChangeDir(storeRoot, 'add-login', '.specagile.yaml'))).toBe(true);
    expect(fs.existsSync(getChangeDir(storeRoot, 'add-login', '.openspec.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(storeRoot, '.openspec-store', 'store.yaml'))).toBe(true);
  });

  it('update keeps both files of a change that has both, warns, and exits with zero', async () => {
    const root = await project400('schema: spec-driven\nskip_specs: true\n');
    write(getChangeDir(root, 'add-login', '.specagile.yaml'), 'schema: spec-driven\n');

    const result = await runCLI(['update'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.readFileSync(getChangeDir(root, 'add-login', '.specagile.yaml'), 'utf-8')).toBe('schema: spec-driven\n');
    expect(fs.readFileSync(getChangeDir(root, 'add-login', '.openspec.yaml'), 'utf-8')).toBe(
      'schema: spec-driven\nskip_specs: true\n'
    );
    expect(result.stdout).toContain('changes/add-login/ has .specagile.yaml and .openspec.yaml: SpecAgile uses .specagile.yaml');
    expect(result.stdout).toContain('delete .openspec.yaml');
  });

  it('update --dry-run reports the rename and changes nothing on disk', async () => {
    const root = await project400();
    const before = snapshotDirectory(root);

    const result = await runCLI(['update', '--dry-run'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain(`Update would rename change metadata: ${RENAMED}.`);
    expect(snapshotDirectory(root)).toEqual(before);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.specagile.yaml'))).toBe(false);
  });

  it('update --dry-run reports the layout move and the rename in one note', async () => {
    const root = path.join(dir, 'project');
    fs.mkdirSync(root, { recursive: true });
    createFormerLayout(root, {
      'config.yaml': 'schema: spec-driven\n',
      'changes/add-login/.openspec.yaml': 'schema: spec-driven\n',
    });
    const before = snapshotDirectory(root);

    const result = await runCLI(['update', '--dry-run'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Update would move the former layout: ');
    expect(result.stdout).toContain(`Update would rename change metadata: ${RENAMED}.`);
    expect(snapshotDirectory(root)).toEqual(before);
  });

  it('init --tools claude renames .openspec.yaml in a set-up project', async () => {
    const root = await project400();

    const result = await runCLI(['init', '--tools', 'claude'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.specagile.yaml'))).toBe(true);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.openspec.yaml'))).toBe(false);
    expect(result.stdout).toContain(`Renamed ${RENAMED}`);
  });

  it('update leaves a file it cannot rename, names it, and completes', async () => {
    const root = await project400();
    vi.spyOn(DISK_LAYOUT_OPS, 'wait').mockResolvedValue(undefined);
    vi.spyOn(DISK_LAYOUT_OPS, 'rename').mockImplementation(async (from) => {
      throw Object.assign(new Error(`EBUSY: resource busy or locked, rename '${from}'`), { code: 'EBUSY' });
    });
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    const previousExitCode = process.exitCode;

    await new UpdateCommand({ force: true }).execute(root);

    expect(process.exitCode ?? 0).toBe(previousExitCode ?? 0);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.openspec.yaml'))).toBe(true);
    expect(fs.existsSync(getChangeDir(root, 'add-login', '.specagile.yaml'))).toBe(false);
    const output = logs.join('\n');
    expect(output).toContain('Could not rename changes/add-login/.openspec.yaml to .specagile.yaml (EBUSY)');
    expect(output).toContain('close it, then run specagile update again');
  });
});
