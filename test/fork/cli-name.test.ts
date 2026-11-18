import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { CLI_WORDS } from '../../src/core/fork/identity.js';
import { runCLI } from '../helpers/run-cli.js';
import { getChangesDir, getConfigFile, getToolDir } from '../helpers/layout.js';

/**
 * SpecAgile's CLI is `specagile`. Every message that tells the user to run a
 * command names it so. This guard walks src/ (the skill templates are
 * translated at generation time and pinned in generated-skills-identity) and
 * fails on any `openspec <subcommand>` left in code, so a sync that brings a
 * new upstream message is caught here. Comment lines don't count.
 */

const repoRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(repoRoot, 'src');
const TEMPLATES = path.join(srcRoot, 'core', 'templates', 'workflows');

/**
 * Files that keep `openspec` on purpose, with the reason.
 */
const EXCEPTIONS: Record<string, string> = {
  'src/core/github-copilot/cloud-agent.ts':
    "keeps upstream's text as the source; the Copilot files are written with the fork's identity",
  'src/commands/install-standalone.ts':
    "OpenSpec's standalone installer; SpecAgile never calls it (`specagile install` points to npm)",
  'src/core/standalone-tip.ts': "OpenSpec's standalone tip; SpecAgile never shows it",
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FORMER_INVOCATION = new RegExp(
  `(?<![\\w/.@-])openspec (${CLI_WORDS.map(escape).join('|')})(?![\\w-])`
);
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full !== TEMPLATES) yield* sourceFiles(full);
    } else if (entry.name.endsWith('.ts')) {
      yield full;
    }
  }
}

describe('the specagile CLI name in messages', () => {
  it('names no openspec subcommand outside the listed exceptions', () => {
    const found: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      const rel = path.relative(repoRoot, file).split(path.sep).join('/');
      if (EXCEPTIONS[rel]) continue;
      fs.readFileSync(file, 'utf-8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          if (isComment(line)) return;
          const match = line.match(FORMER_INVOCATION);
          if (match) found.push(`${rel}:${index + 1}: ${match[0]}`);
        });
    }
    expect(found, `use "specagile" instead of:\n${found.join('\n')}`).toEqual([]);
  });

  it('keeps every exception pointing at a file that exists', () => {
    for (const rel of Object.keys(EXCEPTIONS)) {
      expect(fs.existsSync(path.join(repoRoot, ...rel.split('/'))), rel).toBe(true);
    }
  });
});

describe('specagile CLI output', () => {
  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-cli-name-')));
    env = {
      XDG_CONFIG_HOME: path.join(dir, 'config'),
      XDG_DATA_HOME: path.join(dir, 'data'),
      APPDATA: path.join(dir, 'appdata'),
      LOCALAPPDATA: path.join(dir, 'localappdata'),
      HOME: path.join(dir, 'home'),
      USERPROFILE: path.join(dir, 'home'),
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('suggests specagile status after specagile new change, under changes/', async () => {
    const project = path.join(dir, 'project');
    fs.mkdirSync(getToolDir(project), { recursive: true });
    fs.writeFileSync(getConfigFile(project), 'schema: spec-driven\n');

    const result = await runCLI(['new', 'change', 'add-login'], { cwd: project, env });

    expect(result.exitCode, result.stderr).toBe(0);
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain('specagile status --change add-login');
    expect(output).not.toMatch(/\bopenspec status\b/);
    expect(fs.existsSync(path.join(getChangesDir(project), 'add-login'))).toBe(true);
    expect(output).toContain(`Created change 'add-login' at ${path.join('changes', 'add-login')}`);
  });

  it('suggests specagile init when specagile list finds no project', async () => {
    const empty = path.join(dir, 'empty');
    fs.mkdirSync(empty, { recursive: true });

    const result = await runCLI(['list'], { cwd: empty, env });

    expect(result.exitCode).not.toBe(0);
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain('specagile init');
    expect(output).not.toMatch(/\bopenspec init\b/);
  });

  it('shows specagile config profile in the nested usage line', async () => {
    const result = await runCLI(['config', 'profile', '--help'], { cwd: dir, env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/^Usage: specagile config profile\b/m);
  });

  it('points specagile install to npm and downloads nothing', async () => {
    const result = await runCLI(['install'], { cwd: dir, env });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('SpecAgile has no standalone install');
    expect(result.stderr).toContain('npm install -g specagile@latest');
    expect(fs.readdirSync(dir).sort()).toEqual([]);
  });

  it('sends no telemetry and shows no notice, even with telemetry enabled in the config', async () => {
    const configFile = path.join(env.XDG_CONFIG_HOME!, 'openspec', 'config.json');
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    const config = JSON.stringify({ telemetry: { enabled: true } });
    fs.writeFileSync(configFile, config);

    const result = await runCLI(['config', 'path'], {
      cwd: dir,
      env: { ...env, OPENSPEC_TELEMETRY: '1', DO_NOT_TRACK: '0', CI: 'false' },
    });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).not.toMatch(/usage stats|telemetry/i);
    // Upstream's first run records the notice and an anonymous id here.
    expect(fs.readFileSync(configFile, 'utf-8')).toBe(config);
  });

  it('hides install from the help', async () => {
    const result = await runCLI(['--help'], { cwd: dir, env });

    expect(result.stdout).not.toMatch(/^\s+install\b/m);
  });

  it('shows specagile in the top-level usage line, with no openspec-prefixed command', async () => {
    const result = await runCLI(['--help'], { cwd: dir, env });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/^Usage: specagile\b/m);
    expect(result.stdout).not.toMatch(/\bopenspec [a-z]/);
  });
});
