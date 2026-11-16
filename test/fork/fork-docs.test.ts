import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { FORK_REMOVED_PATHS } from '../../scripts/fork/removed-paths.mjs';

// FORK.md documents the paths this fork removed from upstream, and the fork
// must keep them untracked: a plain `git merge upstream/main` or GitHub's
// "Sync fork" can bring them back without a conflict.
const projectRoot = process.cwd();

function gitInProject(...args: string[]) {
  const result = spawnSync('git', ['-C', projectRoot, ...args], { encoding: 'utf8' });
  return result.error ? null : result;
}

const isGitCheckout = gitInProject('rev-parse', '--is-inside-work-tree')?.status === 0;

describe('fork maintenance documentation', () => {
  const doc = fs.readFileSync(path.join(projectRoot, 'FORK.md'), 'utf8');

  it('lists every fork-removed path in its table', () => {
    const missing = FORK_REMOVED_PATHS.filter((entry) => !doc.includes(`| \`${entry}\` |`));
    expect(missing, `FORK.md does not list: ${missing.join(', ')}`).toEqual([]);
  });

  it('documents the sync command and warns against "Sync fork"', () => {
    expect(doc).toContain('node scripts/fork/sync-upstream.mjs');
    expect(doc).toContain('"Sync fork"');
  });

  it.skipIf(!isGitCheckout)('keeps every fork-removed path untracked', () => {
    const result = gitInProject('--literal-pathspecs', 'ls-files', '-z', '--', ...FORK_REMOVED_PATHS);
    expect(result?.status).toBe(0);
    const tracked = [...new Set(result!.stdout.split('\0').filter((entry) => entry !== ''))];
    expect(
      tracked,
      'fork-removed paths are tracked again; remove them with `git rm -r` (see FORK.md)'
    ).toEqual([]);
  });
});
