import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { runCLI } from '../helpers/run-cli.js';
import { CHANGE_METADATA_FILE_NAME, createFormerLayout } from '../helpers/layout.js';

/**
 * SpecAgile's project layout as the CLI writes and reads it: `specs/`,
 * `changes/` and `specagile/` at the root (src/core/fork/layout.ts). The
 * expected paths are spelled out with path.join, so they hold on Windows too.
 */

const DELTA = `## ADDED Requirements

### Requirement: Login
The system SHALL let a registered user sign in.

#### Scenario: Valid credentials
- **WHEN** the user submits valid credentials
- **THEN** the user is signed in
`;

describe('the SpecAgile layout from the CLI', () => {
  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-layout-cli-')));
    env = {
      XDG_CONFIG_HOME: path.join(dir, 'config'),
      XDG_DATA_HOME: path.join(dir, 'data'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function project(name = 'project'): string {
    const root = path.join(dir, name);
    fs.mkdirSync(root, { recursive: true });
    return root;
  }

  async function initialized(name = 'project'): Promise<string> {
    const root = project(name);
    const result = await runCLI(['init', '--tools', 'none'], { cwd: root, env });
    expect(result.exitCode, result.stderr).toBe(0);
    return root;
  }

  it('init creates specs/, changes/archive/ and specagile/config.yaml, and names the config', async () => {
    const root = project();

    const result = await runCLI(['init', '--tools', 'none'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(fs.statSync(path.join(root, 'specs')).isDirectory()).toBe(true);
    expect(fs.statSync(path.join(root, 'changes', 'archive')).isDirectory()).toBe(true);
    expect(fs.readFileSync(path.join(root, 'specagile', 'config.yaml'), 'utf-8')).toContain('schema: spec-driven');
    expect(fs.existsSync(path.join(root, 'specs', '.gitkeep'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'changes', 'archive', '.gitkeep'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'openspec'))).toBe(false);
    expect(result.stdout).toContain('Config: specagile/config.yaml');
  });

  it('new change creates the change under changes/, with its metadata', async () => {
    const root = await initialized();

    const result = await runCLI(['new', 'change', 'add-login'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(fs.existsSync(path.join(root, 'changes', 'add-login', CHANGE_METADATA_FILE_NAME))).toBe(true);
    expect(`${result.stdout}\n${result.stderr}`).toContain('specagile status --change add-login');
  });

  it('archive moves the change to changes/archive/ and writes the living spec to specs/', async () => {
    const root = await initialized();
    const change = path.join(root, 'changes', 'add-login');
    fs.mkdirSync(path.join(change, 'specs', 'auth'), { recursive: true });
    fs.writeFileSync(path.join(change, 'proposal.md'), '## Why\nUsers need to sign in.\n\n## What Changes\n- **auth:** Add login\n');
    fs.writeFileSync(path.join(change, 'tasks.md'), '- [x] 1.1 Add login\n');
    fs.writeFileSync(path.join(change, 'specs', 'auth', 'spec.md'), DELTA);

    const result = await runCLI(['archive', 'add-login', '--yes'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    const archived = fs.readdirSync(path.join(root, 'changes', 'archive')).filter((name) => name.endsWith('-add-login'));
    expect(archived).toHaveLength(1);
    expect(fs.readFileSync(path.join(root, 'specs', 'auth', 'spec.md'), 'utf-8')).toContain('### Requirement: Login');
  });

  it('schema init puts the project schema under specagile/schemas/, and schemas lists it', async () => {
    const root = await initialized();

    const created = await runCLI(['schema', 'init', 'my-flow', '--description', 'Mine', '--artifacts', 'proposal'], {
      cwd: root,
      env,
    });
    expect(created.exitCode, `${created.stdout}\n${created.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(root, 'specagile', 'schemas', 'my-flow', 'schema.yaml'))).toBe(true);

    const listed = await runCLI(['schemas', '--json'], { cwd: root, env });
    expect(listed.exitCode, listed.stderr).toBe(0);
    const schemas = JSON.parse(listed.stdout) as Array<{ name: string; source: string }>;
    expect(schemas.find((schema) => schema.name === 'my-flow')?.source).toBe('project');
  });

  it('store setup creates the store with the layout, beside its metadata', async () => {
    const storeRoot = path.join(dir, 'stores', 'team');

    const result = await runCLI(['store', 'setup', 'team', '--path', storeRoot, '--no-init-git', '--json'], {
      cwd: dir,
      env,
    });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(fs.statSync(path.join(storeRoot, 'specs')).isDirectory()).toBe(true);
    expect(fs.statSync(path.join(storeRoot, 'changes', 'archive')).isDirectory()).toBe(true);
    expect(fs.existsSync(path.join(storeRoot, 'specagile', 'config.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(storeRoot, '.openspec-store', 'store.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
  });

  it('instructions for specs tell the living spec at the root from the delta in the change', async () => {
    const root = await initialized();
    expect((await runCLI(['new', 'change', 'add-login'], { cwd: root, env })).exitCode).toBe(0);

    const result = await runCLI(['instructions', 'specs', '--change', 'add-login', '--json'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    const text = JSON.stringify(JSON.parse(result.stdout));
    expect(text).toContain('<planningHome.root>/specs/<capability-path>/spec.md');
    expect(text).toContain('when creating the delta at `specs/<capability-path>/spec.md` inside the change');
    expect(text).not.toContain('openspec/');
  });

  describe('a project with the former layout', () => {
    function formerProject(): string {
      const root = project();
      createFormerLayout(root, {
        'config.yaml': 'schema: spec-driven\n',
        'changes/add-login/proposal.md': '# add-login\n',
      });
      return root;
    }

    it('new change fails, asks for specagile update and creates nothing', async () => {
      const root = formerProject();

      const result = await runCLI(['new', 'change', 'add-signup'], { cwd: root, env });

      expect(result.exitCode).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain('specagile update');
      expect(fs.existsSync(path.join(root, 'changes'))).toBe(false);
      expect(fs.existsSync(path.join(root, 'specagile'))).toBe(false);
      expect(fs.existsSync(path.join(root, 'openspec', 'changes', 'add-login', 'proposal.md'))).toBe(true);
    });

    it('list --json from a subfolder reports no root and the fix', async () => {
      const root = formerProject();
      const sub = path.join(root, 'src', 'components');
      fs.mkdirSync(sub, { recursive: true });

      const result = await runCLI(['list', '--json'], { cwd: sub, env });

      expect(result.exitCode).not.toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.root).toBeNull();
      expect(payload.status[0]).toEqual(expect.objectContaining({ code: 'former_layout', fix: 'Run specagile update' }));
    });

    it('list says to run specagile update, and lists the change once it has run', async () => {
      const root = formerProject();

      const before = await runCLI(['list'], { cwd: root, env });
      expect(before.exitCode).not.toBe(0);
      expect(`${before.stdout}\n${before.stderr}`).toContain('specagile update');

      const update = await runCLI(['update'], { cwd: root, env });
      expect(update.exitCode, `${update.stdout}\n${update.stderr}`).toBe(0);
      expect(update.stdout).toContain('Moved openspec/changes/ → changes/');

      const after = await runCLI(['list'], { cwd: root, env });
      expect(after.exitCode, after.stderr).toBe(0);
      expect(after.stdout).toContain('add-login');
      expect(fs.existsSync(path.join(root, 'openspec'))).toBe(false);
    });
  });
});
