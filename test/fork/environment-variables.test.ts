import { existsSync, promises as fs, readdirSync, readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installerBase, installerEnv, resolveInstallTarget } from '../../src/commands/install-standalone.js';
import { ValidateCommand } from '../../src/commands/validate.js';
import { ENV_VAR_NAMES, FORMER_ENV_VAR_NAMES } from '../../src/core/fork/identity.js';
import { Validator } from '../../src/core/validation/validator.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';
import { runCLI } from '../helpers/run-cli.js';

/**
 * SpecAgile reads its settings from `SPECAGILE_*` variables (ENV_VAR_NAMES in
 * src/core/fork/identity.ts) and ignores OpenSpec's (FORMER_ENV_VAR_NAMES), so
 * what is set for `openspec` never changes `specagile`. See "SpecAgile
 * identity" in FORK.md.
 */

// -----------------------------------------------------------------------------
// The tables
// -----------------------------------------------------------------------------

describe('the environment variable tables', () => {
  it('name the same settings', () => {
    expect(Object.keys(FORMER_ENV_VAR_NAMES).sort()).toEqual(Object.keys(ENV_VAR_NAMES).sort());
  });

  it('give every setting a SPECAGILE_ name', () => {
    for (const [setting, name] of Object.entries(ENV_VAR_NAMES)) {
      expect(name, setting).toMatch(/^SPECAGILE_[A-Z0-9_]+$/);
    }
  });

  it('list exactly the thirteen names OpenSpec reads', () => {
    expect(Object.values(FORMER_ENV_VAR_NAMES).sort()).toEqual(
      [
        'OPENSPEC_SKILLS_SCOPE',
        'OPENSPEC_CONCURRENCY',
        'OPENSPEC_NO_UPDATE_CHECK',
        'OPENSPEC_TELEMETRY',
        'OPENSPEC_NO_COMPLETIONS',
        'OPENSPEC_NO_AUTO_CONFIG',
        'OPENSPEC_NO_ANIMATION',
        'OPENSPEC_ENABLE_CLI_AGENT_OPENERS',
        'OPEN_SPEC_INTERACTIVE',
        'OPENSPEC_INSTALL_DIR',
        'OPENSPEC_INSTALL_NAME',
        'OPENSPEC_DOWNLOAD_URL',
        'OPENSPEC_RELEASES_URL',
      ].sort()
    );
  });
});

// -----------------------------------------------------------------------------
// The standalone installer (src/commands/install-standalone.ts)
// -----------------------------------------------------------------------------

describe('the standalone installer variables', () => {
  const FORMER_INSTALLER = {
    OPENSPEC_INSTALL_DIR: path.join(os.tmpdir(), 'for-openspec', 'bin'),
    OPENSPEC_INSTALL_NAME: 'openspec-for-openspec',
    OPENSPEC_DOWNLOAD_URL: 'http://127.0.0.1:9/openspec-mirror',
    // Unsafe on purpose: SpecAgile would refuse it if it read it.
    OPENSPEC_RELEASES_URL: 'http://localhost:80@evil.example/',
  };

  it("are not read under OpenSpec's names", () => {
    expect(resolveInstallTarget(FORMER_INSTALLER, 'linux', null)).toEqual(resolveInstallTarget({}, 'linux', null));
    expect(resolveInstallTarget(FORMER_INSTALLER, 'win32', null)).toEqual(resolveInstallTarget({}, 'win32', null));
    expect(installerBase(FORMER_INSTALLER)).toBe(installerBase({}));
  });

  it('are read under SPECAGILE_* names', () => {
    const dir = path.join(os.tmpdir(), 'for-specagile', 'bin');
    expect(
      resolveInstallTarget({ SPECAGILE_INSTALL_DIR: dir, SPECAGILE_INSTALL_NAME: 'sa' }, 'linux', null)
    ).toEqual({ dir, name: 'sa' });
    expect(installerBase({ SPECAGILE_DOWNLOAD_URL: 'http://127.0.0.1:8765/' })).toBe('http://127.0.0.1:8765');
    expect(() => installerBase({ SPECAGILE_RELEASES_URL: 'http://localhost:80@evil.example/' })).toThrow(
      'SPECAGILE_RELEASES_URL must use https'
    );
  });

  it("reach OpenSpec's installer under its own names, never inherited from OpenSpec's", () => {
    const target = { dir: path.join(os.tmpdir(), 'target'), name: 'specagile-bin' };
    const env = installerEnv(
      { ...FORMER_INSTALLER, PATH: 'kept', SPECAGILE_DOWNLOAD_URL: 'http://127.0.0.1:8765' },
      target,
      '1.2.3'
    );

    expect(env.OPENSPEC_INSTALL_DIR).toBe(target.dir);
    expect(env.OPENSPEC_INSTALL_NAME).toBe(target.name);
    expect(env.OPENSPEC_DOWNLOAD_URL).toBe('http://127.0.0.1:8765');
    expect(env).not.toHaveProperty('OPENSPEC_RELEASES_URL');
    expect(env.OPENSPEC_VERSION).toBe('1.2.3');
    expect(env.PATH).toBe('kept');
  });

  it('passes SPECAGILE_RELEASES_URL on, and no version for the latest', () => {
    const target = { dir: path.join(os.tmpdir(), 'target'), name: 'specagile-bin' };
    const env = installerEnv({ SPECAGILE_RELEASES_URL: 'https://mirror.example/releases' }, target, 'latest');

    expect(env.OPENSPEC_RELEASES_URL).toBe('https://mirror.example/releases');
    expect(env).not.toHaveProperty('OPENSPEC_DOWNLOAD_URL');
    expect(env).not.toHaveProperty('OPENSPEC_VERSION');
  });
});

