import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CLI_NAME, GLOBAL_FOLDER_NAME } from '../../src/core/fork/identity.js';
import {
  GLOBAL_CONFIG_DIR_NAME,
  GLOBAL_DATA_DIR_NAME,
  getGlobalConfig,
  getGlobalConfigPath,
  getGlobalDataDir,
} from '../../src/core/global-config.js';
import { AI_TOOLS } from '../../src/core/config.js';
import { computeProfileMigration } from '../../src/core/migration.js';
import { registerStore } from '../../src/core/store/registry.js';
import { listStores } from '../../src/core/store/operations.js';
import { runCLI } from '../helpers/run-cli.js';
import { createFormerLayout } from '../helpers/layout.js';

/**
 * SpecAgile keeps its global config and data in `specagile` folders of its own
 * and never reads OpenSpec's `openspec` ones; with no `profile` saved, `core`
 * applies and none is inferred from installed skills. See "SpecAgile
 * identity" in FORK.md. This file pins the folder names, so its expected paths
 * are spelled out instead of going through test/helpers/global-folders.ts.
 */

const SPECAGILE = 'specagile';
const OPENSPEC = 'openspec';

// getGlobalConfigDir() asks the os module for the platform and the home folder.
const host = vi.hoisted(() => ({
  platform: undefined as NodeJS.Platform | undefined,
  homedir: undefined as string | undefined,
}));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  const mocked = {
    ...actual,
    platform: () => host.platform ?? actual.platform(),
    homedir: () => host.homedir ?? actual.homedir(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

const CORE_SKILLS = [
  'sa-archive',
  'sa-audit',
  'sa-explore',
  'sa-implement',
  'sa-plan',
  'sa-propose',
  'sa-specify',
  'sa-sync-specs',
  'sa-tasks',
  'sa-update-change',
];

const OPENSPEC_CORE_SKILLS = [
  'openspec-propose',
  'openspec-explore',
  'openspec-apply-change',
  'openspec-archive-change',
];

const RELEASED_SKILLS = path.join(__dirname, '..', 'fixtures', 'released-output', 'v1.16.0-claude-skills');
const CLAUDE = AI_TOOLS.find((tool) => tool.value === 'claude')!;
const CLI_TIMEOUT = 120_000;

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  process.env = savedEnv;
  host.platform = undefined;
  host.homedir = undefined;
  vi.restoreAllMocks();
});

describe('the global folder name', () => {
  it('is specagile, the CLI name, for config and for data', () => {
    expect(GLOBAL_FOLDER_NAME).toBe(SPECAGILE);
    expect(GLOBAL_FOLDER_NAME).toBe(CLI_NAME);
    expect(GLOBAL_CONFIG_DIR_NAME).toBe(GLOBAL_FOLDER_NAME);
    expect(GLOBAL_DATA_DIR_NAME).toBe(GLOBAL_FOLDER_NAME);
  });
});

describe('the global config folder, by platform', () => {
  const root = path.parse(process.cwd()).root;

  it.each(['win32', 'darwin', 'linux'] as const)('is $XDG_CONFIG_HOME/specagile on %s', (platform) => {
    host.platform = platform;
    process.env.XDG_CONFIG_HOME = path.join(root, 'srv', 'conf');

    expect(getGlobalConfigPath()).toBe(path.join(root, 'srv', 'conf', SPECAGILE, 'config.json'));
  });

  it('is %APPDATA%\\specagile on Windows', () => {
    host.platform = 'win32';
    delete process.env.XDG_CONFIG_HOME;
    process.env.APPDATA = 'C:\\Users\\Ana\\AppData\\Roaming';

    expect(getGlobalConfigPath()).toBe(path.join(process.env.APPDATA, SPECAGILE, 'config.json'));
    if (process.platform === 'win32') {
      expect(getGlobalConfigPath()).toBe('C:\\Users\\Ana\\AppData\\Roaming\\specagile\\config.json');
    }
  });

  it('is AppData\\Roaming\\specagile in the home folder on Windows without %APPDATA%', () => {
    host.platform = 'win32';
    host.homedir = 'C:\\Users\\Ana';
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;

    expect(getGlobalConfigPath()).toBe(path.join('C:\\Users\\Ana', 'AppData', 'Roaming', SPECAGILE, 'config.json'));
  });

  it.each(['darwin', 'linux'] as const)('is ~/.config/specagile on %s', (platform) => {
    host.platform = platform;
    host.homedir = path.join(root, 'home', 'ana');
    delete process.env.XDG_CONFIG_HOME;

    expect(getGlobalConfigPath()).toBe(path.join(root, 'home', 'ana', '.config', SPECAGILE, 'config.json'));
  });
});

