# Fork maintenance

This repository is a fork of [OpenSpec](https://github.com/Fission-AI/OpenSpec). It deliberately removes some upstream paths. This page explains which ones, and how to pull in upstream changes without those paths coming back.

## Paths removed by this fork

| Path | Why it is removed |
|---|---|
| `website` | Upstream's documentation site. This fork does not publish it. |
| `test/website-preview.test.ts` | Tests the site's preview script, so it cannot run without the site. |

The list lives in [`scripts/fork/removed-paths.mjs`](scripts/fork/removed-paths.mjs) (`FORK_REMOVED_PATHS`). `test/fork/fork-docs.test.ts` fails if an entry is missing from this table, or if any removed path is tracked again.

These upstream files were edited only so the suite and CI work without the site. A sync can stop on a conflict in them when upstream changes the same lines:

- `test/pnpm-workspace-config.test.ts`: the two site lockfile tests are removed.
- `.github/workflows/ci.yml`: the preview test is no longer listed in the `docs` job.
- `.github/workflows/security.yml`: the site audit step and the `website-lockfile` job are removed.
- `.github/dependabot.yml`: the npm updates for the site are removed.

## Syncing with upstream

Start from a clean working tree on the branch you want to update (usually `main`), then run:

```bash
node scripts/fork/sync-upstream.mjs
```

It works the same from PowerShell, cmd, Git Bash, macOS and Linux. The script:

1. Refuses to start if you have uncommitted changes to tracked files, if a merge is already in progress, or if the `upstream` remote is missing.
2. Fetches `upstream/main`. If your branch already contains it, it reports "Nothing to merge" and stops.
3. Merges it without committing, then removes everything under the removed paths from the merge. That resolves the modify/delete conflicts, keeps out files upstream added there, and keeps out files it renamed there.
4. Commits the merge if no other conflict is left, then reminds you to run `pnpm install` and `pnpm test`.

| Option | Effect |
|---|---|
| `--remote <name>` | Upstream remote (default `upstream`) |
| `--branch <name>` | Upstream branch (default `main`) |
| `--no-commit` | Prepare the merge with the removed paths already resolved, but do not commit it. Review with `git diff --cached`, then `git commit` or `git merge --abort`. |
| `--help` | Show usage |

| Exit code | Meaning |
|---|---|
| `0` | Merged, prepared with `--no-commit`, or nothing to merge |
| `1` | Refused to start, or a git command failed |
| `2` | Conflicts outside the removed paths are left for you |

### When conflicts are left

On exit code `2` the merge stays in progress and the removed paths are already resolved. The script lists the files still in conflict, which are real conflicts outside the removed paths. Resolve each one, `git add` it, and run `git commit`. To go back to where you started, run `git merge --abort`.

If upstream adds a new test or workflow that depends on a removed path, it merges without a conflict but `pnpm test` fails. Either add it to the list (whole files) or make a minimal edit, as was done for the files above.

### Recommended: let git reuse conflict resolutions

The edited upstream files above can conflict again on later syncs. Turn on `rerere` once per clone so git replays a resolution you already made:

```bash
git config rerere.enabled true
```

`rerere` only remembers conflicts inside a file. It cannot handle the modify/delete conflicts on removed paths, which is why the script exists.

## Do not use "Sync fork" or a plain merge

- **GitHub's "Sync fork" button** merges on the server with plain git rules. Any upstream change to a removed file blocks it with a conflict. Any file upstream adds inside a removed folder comes back without a warning.
- **`git merge upstream/main`** stops on a modify/delete conflict for every upstream change to a removed file, and also lets new upstream files back in.

If a removed path comes back by mistake, `test/fork/fork-docs.test.ts` fails. Remove it again with `git rm -r <path>` and commit.

## The upstream remote

The `upstream` remote uses HTTPS, which needs no SSH key: `https://github.com/Fission-AI/OpenSpec.git`. If a clone still has the SSH URL (`git@github.com:Fission-AI/OpenSpec.git`) and no key registered on GitHub, switch it:

```bash
git remote set-url upstream https://github.com/Fission-AI/OpenSpec.git
```

If the remote is missing, add it:

```bash
git remote add upstream https://github.com/Fission-AI/OpenSpec.git
```

## Removing another upstream path

1. Remove it with `git rm -r <path>` and commit.
2. Add it to `FORK_REMOVED_PATHS` in `scripts/fork/removed-paths.mjs`, written the way git writes paths (`/` separators, no trailing slash for folders).
3. Add a row for it to the table at the top of this page.
4. Make the smallest possible edits to the upstream files that depend on it, and list them above.
5. Run `pnpm test`.

## Restoring a removed path

1. Remove its entry from `FORK_REMOVED_PATHS` and from the table above.
2. Bring it back at upstream's current version with `git checkout upstream/main -- <path>`, or with `git revert` on the commit that removed it.
3. Undo the related edits listed above, then commit.