// -----------------------------------------------------------------------------
// The built CLI
// -----------------------------------------------------------------------------

/**
 * Runs the built CLI in a throwaway home. The suite sets
 * SPECAGILE_SKILLS_SCOPE=project (vitest.config.ts); these cases take it out
 * of the environment the CLI inherits, so only what each case sets counts.
 */
describe('the built CLI', { timeout: 60_000 }, () => {
  let box: string;
  let env: NodeJS.ProcessEnv;
  let suiteScope: string | undefined;

  beforeEach(async () => {
    box = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'specagile-env-vars-')));
    const home = path.join(box, 'home');
    await fs.mkdir(home, { recursive: true });
    env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      XDG_STATE_HOME: path.join(home, '.local', 'state'),
      LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
      APPDATA: path.join(home, 'AppData', 'Roaming'),
      CODEX_HOME: path.join(home, '.codex'),
      CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    };
    suiteScope = process.env.SPECAGILE_SKILLS_SCOPE;
    delete process.env.SPECAGILE_SKILLS_SCOPE;
  });

  afterEach(async () => {
    if (suiteScope === undefined) delete process.env.SPECAGILE_SKILLS_SCOPE;
    else process.env.SPECAGILE_SKILLS_SCOPE = suiteScope;
    await fs.rm(box, { recursive: true, force: true });
  });

  const project = async (name: string): Promise<string> => {
    const dir = path.join(box, name);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  };

  it('fails init on an invalid SPECAGILE_SKILLS_SCOPE, naming the variable', async () => {
    const result = await runCLI(['init', '--tools', 'claude'], {
      cwd: await project('app'),
      env: { ...env, SPECAGILE_SKILLS_SCOPE: 'everywhere' },
      timeoutMs: 60_000,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Invalid SPECAGILE_SKILLS_SCOPE "everywhere". Use global or project.');
  });

  it('ignores OPENSPEC_SKILLS_SCOPE: init with --scope project succeeds without naming it', async () => {
    const dir = await project('app');
    const result = await runCLI(['init', '--tools', 'claude', '--scope', 'project'], {
      cwd: dir,
      env: { ...env, OPENSPEC_SKILLS_SCOPE: 'everywhere' },
      timeoutMs: 60_000,
    });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toContain('OPENSPEC_SKILLS_SCOPE');
    expect(existsSync(path.join(dir, '.agents', 'skills', 'sa-propose', 'SKILL.md'))).toBe(true);
  });

  it('ignores OPENSPEC_SKILLS_SCOPE without --scope too: an invalid value is not an error', async () => {
    const result = await runCLI(['init', '--tools', 'claude'], {
      cwd: await project('app'),
      env: { ...env, OPENSPEC_SKILLS_SCOPE: 'everywhere' },
      timeoutMs: 60_000,
    });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toContain('OPENSPEC_SKILLS_SCOPE');
  });

  it('names SPECAGILE_CONCURRENCY in the help of validate --concurrency', async () => {
    const result = await runCLI(['validate', '--help'], { cwd: await project('app'), env });

    expect(result.exitCode).toBe(0);
    // Commander wraps descriptions to the terminal width.
    expect(result.stdout.replace(/\s+/g, ' ')).toContain('defaults to env SPECAGILE_CONCURRENCY or 6');
    expect(result.stdout).not.toContain('OPENSPEC_CONCURRENCY');
  });

  it('names SPECAGILE_CONCURRENCY in the zsh completion script', async () => {
    const result = await runCLI(['completion', 'generate', 'zsh'], { cwd: await project('app'), env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain('SPECAGILE_CONCURRENCY');
    expect(result.stdout).not.toContain('OPENSPEC_CONCURRENCY');
  });
});

// -----------------------------------------------------------------------------
// SPECAGILE_CONCURRENCY in validate
// -----------------------------------------------------------------------------

describe('validate --specs and the concurrency variables', () => {
  const NAMES = [ENV_VAR_NAMES.concurrency, FORMER_ENV_VAR_NAMES.concurrency];
  let dir: string;
  let cwd: string;
  let saved: Record<string, string | undefined>;
  let running: number;
  let maxRunning: number;

  beforeEach(async () => {
    dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'specagile-concurrency-')));
    createOpenSpecRoot(dir);
    for (const id of ['alpha', 'beta', 'gamma', 'delta']) writeSpec(dir, id, `# ${id}\n`);
    cwd = process.cwd();
    process.chdir(dir);
    saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]));
    for (const name of NAMES) delete process.env[name];

    running = 0;
    maxRunning = 0;
    // Counts the validations in flight; each holds its slot for a moment so
    // the ones the limit allows overlap.
    vi.spyOn(Validator.prototype, 'validateSpec').mockImplementation(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 25));
      running--;
      return { valid: true, issues: [], summary: { errors: 0, warnings: 0, info: 0 } };
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.chdir(cwd);
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    process.exitCode = undefined;
    await fs.rm(dir, { recursive: true, force: true });
  });

  const validateSpecs = () => new ValidateCommand().execute(undefined, { specs: true, json: true, noInteractive: true });

  it('runs at most SPECAGILE_CONCURRENCY validations at once', async () => {
    process.env.SPECAGILE_CONCURRENCY = '2';
    await validateSpecs();

    expect(Validator.prototype.validateSpec).toHaveBeenCalledTimes(4);
    expect(maxRunning).toBe(2);
  });

  it('ignores OPENSPEC_CONCURRENCY: the default of 6 lets all four run at once', async () => {
    process.env.OPENSPEC_CONCURRENCY = '2';
    await validateSpecs();

    expect(Validator.prototype.validateSpec).toHaveBeenCalledTimes(4);
    expect(maxRunning).toBe(4);
  });
});

