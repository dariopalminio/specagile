import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

// Integration tests for scripts/fork/sync-upstream.mjs, against throwaway git
// repositories: an "upstream" one and a "fork" clone of it that removed the
// fork-removed paths. Each test changes upstream, runs the script in the fork
// and checks the result, one scenario of the fork-upstream-sync spec each.
//
// No literal "<site dir>/" text in this file: test/ci-docs-only.test.ts would
// then require it in ci.yml's docs job. Paths are built from SITE instead.

const SCRIPT = path.resolve('scripts', 'fork', 'sync-upstream.mjs');
const TIMEOUT = 60_000;
const SITE = 'website';
const gitPath = (...segments: string[]) => path.posix.join(...segments);

const SITE_PACKAGE = gitPath(SITE, 'package.json');
const SITE_LAYOUT = gitPath(SITE, 'app', 'layout.tsx');
const SITE_PAGE = gitPath(SITE, 'app', 'page.tsx');
const PREVIEW_TEST = gitPath('test', 'website-preview.test.ts');
const SRC_INDEX = gitPath('src', 'index.ts');
const CI_WORKFLOW = gitPath('.github', 'workflows', 'ci.yml');

type Run = { status: number | null; stdout: string; stderr: string };

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
});

function git(cwd: string, ...args: string[]): Run {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Runs git and fails the test on a non-zero exit, showing git's output. */
function gitOk(cwd: string, ...args: string[]): string {
  const result = git(cwd, ...args);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed (${result.status}):\n${result.stderr}${result.stdout}`);
  }
  return result.stdout;
}

function write(repo: string, file: string, content: string): void {
  const absolute = path.join(repo, ...file.split('/'));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function read(repo: string, file: string): string {
  return fs.readFileSync(path.join(repo, ...file.split('/')), 'utf8');
}

function configure(repo: string): void {
  // vitest isolates HOME, so the developer's global git identity is not visible.
  gitOk(repo, 'config', 'user.name', 'Fork Sync Test');
  gitOk(repo, 'config', 'user.email', 'fork-sync-test@example.com');
  gitOk(repo, 'config', 'core.autocrlf', 'false');
}

function commitAll(repo: string, message: string): string {
  gitOk(repo, 'add', '-A');
  gitOk(repo, 'commit', '-q', '-m', message);
  return head(repo);
}

function head(repo: string): string {
  return gitOk(repo, 'rev-parse', 'HEAD').trim();
}

function parents(repo: string, ref = 'HEAD'): string[] {
  return gitOk(repo, 'rev-list', '--parents', '-n', '1', ref).trim().split(' ').slice(1);
}

function nulList(output: string): string[] {
  return [...new Set(output.split('\0').filter((entry) => entry !== ''))];
}

function committedFiles(repo: string, ref = 'HEAD'): string[] {
  return nulList(gitOk(repo, 'ls-tree', '-r', '--name-only', '-z', ref));
}

function indexFiles(repo: string): string[] {
  return nulList(gitOk(repo, 'ls-files', '-z', '--cached'));
}

function isRemoved(file: string): boolean {
  return file === SITE || file.startsWith(`${SITE}/`) || file === PREVIEW_TEST;
}

function mergeInProgress(repo: string): boolean {
  return git(repo, 'rev-parse', '-q', '--verify', 'MERGE_HEAD').status === 0;
}

/** Upstream with the site, plus a fork clone (remote "upstream") that removed it. */
function setup(): { upstream: string; fork: string } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-fork-sync-'));
  tempDirs.push(base);
  const upstream = path.join(base, 'upstream');
  const fork = path.join(base, 'fork');

  fs.mkdirSync(upstream);
  gitOk(upstream, 'init', '-q', '-b', 'main');
  configure(upstream);
  write(upstream, SITE_PACKAGE, '{ "name": "site", "version": "1.0.0" }\n');
  write(upstream, SITE_LAYOUT, 'export const layout = 1;\n');
  write(upstream, SITE_PAGE, 'export const page = 1;\n');
  write(upstream, PREVIEW_TEST, 'it("previews", () => {});\n');
  write(upstream, SRC_INDEX, 'export const version = 1;\n');
  write(upstream, CI_WORKFLOW, 'name: CI\njobs:\n  docs:\n    run: one\n');
  write(upstream, 'README.md', '# OpenSpec\n');
  commitAll(upstream, 'initial');

  gitOk(base, 'clone', '-q', '-c', 'core.autocrlf=false', '--origin', 'upstream', upstream, fork);
  configure(fork);
  gitOk(fork, 'rm', '-r', '-q', SITE, PREVIEW_TEST);
  commitAll(fork, 'remove the documentation site');

  return { upstream, fork };
}

function sync(fork: string, ...args: string[]): Run {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: fork, encoding: 'utf8' });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function expectSynced(run: Run): void {
  expect(run.status, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`).toBe(0);
}

