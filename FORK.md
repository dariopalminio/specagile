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

## Workflows added by this fork

The fork adds two workflows upstream does not have. Both ship as skills only and are part of the `core` profile. Their text lives in files of their own, so a sync never edits it:

| Workflow | Skill | Template | Adapted from (upstream) |
|---|---|---|---|
| `specify` | `sa-specify` | `src/core/templates/workflows/specify.ts` | `propose.ts`: context loading, schema selection, artifact loop |
| `plan` | `sa-plan` | `src/core/templates/workflows/plan.ts` | `continue-change.ts`: change selection; `propose.ts`: artifact loop; `update-change.ts`: confirm before revising |

The templates are written with OpenSpec's names (`openspec-specify`, `openspec status`, …), like upstream's; generation gives them SpecAgile's (see [SpecAgile identity](#specagile-identity)).

When a sync changes `propose.ts`, `continue-change.ts` or `update-change.ts` in `src/core/templates/workflows/`, review the matching passages in `specify.ts` and `plan.ts` and carry over the fixes that apply. Then regenerate and check:

```bash
pnpm build && pnpm regen:parity-hashes && pnpm generate:skills
pnpm test -- --run test/core/templates
```

Registering them added one line each to these upstream lists, which can conflict when upstream adds or reorders a workflow: `ALL_WORKFLOWS` and `CORE_WORKFLOWS` (`src/core/profiles.ts`), `COMMAND_TO_SKILL_NAME` (`src/utils/command-references.ts`), `WORKFLOW_PROMPT_META` (`src/commands/config.ts`), `ONBOARDING_COMMANDS` (`src/core/onboarding-commands.ts`) and `allSkillTemplates()` (`src/core/shared/skill-generation.ts`), plus the tests that pin those inventories. Their skill names come from the identity tables in `src/core/fork/identity.ts`, which `WORKFLOW_TO_SKILL_DIR` and `OPENSPEC_SKILL_NAMES` also read.

**`COMMAND_IDS` does not grow.** `COMMAND_IDS` (`src/core/shared/tool-detection.ts`) lists the workflows that had a command file in 1.x. Legacy cleanup (`src/core/legacy-cleanup.ts`) and command reconciliation (`src/core/shared/command-reconcile.ts`) use it to decide which files OpenSpec wrote. Adding a fork workflow there would make OpenSpec delete or report a user's own file with that name, such as `.kilocode/workflows/opsx-plan.md` or `.claude/commands/opsx/plan.md`. For the same reason fork workflows get no command template. `test/core/shared/tool-detection.test.ts` pins the list.

## SpecAgile identity

SpecAgile's CLI is `specagile` (`bin/specagile.js`); the fork installs no `openspec` executable. Its skills are named `sa-*`:

| Workflow | Skill | Former name |
|---|---|---|
| `explore`, `propose`, `specify`, `plan`, `onboard` | `sa-<workflow>` | `openspec-<workflow>` |
| `apply` | `sa-implement` | `openspec-apply-change` |
| `verify` | `sa-verify` | `openspec-verify-change` |
| `archive` | `sa-archive` | `openspec-archive-change` |
| `new`, `continue`, `ff`, `bulk-archive`, `update` | `sa-<workflow>-change` | `openspec-<workflow>-change` |
| `sync` | `sa-sync-specs` | `openspec-sync-specs` |

Workflow ids (`apply`, `verify`, …), the project's `openspec/` folder, internal files (`.openspec-target`, `.openspec-store/`), the global config directory, the npm package name and "OpenSpec" in prose keep upstream's names.

### Where it lives

[`src/core/fork/identity.ts`](src/core/fork/identity.ts) is the fork's own file, so a sync never conflicts in it. It holds:

- `CLI_NAME`, and the two tables `SKILL_NAME_BY_WORKFLOW` (`sa-*`) and `FORMER_SKILL_NAME_BY_WORKFLOW` (`openspec-*`). Both are typed `Record<WorkflowId, …>`, so a workflow upstream adds fails the build until it has a name in each.
- `KNOWN_SKILL_NAMES`: current and former names, for detecting a set-up project and honoring `keep` lines, never for deciding what to write.
- `CLI_SUBCOMMANDS` (every subcommand of `src/cli/index.ts`, hidden ones included), and `CLI_WORDS`: those, `--version` and the trigger verbs (`apply`, `implement`, …).
- `applyForkIdentity(text)`: turns each former skill name into its `sa-*` name, each `openspec <word in CLI_WORDS>` into `specagile <word>`, and three exact texts (`Bash(openspec:*)`, `Requires openspec CLI.`, `Get-Command openspec `). Anything outside the tables, such as `openspec/changes/` or `openspec-helpers`, is left as written.

**Upstream skill templates are not edited.** `generateSkillContent` (`src/core/shared/skill-generation.ts`) passes every generated `SKILL.md` through `applyForkIdentity`, and so do the hints `init`, `update` and the profile migration print (`src/core/init.ts`, `src/core/update.ts`, `src/core/migration.ts`). `COMMAND_TO_SKILL_NAME` keeps upstream's names on purpose: the current text is always the translation of upstream's, which is what lets the migration recognize copies an earlier version wrote.

Upstream code that reads the tables: `WORKFLOW_TO_SKILL_DIR` (`src/core/profile-sync-drift.ts`), `OPENSPEC_SKILL_NAMES` (`src/core/config.ts`), `allSkillTemplates()`, `ONBOARDING_COMMANDS`; with `KNOWN_SKILL_NAMES`: `isListedToolPresent`, `hasSkillLinks` and `getToolSkillStatus` (`src/core/shared/tool-detection.ts`), `readKeptSharedSkills`, `inferPreListTool` and `hasOpenSpecSkillIn` (`src/core/shared-skill-target.ts`), and `src/core/retired-tools.ts`. `src/core/shared/skill-content-equivalence.ts` builds its Codex pattern from `OPENSPEC_SKILL_NAMES`.

