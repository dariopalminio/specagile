import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getToolDir } from '../helpers/layout.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

async function runConfigCommand(args: string[]): Promise<void> {
  const { registerConfigCommand } = await import('../../src/cli/commands/config.js');
  const program = new Command();
  registerConfigCommand(program);
  await program.parseAsync(['node', 'openspec', 'config', ...args]);
}

async function getPromptMocks(): Promise<{
  select: ReturnType<typeof vi.fn>;
  checkbox: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
}> {
  const prompts = await import('@inquirer/prompts');
  return {
    select: prompts.select as unknown as ReturnType<typeof vi.fn>,
    checkbox: prompts.checkbox as unknown as ReturnType<typeof vi.fn>,
    confirm: prompts.confirm as unknown as ReturnType<typeof vi.fn>,
  };
}

describe('diffProfileState workflow formatting', () => {
  it('uses explicit "removed" wording when workflows are deleted', async () => {
    const { diffProfileState } = await import('../../src/commands/config.js');

    const diff = diffProfileState(
      { profile: 'custom', delivery: 'both', workflows: ['propose', 'sync'] },
      { profile: 'custom', delivery: 'both', workflows: ['propose'] },
    );

    expect(diff.hasChanges).toBe(true);
    expect(diff.lines).toEqual(['workflows: removed sync']);
  });

  it('uses explicit labels when workflows are added and removed', async () => {
    const { diffProfileState } = await import('../../src/commands/config.js');

    const diff = diffProfileState(
      { profile: 'custom', delivery: 'both', workflows: ['propose', 'sync'] },
      { profile: 'custom', delivery: 'both', workflows: ['propose', 'verify'] },
    );

    expect(diff.hasChanges).toBe(true);
    expect(diff.lines).toEqual(['workflows: added verify; removed sync']);
  });
});

describe('deriveProfileFromWorkflowSelection', () => {
  it('returns custom for an empty workflow selection', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection([])).toBe('custom');
  });

  it('returns custom when selection is a superset of core workflows', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive', 'new'])).toBe('custom');
  });

  it('returns core when selection has exactly core workflows in different order', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['archive', 'sync', 'update', 'verify', 'apply', 'tasks', 'plan', 'specify', 'explore', 'propose'])).toBe('core');
  });

  it('returns custom for the nine workflows that made up core before verify', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'update', 'sync', 'archive'])).toBe('custom');
  });

  it('returns custom for the six workflows that made up core before specify and plan', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['propose', 'explore', 'apply', 'update', 'sync', 'archive'])).toBe('custom');
  });

  it('returns custom for the eight workflows that made up core before tasks', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['propose', 'explore', 'specify', 'plan', 'apply', 'update', 'sync', 'archive'])).toBe('custom');
  });
});