describe('fork upstream sync', () => {
  it('shows why the script exists: a plain merge stops on a modify/delete conflict', () => {
    const { upstream, fork } = setup();
    write(upstream, SITE_PACKAGE, '{ "name": "site", "version": "2.0.0" }\n');
    commitAll(upstream, 'bump site');

    gitOk(fork, 'fetch', '-q', 'upstream');
    const merge = git(fork, 'merge', '--no-edit', 'upstream/main');

    expect(merge.status).not.toBe(0);
    expect(merge.stdout).toContain('modify/delete');
  }, TIMEOUT);

  it('keeps a file upstream modified inside a removed directory out, with no conflict', () => {
    const { upstream, fork } = setup();
    write(upstream, SITE_PACKAGE, '{ "name": "site", "version": "2.0.0" }\n');
    const upstreamHead = commitAll(upstream, 'bump site');

    const run = sync(fork);

    expectSynced(run);
    expect(mergeInProgress(fork)).toBe(false);
    expect(parents(fork)[1]).toBe(upstreamHead);
    expect(committedFiles(fork).filter(isRemoved)).toEqual([]);
    // Windows shows the directory with `\` separators and git with `/`:
    // either way nothing of it is left on disk.
    expect(fs.existsSync(path.join(fork, SITE))).toBe(false);
  }, TIMEOUT);

  it('keeps a file upstream added inside a removed directory out', () => {
    const { upstream, fork } = setup();
    write(upstream, gitPath(SITE, 'app', 'new-page.tsx'), 'export const fresh = 1;\n');
    commitAll(upstream, 'add a page');

    const run = sync(fork);

    expectSynced(run);
    expect(committedFiles(fork).filter(isRemoved)).toEqual([]);
    expect(fs.existsSync(path.join(fork, SITE))).toBe(false);
  }, TIMEOUT);

  it('keeps both names out when upstream renames a file inside a removed directory', () => {
    const { upstream, fork } = setup();
    gitOk(upstream, 'mv', SITE_PAGE, gitPath(SITE, 'app', 'home.tsx'));
    commitAll(upstream, 'rename page');

    const run = sync(fork);

    expectSynced(run);
    expect(committedFiles(fork).filter(isRemoved)).toEqual([]);
  }, TIMEOUT);

  it('keeps a removed test file out when upstream modifies it', () => {
    const { upstream, fork } = setup();
    write(upstream, PREVIEW_TEST, 'it("previews more", () => {});\n');
    commitAll(upstream, 'extend preview test');

    const run = sync(fork);

    expectSynced(run);
    expect(committedFiles(fork)).not.toContain(PREVIEW_TEST);
    expect(fs.existsSync(path.join(fork, 'test', 'website-preview.test.ts'))).toBe(false);
  }, TIMEOUT);

  it('merges paths whose names only resemble the removed ones', () => {
    const { upstream, fork } = setup();
    const similar = [
      gitPath('website-assets', 'logo.svg'),
      gitPath('test', 'website-preview.helpers.ts'),
      gitPath('docs', 'guide.md'),
    ];
    for (const file of similar) write(upstream, file, 'kept\n');
    commitAll(upstream, 'add look-alike paths');

    const run = sync(fork);

    expectSynced(run);
    expect(committedFiles(fork)).toEqual(expect.arrayContaining(similar));
  }, TIMEOUT);

  it('commits a clean merge with upstream as second parent and reports what it kept out', () => {
    const { upstream, fork } = setup();
    const forkHead = head(fork);
    write(upstream, SRC_INDEX, 'export const version = 2;\n');
    write(upstream, SITE_LAYOUT, 'export const layout = 2;\n');
    write(upstream, gitPath(SITE, 'app', 'new-page.tsx'), 'export const fresh = 1;\n');
    const upstreamHead = commitAll(upstream, 'change src and site');

    const run = sync(fork);

    expectSynced(run);
    expect(parents(fork)).toEqual([forkHead, upstreamHead]);
    expect(read(fork, SRC_INDEX)).toBe('export const version = 2;\n');
    expect(committedFiles(fork).filter(isRemoved)).toEqual([]);
    // layout.tsx (modify/delete) and new-page.tsx (added) were kept out.
    expect(run.stdout).toContain('Kept 2 upstream entries');
    expect(run.stdout).toContain('pnpm install');
    expect(run.stdout).toContain('pnpm test');
    expect(git(fork, 'status', '--porcelain').stdout).toBe('');
  }, TIMEOUT);

  it('fails without leaving a merge behind when git cannot start the merge', () => {
    const { upstream, fork } = setup();
    write(upstream, gitPath('src', 'extra.ts'), 'export const extra = 1;\n');
    commitAll(upstream, 'add extra');
    // An untracked file in the way: git refuses to overwrite it and never starts.
    write(fork, gitPath('src', 'extra.ts'), 'local, untracked\n');
    const before = head(fork);

    const run = sync(fork);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('git merge did not start');
    expect(mergeInProgress(fork)).toBe(false);
    expect(head(fork)).toBe(before);
    expect(read(fork, gitPath('src', 'extra.ts'))).toBe('local, untracked\n');
  }, TIMEOUT);

  it('reports nothing to merge and creates no commit when already up to date', () => {
    const { fork } = setup();
    const before = head(fork);

    const run = sync(fork);

    expectSynced(run);
    expect(run.stdout).toContain('Nothing to merge');
    expect(head(fork)).toBe(before);
    expect(mergeInProgress(fork)).toBe(false);
  }, TIMEOUT);

  it('leaves real conflicts to the maintainer, with removed paths already resolved', () => {
    const { upstream, fork } = setup();
    write(fork, CI_WORKFLOW, 'name: CI\njobs:\n  docs:\n    run: fork\n');
    const before = commitAll(fork, 'fork edits ci');
    write(upstream, CI_WORKFLOW, 'name: CI\njobs:\n  docs:\n    run: upstream\n');
    write(upstream, SITE_PACKAGE, '{ "name": "site", "version": "2.0.0" }\n');
    commitAll(upstream, 'upstream edits ci and site');

    const run = sync(fork);

    expect(run.status).toBe(2);
    expect(run.stderr).toContain(CI_WORKFLOW);
    expect(run.stderr).not.toContain(SITE);
    expect(run.stderr).toContain('git commit');
    expect(run.stderr).toContain('git merge --abort');
    expect(mergeInProgress(fork)).toBe(true);
    expect(head(fork)).toBe(before);
    expect(indexFiles(fork).filter(isRemoved)).toEqual([]);
    const unmerged = nulList(gitOk(fork, 'diff', '--name-only', '--diff-filter=U', '-z'));
    expect(unmerged).toEqual([CI_WORKFLOW]);

    gitOk(fork, 'merge', '--abort');

    expect(mergeInProgress(fork)).toBe(false);
    expect(head(fork)).toBe(before);
    expect(git(fork, 'status', '--porcelain').stdout).toBe('');
  }, TIMEOUT);

  it('refuses to start with uncommitted changes to tracked files', () => {
    const { upstream, fork } = setup();
    write(upstream, SRC_INDEX, 'export const version = 2;\n');
    commitAll(upstream, 'change src');
    write(fork, 'README.md', '# Local edit\n');
    const before = head(fork);
    const trackingBefore = gitOk(fork, 'rev-parse', 'upstream/main');
    const statusBefore = git(fork, 'status', '--porcelain').stdout;

    const run = sync(fork);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('uncommitted changes');
    expect(run.stderr).toContain('git stash');
    expect(head(fork)).toBe(before);
    expect(git(fork, 'status', '--porcelain').stdout).toBe(statusBefore);
    expect(gitOk(fork, 'rev-parse', 'upstream/main')).toBe(trackingBefore);
    expect(mergeInProgress(fork)).toBe(false);
  }, TIMEOUT);

  it('refuses to start while another merge is in progress', () => {
    const { upstream, fork } = setup();
    write(upstream, SITE_PACKAGE, '{ "name": "site", "version": "2.0.0" }\n');
    commitAll(upstream, 'bump site');
    gitOk(fork, 'fetch', '-q', 'upstream');
    git(fork, 'merge', '--no-edit', 'upstream/main');
    const mergeHead = gitOk(fork, 'rev-parse', 'MERGE_HEAD');

    const run = sync(fork);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('already in progress');
    expect(run.stderr).toContain('git merge --abort');
    expect(gitOk(fork, 'rev-parse', 'MERGE_HEAD')).toBe(mergeHead);
  }, TIMEOUT);

  it('refuses to start without the upstream remote and says how to add it', () => {
    const { fork } = setup();
    gitOk(fork, 'remote', 'remove', 'upstream');
    const before = head(fork);

    const run = sync(fork);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('git remote add upstream https://github.com/Fission-AI/OpenSpec.git');
    expect(head(fork)).toBe(before);
  }, TIMEOUT);

  it('prepares the merge without committing in review mode', () => {
    const { upstream, fork } = setup();
    const before = head(fork);
    write(upstream, SRC_INDEX, 'export const version = 2;\n');
    write(upstream, SITE_PACKAGE, '{ "name": "site", "version": "2.0.0" }\n');
    commitAll(upstream, 'change src and site');

    const run = sync(fork, '--no-commit');

    expectSynced(run);
    expect(run.stdout).toContain('git commit');
    expect(run.stdout).toContain('git merge --abort');
    expect(mergeInProgress(fork)).toBe(true);
    expect(head(fork)).toBe(before);
    expect(indexFiles(fork).filter(isRemoved)).toEqual([]);
    expect(nulList(gitOk(fork, 'diff', '--cached', '--name-only', '-z'))).toEqual([SRC_INDEX]);
  }, TIMEOUT);

  it('reports untracked leftovers inside a removed directory without deleting them', () => {
    const { upstream, fork } = setup();
    write(fork, gitPath(SITE, 'notes.txt'), 'local only\n');
    write(upstream, SRC_INDEX, 'export const version = 2;\n');
    commitAll(upstream, 'change src');

    const run = sync(fork);

    expectSynced(run);
    expect(run.stdout).toContain('still exist on disk');
    expect(read(fork, gitPath(SITE, 'notes.txt'))).toBe('local only\n');
    expect(committedFiles(fork).filter(isRemoved)).toEqual([]);
  }, TIMEOUT);

  it('works from a subdirectory of the fork', () => {
    const { upstream, fork } = setup();
    write(upstream, SRC_INDEX, 'export const version = 2;\n');
    commitAll(upstream, 'change src');

    const run = sync(path.join(fork, 'src'));

    expectSynced(run);
    expect(read(fork, SRC_INDEX)).toBe('export const version = 2;\n');
  }, TIMEOUT);
});