### Migrating projects with the former skills

[`src/core/fork/former-skills.ts`](src/core/fork/former-skills.ts) runs in `init` and `update` after the `sa-*` skills are installed (and before the sweep of earlier-release files). It looks up the fourteen former names in `.agents/skills/` and in each set-up tool's own folder, removes a `SKILL.md` that is text OpenSpec wrote (a release's, or this version's text with upstream's names) along with OpenSpec's links to it, and keeps and reports anything else. A `keep openspec-*` line stays honored: `installSharedSkills` (`src/core/shared/shared-skill-install.ts`) keeps writing it to `.openspec-target`. `update --dry-run` plans the removals and notes what it keeps (`kept-former-skills` in `src/core/update-plan.ts`).

### Upstream files edited for the identity

These can conflict when upstream changes the same lines:

- **CLI name**: `package.json` (`bin`, `dev:cli`), `src/cli/index.ts` (`.name(CLI_NAME)`, `getCommandPath`), `scripts/pack-version-check.mjs`, `scripts/binary/install-check.sh`, `flake.nix` and the Nix check in `.github/workflows/ci.yml`.
- **Messages**: every `openspec <subcommand>` a user reads in `src/cli/`, `src/commands/`, `src/core/` and `src/telemetry/` now says `specagile <subcommand>`. Comments were left alone.
- **Built-in schema**: `schemas/spec-driven/schema.yaml` and `schemas/spec-driven/templates/proposal.md`.
- **Shell completions** (`src/core/completions/`): the scripts register and call `CLI_NAME`, the installers write `specagile` files (`_specagile`, `specagile.fish`, `SpecAgileCompletion.ps1`, …) and mark their block in shell config with `# SPECAGILE:START`/`# SPECAGILE:END`, so an OpenSpec completion installed beside them is left alone. Internal function names (`_openspec_*`) are unchanged.
- **Tests**: names in the tests that pin what this version installs; `scripts/parity-hash-shared.mjs` accepts `sa-*` keys. Upstream tests that pin a template's wording on generated text compare it through `withUpstreamIdentity` (`test/helpers/fork-identity.ts`), so their assertions stay as upstream wrote them.
- **Docs**: `README.md` and `docs-lab/`.

### Texts that keep `openspec` on purpose

Until the fork has a package of its own, these still name OpenSpec's published package and standalone binary, and are the exceptions in `test/fork/cli-name.test.ts`: `src/core/github-copilot/cloud-agent.ts`, `src/core/version-check.ts`, `src/commands/install-standalone.ts`, `src/core/standalone-tip.ts`. `specagile install` still downloads OpenSpec's standalone binary.

### When a sync touches the identity

- **A conflict in a message or list above**: keep upstream's new text, then change `openspec <subcommand>` back to `specagile <subcommand>` (or the skill name to read the tables).
- **A new message naming `openspec <subcommand>`**: `test/fork/cli-name.test.ts` lists it; change it to `specagile`, or add the file to the exceptions with the reason.
- **A new subcommand**: `test/fork/identity.test.ts` fails until it is added to `CLI_SUBCOMMANDS`.
- **A new workflow**: the build fails until it has a name in both tables; add it to `test/fork/identity.test.ts` too.
- **A template with a new wording**: `test/fork/generated-skills-identity.test.ts` fails when a generated skill still names a former skill or `openspec <word>`.

Then run:

```bash
pnpm build && pnpm regen:parity-hashes && pnpm generate:skills
pnpm test -- --run test/fork test/core/templates
```

## Verification record

| Platform | Scope | Result | Notes |
|:---|:---|:---|:---|
| Windows 11 (local) | `pnpm build`, `pnpm lint`, `test/fork/` + full suite | ✅ Passed | `rename-skills-and-cli-to-specagile`, working tree on `0d9a508f`. PowerShell, Node 26.13.0, git 2.37.1, pnpm 10.34.5. `test/fork/` 147/147; `test/fork test/core/templates test/core/shared test/commands test/utils` has no failure beyond the ones `0d9a508f` has. Full suite: 7012 passed, 75 failed; the failures not on `0d9a508f` are the validation tests' `EBUSY` on their temp folders in the repo root (a lock on this machine; they pass on Linux) and `update-flake-script` (`bash` resolves to WSL here, which also fails on `0d9a508f`) |
| Linux (Docker, `node:22-bookworm`) | Full suite | ✅ Passed | Same working tree, checked out with LF as a clone would be; unprivileged user, Node 22.23.5, git 2.39.5, pnpm 10.34.5. 7248 passed, 0 failed, 18 skipped |
| Packed install (Windows, Linux) | `pnpm pack`, global install, `specagile init --tools claude` | ✅ Passed | The package installs only a `specagile` executable (`specagile`, `.cmd`, `.ps1` on Windows); `specagile --version` prints 2.0.0; a new project gets only `sa-*` skills. Windows used a temporary npm prefix. On Linux, installing the tarball with npm into a prefix that already holds OpenSpec upstream replaces its `openspec` command: both are still the npm package `@fission-ai/openspec` |
| CI (GitHub Actions) | Full suite | ⚪ Not run | Actions never triggered on the fork; would require pushing the branch |

The fork's CI is not enabled. Verification is local only until the branch is
pushed and Actions is configured for this fork.