// -----------------------------------------------------------------------------
// Guards over src/ and the test suite
// -----------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(repoRoot, 'src');
const testRoot = path.join(repoRoot, 'test');

/** The suite's own variables before they were renamed to SPECAGILE_*. */
const FORMER_SUITE_VAR_NAMES = [
  'OPENSPEC_TEST_HOME',
  'OPENSPEC_TEST_BINARY',
  'OPENSPEC_RELEASE_UPGRADES',
  'OPENSPEC_RELEASE_CACHE',
  'OPENSPEC_TEST_EDITOR_EXIT',
  'OPENSPEC_TEST_EDITOR_LOG',
  'OPENSPEC_TEST_EDITOR_WRITE',
  'OPENSPEC_TEST_MODULE_LOG',
];

/** The two src/ files that may spell a former name: the table, and the telemetry notice SpecAgile never shows. */
const SRC_FILES_WITH_FORMER_NAMES = ['src/core/fork/identity.ts', 'src/telemetry/index.ts'];

/** Test files that set a former name on purpose, because what they run is OpenSpec. */
const TEST_FORMER_NAME_EXCEPTIONS: Record<string, readonly string[]> = {
  // Runs OpenSpec's and SpecAgile's releases with one environment.
  'test/cli-e2e/upgrade-from-releases.test.ts': ['OPENSPEC_TELEMETRY'],
  // Tests OpenSpec's installer (scripts/binary/install.sh), which reads OpenSpec's names.
  'test/binary-installer.test.ts': [
    'OPENSPEC_INSTALL_DIR',
    'OPENSPEC_INSTALL_NAME',
    'OPENSPEC_DOWNLOAD_URL',
    'OPENSPEC_RELEASES_URL',
  ],
  // This file names them to check them.
  'test/fork/environment-variables.test.ts': [...Object.values(FORMER_ENV_VAR_NAMES), ...FORMER_SUITE_VAR_NAMES],
};

function* filesUnder(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(full);
    else if (entry.isFile()) yield full;
  }
}

