import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { CORE_WORKFLOWS, type WorkflowId } from '../../src/core/profiles.js';
import { FORMER_SKILL_NAME_BY_WORKFLOW, SKILL_NAME_BY_WORKFLOW } from '../../src/core/fork/identity.js';
import { generateSkillContent, getSkillTemplates } from '../../src/core/shared/skill-generation.js';
import { transformToSharedSkillReferences } from '../../src/utils/command-references.js';
import type { GlobalConfig } from '../../src/core/global-config.js';
import { withUpstreamIdentity } from '../helpers/fork-identity.js';

const mockState = {
  config: { featureFlags: {}, profile: 'core', delivery: 'both' } as GlobalConfig,
};

// Isolate from the machine's actual profile/delivery settings.
vi.mock('../../src/core/global-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/global-config.js')>();
  return {
    ...actual,
    getGlobalConfig: () => ({ ...mockState.config }),
    saveGlobalConfig: vi.fn(),
  };
});

const require = createRequire(import.meta.url);
const { version: VERSION } = require('../../package.json') as { version: string };
const RELEASED_SKILLS = path.join(__dirname, '..', 'fixtures', 'released-output', 'v1.16.0-claude-skills');

/**
 * SpecAgile renamed its skills from `openspec-*` to `sa-*`. A project set up
 * by OpenSpec (or by the fork before the rename) is migrated by `init` and
 * `update`: untouched former skills go, anything of the user's stays. One
 * case per scenario of specs/fork-skill-names/spec.md.
 */