describe('the global data folder, by platform', () => {
  it('is $XDG_DATA_HOME/specagile on every platform', () => {
    expect(getGlobalDataDir({ env: { XDG_DATA_HOME: '/srv/data' }, platform: 'linux', homedir: '/home/ana' })).toBe(
      path.posix.join('/srv/data', SPECAGILE)
    );
    expect(getGlobalDataDir({ env: { XDG_DATA_HOME: '/srv/data' }, platform: 'darwin', homedir: '/Users/ana' })).toBe(
      path.posix.join('/srv/data', SPECAGILE)
    );
    expect(
      getGlobalDataDir({ env: { XDG_DATA_HOME: 'D:\\data' }, platform: 'win32', homedir: 'C:\\Users\\Ana' })
    ).toBe(path.win32.join('D:\\data', SPECAGILE));
  });

  it('is %LOCALAPPDATA%\\specagile on Windows, or AppData\\Local\\specagile without it', () => {
    expect(
      getGlobalDataDir({
        env: { LOCALAPPDATA: 'C:\\Users\\Ana\\AppData\\Local' },
        platform: 'win32',
        homedir: 'C:\\Users\\Ana',
      })
    ).toBe(path.win32.join('C:\\Users\\Ana\\AppData\\Local', SPECAGILE));
    expect(getGlobalDataDir({ env: {}, platform: 'win32', homedir: 'C:\\Users\\Ana' })).toBe(
      path.win32.join('C:\\Users\\Ana', 'AppData', 'Local', SPECAGILE)
    );
  });

  it('is ~/.local/share/specagile on macOS and Linux', () => {
    expect(getGlobalDataDir({ env: {}, platform: 'linux', homedir: '/home/ana' })).toBe(
      path.posix.join('/home/ana', '.local', 'share', SPECAGILE)
    );
    expect(getGlobalDataDir({ env: {}, platform: 'darwin', homedir: '/Users/ana' })).toBe(
      path.posix.join('/Users/ana', '.local', 'share', SPECAGILE)
    );
  });
});

/** A sandbox with OpenSpec's global folders beside SpecAgile's (still missing). */
function sandbox() {
  const box = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-global-folders-')));
  const configHome = path.join(box, 'config');
  const dataHome = path.join(box, 'data');
  const home = path.join(box, 'home');
  fs.mkdirSync(home, { recursive: true });
  return {
    box,
    configHome,
    dataHome,
    home,
    env: {
      XDG_CONFIG_HOME: configHome,
      XDG_DATA_HOME: dataHome,
      APPDATA: path.join(box, 'appdata'),
      LOCALAPPDATA: path.join(box, 'localappdata'),
      HOME: home,
      USERPROFILE: home,
      CODEX_HOME: path.join(home, '.codex'),
    } satisfies NodeJS.ProcessEnv,
    specagileConfigDir: path.join(configHome, SPECAGILE),
    specagileConfigFile: path.join(configHome, SPECAGILE, 'config.json'),
  };
}

type Sandbox = ReturnType<typeof sandbox>;

/**
 * OpenSpec's config with a custom profile, dated in the past so that any
 * rewrite would show in its modification time.
 */