function relative(file: string): string {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

/** Each of `names` that `source` spells as a whole word. */
function namesIn(source: string, names: readonly string[]): string[] {
  return names.filter((name) => new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`).test(source));
}

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

// `env.X`, `env?.X`, `env['X']`, `env["X"]`, env[`X`] and `const { X } = process.env`
// for any X that starts with OPENSPEC_ or OPEN_SPEC_. Object keys (an installer's
// `{ OPENSPEC_VERSION: … }`) and PowerShell's `$env:X` are not reads.
const FORMER_ENV_READ = new RegExp(
  [
    String.raw`\benv(?:\?\.|\.)(OPEN_?SPEC_\w+)`,
    String.raw`\benv\??\.?\[\s*['"\x60](OPEN_?SPEC_\w+)['"\x60]\s*\]`,
    String.raw`\{[^}]*\b(OPEN_?SPEC_\w+)\b[^}]*\}\s*=\s*(?:process\.)?env\b`,
  ].join('|')
);

/** The code lines of `source` that read an OPENSPEC_ or OPEN_SPEC_ variable from the environment. */
function formerEnvReads(rel: string, source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => !isComment(line) && FORMER_ENV_READ.test(line))
    .map(({ line, number }) => `${rel}:${number}: ${line.trim()}`);
}

describe('former environment variable names in src/', () => {
  it('are spelled only in identity.ts and the telemetry notice', () => {
    const found: string[] = [];
    for (const file of filesUnder(srcRoot)) {
      const rel = relative(file);
      if (SRC_FILES_WITH_FORMER_NAMES.includes(rel)) continue;
      for (const name of namesIn(readFileSync(file, 'utf-8'), Object.values(FORMER_ENV_VAR_NAMES))) {
        found.push(`${rel}: ${name}`);
      }
    }
    expect(found, `read and name the variable with ENV_VAR_NAMES (src/core/fork/identity.ts):\n${found.join('\n')}`).toEqual([]);
  });

  it('are never read from the environment, including a name the tables do not list', () => {
    const found: string[] = [];
    for (const file of filesUnder(srcRoot)) {
      found.push(...formerEnvReads(relative(file), readFileSync(file, 'utf-8')));
    }
    expect(
      found,
      `add the setting to ENV_VAR_NAMES and FORMER_ENV_VAR_NAMES and read ENV_VAR_NAMES (see FORK.md):\n${found.join('\n')}`
    ).toEqual([]);
  });

  it('catches every form of a read, and leaves object keys, $env: and comments alone', () => {
    for (const read of [
      'if (process.env.OPENSPEC_EXAMPLE) {',
      'const v = env?.OPEN_SPEC_EXAMPLE;',
      "const v = process.env['OPENSPEC_EXAMPLE'];",
      'const v = env["OPENSPEC_EXAMPLE"];',
      'const v = env[`OPENSPEC_EXAMPLE`];',
      'const { OPENSPEC_EXAMPLE, HOME } = process.env;',
    ]) {
      expect(formerEnvReads('src/x.ts', read), read).toHaveLength(1);
    }
    for (const other of [
      "  ...(version ? { OPENSPEC_VERSION: version } : {}),",
      "const WINDOWS_RUNNER = 'irm $env:OPENSPEC_INSTALLER_URL | iex';",
      ' * set OPENSPEC_EXAMPLE=1 to restore them (process.env.OPENSPEC_EXAMPLE)',
      'const v = process.env[ENV_VAR_NAMES.telemetry];',
    ]) {
      expect(formerEnvReads('src/x.ts', other), other).toEqual([]);
    }
  });
});

describe("the test suite's environment", () => {
  it('sets no former name, except where what runs is OpenSpec', () => {
    const names = [...Object.values(FORMER_ENV_VAR_NAMES), ...FORMER_SUITE_VAR_NAMES];
    const files = [
      path.join(repoRoot, 'vitest.config.ts'),
      path.join(repoRoot, 'vitest.setup.ts'),
      ...filesUnder(testRoot),
    ];
    const found: string[] = [];
    for (const file of files) {
      const rel = relative(file);
      const allowed = TEST_FORMER_NAME_EXCEPTIONS[rel] ?? [];
      for (const name of namesIn(readFileSync(file, 'utf-8'), names)) {
        if (!allowed.includes(name)) found.push(`${rel}: ${name}`);
      }
    }
    expect(
      found,
      `use the SPECAGILE_* name (a test that checks a former name has no effect reads it from FORMER_ENV_VAR_NAMES):\n${found.join('\n')}`
    ).toEqual([]);
  });
});