describe('migration of skills under their former openspec-* names', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let logs: string[];

  const shared = (...parts: string[]) => path.join(testDir, '.agents', 'skills', ...parts);
  const claude = (...parts: string[]) => path.join(testDir, '.claude', 'skills', ...parts);
  const former = (workflow: WorkflowId) => FORMER_SKILL_NAME_BY_WORKFLOW[workflow];
  const current = (workflow: WorkflowId) => SKILL_NAME_BY_WORKFLOW[workflow];

  /** The shared SKILL.md OpenSpec 2.0 wrote for a workflow: this version's text, upstream's names. */
  function upstreamSharedText(workflow: WorkflowId, installed: readonly string[] = CORE_WORKFLOWS): string {
    const entry = getSkillTemplates(installed).find((candidate) => candidate.workflowId === workflow)!;
    return withUpstreamIdentity(generateSkillContent(entry.template, VERSION, transformToSharedSkillReferences));
  }

  async function write(file: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  /** A link the way OpenSpec makes one; a junction on Windows, which needs no privilege. */
  async function link(target: string, at: string): Promise<void> {
    await fs.mkdir(path.dirname(at), { recursive: true });
    await fs.symlink(target, at, process.platform === 'win32' ? 'junction' : 'dir');
  }

  /**
   * A project OpenSpec set up: the core skills shared under their former
   * names. With `openspec init --tools claude`, Claude's own folder holds
   * links to them or, where links could not be made, copies; `shared-only` is
   * `openspec init --tools agents`, whose tool reads the shared folder itself.
   */
  async function openspecProject(claudeSpots: 'links' | 'copies' | 'shared-only' = 'copies'): Promise<void> {
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
    for (const workflow of CORE_WORKFLOWS) {
      await write(shared(former(workflow), 'SKILL.md'), upstreamSharedText(workflow));
      if (claudeSpots === 'links') await link(shared(former(workflow)), claude(former(workflow)));
      if (claudeSpots === 'copies') await write(claude(former(workflow), 'SKILL.md'), upstreamSharedText(workflow));
    }
    await write(shared('.openspec-target'), claudeSpots === 'shared-only' ? 'agents\n' : 'claude own-files\n');
  }

  async function update(): Promise<string> {
    const spy = vi.spyOn(console, 'log');
    await new UpdateCommand().execute(testDir);
    const output = spy.mock.calls.map((call) => call.join(' ')).join('\n');
    spy.mockRestore();
    logs.push(output);
    return output;
  }

  const isLink = async (p: string) => {
    try {
      return (await fs.lstat(p)).isSymbolicLink();
    } catch {
      return false;
    }
  };

  beforeEach(async () => {
    originalEnv = { ...process.env };
    testDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'specagile-former-skills-')));
    process.env.CODEX_HOME = path.join(testDir, 'codex-home');
    process.env.HOME = path.join(testDir, 'home');
    process.env.USERPROFILE = path.join(testDir, 'home');
    process.env.APPDATA = path.join(testDir, 'appdata');
    process.env.LOCALAPPDATA = path.join(testDir, 'localappdata');
    process.env.XDG_CONFIG_HOME = path.join(testDir, 'config');
    process.env.XDG_DATA_HOME = path.join(testDir, 'data');
    mockState.config = { featureFlags: {}, profile: 'core', delivery: 'both' };
    logs = [];
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('recognizes a project with only former skills as set up, and installs the sa-* skills', async () => {
    await openspecProject('copies');

    await update();

    for (const workflow of CORE_WORKFLOWS) {
      expect(existsSync(shared(current(workflow), 'SKILL.md')), current(workflow)).toBe(true);
      expect(existsSync(claude(current(workflow), 'SKILL.md')), current(workflow)).toBe(true);
    }
  });

  it('removes an untouched shared copy and OpenSpec link to it', async () => {
    await openspecProject('links');
    expect(await isLink(claude('openspec-propose'))).toBe(true);

    const output = await update();

    expect(existsSync(shared('openspec-propose'))).toBe(false);
    expect(await isLink(claude('openspec-propose'))).toBe(false);
    expect(existsSync(claude('openspec-propose'))).toBe(false);
    expect(existsSync(shared('sa-propose', 'SKILL.md'))).toBe(true);
    expect(existsSync(claude('sa-propose', 'SKILL.md'))).toBe(true);
    expect(output).toContain('Removed:');
  });

  it('removes untouched copies made where links could not be, and their empty folders', async () => {
    await openspecProject('copies');

    await update();

    for (const workflow of CORE_WORKFLOWS) {
      expect(existsSync(claude(former(workflow))), former(workflow)).toBe(false);
      expect(existsSync(shared(former(workflow))), former(workflow)).toBe(false);
    }
    expect(existsSync(claude('sa-propose', 'SKILL.md'))).toBe(true);
  });

  it('removes a former skill whose workflow the profile no longer installs, without installing it', async () => {
    await openspecProject('shared-only');
    await write(shared('openspec-onboard', 'SKILL.md'), upstreamSharedText('onboard', [...CORE_WORKFLOWS, 'onboard']));

    await update();

    expect(existsSync(shared('openspec-onboard'))).toBe(false);
    expect(existsSync(shared('sa-onboard'))).toBe(false);
  });

  it('keeps the user files beside an untouched SKILL.md', async () => {
    await openspecProject('shared-only');
    await write(shared('openspec-explore', 'notes.md'), 'my notes');

    await update();

    expect(existsSync(shared('openspec-explore', 'SKILL.md'))).toBe(false);
    expect(readFileSync(shared('openspec-explore', 'notes.md'), 'utf-8')).toBe('my notes');
  });

  it('keeps and reports an edited former skill, and still installs sa-implement', async () => {
    await openspecProject('shared-only');
    const edited = `${upstreamSharedText('apply')}\nOur team step.\n`;
    await write(shared('openspec-apply-change', 'SKILL.md'), edited);

    const output = await update();

    expect(readFileSync(shared('openspec-apply-change', 'SKILL.md'), 'utf-8')).toBe(edited);
    expect(output).toContain('.agents/skills/openspec-apply-change');
    expect(output).toMatch(/Kept \d+ skill/);
    expect(existsSync(shared('sa-implement', 'SKILL.md'))).toBe(true);
  });

  it('keeps and reports a former skill written by a newer OpenSpec than SpecAgile knows', async () => {
    await openspecProject('shared-only');
    const newer = upstreamSharedText('propose').replace(
      'Propose a new OpenSpec change',
      'Propose a brand-new OpenSpec change (wording from a later release)'
    );
    expect(newer).not.toBe(upstreamSharedText('propose'));
    await write(shared('openspec-propose', 'SKILL.md'), newer);

    const output = await update();

    expect(readFileSync(shared('openspec-propose', 'SKILL.md'), 'utf-8')).toBe(newer);
    expect(output).toContain('.agents/skills/openspec-propose');
  });

  it('leaves a former skill recorded with a keep line alone, without reporting it again', async () => {
    await openspecProject('shared-only');
    await write(shared('.openspec-target'), 'agents\nkeep openspec-propose\n');

    const output = await update();

    expect(existsSync(shared('openspec-propose', 'SKILL.md'))).toBe(true);
    expect(output).not.toContain('openspec-propose');
    // The record survives this run, so the next one leaves it alone too.
    expect(readFileSync(shared('.openspec-target'), 'utf-8')).toContain('keep openspec-propose');
  });

  it("leaves the user's link to another place alone, without reporting it", async () => {
    await openspecProject('copies');
    // The user replaced Claude's copy with a link to their team's skill.
    await fs.rm(claude('openspec-propose'), { recursive: true });
    const elsewhere = path.join(testDir, 'team-skills', 'propose');
    await write(path.join(elsewhere, 'SKILL.md'), 'our team skill');
    await link(elsewhere, claude('openspec-propose'));

    const output = await update();

    expect(await isLink(claude('openspec-propose'))).toBe(true);
    expect(readFileSync(path.join(elsewhere, 'SKILL.md'), 'utf-8')).toBe('our team skill');
    expect(output).not.toContain('.claude/skills/openspec-propose');
  });

  it('never touches a user skill that only shares the prefix', async () => {
    await openspecProject('shared-only');
    await write(shared('openspec-helpers', 'SKILL.md'), 'my helpers');

    const output = await update();

    expect(readFileSync(shared('openspec-helpers', 'SKILL.md'), 'utf-8')).toBe('my helpers');
    expect(output).not.toContain('openspec-helpers');
  });

  it('removes an untouched copy a 1.x release wrote in the tool folder', async () => {
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
    await write(
      claude('openspec-explore', 'SKILL.md'),
      readFileSync(path.join(RELEASED_SKILLS, 'openspec-explore', 'SKILL.md'), 'utf-8')
    );

    await update();

    expect(existsSync(claude('openspec-explore'))).toBe(false);
    expect(existsSync(shared('sa-explore', 'SKILL.md'))).toBe(true);
  });

  it('plans the migration in a dry run without changing a file', async () => {
    await openspecProject('shared-only');
    const edited = `${upstreamSharedText('apply')}\nOur team step.\n`;
    await write(shared('openspec-apply-change', 'SKILL.md'), edited);
    const before = readFileSync(shared('openspec-propose', 'SKILL.md'), 'utf-8');

    const plan = await new UpdateCommand({ dryRun: true }).plan(testDir);

    expect(plan.changes).toContainEqual(
      expect.objectContaining({ path: '.agents/skills/openspec-propose/SKILL.md', action: 'delete' })
    );
    expect(plan.notes.map((note) => note.message).join('\n')).toContain('.agents/skills/openspec-apply-change');
    expect(readFileSync(shared('openspec-propose', 'SKILL.md'), 'utf-8')).toBe(before);
    expect(existsSync(shared('sa-propose'))).toBe(false);
  });

  it('recognizes as untouched the 2.0.0 text of every workflow', async () => {
    const every = Object.keys(FORMER_SKILL_NAME_BY_WORKFLOW) as WorkflowId[];
    mockState.config = { featureFlags: {}, profile: 'custom', delivery: 'both', workflows: every };
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
    for (const workflow of every) {
      await write(shared(former(workflow), 'SKILL.md'), upstreamSharedText(workflow, every));
    }
    await write(shared('.openspec-target'), 'agents\n');

    await update();

    for (const workflow of every) {
      expect(existsSync(shared(former(workflow))), former(workflow)).toBe(false);
      expect(existsSync(shared(current(workflow), 'SKILL.md')), current(workflow)).toBe(true);
    }
  });

  it('migrates on init too', async () => {
    await openspecProject('copies');

    const spy = vi.spyOn(console, 'log');
    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
    spy.mockRestore();

    expect(existsSync(shared('openspec-propose'))).toBe(false);
    expect(existsSync(claude('openspec-propose'))).toBe(false);
    expect(existsSync(claude('sa-propose', 'SKILL.md'))).toBe(true);
  });
});
