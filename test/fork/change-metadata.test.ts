import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  ChangeMetadataError,
  METADATA_FILENAME,
  readChangeMetadata,
  readRetireCapabilitiesMarker,
  readSkipSpecsMarker,
  readUnknownChangeMetadataKeys,
  resolveSchemaForChange,
} from '../../src/utils/change-metadata.js';
import { findNestedChangesIn } from '../../src/utils/nested-change.js';
import { runCLI } from '../helpers/run-cli.js';
import {
  CHANGE_METADATA_FILE_NAME,
  FORMER_CHANGE_METADATA_FILE_NAME,
  getChangeDir,
  getChangesDir,
  getConfigFile,
  getProjectSchemasDir,
  getSpecFile,
  getToolDir,
} from '../helpers/layout.js';

/**
 * A change's metadata lives in `.specagile.yaml`; a change that only has the
 * `.openspec.yaml` OpenSpec and SpecAgile 4.0.0 wrote keeps working, and with
 * both files `.specagile.yaml` rules (src/core/fork/layout.ts,
 * getChangeMetadataFile).
 */

const MY_FLOW_SCHEMA = `name: my-flow
version: 1
description: A project schema
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
`;

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A project with the layout, `spec-driven` in its config and a project schema `my-flow`. */
function createProject(root: string): void {
  fs.mkdirSync(getToolDir(root), { recursive: true });
  write(getConfigFile(root), 'schema: spec-driven\n');
  const schemaDir = path.join(getProjectSchemasDir(root), 'my-flow');
  write(path.join(schemaDir, 'schema.yaml'), MY_FLOW_SCHEMA);
  write(path.join(schemaDir, 'templates', 'proposal.md'), '# Proposal\n');
  fs.mkdirSync(getChangesDir(root), { recursive: true });
}

