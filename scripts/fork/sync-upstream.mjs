#!/usr/bin/env node
// Merge upstream OpenSpec into the current branch of this fork, keeping the
// paths the fork removed (scripts/fork/removed-paths.mjs) out of the result.
//
// A plain `git merge upstream/main` is not enough once the fork has deleted a
// path: every upstream edit to it is a modify/delete conflict to resolve by
// hand, and every file upstream adds inside it comes back silently. This
// script merges without committing, removes everything under the listed paths
// from the index and the working tree (resolving those conflicts as deletions),
// and commits only when no other conflict is left. See FORK.md.
//
// Git is run without a shell, with an argument array, so the script behaves the
// same from PowerShell, cmd, Git Bash, macOS and Linux.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FORK_REMOVED_PATHS } from './removed-paths.mjs';

const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_CONFLICTS = 2;

const UPSTREAM_HTTPS_URL = 'https://github.com/Fission-AI/OpenSpec.git';

const HELP = `Usage: node scripts/fork/sync-upstream.mjs [options]

Merge upstream into the current branch, keeping the fork-removed paths out:
${FORK_REMOVED_PATHS.map((entry) => `  - ${entry}`).join('\n')}

Options:
  --remote <name>   Upstream remote (default: upstream)
  --branch <name>   Upstream branch (default: main)
  --no-commit       Prepare the merge with removed paths resolved, but do not
                    commit it: review, then \`git commit\` or \`git merge --abort\`
  -h, --help        Show this help

Exit codes:
  0  merged (or prepared with --no-commit), or nothing to merge
  1  refused to start, or git failed
  2  conflicts outside the removed paths are left for you to resolve`;

class UsageError extends Error {}

function parseArgs(argv) {
  const options = { remote: 'upstream', branch: 'main', commit: true, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--no-commit') {
      options.commit = false;
    } else if (arg === '--remote' || arg === '--branch') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new UsageError(`${arg} needs a value`);
      }
      options[arg.slice(2)] = value;
      i += 1;
    } else if (arg.startsWith('--remote=') || arg.startsWith('--branch=')) {
      const [name, value] = [arg.slice(2, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)];
      if (value === '') throw new UsageError(`--${name} needs a value`);
      options[name] = value;
    } else {
      throw new UsageError(`Unknown option: ${arg}`);
    }
  }
  return options;
}

/**
 * Runs git and returns { status, stdout, stderr }. `inherit` streams git's
 * output to the terminal (fetch progress, SSH prompts, commit hooks).
 */
function git(root, args, { inherit = false } = {}) {
  const fullArgs = root ? ['-C', root, ...args] : args;
  const result = spawnSync('git', fullArgs, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: inherit ? 'inherit' : 'pipe',
  });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error('git was not found on PATH. Install git and try again.');
    }
    throw result.error;
  }
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** NUL-separated git output (`-z`) as a list of unique paths. */
function splitNul(output) {
  return [...new Set(output.split('\0').filter((entry) => entry !== ''))];
}

function fail(message) {
  console.error(`sync-upstream: ${message}`);
  return EXIT_ERROR;
}

function preflight(options) {
  const top = git(null, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) {
    return { exit: fail('not inside a git repository. Run this from your clone of the fork.') };
  }
  const root = path.resolve(top.stdout.trim());

  if (git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status === 0) {
    return {
      exit: fail(
        'a merge is already in progress. Finish it with `git commit`, or abort it with `git merge --abort`, then run this again.'
      ),
    };
  }

  const status = git(root, ['status', '--porcelain', '--untracked-files=no']);
  if (status.status !== 0) {
    return { exit: fail(`could not read the working tree status:\n${status.stderr.trim()}`) };
  }
  if (status.stdout.trim() !== '') {
    return {
      exit: fail(
        `you have uncommitted changes to tracked files. Commit or stash them first (\`git stash\`), then run this again:\n${status.stdout.trimEnd()}`
      ),
    };
  }

  if (git(root, ['remote', 'get-url', options.remote]).status !== 0) {
    return {
      exit: fail(
        `there is no "${options.remote}" remote. Add it with:\n  git remote add ${options.remote} ${UPSTREAM_HTTPS_URL}`
      ),
    };
  }

  return { root };
}

function removedPathsOnDisk(root) {
  return FORK_REMOVED_PATHS.filter((entry) => fs.existsSync(path.join(root, ...entry.split('/'))));
}