function writeOpenSpecConfig(configHome: string) {
  const file = path.join(configHome, OPENSPEC, 'config.json');
  const content = `${JSON.stringify(
    { featureFlags: {}, profile: 'custom', workflows: ['propose', 'explore', 'apply', 'archive'] },
    null,
    2
  )}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  const past = new Date('2020-01-01T00:00:00Z');
  fs.utimesSync(file, past, past);
  const mtimeMs = fs.statSync(file).mtimeMs;

  return {
    file,
    expectUnchanged() {
      expect(fs.readFileSync(file, 'utf-8')).toBe(content);
      expect(fs.statSync(file).mtimeMs).toBe(mtimeMs);
    },
  };
}

/** The core skills OpenSpec 1.16 wrote into a Claude project. */
function writeOpenSpecSkills(project: string): void {
  for (const name of OPENSPEC_CORE_SKILLS) {
    const target = path.join(project, '.claude', 'skills', name, 'SKILL.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(RELEASED_SKILLS, name, 'SKILL.md'), target);
  }
}

/** The skills Claude Code sees in a project. */
function claudeSkills(project: string): string[] {
  const dir = path.join(project, '.claude', 'skills');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => fs.existsSync(path.join(dir, name, 'SKILL.md')))
    .sort();
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
}

describe('OpenSpec\'s global folders, in process', () => {
  let s: Sandbox;

  beforeEach(() => {
    s = sandbox();
    Object.assign(process.env, s.env);
  });

  afterEach(() => {
    fs.rmSync(s.box, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('reads the core profile beside a custom OpenSpec config, leaving it as it was and creating nothing', () => {
    const openspecConfig = writeOpenSpecConfig(s.configHome);

    const config = getGlobalConfig();

    expect(config.profile).toBe('core');
    expect(config.workflows).toBeUndefined();
    openspecConfig.expectUnchanged();
    expect(fs.existsSync(s.specagileConfigDir)).toBe(false);
  });

  it('lists no store registered in OpenSpec\'s data folder, until SpecAgile registers it', async () => {
    const storeRoot = path.join(s.box, 'stores', 'team');
    fs.mkdirSync(storeRoot, { recursive: true });
    const openspecData = path.join(s.dataHome, OPENSPEC);
    await registerStore({ id: 'team', localPath: storeRoot, globalDataDir: openspecData });
    const openspecRegistry = path.join(openspecData, 'stores', 'registry.yaml');
    const registryBefore = fs.readFileSync(openspecRegistry, 'utf-8');

    expect((await listStores()).stores).toEqual([]);

    await registerStore({ id: 'team', localPath: storeRoot });

    expect((await listStores()).stores.map((store) => store.id)).toEqual(['team']);
    expect(fs.existsSync(path.join(s.dataHome, SPECAGILE, 'stores', 'registry.yaml'))).toBe(true);
    expect(fs.readFileSync(openspecRegistry, 'utf-8')).toBe(registryBefore);
  });

  it('infers no profile from OpenSpec\'s core skills when its config has none', () => {
    const project = path.join(s.box, 'project');
    writeOpenSpecSkills(project);

    expect(computeProfileMigration(project, [CLAUDE])).toBeNull();
  });

  it('saves the custom profile chosen with config profile in its own folder, leaving OpenSpec\'s alone', async () => {
    const openspecConfig = writeOpenSpecConfig(s.configHome);
    const prompts = await import('@inquirer/prompts');
    vi.mocked(prompts.select).mockResolvedValue('workflows');
    vi.mocked(prompts.checkbox).mockResolvedValue(['propose', 'explore']);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const cwd = process.cwd();
    const tty = process.stdout.isTTY;
    try {
      process.chdir(s.box);
      process.stdout.isTTY = true;
      const { configProfileCommand } = await import('../../src/commands/config.js');
      await configProfileCommand();
    } finally {
      process.chdir(cwd);
      process.stdout.isTTY = tty;
    }

    expect(readJson(s.specagileConfigFile)).toMatchObject({ profile: 'custom', workflows: ['propose', 'explore'] });
    openspecConfig.expectUnchanged();
  });
});

describe('specagile beside OpenSpec\'s global folders', () => {
  let s: Sandbox;

  beforeEach(() => {
    s = sandbox();
  });

  afterEach(() => {
    fs.rmSync(s.box, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function project(): string {
    const dir = path.join(s.box, 'project');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** A project OpenSpec 1.16 set up: the openspec/ layout and its core skills. */
  function openspecProject(): string {
    const dir = project();
    createFormerLayout(dir);
    writeOpenSpecSkills(dir);
    return dir;
  }

  it('config path names the specagile folder', async () => {
    const result = await runCLI(['config', 'path'], { cwd: s.box, env: s.env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe(s.specagileConfigFile);
  });

  it('config list shows the core profile on a first run, and creates no folder', async () => {
    const openspecConfig = writeOpenSpecConfig(s.configHome);

    const result = await runCLI(['config', 'list'], { cwd: s.box, env: s.env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/profile:\s*core/);
    expect(fs.existsSync(s.specagileConfigDir)).toBe(false);
    openspecConfig.expectUnchanged();
  });

  it('config profile core creates the specagile config', async () => {
    const openspecConfig = writeOpenSpecConfig(s.configHome);

    const result = await runCLI(['config', 'profile', 'core'], { cwd: s.box, env: s.env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(readJson(s.specagileConfigFile).profile).toBe('core');
    openspecConfig.expectUnchanged();
  });

  it('init installs the core skills when OpenSpec\'s config has a custom profile', async () => {
    const openspecConfig = writeOpenSpecConfig(s.configHome);
    const dir = project();

    const result = await runCLI(['init', '--tools', 'claude'], { cwd: dir, env: s.env, timeoutMs: CLI_TIMEOUT });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(claudeSkills(dir)).toEqual(CORE_SKILLS);
    openspecConfig.expectUnchanged();
  }, CLI_TIMEOUT);

  it('update installs the core skills in a project with OpenSpec\'s skills, and infers no profile', async () => {
    const openspecConfig = writeOpenSpecConfig(s.configHome);
    const dir = openspecProject();

    const result = await runCLI(['update'], { cwd: dir, env: s.env, timeoutMs: CLI_TIMEOUT });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).not.toContain('Migrated: custom profile');
    expect(claudeSkills(dir)).toEqual(expect.arrayContaining(CORE_SKILLS));
    if (fs.existsSync(s.specagileConfigFile)) {
      expect(readJson(s.specagileConfigFile).profile).not.toBe('custom');
    }
    openspecConfig.expectUnchanged();
  }, CLI_TIMEOUT);

  it('update --dry-run plans the core skills and no write of the global config', async () => {
    const dir = openspecProject();

    const result = await runCLI(['update', '--dry-run', '--json'], { cwd: dir, env: s.env, timeoutMs: CLI_TIMEOUT });

    expect(result.exitCode, result.stderr).toBe(0);
    const paths: string[] = JSON.parse(result.stdout).changes.map((change: { path: string }) => change.path);
    expect(paths.some((p) => p.endsWith('sa-specify/SKILL.md')), paths.join('\n')).toBe(true);
    expect(paths.some((p) => p.endsWith('sa-plan/SKILL.md')), paths.join('\n')).toBe(true);
    expect(paths.some((p) => p.endsWith('sa-tasks/SKILL.md')), paths.join('\n')).toBe(true);
    const configPath = path.relative(dir, s.specagileConfigFile).split(path.sep).join('/');
    expect(paths).not.toContain(configPath);
    expect(paths.filter((p) => p.endsWith('/config.json'))).toEqual([]);
    expect(fs.existsSync(s.specagileConfigDir)).toBe(false);
  }, CLI_TIMEOUT);

  it('init respects a custom profile saved in the specagile config', async () => {
    // What `specagile config profile` saves after choosing these workflows.
    fs.mkdirSync(s.specagileConfigDir, { recursive: true });
    fs.writeFileSync(
      s.specagileConfigFile,
      `${JSON.stringify({ featureFlags: {}, profile: 'custom', workflows: ['propose', 'explore', 'apply', 'archive'] }, null, 2)}\n`
    );
    const dir = project();

    const result = await runCLI(['init', '--tools', 'claude'], { cwd: dir, env: s.env, timeoutMs: CLI_TIMEOUT });

    expect(result.exitCode, result.stderr).toBe(0);
    const skills = claudeSkills(dir);
    expect(skills).toEqual(expect.arrayContaining(['sa-archive', 'sa-explore', 'sa-implement', 'sa-propose', 'sa-sync-specs']));
    expect(skills).not.toContain('sa-specify');
    expect(skills).not.toContain('sa-plan');
    expect(skills).not.toContain('sa-tasks');
  }, CLI_TIMEOUT);
});

/**
 * Every global path in src/ goes through getGlobalConfigDir() or
 * getGlobalDataDir(). This guard walks src/ and fails on a line that joins an
 * `openspec` folder to a platform's global root (APPDATA, LOCALAPPDATA,
 * .config, .local/share, XDG_*_HOME), so a sync that brings a global path
 * built by hand is caught here. Comment lines don't count.
 */

const repoRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(repoRoot, 'src');

/** Lines that join `openspec` to a global root on purpose, with the reason. */
const ALLOWED_GLOBAL_PATHS: ReadonlyArray<{ file: string; text: RegExp; reason: string }> = [
  {
    file: 'src/commands/install-standalone.ts',
    text: /path\.join\(localAppData, 'Programs', 'openspec'\)/,
    reason: "OpenSpec's standalone install folder; SpecAgile never runs it",
  },
];

const GLOBAL_ROOT = /APPDATA|AppData|['"`]\.config['"`]|\.config[\\/]|['"`]\.local['"`]|\.local[\\/]|XDG_[A-Z]+_HOME/;
const OPENSPEC_FOLDER = /['"`]openspec['"`]|[\\/]openspec(?![\w.-])/;
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
const withoutTrailingComment = (line: string) => line.replace(/\s\/\/\s.*$/, '');

/** The lines of `source` (a file at `rel`) that build an `openspec` global path. */
function openspecGlobalPaths(rel: string, source: string): string[] {
  const allowed = ALLOWED_GLOBAL_PATHS.filter((entry) => entry.file === rel).map((entry) => entry.text);
  const found: string[] = [];
  source.split(/\r?\n/).forEach((line, index) => {
    if (isComment(line)) return;
    const code = withoutTrailingComment(line);
    if (!GLOBAL_ROOT.test(code) || !OPENSPEC_FOLDER.test(code)) return;
    if (allowed.some((text) => text.test(code))) return;
    found.push(`${rel}:${index + 1}: ${code.trim()}`);
  });
  return found;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (entry.name.endsWith('.ts')) yield full;
  }
}