describe('reading a change metadata file', () => {
  let root: string;
  let changeDir: string;

  beforeEach(() => {
    root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-change-metadata-')));
    createProject(root);
    changeDir = getChangeDir(root, 'add-login');
    fs.mkdirSync(changeDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const current = (content: string) => write(path.join(changeDir, CHANGE_METADATA_FILE_NAME), content);
  const former = (content: string) => write(path.join(changeDir, FORMER_CHANGE_METADATA_FILE_NAME), content);

  it('writes new metadata to .specagile.yaml', () => {
    expect(CHANGE_METADATA_FILE_NAME).toBe('.specagile.yaml');
    expect(METADATA_FILENAME).toBe(CHANGE_METADATA_FILE_NAME);
  });

  describe('a change with only .openspec.yaml', () => {
    it('reads its schema', () => {
      former('schema: my-flow\n');

      expect(readChangeMetadata(changeDir, root)?.schema).toBe('my-flow');
      expect(resolveSchemaForChange(changeDir)).toBe('my-flow');
    });

    it('reads skip_specs and retire_capabilities', () => {
      former('schema: spec-driven\nskip_specs: true\nretire_capabilities: true\n');

      expect(readSkipSpecsMarker(changeDir)).toEqual({ declared: true });
      expect(readRetireCapabilitiesMarker(changeDir)).toEqual({ declared: true });
    });

    it('reads initiative', () => {
      former('schema: spec-driven\ninitiative:\n  store: platform\n  id: billing-launch\n');

      expect(readChangeMetadata(changeDir, root)?.initiative).toEqual({ store: 'platform', id: 'billing-launch' });
    });

    it('reads its keys: x- keys are extensions, other unknown keys are reported', () => {
      former('schema: spec-driven\nx-tracker: JIRA-1\nowner: ana\n');

      expect(readUnknownChangeMetadataKeys(changeDir)).toEqual(['owner']);
    });
  });

  describe('a change with both files', () => {
    it('takes the schema from .specagile.yaml', () => {
      current('schema: spec-driven\n');
      former('schema: my-flow\n');

      expect(readChangeMetadata(changeDir, root)?.schema).toBe('spec-driven');
      expect(resolveSchemaForChange(changeDir)).toBe('spec-driven');
    });

    it('ignores a marker that is only in .openspec.yaml', () => {
      current('schema: spec-driven\n');
      former('schema: spec-driven\nskip_specs: true\nretire_capabilities: true\nowner: ana\n');

      expect(readSkipSpecsMarker(changeDir)).toEqual({ declared: false });
      expect(readRetireCapabilitiesMarker(changeDir)).toEqual({ declared: false });
      expect(readUnknownChangeMetadataKeys(changeDir)).toEqual([]);
    });
  });

  describe('an invalid .specagile.yaml never falls back to .openspec.yaml', () => {
    it('fails reading, naming .specagile.yaml', () => {
      current('{ invalid yaml');
      former('schema: my-flow\n');

      let error: unknown;
      try {
        readChangeMetadata(changeDir, root);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(ChangeMetadataError);
      expect((error as ChangeMetadataError).metadataPath).toBe(path.join(changeDir, CHANGE_METADATA_FILE_NAME));
      expect(() => resolveSchemaForChange(changeDir)).toThrow(ChangeMetadataError);
    });

    it('does not honor a marker of .openspec.yaml', () => {
      current('schema: [spec-driven\nretire_capabilities: true\n');
      former('schema: spec-driven\nretire_capabilities: true\nskip_specs: true\n');

      const retire = readRetireCapabilitiesMarker(changeDir);
      expect(retire.declared).toBe(false);
      expect(retire.invalidReason).toBeDefined();
      expect(readSkipSpecsMarker(changeDir)).toEqual({ declared: false });
    });

    it('does not honor a marker of .openspec.yaml when .specagile.yaml is not valid metadata', () => {
      current('created: 2026-01-01\n');
      former('schema: spec-driven\nskip_specs: true\n');

      expect(readSkipSpecsMarker(changeDir)).toEqual({ declared: false });
    });
  });
});

describe('a namespace folder wrapping a change', () => {
  let root: string;

  beforeEach(() => {
    root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-nested-change-')));
    createProject(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it.each([FORMER_CHANGE_METADATA_FILE_NAME, CHANGE_METADATA_FILE_NAME])(
    'is detected when the nested change only has %s',
    async (name) => {
      write(getChangeDir(root, 'mobile', 'refresh-token', name), 'schema: spec-driven\n');

      expect(await findNestedChangesIn(getChangesDir(root), 'mobile')).toEqual({
        name: 'mobile',
        nested: ['mobile/refresh-token'],
      });
    }
  );
});

describe('archiving a change that retires a capability', () => {
  const PURPOSE =
    'Holds the behavior contract for the legacy authentication that consumers still depend on.';
  const MAIN_SPEC = `# legacy-auth Specification

## Purpose
${PURPOSE}

## Requirements

### Requirement: The system SHALL provide legacy authentication
The system SHALL accept legacy tokens.

#### Scenario: A legacy token
- **WHEN** a client sends a legacy token
- **THEN** it is accepted
`;
  const REMOVE_ALL = `## REMOVED Requirements

### Requirement: The system SHALL provide legacy authentication
**Reason**: The capability is retired.
**Migration**: None; clients already moved off it.
`;

  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-retire-')));
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

  it.each([FORMER_CHANGE_METADATA_FILE_NAME, CHANGE_METADATA_FILE_NAME])(
    'retires specs/legacy-auth/spec.md with retire_capabilities: true in %s',
    async (name) => {
      const root = path.join(dir, 'project');
      createProject(root);
      const mainSpec = getSpecFile(root, 'legacy-auth');
      write(mainSpec, MAIN_SPEC);
      const change = getChangeDir(root, 'remove-legacy-auth');
      write(path.join(change, name), 'schema: spec-driven\nretire_capabilities: true\n');
      write(path.join(change, 'tasks.md'), '- [x] 1.1 Remove legacy authentication\n');
      write(path.join(change, 'specs', 'legacy-auth', 'spec.md'), REMOVE_ALL);

      const result = await runCLI(['archive', 'remove-legacy-auth', '--yes'], { cwd: root, env });

      expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(fs.existsSync(mainSpec)).toBe(false);
      expect(fs.existsSync(change)).toBe(false);
    }
  );
});

describe('validate and status read either file', () => {
  const DELTA = `## ADDED Requirements

### Requirement: Login
The system SHALL let a registered user sign in.

#### Scenario: Valid credentials
- **WHEN** the user submits valid credentials
- **THEN** the user is signed in
`;
  const PROPOSAL = '## Why\nThe docs are out of date and confuse new users who try to set up the tool.\n\n## What Changes\n- Update the docs\n';

  let dir: string;
  let root: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-metadata-cli-')));
    root = path.join(dir, 'project');
    createProject(root);
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

  it('validate accepts a change without deltas whose .openspec.yaml declares skip_specs', async () => {
    write(getChangeDir(root, 'update-docs', FORMER_CHANGE_METADATA_FILE_NAME), 'schema: spec-driven\nskip_specs: true\n');
    write(getChangeDir(root, 'update-docs', 'proposal.md'), PROPOSAL);

    const result = await runCLI(['validate', 'update-docs'], { cwd: root, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
  });

  it('validate rejects a change whose skip_specs is only in .openspec.yaml beside .specagile.yaml, naming .specagile.yaml', async () => {
    write(getChangeDir(root, 'update-docs', CHANGE_METADATA_FILE_NAME), 'schema: spec-driven\n');
    write(getChangeDir(root, 'update-docs', FORMER_CHANGE_METADATA_FILE_NAME), 'schema: spec-driven\nskip_specs: true\n');
    write(getChangeDir(root, 'update-docs', 'proposal.md'), PROPOSAL);

    const result = await runCLI(['validate', 'update-docs'], { cwd: root, env });

    expect(result.exitCode).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(`set "skip_specs: true" in the change's .specagile.yaml`);
  });

  it('validate names .specagile.yaml when skip_specs is set and a delta exists', async () => {
    write(getChangeDir(root, 'add-login', CHANGE_METADATA_FILE_NAME), 'schema: spec-driven\nskip_specs: true\n');
    write(getChangeDir(root, 'add-login', 'proposal.md'), PROPOSAL);
    write(getChangeDir(root, 'add-login', 'specs', 'auth', 'spec.md'), DELTA);

    const result = await runCLI(['validate', 'add-login'], { cwd: root, env });

    expect(result.exitCode).not.toBe(0);
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain('skip_specs is set in .specagile.yaml but spec files exist under specs/');
    expect(output).not.toContain('.openspec.yaml');
  });

  it('status uses the schema of .openspec.yaml in a change without .specagile.yaml', async () => {
    write(getChangeDir(root, 'add-login', FORMER_CHANGE_METADATA_FILE_NAME), 'schema: my-flow\n');

    const result = await runCLI(['status', '--change', 'add-login', '--json'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).schemaName).toBe('my-flow');
  });

  it('status uses the schema of .specagile.yaml when the change has both files', async () => {
    write(getChangeDir(root, 'add-login', CHANGE_METADATA_FILE_NAME), 'schema: spec-driven\n');
    write(getChangeDir(root, 'add-login', FORMER_CHANGE_METADATA_FILE_NAME), 'schema: my-flow\n');

    const result = await runCLI(['status', '--change', 'add-login', '--json'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).schemaName).toBe('spec-driven');
  });

  it('status --store uses the schema of .openspec.yaml in a store change', async () => {
    const storeRoot = path.join(dir, 'stores', 'team');
    const setup = await runCLI(['store', 'setup', 'team', '--path', storeRoot, '--no-init-git', '--json'], {
      cwd: dir,
      env,
    });
    expect(setup.exitCode, setup.stderr).toBe(0);
    createProject(storeRoot);
    write(getChangeDir(storeRoot, 'add-login', FORMER_CHANGE_METADATA_FILE_NAME), 'schema: my-flow\n');

    const result = await runCLI(['status', '--change', 'add-login', '--store', 'team', '--json'], { cwd: dir, env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).schemaName).toBe('my-flow');
  });
});

describe('specagile new change', () => {
  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-new-change-')));
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

  async function initialized(): Promise<string> {
    const root = path.join(dir, 'project');
    fs.mkdirSync(root, { recursive: true });
    const result = await runCLI(['init', '--tools', 'none'], { cwd: root, env });
    expect(result.exitCode, result.stderr).toBe(0);
    return root;
  }

  it('creates changes/add-login/.specagile.yaml with schema and created, and no .openspec.yaml', async () => {
    const root = await initialized();

    const result = await runCLI(['new', 'change', 'add-login'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    const content = fs.readFileSync(path.join(getChangesDir(root), 'add-login', '.specagile.yaml'), 'utf-8');
    expect(content).toContain('schema: spec-driven');
    expect(content).toMatch(/^created: \d{4}-\d{2}-\d{2}$/m);
    expect(fs.existsSync(path.join(getChangesDir(root), 'add-login', '.openspec.yaml'))).toBe(false);
  });

  it('names .specagile.yaml in metadataPath with --json', async () => {
    const root = await initialized();

    const result = await runCLI(['new', 'change', 'add-login', '--json'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    const payload = JSON.parse(result.stdout) as { change: { metadataPath: string } };
    expect(payload.change.metadataPath).toBe(path.join(getChangesDir(root), 'add-login', '.specagile.yaml'));
  });

  it('instructions for the proposal say to declare skip_specs in .specagile.yaml', async () => {
    const root = await initialized();
    expect((await runCLI(['new', 'change', 'add-login'], { cwd: root, env })).exitCode).toBe(0);

    const result = await runCLI(['instructions', 'proposal', '--change', 'add-login', '--json'], { cwd: root, env });

    expect(result.exitCode, result.stderr).toBe(0);
    const payload = JSON.parse(result.stdout) as { instruction: string; template: string };
    expect(payload.instruction).toContain("unless the change's `.specagile.yaml` sets\n`skip_specs: true`");
    expect(payload.template).toContain('must set `skip_specs: true` in its .specagile.yaml');
    expect(result.stdout).not.toContain('.openspec.yaml');
  });

  it('creates .specagile.yaml in the store with --store', async () => {
    const storeRoot = path.join(dir, 'stores', 'team');
    const setup = await runCLI(['store', 'setup', 'team', '--path', storeRoot, '--no-init-git', '--json'], {
      cwd: dir,
      env,
    });
    expect(setup.exitCode, setup.stderr).toBe(0);
    const outside = path.join(dir, 'outside');
    fs.mkdirSync(outside, { recursive: true });

    const result = await runCLI(['new', 'change', 'add-login', '--store', 'team'], { cwd: outside, env });

    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(getChangesDir(storeRoot), 'add-login', '.specagile.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(getChangesDir(storeRoot), 'add-login', '.openspec.yaml'))).toBe(false);
  });
});