describe('config profile interactive flow', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let originalTTY: boolean | undefined;
  let originalExitCode: number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  function setupDriftedProjectArtifacts(projectDir: string): void {
    fs.mkdirSync(getToolDir(projectDir), { recursive: true });
    const exploreSkillPath = path.join(projectDir, '.claude', 'skills', 'sa-explore', 'SKILL.md');
    fs.mkdirSync(path.dirname(exploreSkillPath), { recursive: true });
    fs.writeFileSync(exploreSkillPath, 'name: sa-explore\n', 'utf-8');
  }

  function setupSyncedCoreBothArtifacts(projectDir: string): void {
    fs.mkdirSync(getToolDir(projectDir), { recursive: true });
    const coreSkillDirs = [
      'sa-propose',
      'sa-explore',
      'sa-specify',
      'sa-plan',
      'sa-tasks',
      'sa-implement',
      'sa-audit',
      'sa-update-change',
      'sa-sync-specs',
      'sa-archive',
    ];
    // As 2.0 writes them: one shared copy, Claude's links to it, Claude listed.
    for (const dirName of coreSkillDirs) {
      const sharedDir = path.join(projectDir, '.agents', 'skills', dirName);
      fs.mkdirSync(sharedDir, { recursive: true });
      fs.writeFileSync(path.join(sharedDir, 'SKILL.md'), `name: ${dirName}\n`, 'utf-8');
      const linkPath = path.join(projectDir, '.claude', 'skills', dirName);
      fs.mkdirSync(path.dirname(linkPath), { recursive: true });
      fs.symlinkSync(
        process.platform === 'win32' ? sharedDir : path.join('..', '..', '.agents', 'skills', dirName),
        linkPath,
        process.platform === 'win32' ? 'junction' : 'dir'
      );
    }
    fs.writeFileSync(path.join(projectDir, '.agents', 'skills', '.openspec-target'), 'claude own-files\n', 'utf-8');

  }

  function addExtraNewWorkflowArtifacts(projectDir: string): void {
    // As 2.0 writes it: the shared copy and Claude's link to it.
    const dirName = 'sa-new-change';
    const sharedDir = path.join(projectDir, '.agents', 'skills', dirName);
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(path.join(sharedDir, 'SKILL.md'), `name: ${dirName}\n`, 'utf-8');
    fs.symlinkSync(
      process.platform === 'win32' ? sharedDir : path.join('..', '..', '.agents', 'skills', dirName),
      path.join(projectDir, '.claude', 'skills', dirName),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  }

  beforeEach(() => {
    vi.resetModules();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-config-profile-test-'));

    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalTTY = (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;

    process.env.XDG_CONFIG_HOME = tempDir;
    // Never the real home: Codex prompts there would count as a tool here.
    process.env.CODEX_HOME = path.join(tempDir, 'codex-home');
    // Nor for global-skill tools (MiniMax Code's ~/.minimax/skills): an
    // in-process update would detect and rewrite them.
    process.env.HOME = path.join(tempDir, 'home');
    process.env.USERPROFILE = path.join(tempDir, 'home');
    process.chdir(tempDir);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = true;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = originalEnv;
    process.chdir(originalCwd);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = originalTTY;
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('action picker should use configure wording and describe each path', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    const firstCall = select.mock.calls[0][0];
    expect(firstCall.message).toBe('What do you want to configure?');
    // OpenSpec 2.0 installs skills only, so there is no delivery to configure.
    expect(firstCall.choices.map((choice: { value: string }) => choice.value)).toEqual(['workflows', 'keep']);
    expect(firstCall.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 'workflows',
        description: 'Change which workflow actions are available',
      }),
      expect.objectContaining({
        value: 'keep',
        name: 'Keep current settings (exit)',
      }),
    ]));
  });

  it('workflows-only action should not invoke delivery prompt', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { ALL_WORKFLOWS } = await import('../../src/core/profiles.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore']);

    await runConfigCommand(['profile']);

    expect(select).toHaveBeenCalledTimes(1);
    expect(checkbox).toHaveBeenCalledTimes(1);
    const checkboxCall = checkbox.mock.calls[0][0];
    expect(checkboxCall.pageSize).toBe(ALL_WORKFLOWS.length);
    expect(checkboxCall.theme).toEqual({
      icon: {
        checked: '[x]',
        unchecked: '[ ]',
      },
    });
    const proposeChoice = checkboxCall.choices.find((choice: { value: string }) => choice.value === 'propose');
    const onboardChoice = checkboxCall.choices.find((choice: { value: string }) => choice.value === 'onboard');
    expect(proposeChoice.checked).toBe(true);
    expect(onboardChoice.checked).toBe(false);
    expect(getGlobalConfig().workflows).toEqual(['propose', 'explore']);
  });

  it('workflow picker should use friendly names with descriptions', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    const checkboxCall = checkbox.mock.calls[0][0];
    expect(checkboxCall.message).toBe('Select workflows to make available:');
    expect(checkboxCall.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 'propose',
        name: 'Propose change',
        description: 'Create proposal, design, and tasks from a request',
      }),
      expect.objectContaining({
        value: 'verify',
        name: 'Audit change',
        description: 'Audit a change before its pull request',
      }),
    ]));
  });

  it('workflow picker lists specify, plan and tasks, checked for the core profile', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { CORE_WORKFLOWS } = await import('../../src/core/profiles.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: [...CORE_WORKFLOWS] });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce([...CORE_WORKFLOWS]);

    await runConfigCommand(['profile']);

    expect(checkbox.mock.calls[0][0].choices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 'specify',
        name: 'Specify change',
        description: 'Create or edit proposal and specs',
        checked: true,
      }),
      expect.objectContaining({
        value: 'plan',
        name: 'Plan change',
        description: 'Create design from specs',
        checked: true,
      }),
      expect.objectContaining({
        value: 'tasks',
        name: 'Write tasks',
        description: 'Create tasks from specs and design',
        checked: true,
      }),
    ]));
    const values: string[] = checkbox.mock.calls[0][0].choices.map((choice: { value: string }) => choice.value);
    expect(values.indexOf('tasks')).toBe(values.indexOf('plan') + 1);
  });

  it('workflow picker checks Audit change with the other core workflows for the core profile', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { CORE_WORKFLOWS } = await import('../../src/core/profiles.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce([...CORE_WORKFLOWS]);

    await runConfigCommand(['profile']);

    const choices: Array<{ value: string; name: string; checked: boolean }> = checkbox.mock.calls[0][0].choices;
    expect(choices.find((choice) => choice.value === 'verify')).toEqual(
      expect.objectContaining({ name: 'Audit change', checked: true })
    );
    expect(choices.filter((choice) => choice.checked).map((choice) => choice.value).sort())
      .toEqual([...CORE_WORKFLOWS].sort());
  });

  it('unchecking Audit change saves a custom profile without verify', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { CORE_WORKFLOWS } = await import('../../src/core/profiles.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });
    select.mockResolvedValueOnce('workflows');
    const withoutVerify = CORE_WORKFLOWS.filter((workflow) => workflow !== 'verify');
    checkbox.mockResolvedValueOnce(withoutVerify);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().profile).toBe('custom');
    expect(getGlobalConfig().workflows).toEqual(withoutVerify);
  });

  it('selecting the ten core workflows from a custom profile without verify saves the core profile', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { CORE_WORKFLOWS } = await import('../../src/core/profiles.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      delivery: 'both',
      workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'update', 'sync', 'archive'],
    });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce([...CORE_WORKFLOWS]);

    await runConfigCommand(['profile']);

    expect(CORE_WORKFLOWS).toHaveLength(10);
    expect(getGlobalConfig().profile).toBe('core');
    expect(getGlobalConfig().workflows).toEqual([...CORE_WORKFLOWS]);
  });

  it('workflow picker leaves plan and tasks unchecked for a custom profile without them', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'both', workflows: ['propose', 'specify', 'apply'] });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'specify', 'apply']);

    await runConfigCommand(['profile']);

    const choices: Array<{ value: string; checked: boolean }> = checkbox.mock.calls[0][0].choices;
    expect(choices.find((choice) => choice.value === 'specify')?.checked).toBe(true);
    expect(choices.find((choice) => choice.value === 'plan')?.checked).toBe(false);
    expect(choices.find((choice) => choice.value === 'tasks')?.checked).toBe(false);
  });

  it('selecting current values only should be a no-op and should not ask apply', async () => {
    const { saveGlobalConfig, getGlobalConfigPath } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    const configPath = getGlobalConfigPath();
    const beforeContent = fs.readFileSync(configPath, 'utf-8');

    fs.mkdirSync(getToolDir(tempDir), { recursive: true });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    const afterContent = fs.readFileSync(configPath, 'utf-8');
    expect(afterContent).toBe(beforeContent);
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
  });

  it('should preserve a custom profile when dependency expansion matches the core set', async () => {
    const { saveGlobalConfig, getGlobalConfig, getGlobalConfigPath } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      delivery: 'both',
      workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'archive'],
    });
    const configPath = getGlobalConfigPath();
    const beforeContent = fs.readFileSync(configPath, 'utf-8');

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().profile).toBe('custom');
    expect(fs.readFileSync(configPath, 'utf-8')).toBe(beforeContent);
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
  });

  it('keep action should warn when project files drift from global config', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    setupDriftedProjectArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('keep action should not warn when project files are already synced', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    setupSyncedCoreBothArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    const allLogs = consoleLogSpy.mock.calls.map((args) => args.map(String).join(' '));
    expect(allLogs.some((line) => line.includes('Warning: Global config is not applied to this project.'))).toBe(false);
  });

  it('effective no-op after prompts should warn when project files drift', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    setupDriftedProjectArtifacts(tempDir);
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('keep action should warn when project has extra workflows beyond global config', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    setupSyncedCoreBothArtifacts(tempDir);
    addExtraNewWorkflowArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('changed config should save and ask apply when inside project', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    fs.mkdirSync(getToolDir(tempDir), { recursive: true });

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply']);
    confirm.mockResolvedValueOnce(false);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().workflows).toEqual(['propose', 'explore', 'apply']);
    expect(confirm).toHaveBeenCalledWith({
      message: 'Apply changes to this project now?',
      default: true,
    });
  });

  it('confirmed project apply should update in process without resolving openspec from PATH', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    fs.mkdirSync(getToolDir(tempDir), { recursive: true });
    const emptyBinDir = path.join(tempDir, 'empty-bin');
    fs.mkdirSync(emptyBinDir);
    vi.stubEnv('PATH', emptyBinDir);

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply']);
    confirm.mockResolvedValueOnce(true);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().workflows).toEqual(['propose', 'explore', 'apply']);
    expect(process.exitCode).toBeUndefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No configured tools found.');
    expect(consoleLogSpy).toHaveBeenCalledWith('Run `specagile update` in your other projects to apply.');
  });

  it('confirmed project apply should report the update failure reason', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { UpdateCommand } = await import('../../src/core/update.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive'] });
    fs.mkdirSync(getToolDir(tempDir), { recursive: true });
    const executeSpy = vi.spyOn(UpdateCommand.prototype, 'execute')
      .mockRejectedValueOnce(new Error('permission denied'));

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply']);
    confirm.mockResolvedValueOnce(true);

    try {
      await runConfigCommand(['profile']);
    } finally {
      executeSpy.mockRestore();
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith('`specagile update` failed: permission denied');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Please run it manually to apply the profile changes.');
    expect(process.exitCode).toBe(1);
  });

  it('core preset should preserve delivery setting', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'skills', workflows: ['explore'] });

    await runConfigCommand(['profile', 'core']);

    const config = getGlobalConfig();
    expect(config.profile).toBe('core');
    expect(config.delivery).toBe('skills');
    expect(config.workflows).toEqual(['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'verify', 'update', 'sync', 'archive']);
    expect(select).not.toHaveBeenCalled();
    expect(checkbox).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('core preset brings a custom profile without verify back to the ten core workflows', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');

    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      delivery: 'both',
      workflows: ['propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'update', 'sync', 'archive'],
    });

    await runConfigCommand(['profile', 'core']);

    expect(getGlobalConfig().profile).toBe('core');
    expect(getGlobalConfig().workflows).toContain('verify');
    expect(getGlobalConfig().workflows).toHaveLength(10);
  });

  it('config list names verify among the workflows from the core profile', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });

    await runConfigCommand(['list']);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '  workflows: propose, explore, specify, plan, tasks, apply, verify, update, sync, archive (from core profile)'
    );
  });

  it('Ctrl+C should cancel without stack trace and set interrupted exit code', async () => {
    const { select, checkbox, confirm } = await getPromptMocks();
    const cancellationError = new Error('User force closed the prompt with SIGINT');
    cancellationError.name = 'ExitPromptError';

    select.mockRejectedValueOnce(cancellationError);

    await expect(runConfigCommand(['profile'])).resolves.toBeUndefined();

    expect(consoleLogSpy).toHaveBeenCalledWith('Config profile cancelled.');
    expect(process.exitCode).toBe(130);
    expect(checkbox).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});