describe('global paths in src/', () => {
  it('builds no openspec global folder by hand', () => {
    const found: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      const rel = path.relative(repoRoot, file).split(path.sep).join('/');
      found.push(...openspecGlobalPaths(rel, fs.readFileSync(file, 'utf-8')));
    }
    expect(found, `use getGlobalConfigDir() or getGlobalDataDir():\n${found.join('\n')}`).toEqual([]);
  });

  it('catches a global path built by hand, also in a file with an allowed line', () => {
    expect(openspecGlobalPaths('src/core/list.ts', "  const dir = path.join(os.homedir(), '.config', 'openspec');")).toHaveLength(1);
    expect(openspecGlobalPaths('src/core/list.ts', "  const dir = path.join(process.env.LOCALAPPDATA!, 'openspec');")).toHaveLength(1);
    expect(openspecGlobalPaths('src/core/list.ts', "  const dir = path.join(env.XDG_DATA_HOME, 'openspec', 'stores');")).toHaveLength(1);
    expect(openspecGlobalPaths('src/core/list.ts', "  const file = '~/.local/share/openspec/projects.json';")).toHaveLength(1);
    expect(
      openspecGlobalPaths('src/commands/install-standalone.ts', "  return path.join(os.homedir(), '.config', 'openspec');")
    ).toHaveLength(1);
    expect(openspecGlobalPaths('src/core/list.ts', '  // ~/.config/openspec is where OpenSpec keeps it')).toEqual([]);
    expect(openspecGlobalPaths('src/core/list.ts', "  const store = path.join(os.homedir(), 'openspec', id);")).toEqual([]);
  });

  it('keeps every allowed line pointing at a file that still has it', () => {
    for (const { file, text } of ALLOWED_GLOBAL_PATHS) {
      const source = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf-8');
      expect(source.split(/\r?\n/).some((line) => text.test(withoutTrailingComment(line))), `${file}: ${text}`).toBe(true);
    }
  });
});