function finish(root) {
  const leftovers = removedPathsOnDisk(root);
  if (leftovers.length > 0) {
    console.log(
      `\nNote: these removed paths still exist on disk with untracked or ignored files (left untouched):\n${leftovers
        .map((entry) => `  - ${entry}`)
        .join('\n')}`
    );
  }
  console.log('\nNext: run `pnpm install` and `pnpm test` to check the merged result.');
}

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`sync-upstream: ${error.message}\n\n${HELP}`);
      return EXIT_ERROR;
    }
    throw error;
  }
  if (options.help) {
    console.log(HELP);
    return EXIT_OK;
  }

  const checked = preflight(options);
  if (checked.exit !== undefined) return checked.exit;
  const { root } = checked;

  const upstreamRef = `${options.remote}/${options.branch}`;
  const fetch = git(
    root,
    ['fetch', options.remote, `+refs/heads/${options.branch}:refs/remotes/${upstreamRef}`],
    { inherit: true }
  );
  if (fetch.status !== 0) {
    return fail(
      `could not fetch ${upstreamRef}. If the remote uses SSH and you have no key set up, switch it to HTTPS:\n  git remote set-url ${options.remote} ${UPSTREAM_HTTPS_URL}`
    );
  }

  const ancestor = git(root, ['merge-base', '--is-ancestor', upstreamRef, 'HEAD']);
  if (ancestor.status === 0) {
    console.log(`Nothing to merge: the current branch already contains ${upstreamRef}.`);
    return EXIT_OK;
  }
  if (ancestor.status !== 1) {
    return fail(`could not compare HEAD with ${upstreamRef}:\n${ancestor.stderr.trim()}`);
  }

  const merge = git(root, ['merge', '--no-ff', '--no-commit', upstreamRef]);
  if (git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status !== 0) {
    // The merge never started (e.g. untracked files would be overwritten).
    return fail(`git merge did not start:\n${(merge.stderr || merge.stdout).trim()}`);
  }

  const pathspecs = ['--', ...FORK_REMOVED_PATHS];
  const tracked = git(root, ['--literal-pathspecs', 'ls-files', '-z', '--cached', ...pathspecs]);
  if (tracked.status !== 0) {
    return fail(`could not list the removed paths:\n${tracked.stderr.trim()}`);
  }
  const resolved = splitNul(tracked.stdout);
  if (resolved.length > 0) {
    const rm = git(root, ['--literal-pathspecs', 'rm', '-r', '-f', '-q', '--ignore-unmatch', ...pathspecs]);
    if (rm.status !== 0) {
      return fail(
        `could not remove the fork-removed paths from the merge:\n${rm.stderr.trim()}\nThe merge is still in progress: fix it by hand or run \`git merge --abort\`.`
      );
    }
  }
  console.log(
    `Kept ${resolved.length} upstream entr${resolved.length === 1 ? 'y' : 'ies'} under fork-removed paths out of the merge.`
  );

  const unmerged = git(root, ['diff', '--name-only', '--diff-filter=U', '-z']);
  if (unmerged.status !== 0) {
    return fail(`could not list the remaining conflicts:\n${unmerged.stderr.trim()}`);
  }
  const conflicts = splitNul(unmerged.stdout);
  if (conflicts.length > 0) {
    console.error(
      `\nConflicts left to resolve (outside the fork-removed paths):\n${conflicts
        .map((file) => `  - ${file}`)
        .join('\n')}\n\nResolve each file, \`git add\` it, then \`git commit\` to finish the merge.\nOr run \`git merge --abort\` to go back to where you started.`
    );
    return EXIT_CONFLICTS;
  }

  if (!options.commit) {
    console.log(
      `\nMerge of ${upstreamRef} prepared and not committed (--no-commit).\nReview it with \`git diff --cached\`, then \`git commit\` to finish it or \`git merge --abort\` to drop it.`
    );
    finish(root);
    return EXIT_OK;
  }

  const commit = git(root, ['commit', '--no-edit'], { inherit: true });
  if (commit.status !== 0) {
    return fail(
      'git commit failed (see above). The merge is still in progress: fix the problem and run `git commit`, or `git merge --abort`.'
    );
  }

  const leaked = git(root, ['--literal-pathspecs', 'ls-tree', '-r', '--name-only', '-z', 'HEAD', ...pathspecs]);
  const leakedPaths = splitNul(leaked.stdout);
  if (leaked.status !== 0 || leakedPaths.length > 0) {
    return fail(
      `the merge commit still contains fork-removed paths:\n${leakedPaths.map((file) => `  - ${file}`).join('\n')}`
    );
  }

  console.log(`\nMerged ${upstreamRef} into the current branch.`);
  finish(root);
  return EXIT_OK;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`sync-upstream: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = EXIT_ERROR;
}
