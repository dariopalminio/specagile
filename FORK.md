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

The fork adds three workflows upstream does not have, the stages of the long flow `specify` → `plan` → `tasks` → `apply`. All ship as skills only and are part of the `core` profile. Their text lives in files of their own, so a sync never edits it:

| Workflow | Skill | Template | Adapted from (upstream) |
|---|---|---|---|
| `specify` | `sa-specify` | `src/core/templates/workflows/specify.ts` | `propose.ts`: context loading, schema selection, artifact loop |
| `plan` | `sa-plan` | `src/core/templates/workflows/plan.ts` | `continue-change.ts`: change selection; `propose.ts`: artifact loop; `update-change.ts`: confirm before revising |
| `tasks` | `sa-tasks` | `src/core/templates/workflows/tasks.ts` | Derived from `plan.ts` (so from the same three upstream files) |

`plan` writes the design (spec-driven: `design.md`) and `tasks` writes the artifact with id `tasks` (`tasks.md`); both split the artifact graph by the explicit ids `specs` and `tasks`, never by file name. A schema with no `tasks` artifact gets its whole plan from `plan`. `plan.ts` and `tasks.ts` share their handoff texts (missing change, incomplete specification, schema without `specs`) through `src/core/templates/workflows/stage-handoffs.ts`, also the fork's.

The templates are written with OpenSpec's names (`openspec-specify`, `openspec status`, …), like upstream's; generation gives them SpecAgile's (see [SpecAgile identity](#specagile-identity)).

Since upstream 2.1 a skill says the same thing whatever workflows are installed (`test/core/templates/one-text-per-skill.test.ts`; upstream removed `optional-workflow.ts`). So `specify.ts`, `plan.ts` and `tasks.ts` never assume another workflow is there: they hand off with "ask me to plan it" / "ask me to write the tasks" / "ask me to implement them", as `propose.ts` does, or name a skill only "if that skill is installed", as `archive-change.ts` does.

When a sync changes `propose.ts`, `continue-change.ts` or `update-change.ts` in `src/core/templates/workflows/`, review the matching passages in `specify.ts`, `plan.ts` and `tasks.ts` (and `stage-handoffs.ts`) and carry over the fixes that apply. Then regenerate and check:

```bash
pnpm build && pnpm regen:parity-hashes && pnpm generate:skills
pnpm test -- --run test/core/templates
```

Registering them added one line each to these upstream lists, which can conflict when upstream adds or reorders a workflow: `ALL_WORKFLOWS` and `CORE_WORKFLOWS` (`src/core/profiles.ts`), `COMMAND_TO_SKILL_NAME` (`src/utils/command-references.ts`), `WORKFLOW_PROMPT_META` (`src/commands/config.ts`), `ONBOARDING_COMMANDS` (`src/core/onboarding-commands.ts`) and `allSkillTemplates()` (`src/core/shared/skill-generation.ts`), plus the tests that pin those inventories. Their skill names come from the identity tables in `src/core/fork/identity.ts`, which `WORKFLOW_TO_SKILL_DIR` and `OPENSPEC_SKILL_NAMES` also read.

**`COMMAND_IDS` does not grow.** `COMMAND_IDS` (`src/core/shared/tool-detection.ts`) lists the workflows that had a command file in 1.x. Legacy cleanup (`src/core/legacy-cleanup.ts`) and command reconciliation (`src/core/shared/command-reconcile.ts`) use it to decide which files OpenSpec wrote. Adding a fork workflow there would make OpenSpec delete or report a user's own file with that name, such as `.kilocode/workflows/opsx-plan.md` or `.claude/commands/opsx/plan.md`. For the same reason fork workflows get no command template. `test/core/shared/tool-detection.test.ts` pins the list.

### The audit skill

`verify` is upstream's workflow, but the fork writes its skill's text: SpecAgile installs it as `sa-audit`, the static, read-only audit of a change before its pull request ("specagile audit"). [`src/core/templates/workflows/audit.ts`](src/core/templates/workflows/audit.ts), the fork's own file, builds that text from upstream's `verify-change.ts`, which stays as upstream wrote it:

- `getAuditSkillTemplate()` takes `getVerifyChangeSkillTemplate()`, replaces its `description` with `AUDIT_DESCRIPTION`, and applies `AUDIT_TEXT_REPLACEMENTS` to its instructions. Each entry pairs an exact upstream text that frames the skill as a verification before archiving (`## Verification Report: <change-name>`, `Fix before archiving.`, `Ready for archive`, …) with the audit's (`## Audit Report: <change-name>`, `Fix before opening the PR.`, `Ready for PR`, …); the opening line becomes two paragraphs that say the audit is static and read-only. Every occurrence of each text is replaced, and a text that is missing makes generation throw, naming it (the idea of `replaceRequired` in `cloud-agent.ts`). The checks, their rules and the sentences saying archive keeps its own checks stay upstream's, so upstream's fixes to them reach `sa-audit` without a port.
- `name` stays `openspec-verify-change`, as in every template written with OpenSpec's names: generation turns it into `sa-audit`, and `/opsx:verify` references follow it.
- `allSkillTemplates()` (`src/core/shared/skill-generation.ts`) uses it for `verify`. `getOpsxVerifyCommandTemplate()` is still upstream's, used only to recognize 1.x command files.

Guards: `test/core/templates/audit.test.ts` checks that undoing the table (`withUpstreamVerifyText` in `test/helpers/fork-identity.ts`) gives back upstream's instructions exactly, that no audit text is already in upstream's, that the generated skill has no "verification", "Ready for archive", "before archiv" or "archive-readiness" left, and that a missing text fails generation. `test/core/templates/verify-change-delta-operations.test.ts` reads `skills/sa-audit/SKILL.md` through `withUpstreamIdentity` and `withUpstreamVerifyText`, so upstream's assertions on verify's wording also hold for `sa-audit`.

When a sync changes `verify-change.ts`, regenerate and run `test/core/templates`. A text of the table that upstream rewrote fails generation: put upstream's new text in its `AUDIT_TEXT_REPLACEMENTS` entry. A new sentence with verify's framing fails `audit.test.ts`: give it an entry of its own. Any other change reaches `sa-audit` as is.

## SpecAgile identity

SpecAgile is the npm package `specagile` (`npm install -g specagile`), version 2.1.0 like the upstream release it starts from. Its CLI is `specagile` (`bin/specagile.js`); the fork installs no `openspec` executable, so it coexists with an OpenSpec installed by npm. Its skills are named `sa-*`:

| Workflow | Skill | Former name |
|---|---|---|
| `explore`, `propose`, `specify`, `plan`, `onboard` | `sa-<workflow>` | `openspec-<workflow>` |
| `apply` | `sa-implement` | `openspec-apply-change` |
| `verify` | `sa-audit` | `openspec-verify-change`, `sa-verify` |
| `archive` | `sa-archive` | `openspec-archive-change` |
| `new`, `continue`, `ff`, `bulk-archive`, `update` | `sa-<workflow>-change` | `openspec-<workflow>-change` |
| `sync` | `sa-sync-specs` | `openspec-sync-specs` |
| `tasks` | `sa-tasks` | — |

`tasks` came after the rename, so it has no former name: `FORMER_SKILL_NAME_BY_WORKFLOW` has no entry for it (read it through `formerSkillNames`), and a user's own `openspec-tasks` skill is never migrated or reported. Its template still says `openspec-tasks`, like the others; `TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW` lets generation translate that name without making it a former one.

Workflow ids (`apply`, `verify`, …), internal files (`.openspec-target`, `.openspec-store/`), the suggested store location (`~/openspec/<id>`) and "OpenSpec" in prose keep upstream's names. The project's folders do not (see [Project layout](#project-layout)), neither does each change's metadata file (`.specagile.yaml`, where upstream writes `.openspec.yaml`), and neither do the global folders.

**Global folders.** SpecAgile keeps its global config and data in folders named `specagile` (`GLOBAL_FOLDER_NAME`), never in OpenSpec's `openspec` ones:

| Platform | Config (`config.json`) | Data |
|---|---|---|
| With `XDG_CONFIG_HOME` / `XDG_DATA_HOME` | `$XDG_CONFIG_HOME/specagile/` | `$XDG_DATA_HOME/specagile/` |
| macOS and Linux | `~/.config/specagile/` | `~/.local/share/specagile/` |
| Windows | `%APPDATA%\specagile\` (or `AppData\Roaming\specagile\` in the home folder) | `%LOCALAPPDATA%\specagile\` (or `AppData\Local\specagile\`) |

The data folder holds the registered stores, the worksets, the global schemas (`schemas/`), the known projects (`projects.json`) and the global skills lock. SpecAgile does not read, copy or change the `openspec` folders, so `openspec` and `specagile` on one machine share no settings: what one saves never changes what the other installs. A first run starts from the defaults.

**Environment variables.** SpecAgile reads its settings from `SPECAGILE_*` variables, with the same values and effects as OpenSpec's:

| OpenSpec | SpecAgile |
|---|---|
| `OPENSPEC_SKILLS_SCOPE` | `SPECAGILE_SKILLS_SCOPE` |
| `OPENSPEC_CONCURRENCY` | `SPECAGILE_CONCURRENCY` |
| `OPENSPEC_NO_UPDATE_CHECK` | `SPECAGILE_NO_UPDATE_CHECK` |
| `OPENSPEC_TELEMETRY` | `SPECAGILE_TELEMETRY` |
| `OPENSPEC_NO_COMPLETIONS` | `SPECAGILE_NO_COMPLETIONS` |
| `OPENSPEC_NO_AUTO_CONFIG` | `SPECAGILE_NO_AUTO_CONFIG` |
| `OPENSPEC_NO_ANIMATION` | `SPECAGILE_NO_ANIMATION` |
| `OPENSPEC_ENABLE_CLI_AGENT_OPENERS` | `SPECAGILE_ENABLE_CLI_AGENT_OPENERS` |
| `OPEN_SPEC_INTERACTIVE` | `SPECAGILE_INTERACTIVE` |
| `OPENSPEC_INSTALL_DIR`, `_INSTALL_NAME`, `_DOWNLOAD_URL`, `_RELEASES_URL` | `SPECAGILE_INSTALL_DIR`, `_INSTALL_NAME`, `_DOWNLOAD_URL`, `_RELEASES_URL` |

OpenSpec's names are ignored: they are not read as a fallback and their presence prints no warning, so what is set for `openspec` never changes `specagile` (the same rule as the global folders). `CI`, `DO_NOT_TRACK`, `NO_COLOR`, `XDG_CONFIG_HOME` and `XDG_DATA_HOME` still apply. When `specagile update` upgrades the CLI and runs `update` again with the new version, it passes that run `SPECAGILE_NO_UPDATE_CHECK=1` and `SPECAGILE_TELEMETRY=0` (`rerunUpdateWithUpgradedCli` in `src/core/version-check.ts`). The test suite's own variables are named `SPECAGILE_*` too: `SPECAGILE_TEST_HOME`, `SPECAGILE_TEST_BINARY`, `SPECAGILE_RELEASE_UPGRADES`, `SPECAGILE_RELEASE_CACHE`, `SPECAGILE_TEST_EDITOR_EXIT`/`_LOG`/`_WRITE` and `SPECAGILE_TEST_MODULE_LOG`. Users read the page `docs-lab/reference/configuration/environment-variables.md`.

**No profile is inferred.** Upstream's one-time profile migration (`computeProfileMigration` in `src/core/migration.ts`) deduces a profile from the skills installed in the project when the config has no `profile`, counting OpenSpec's `openspec-*` skills too. With a folder of its own, every SpecAgile config starts without `profile`, so that migration would save a `custom` profile without `specify` and `plan` on a user's first `init` or `update`. In the fork it returns `null` on its first line: with no `profile`, `core` applies, nothing is saved and `Migrated: custom profile…` is never printed. A `custom` profile exists only when the user chooses one with `specagile config profile`. `applyProfileMigration` and the message stay as upstream wrote them, without callers.

Because it is published on its own, SpecAgile also differs from upstream in what it installs and sends:

- **Updates** name the `specagile` package (`npm install -g specagile@latest`, `npx specagile@latest update`). `version-check.ts` reads the name from `package.json`; the shim npm writes (`specagile.cmd`, `bin/specagile`) and its messages use `CLI_NAME`.
- **No standalone install.** The standalone binary and its installer are OpenSpec's. `specagile install` is hidden and only prints `npm install -g specagile@latest` (exit code 1); `update` does not show the standalone tip. `src/commands/install-standalone.ts` and `src/core/standalone-tip.ts` are no longer reached; `standalone-tip.ts` is left as upstream wrote it. `install-standalone.ts` reads `SPECAGILE_INSTALL_DIR`, `SPECAGILE_INSTALL_NAME`, `SPECAGILE_DOWNLOAD_URL` and `SPECAGILE_RELEASES_URL` (`ENV_VAR_NAMES`), and the installer it would download is OpenSpec's, which reads `OPENSPEC_*`: `installerEnv` drops those four inherited `OPENSPEC_*` names and passes the installer the resolved target and the `SPECAGILE_*` values under OpenSpec's names (`FORMER_ENV_VAR_NAMES`), plus `OPENSPEC_VERSION` and, on Windows, `OPENSPEC_INSTALLER_URL`, which are the installer's protocol.
- **No telemetry.** `src/cli/index.ts` does not call the telemetry hooks, so nothing goes to OpenSpec's analytics and no first-run notice appears. `src/telemetry/` is left as is, except that `src/telemetry/opt-out.ts` reads `SPECAGILE_TELEMETRY`; `telemetry.enabled`, `SPECAGILE_TELEMETRY` and `DO_NOT_TRACK` still turn off the background update check.
- **Links and feedback** go to `REPOSITORY_URL` (`https://github.com/dariopalminio/specagile`): `specagile feedback`, and the "Learn more" lines of `init` and `update`. `package.json` names the fork in `repository`, `homepage`, `bugs` and `author`.
- **Skills come from this repository.** Since upstream 2.1, `init` and `update` install the skills with the `skills` package, which fetches the `skills/` folder of a GitHub repository at the running version's tag. `src/core/skill-installer.ts` points it at `REPOSITORY_URL` (`dariopalminio/specagile/skills`, the `sa-*` skills `pnpm generate:skills` writes) and at the tags `v<version>` or `specagile@<version>`, never at OpenSpec's. **A release must push that tag, on a commit whose `skills/` matches the package**, or `specagile init` fails with a missing-tag error. The tests fake that repository (`test/helpers/skill-release.mjs`, which reads `repository.url` from `package.json`).
- **GitHub Copilot cloud files** install `specagile` and use its CLI. `cloud-agent.ts` keeps building upstream's text and writes it through the fork's identity, so a file OpenSpec wrote is recognized as earlier output and refreshed. The agent is `.github/agents/specagile.agent.md` (`COPILOT_CLOUD_FILES.agent`, built with `CLI_NAME`), and Copilot shows it as **SpecAgile**: `AGENT_IDENTITY_REPLACEMENTS` swaps upstream's `name: OpenSpec`, the description's "OpenSpec changes … the OpenSpec CLI" and the `# OpenSpec Agent` title for texts built with `PRODUCT_NAME`; the rest of the body keeps upstream's prose. A profile of the user's with the same Copilot identifier is `specagile.md`, so an `openspec.md` no longer stops SpecAgile from writing its agent. `init` and `update` migrate `.github/agents/openspec.agent.md` (`FORMER_COPILOT_AGENT_FILE`), where OpenSpec and SpecAgile up to 4.0.0 wrote the agent: one whose text is in the list of earlier output (line endings ignored) counts as the cloud files being set up, is removed once `specagile.agent.md` is written, and is removed too on opt-out or once Copilot is no longer set up. An edited one stays, and `init` and `update` say so (`findKeptFormerCopilotAgent`).

Publishing (`npm publish`) is the maintainer's step. Upstream's release workflows (`.github/workflows/release-prepare.yml`, `binaries.yml`, `scripts/binary/`) are not used by the fork to publish anything. `binaries.yml` still builds and checks the binaries on each pull request (its release job only runs in Fission-AI/OpenSpec), and its `scripts/binary/install-check.sh` checks that `install` points to npm and writes nothing, from the Node build and from the binary.

### Where it lives

[`src/core/fork/identity.ts`](src/core/fork/identity.ts) is the fork's own file, so a sync never conflicts in it. It holds:

- `GLOBAL_FOLDER_NAME` (`CLI_NAME`, so `specagile`): the name of the global config and data folders. `GLOBAL_CONFIG_DIR_NAME` and `GLOBAL_DATA_DIR_NAME` (`src/core/global-config.ts`) take their value from it, and every global path is built from them with `getGlobalConfigDir()` and `getGlobalDataDir()`. Tests build those paths with `test/helpers/global-folders.ts`.
- `CLI_NAME`, and the two tables `SKILL_NAME_BY_WORKFLOW` (`sa-*`) and `FORMER_SKILL_NAME_BY_WORKFLOW` (`openspec-*`). `SKILL_NAME_BY_WORKFLOW` is typed `Record<WorkflowId, …>`, so a workflow upstream adds fails the build until it has a name. `FORMER_SKILL_NAME_BY_WORKFLOW` is `Partial`, since a workflow the fork added after the rename (`tasks`) has none: code reads it through `formerSkillNames(workflow)`, and `test/fork/identity.test.ts` requires a former name for every workflow but `tasks`. `TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW` holds the `openspec-*` name such a workflow's template uses (`openspec-tasks`), which generated text translates but migration and detection never look for.
- `FORMER_SA_SKILL_NAME_BY_WORKFLOW` (`{ verify: 'sa-verify' }`) and its list `FORMER_SA_SKILL_NAMES`: the `sa-*` name a workflow had in an earlier SpecAgile release (`verify`, 2.1.1 to 6.0.0). `formerSkillNames(workflow)` returns the OpenSpec name and then this one (`['openspec-verify-change', 'sa-verify']`), so the migration, `FORMER_SKILL_NAMES` and `KNOWN_SKILL_NAMES` look for it too. `applyForkNames` never translates it: no template says it. The texts SpecAgile released under it are recognized by `FORMER_SA_SKILL_FINGERPRINTS` (`src/core/fork/former-sa-skill-fingerprints.ts`), which `scripts/fork/capture-former-sa-skill-fingerprints.mjs` writes from the `skills/` folder of each release tag that installed it (v2.1.1 to v6.0.0, read with `git show`) and its `projectSkillText` forms; no later release writes those names, so the list is closed. `FORMER_TEMPLATE_BY_WORKFLOW` (`{ verify: getVerifyChangeSkillTemplate }`, in `src/core/fork/former-skills.ts`) lets the migration also compare a former skill with what the upstream template a fork-owned one replaces generates, so the `openspec-verify-change` OpenSpec 2.1 wrote is still recognized now that `verify` generates sa-audit's text.
- `KNOWN_SKILL_NAMES`: current and former names, for detecting a set-up project, never for deciding what to write.
- `ENV_VAR_NAMES` (`SPECAGILE_*`) and `FORMER_ENV_VAR_NAMES` (OpenSpec's thirteen names), both typed `Record<EnvSetting, string>`. Code reads `process.env[ENV_VAR_NAMES.<setting>]` and builds messages and help with the table (`--concurrency`, an invalid `SPECAGILE_SKILLS_SCOPE`); `FORMER_ENV_VAR_NAMES` is never read from the environment, only used by tests, docs and `installerEnv`. `test/fork/environment-variables.test.ts` pins both, and fails on a former name in `src/` outside `identity.ts` and `src/telemetry/index.ts`, on any `OPENSPEC_*`/`OPEN_SPEC_*` read from the environment in `src/`, and on a former or suite name in the tests' environment.
- `SPECAGILE_BANNER`: the two-line "SpecAgile" banner `init` prints above its tool picker.
- `PRODUCT_NAME` (`SpecAgile`): the name a tool shows for the product, today the GitHub Copilot cloud agent's `name:`, description and title (`AGENT_IDENTITY_REPLACEMENTS` in `src/core/github-copilot/cloud-agent.ts`).
- `CLI_SUBCOMMANDS` (every subcommand of `src/cli/index.ts`, hidden ones included), and `CLI_WORDS`: those, `--version` and the trigger verbs (`apply`, `implement`, `audit`, …).
- `applyForkNames(text)`: turns each former skill name into its `sa-*` name, each `openspec <word in CLI_WORDS>` into `specagile <word>`, and three exact texts (`Bash(openspec:*)`, `Requires openspec CLI.`, `Get-Command openspec `). Anything outside the tables, such as `openspec/changes/` or `openspec-helpers`, is left as written. This is the whole translation SpecAgile 2.1 applied, so it also describes what 2.1 wrote.
- `applyForkIdentity(text)`: `applyForkNames`, then `applyLayoutText` from [`src/core/fork/layout.ts`](src/core/fork/layout.ts), which applies `LAYOUT_TEXT_REPLACEMENTS`: whole upstream texts that name its layout, each with its SpecAgile translation (`<planningHome.root>/openspec/specs/` → `<planningHome.root>/specs/`, `<root.path>/openspec/config.yaml` → `<root.path>/specagile/config.yaml`, ``under `openspec/changes/` by hand`` → ``under `changes/` by hand``, the five phrases that name `openspec/` alone, the Copilot agent's directory list, and a change's metadata file, `.openspec.yaml` → `.specagile.yaml`). No regexes, longest first, and each entry carries enough context that its translation never appears in upstream's text (`.specagile.yaml` appears in none). A bare `openspec/specs/` is never translated: upstream already writes `specs/` for a change's deltas. Internal files (`.openspec-target`, `.openspec-store/`) and `~/openspec/<id>` stay. Last, `applyProductText` applies `PRODUCT_TEXT_REPLACEMENTS`: whole upstream texts that greet the user as OpenSpec, today only the onboard skill's `## Welcome to OpenSpec!` → `## Welcome to SpecAgile!`. Any other "OpenSpec" in prose stays.
- `withUpstreamIdentity` (`test/helpers/fork-identity.ts`) is the inverse of all three: it undoes the greetings first, then the layout table, then the names. `test/fork/identity.test.ts` checks the round trip, `withUpstreamIdentity(applyForkIdentity(t)) === t`, on every skill and command template, so upstream tests that pin a template's wording keep their text.

**Upstream skill templates are not edited.** `generateSkillContent` (`src/core/shared/skill-generation.ts`) passes every generated `SKILL.md` through `applyForkIdentity`, and so do the hints `init` and `update` print (`src/core/init.ts`, `src/core/update.ts`; the profile migration's in `src/core/migration.ts` is no longer reached). `COMMAND_TO_SKILL_NAME` keeps upstream's names on purpose: the current text is always the translation of upstream's, which is what lets the migration recognize copies an earlier version wrote.

Upstream code that reads the tables: `WORKFLOW_TO_SKILL_DIR` (`src/core/profile-sync-drift.ts`), `OPENSPEC_SKILL_NAMES` (`src/core/config.ts`, which also decides which skills `src/core/global-skills.ts` and the installer manage), `allSkillTemplates()`, `ONBOARDING_COMMANDS`; with `KNOWN_SKILL_NAMES`: `isListedToolPresent`, `hasSkillLinks` and `getToolSkillStatus` (`src/core/shared/tool-detection.ts`), `inferPreListTool` and `hasOpenSpecSkillIn` (`src/core/shared-skill-target.ts`), and `src/core/retired-tools.ts`. `src/core/shared/skill-content-equivalence.ts` builds its Codex pattern from `OPENSPEC_SKILL_NAMES`. Because the global install only touches `OPENSPEC_SKILL_NAMES` and SpecAgile's former `FORMER_SA_SKILL_NAMES`, SpecAgile's `sa-*` skills and an OpenSpec's `openspec-*` ones can share `~/.agents/skills/`.

### Migrating projects with the former skills

[`src/core/fork/former-skills.ts`](src/core/fork/former-skills.ts) runs in `init` and `update` after the `sa-*` skills are installed (and before the sweep of earlier-release files). It looks up the former names `formerSkillNames` lists (OpenSpec's fourteen, and `sa-verify`, `verify`'s name in SpecAgile 2.1.1 to 6.0.0) in `.agents/skills/` and in each set-up tool's own folder, removes a `SKILL.md` that is text OpenSpec or SpecAgile wrote along with the links they made to it, and keeps and reports anything else; `update` names what it removed and what it kept. Text OpenSpec or SpecAgile wrote is: a release up to 1.16.1 (upstream's `RELEASED_GENERATED_FINGERPRINTS`), OpenSpec 2.0.0 or this fork before the rename (`FORMER_RELEASE_FINGERPRINTS` in `src/core/fork/former-release-fingerprints.ts`, generated by `scripts/fork/capture-former-skill-fingerprints.mjs` from a build of `0039e6b3`), the `sa-verify` of a SpecAgile release (`FORMER_SA_SKILL_FINGERPRINTS`, see [Where it lives](#where-it-lives)), or this version's text with upstream's names. For `verify` that last one includes upstream's verify template (`FORMER_TEMPLATE_BY_WORKFLOW`): the `openspec-verify-change` OpenSpec 2.1 wrote is upstream's verify text, not sa-audit's. A user's `sa-verify-security` is not a former name and is never touched. Upstream 2.1 dropped the `keep <skill>` lines of `.openspec-target`, so the fork no longer reads them either. A tool's former root (`.codex/`, `.agent/`, `.kimi/`, `.windsurf/`) is handled by upstream's move in `src/core/migration.ts`, which also looks for the former names there: before generation it moves them under their own name, so `former-skills.ts` retires them; after generation it compares them with the `sa-*` skill (fork identity applied) and drops or keeps them. `scanInstalledWorkflows` counts skills under either name (it no longer feeds a profile: see "No profile is inferred" above). Moving a project to the global skills (`init --scope global`, `removeProjectSkills` in `src/core/init.ts`) has no move to run first, so it calls `former-skills.ts` with `legacyRoots`, which also looks in the former roots: it removes what OpenSpec wrote there too, or the next `update` would find those skills and set the project up again, and an edited former skill stops the switch the way an edited command file does. `test/cli-e2e/upgrade-from-releases.test.ts` (run with `SPECAGILE_RELEASE_UPGRADES=1`) covers both. `update --dry-run` plans the removals and notes what it keeps (`kept-former-skills` in `src/core/update-plan.ts`).

The global skills (`~/.agents/skills/` and each tool's global folder) are not migrated by `former-skills.ts`: there a former `openspec-*` name belongs to an OpenSpec installed with global scope and must stay. `readGlobalSkills()` (`src/core/global-skills.ts`) lists the names of `OPENSPEC_SKILL_NAMES` and of `FORMER_SA_SKILL_NAMES` present in those folders, never the `openspec-*` ones. `sa-verify` is never in the set a profile expects, so `installGlobalSkills` puts it in `removedSkills` and removes it, after installing the chosen skills, like the skill of a deselected workflow, with the same check that nothing is left. The global scope treats its skills as managed (it rewrites a changed `SKILL.md` and removes a deselected one without looking for edits), and `sa-verify` follows that rule: an edited one is removed too. `update --dry-run` lists it in its `removed-skills` note.

### Upstream files edited for the identity

These can conflict when upstream changes the same lines:

- **Skill source**: `src/core/skill-installer.ts` (`SKILLS_SOURCE`, `RELEASE_TAG_PREFIX`), `test/helpers/skill-release.mjs` (the faked repository's URL), and the "link another tool" note in `src/core/config.ts`.
- **CLI and package name**: `package.json` (`name`, `bin`, `dev:cli`, `repository`, `homepage`, `bugs`, `author`), `src/cli/index.ts` (`.name(CLI_NAME)`, `getCommandPath`, the hidden `install`, no standalone tip, no telemetry hooks), `src/core/version-check.ts`, `src/commands/feedback.ts`, the "Learn more" lines in `src/core/init.ts` and `src/core/update.ts`, `src/core/github-copilot/cloud-agent.ts`, `scripts/pack-version-check.mjs`, `scripts/binary/install-check.sh`, `flake.nix` (`pname`, completions) and the Nix check in `.github/workflows/ci.yml`.
- **Messages**: every `openspec <subcommand>` a user reads in `src/cli/`, `src/commands/`, `src/core/` and `src/telemetry/` now says `specagile <subcommand>`. Comments were left alone.
- **Copilot agent name**: `src/core/github-copilot/cloud-agent.ts` (the agent and profile paths, `AGENT_IDENTITY_REPLACEMENTS`, the 4.0.0 text in `getLegacyCopilotCloudFileContents`, and the `SpecAgile:` blocks that handle `FORMER_COPILOT_AGENT_FILE` in `writeCopilotCloudFiles`, `removeCopilotCloudFiles` and `hasExistingManagedCloudFiles`), `src/core/init.ts` (the cloud question builds the agent's path from `COPILOT_CLOUD_FILES`, and the summary reports a kept former agent), `src/core/update.ts` (the same report in `syncCopilotCloudFiles`) and `src/core/update-plan.ts` (the note `kept-former-copilot-agent`). The tests pin the 4.0.0 agent with `test/fixtures/copilot-cloud/specagile-4.0.0.agent.md` (`test/helpers/copilot-cloud.ts`).
- **Built-in schema**: `schemas/spec-driven/schema.yaml` and `schemas/spec-driven/templates/proposal.md`: the CLI name, and the layout (the living spec at `<planningHome.root>/specs/<capability-path>/spec.md`, the delta at `specs/<capability-path>/spec.md` inside the change). `docs-lab/reference/schemas/spec-driven/index.md` quotes them verbatim (`test/core/templates/schema-docs-instruction-parity.test.ts`).
- **Shell completions** (`src/core/completions/`): the registry does not list `install`; the scripts register and call `CLI_NAME`, the installers write `specagile` files (`_specagile`, `specagile.fish`, `SpecAgileCompletion.ps1`, …) and mark their block in shell config with `# SPECAGILE:START`/`# SPECAGILE:END`, so an OpenSpec completion installed beside them is left alone. Internal function names (`_openspec_*`) are unchanged.
- **Tests**: names in the tests that pin what this version installs; `scripts/parity-hash-shared.mjs` accepts `sa-*` keys. Upstream tests that pin a template's wording on generated text compare it through `withUpstreamIdentity` (`test/helpers/fork-identity.ts`), so their assertions stay as upstream wrote them.
- **Docs**: `README.md`, `docs-lab/` and `skills/README.md` (the page of the folder the skills are installed from), which also name the project layout (see [Project layout](#project-layout)).
- **Layout**: the source files listed under [Upstream files edited for the layout](#upstream-files-edited-for-the-layout), `src/core/github-copilot/cloud-agent.ts` (2.1's output, translated with `applyForkNames` only, counts as earlier output), and the upstream tests whose fixtures or expected paths now come from `test/helpers/layout.ts`.
- **Global folders**: `src/core/global-config.ts` (`GLOBAL_CONFIG_DIR_NAME` and `GLOBAL_DATA_DIR_NAME` read `GLOBAL_FOLDER_NAME`) and `src/core/migration.ts` (the early `return null` in `computeProfileMigration`). The upstream tests that named the `openspec` global folder build it with `test/helpers/global-folders.ts` (`global-config`, `global-config.unparseable`, `global-skills`, `known-projects`, `standalone-tip`, `version-check`, `store/foundation`, `store/registry`, `artifact-graph/resolver`, `project-skills-vercel`, `released-output-sweep`, `skills-2-0-hardening`, `openers` and `references` in `test/core/`; `artifact-workflow`, `config-edit`, `config`, `context`, `doctor`, `global-default-store`, `profile-handoffs`, `schemas`, `store-root-selection` and `workset` in `test/commands/`; `completion-tip`, `startup-modules`, `store-lifecycle` and `upgrade-from-releases` in `test/cli-e2e/`; `config` and `index` in `test/telemetry/`; and `test/fork/cli-name.test.ts`). `upgrade-from-releases` keeps writing the releases' settings to OpenSpec's folder, and gives SpecAgile the same profile in its own where a case depends on it. The ones that expected a profile migration now expect none: `test/core/migration.test.ts` (one `SpecAgile: no profile is inferred` block), and one case each in `skills-2-0-hardening`, `update-dry-run` and `init`.
- **Welcome screen**: `src/ui/welcome-screen.ts` (the title "Welcome to SpecAgile", the import of the animation and the frame shown when it does not animate, `staticFrame`). The onboard skill's "Welcome to SpecAgile!" is not an edit: `applyProductText` writes it when the skill is generated, and `src/core/templates/workflows/onboard.ts`, `docs/` and the released-output fixtures keep OpenSpec's greeting. The animation is the fork's own [`src/ui/glider-animation.ts`](src/ui/glider-animation.ts): a glider from Conway's Game of Life crossing a 10×10 toroidal field, its frames computed with Life's rules (B3/S23), with the cells that just died drawn dim. Upstream's `src/ui/ascii-patterns.ts` (OpenSpec's logo) is left as upstream wrote it and is no longer imported. Upstream's `cli-init` spec still says "OpenSpec logo" and stays as is. `src/core/init.ts` prints `SPECAGILE_BANNER` in `getSelectedTools`, above the "configured" line and the tool picker, only when the picker is shown.
- **Environment variables**: one read or text each, plus the import of `ENV_VAR_NAMES`, in `src/core/init.ts` (`resolveSkillScope` and its error), `src/core/update.ts` (the global skills question), `src/commands/validate.ts`, `src/cli/index.ts` and `src/core/completions/command-registry.ts` (the `--concurrency` description), `src/core/version-check.ts` (`isCheckEnabled` and `rerunUpdateWithUpgradedCli`), `src/telemetry/opt-out.ts`, `src/core/completion-tip.ts`, `src/core/completions/installers/bash-installer.ts` and `zsh-installer.ts`, `src/ui/welcome-screen.ts`, `src/core/openers.ts` and `src/utils/interactive.ts`, and the comments that named the former variables in those files and in `src/core/completions/factory.ts`. `src/commands/install-standalone.ts` reads its four variables with the table and builds the installer's environment in `installerEnv`. The suite's environment (`vitest.config.ts`, `vitest.setup.ts`, `test/helpers/run-cli.ts`, `test/helpers/record-loaded-modules.mjs`) and every test that set a former name use the `SPECAGILE_*` one; so do `flake.nix`, `scripts/binary/install-check.sh`, `smoke.sh` and `e2e.sh`, the "Upgrade from releases" job of `.github/workflows/ci.yml` and the two lines of `binaries.yml` that run `install-check.sh`.
- **Audit skill**: `src/core/shared/skill-generation.ts` (`allSkillTemplates()` uses `getAuditSkillTemplate()` for `verify`), `src/core/templates/skill-templates.ts` (its export) and `src/commands/config.ts` (`WORKFLOW_PROMPT_META.verify` reads "Audit change"). See [The audit skill](#the-audit-skill).
- **Former `sa-verify`**: `src/core/global-skills.ts` (`readGlobalSkills()` also lists `FORMER_SA_SKILL_NAMES`) and `src/core/update.ts` (the summary names the skills removed under a former name, with `formatFormerSkillMigration`, instead of counting them in "Removed: N skill directories").
- **Not identity, same risk**: `src/core/update-plan.ts` (`removesLinkAbove`). A file the plan writes where it removed a link is planned as added, not updated, as on Windows, where the installer replaces a junction with a copy. Upstream has the same bug; the fork's extra skills are what made `test/core/update-dry-run.property.test.ts` hit it on Windows.

### Texts that keep `openspec` on purpose

These are the exceptions in `test/fork/cli-name.test.ts`: `src/core/github-copilot/cloud-agent.ts` (upstream's text is the source; the files are written with the fork's identity), and `src/commands/install-standalone.ts` and `src/core/standalone-tip.ts` (OpenSpec's standalone install, which SpecAgile never reaches). `test/cli-e2e/upgrade-from-releases.test.ts` and `scripts/capture-released-fingerprints.mjs` install OpenSpec's released `@fission-ai/openspec` packages on purpose: they are earlier output SpecAgile must recognize.

Former environment variable names stay where the reader is OpenSpec: the telemetry notice and comments in `src/telemetry/index.ts` (`OPENSPEC_TELEMETRY`; SpecAgile never shows that notice), `test/cli-e2e/upgrade-from-releases.test.ts` (it runs OpenSpec's and SpecAgile's releases with one environment, so it sets both `OPENSPEC_TELEMETRY` and `SPECAGILE_TELEMETRY`), `scripts/capture-released-fingerprints.mjs` (it only runs OpenSpec), and OpenSpec's installer: `scripts/binary/install.sh`, `install.ps1`, the `binaries.yml` steps that run them and `test/binary-installer.test.ts`, with every `OPENSPEC_*` they read (`OPENSPEC_VERSION`, `OPENSPEC_INSTALLER_URL`, `OPENSPEC_INSTALL_PATH_CHANGED` included).

### When a sync touches the identity

- **A conflict in a message or list above**: keep upstream's new text, then change `openspec <subcommand>` back to `specagile <subcommand>` (or the skill name to read the tables).
- **A new message naming `openspec <subcommand>`**: `test/fork/cli-name.test.ts` lists it; change it to `specagile`, or add the file to the exceptions with the reason.
- **A new subcommand**: `test/fork/identity.test.ts` fails until it is added to `CLI_SUBCOMMANDS`.
- **New telemetry or standalone calls** in `src/cli/index.ts`: keep them out (SpecAgile has neither); `test/cli-e2e/startup-modules.test.ts` and `test/fork/cli-name.test.ts` fail if the telemetry module loads or a notice appears.
- **A new hard-coded `Fission-AI/OpenSpec` link or `@fission-ai/openspec` install** in user-facing code: point it at `REPOSITORY_URL` or `PACKAGE_NAME`.
- **A new workflow**: the build fails until it has a name in both tables; add it to `test/fork/identity.test.ts` too.
- **A template with a new wording**: `test/fork/generated-skills-identity.test.ts` fails when a generated skill still names a former skill or `openspec <word>`.
- **The Copilot agent's name, description or title reworded upstream**: `generateCopilotAgentFile` throws (`replaceRequired`) and `test/core/github-copilot-cloud-agent.test.ts` fails. Put upstream's new text in `AGENT_IDENTITY_REPLACEMENTS`, and add the text the last release wrote to `getLegacyCopilotCloudFileContents`, so `update` still recognizes it as generated.
- **A conflict in `cloud-agent.ts` around the alternate profile or the loops over `COPILOT_CLOUD_FILES`**: keep the `SpecAgile:` blocks for `FORMER_COPILOT_AGENT_FILE`; the "the former agent" tests in `test/core/github-copilot-cloud-agent.test.ts` fail if one is lost.
- **A text of `AUDIT_TEXT_REPLACEMENTS` rewritten upstream** (`verify-change.ts`): `getAuditSkillTemplate` throws naming the text, and `test/core/templates` fails. Put upstream's new text in that entry, never in the template; a new sentence with verify's framing gets an entry of its own (see [The audit skill](#the-audit-skill)).
- **A greeting upstream rewords** (`## Welcome to OpenSpec!`): `test/fork/identity.test.ts` fails because the entry no longer matches upstream's text. Put upstream's new text in `PRODUCT_TEXT_REPLACEMENTS`, never in the template.
- **A template with a new `openspec/` path**: the same test fails, naming the skill (and its check of `skills/` fails after `pnpm generate:skills`). Add the whole sentence or path, with enough context that its translation is not already upstream text, to `LAYOUT_TEXT_REPLACEMENTS` in `src/core/fork/layout.ts`; the round trip in `test/fork/identity.test.ts` tells you when the context is too short.
- **A new global path** (under `APPDATA`, `LOCALAPPDATA`, `~/.config`, `~/.local/share` or `XDG_*_HOME`): build it with `getGlobalConfigDir()` or `getGlobalDataDir()`. `test/fork/global-folders.test.ts` fails on one that joins an `openspec` folder by hand; a new upstream test that names that folder builds it with `test/helpers/global-folders.ts`.
- **A change in `computeProfileMigration`, or a new way upstream deduces a profile** (from installed skills, commands or another tool's config): keep the early `return null` first in the function, and check the new path against "No profile is inferred" above. `test/fork/global-folders.test.ts` fails if `init`, `update` or `update --dry-run` infer one again.
- **A new environment variable** (`OPENSPEC_*` or `OPEN_SPEC_*`): `test/fork/environment-variables.test.ts` fails. One the CLI reads in `src/`: add a setting to `EnvSetting`, its `SPECAGILE_*` name to `ENV_VAR_NAMES` and OpenSpec's to `FORMER_ENV_VAR_NAMES`, read it with `ENV_VAR_NAMES`, and add it to the docs page and the table above. One only the test suite uses: rename it to `SPECAGILE_*` where it is set and where it is read, and add the former name to the suite's list in that test. A conflict in a line that reads a variable: keep upstream's change and read through `ENV_VAR_NAMES` again.
- **A new path into the project layout in `src/`**: `test/fork/layout.test.ts` lists it. Build it with `src/core/fork/layout.ts`, or add the text to that test's allow list with the reason when it is not the project layout.

Then run:

```bash
pnpm build && pnpm regen:parity-hashes && pnpm generate:skills
pnpm test -- --run test/fork test/core/templates
```

## Project layout

SpecAgile keeps a project's (or a store's) planning in three folders at the root, named for what they hold rather than for the tool:

```
specs/        living specs: specs/<capability-path>/spec.md
changes/      changes in progress; changes/archive/ holds the archived ones
specagile/    the tool's own files: config.yaml, schemas/, and whatever else upstream keeps in openspec/
```

Inside a change only the metadata file differs from upstream: it is `.specagile.yaml`, where upstream writes `.openspec.yaml` (its deltas are in `specs/<capability-path>/spec.md`, as upstream's). Upstream keeps all of it in `openspec/`; that is the *former layout*, and `specagile update` (or `specagile init` on a set-up project) migrates it.

### Where it lives

[`src/core/fork/layout.ts`](src/core/fork/layout.ts) is the fork's own file, so a sync never conflicts in it, and it loads only `node:` modules (the CLI loads it at startup). It holds:

- The names: `SPECS_DIR_NAME`, `CHANGES_DIR_NAME`, `ARCHIVE_DIR_NAME`, `TOOL_DIR_NAME` (`specagile`), `CONFIG_FILE_NAMES` (`config.yaml`, then `config.yml`), `SCHEMAS_DIR_NAME`, and `FORMER_TOOL_DIR_NAME` (`openspec`, for detection and migration only).
- `CURRENT_LAYOUT`, the one place that decides where `specs/`/`changes/` and the tool folder sit relative to the root.
- Functions that build absolute paths with `path.join` (`getSpecsDir`, `getChangesDir`, `getArchiveDir`, `getToolDir`, `getConfigFilePaths`, `getProjectSchemasDir`), their inverses (`getRootOfSpecsDir`, `getRootOfChangesDir`, `getRootOfChangeDir`) for the code that derives the root from a folder, and the relative forms with `/` that messages print (`RELATIVE_CONFIG_FILE` is `specagile/config.yaml` on every platform, `relativeChangeDir`, `relativeSpecFile`, …).
- `isLayoutRoot(dir)` and `detectFormerLayout(dir)`.
- A change's metadata file: `CHANGE_METADATA_FILE_NAME` (`.specagile.yaml`, the one the CLI writes and names in messages), `FORMER_CHANGE_METADATA_FILE_NAME` (`.openspec.yaml`, which OpenSpec and SpecAgile 4.0.0 wrote; read, detected and migrated, never written) and `CHANGE_METADATA_FILE_NAMES` (both, in reading order). `getChangeMetadataFile(changeDir)` gives the path, built with `path.join`, of the first of them that exists in the change folder, or of `.specagile.yaml` when neither does. **Precedence goes by existence, not validity**: an invalid or unreadable `.specagile.yaml` never falls back to `.openspec.yaml`; it fails as an invalid `.openspec.yaml` failed before, so a former file never authorizes a `retire_capabilities` or a `skip_specs` that the file in force does not validly declare. `METADATA_FILENAME` (`src/utils/change-metadata.ts`) takes its value from `CHANGE_METADATA_FILE_NAME`; every reader resolves the file with `getChangeMetadataFile`, and only writers of a new file use `METADATA_FILENAME`.

Upstream's own constants keep their names and take their values from it: `OPENSPEC_DIR_NAME` (`project-dir.ts`) is the tool folder; `OPENSPEC_ROOT_DIR`, `OPENSPEC_SPECS_DIR`, `OPENSPEC_CHANGES_DIR`, `OPENSPEC_ARCHIVE_DIR`, `OPENSPEC_CONFIG_YAML`/`_YML` (`openspec-root.ts`) are relative paths into the layout. So do `inspectOpenSpecRoot`, `classifyOpenSpecDir`, `ResolvedOpenSpecRoot` and the `openspec_*` diagnostic codes: same names, new paths.

### How a root is recognized

A folder is a root when it has `specagile/` with a config file, or `specagile/` next to `specs/` or `changes/`; `findRepoPlanningRootSync` (`planning-home.ts`) looks for `specagile/`, and `classifyOpenSpecDir` (`project-config.ts`) reads `specs/` and `changes/` at the root and the config inside `specagile/`. A `specs/` folder alone is never a root: many repos keep tests there. A `specs/` or `changes/` with store metadata is a store at `~/openspec/<id>`, as upstream already handled.

The former layout is only detected, never read: `detectFormerLayout` applies upstream's old rule to `openspec/` (a config, or `specs/`/`changes/` without store metadata), so a `~/openspec/` that only holds stores never counts. When the nearest root has only the former layout, the walk stops there and fails with `former_layout` ("Run specagile update"), without looking further up. With `--store`, `store doctor` and `store register`, `inspectOpenSpecRoot` reports `openspec_former_layout` with the store's path.

Spec link containment (`src/utils/spec-path-containment.ts`) has no container folder to look for any more: the project of a specs root is the first ancestor whose child on the way is `specs` or `changes` and that has a `specagile/` folder.

### Migration

[`src/core/fork/layout-migration.ts`](src/core/fork/layout-migration.ts) (`migrateFormerLayout`) moves `openspec/specs/` to `specs/`, `openspec/changes/` to `changes/` and every other entry to `specagile/<entry>`, then removes the empty `openspec/`. It checks that `specs/`, `changes/` and `specagile/` are missing or empty before moving anything, moves each entry with one `rename` recorded in a ledger, retries `EPERM`/`EBUSY`/`EACCES` on Windows a few times, and undoes in reverse order when a move still fails. `update` runs it before anything else in `updateProject` (and plans it on the recorder for `--dry-run`); `init` runs it before the store-pointer guard. A root that already has the new layout keeps its `openspec/` untouched, with a warning.

[`src/core/fork/change-metadata-migration.ts`](src/core/fork/change-metadata-migration.ts) (`migrateChangeMetadata`) then renames each active change's `.openspec.yaml` to `.specagile.yaml`, without changing its content. It looks at each folder directly under `changes/`, leaving out `changes/archive/` and hidden folders (the rule of `getActiveChangeIds`), and only for the exact former name:

| `.openspec.yaml` | `.specagile.yaml` | Result |
|---|---|---|
| file | missing | renamed (with the layout's retries) |
| file | exists | both kept, with a warning that `.specagile.yaml` is used |
| missing | either | nothing |
| the rename still fails after the retries | | kept and reported, with "close it and run specagile update again" |

What it leaves: archived changes keep `.openspec.yaml` (they are history, the CLI still reads them, and renaming them would fill the diff); a change with both files keeps both, because `rename` would replace the destination and the two may differ. It is **not all or nothing**, unlike the layout: a change left with `.openspec.yaml` keeps working through `getChangeMetadataFile`, so a failed rename is reported and the run goes on, with exit code zero. It reuses `LayoutMigrationOps`, `DISK_LAYOUT_OPS`, `planLayoutOps` and `renameWithRetry` from `layout-migration.ts`. `update` runs it inside `migrateLayout`, right after the layout and only once per run, unless the layout is blocked; in `--dry-run` it is planned on the recorder, and its account joins the layout's in the one `layout-migration` note (the recorder keeps one note per code). `init` runs it after the layout block, before the global skills branch. The root is the folder `update` or `init` runs on, a store's included; a project that points at a store has no `changes/` of its own, so nothing happens there.

This repository still keeps `openspec/` (it is operated with upstream's CLI, and every sync writes there), so `specagile update` and `specagile init` are never run at its root (see AGENTS.md).

### Upstream files edited for the layout

- **Root and config resolution**: `src/core/project-dir.ts`, `openspec-root.ts`, `planning-home.ts`, `root-selection.ts`, `project-config.ts`, `artifact-graph/resolver.ts`, `artifact-graph/instruction-loader.ts`.
- **Commands and readers**: `src/commands/` (`change.ts`, `spec.ts`, `schema.ts`, `shared-gather.ts`, `doctor.ts`, `validate.ts`, `workflow/shared.ts`, `workflow/new-change.ts`), `src/core/` (`list.ts`, `view.ts`, `archive.ts`, `specs-apply.ts`, `references.ts`, `known-projects.ts`, `relationship-health.ts`, `parsers/spec-structure.ts`), `src/utils/` (`item-discovery.ts`, `change-utils.ts`, `nested-change.ts`, `change-metadata.ts`, `spec-path-containment.ts`) and `src/cli/index.ts` (the implicit root of `list`).
- **Writers**: `src/core/init.ts`, `update.ts`, `update-plan.ts` (the `layout-migration` note), `legacy-cleanup.ts`, `store/operations.ts`, `project-skills-scope.ts`, `github-copilot/cloud-agent.ts`.
- **Change metadata file** (`.specagile.yaml`): the readers, through `getChangeMetadataFile`, in `src/utils/change-metadata.ts` (`METADATA_FILENAME` takes `CHANGE_METADATA_FILE_NAME`; `readUnknownChangeMetadataKeys`, `readChangeMetadata`, `readBooleanMarker`), `src/core/archive.ts` (the two reads of the retirement authorization), `src/commands/workflow/instructions.ts` (the no-deltas warning) and `src/utils/nested-change.ts` (`CHANGE_ROOT_MARKERS` takes both names); the `metadataPath` of `src/commands/workflow/new-change.ts`; the messages that name the file, with `CHANGE_METADATA_FILE_NAME`, in `src/commands/change.ts`, `src/commands/validate.ts`, `src/commands/workflow/instructions.ts`, `src/core/artifact-graph/instruction-loader.ts` and `src/core/validation/constants.ts`; and the calls to the migration in `src/core/init.ts` and `src/core/update.ts`. Upstream's comments still say `.openspec.yaml`.
- **Tests**: fixtures build their paths with `test/helpers/layout.ts` (and `createOpenSpecRoot` in `openspec-fixtures.ts`); the ones that build the former layout on purpose use `createFormerLayout`.

### When a sync touches the layout

- **A new path built by hand** (`path.join(root, 'openspec', …)` or a message with `openspec/…`): `test/fork/layout.test.ts` lists it. Build it with `layout.ts`, or add the text to its allow list with the reason when it is not the project layout (a tool's command folder, the store location `~/openspec/<id>`, an owner tag).
- **A conflict in a line edited for the layout**: keep upstream's change, then route the path through `layout.ts` again.
- **A new fixture under `openspec/`** in an upstream test: build it with `test/helpers/layout.ts`.
- **A new message that names `.openspec.yaml`** in `src/`: `test/fork/change-metadata-guards.test.ts` lists it (comment lines and the skill templates don't count). Name the file with `CHANGE_METADATA_FILE_NAME` from `layout.ts`, never from `change-metadata.ts`, which would load `yaml` and `zod` into modules that don't load them now (`test/cli-e2e/startup-modules.test.ts`).
- **A new read of a change's metadata** (`path.join(changeDir, METADATA_FILENAME)`, or any new use of `METADATA_FILENAME`): the same test lists it, because it would miss every change that still has `.openspec.yaml`. Read the file with `getChangeMetadataFile(changeDir)`. A new write of a new change's file goes into the test's `ALLOWED_USES`, with the reason.
- **A conflict in a line edited for the metadata file**: keep upstream's change, then read through `getChangeMetadataFile` or name the file with `CHANGE_METADATA_FILE_NAME` again.
- **An upstream test that pins the created file or a message**: take the name from `test/helpers/layout.ts` (`CHANGE_METADATA_FILE_NAME`). A fixture that writes `.openspec.yaml` stays as upstream wrote it: the CLI still reads it.

## Verification record

| Platform | Scope | Result | Notes |
|:---|:---|:---|:---|
| Windows 11 (local) | `pnpm build`, `pnpm lint`, `test/fork/` + full suite | ✅ Passed | `rename-skills-and-cli-to-specagile` with the `specagile` package, working tree on `b3766ff9`. PowerShell, Node 26.13.0, git 2.37.1, pnpm 10.34.5. `test/fork/` passes. Full suite: 7019 passed, 73 failed; besides the failures `0d9a508f` already has, only the validation tests' `EBUSY` on their temp folders in the repo root (a lock on this machine; they pass on Linux) and `update-flake-script` (`bash` resolves to WSL here; also fails on `0d9a508f`). The two other new failures that run showed were tests fixed afterwards and re-run green |
| Linux (Docker, `node:22-bookworm`) | Full suite | ✅ Passed | Same working tree, checked out with LF as a clone would be; unprivileged user, Node 22.23.5, git 2.39.5, pnpm 10.34.5. 7253 passed, 0 failed, 18 skipped |
| Packed install (Windows, Linux) | `pnpm pack` → `specagile-2.0.0.tgz`, global install, `specagile init --tools claude` | ✅ Passed | The package installs only `specagile` (`specagile`, `.cmd`, `.ps1` on Windows); `specagile --version` prints 2.0.0; `specagile install` prints `npm install -g specagile@latest` and exits 1; a new project gets only `sa-*` skills, with no telemetry notice and nothing written to the global config. Installing `@fission-ai/openspec@2.0.0` and then `specagile` into the same npm prefix leaves both `openspec` and `specagile` working (Linux, and a temporary prefix on Windows) |
| CI (GitHub Actions) | Full suite | ⚪ Not run | Actions never triggered on the fork; would require pushing the branch |
| Windows 11 (local) | `adopt-tool-agnostic-layout`: `pnpm build`, `pnpm lint`, `tsc --noEmit`, full suite | ✅ Passed | Working tree on `ead634a3`, Node 26.13.0, pnpm 10.34.5. Build, lint and typecheck clean. Full suite (6722 tests) compared with a full run of `ead634a3` on the same machine: every remaining failure also fails there (symlink privileges, editor quoting, `EBUSY` on temp folders, timeouts under load); the files changed after that run were re-run with no new failures. `test/fork` passes |
| Linux (Docker, `node:22-bookworm`) | `adopt-tool-agnostic-layout`: install, build, lint, full suite | ✅ Passed | Working tree checked out with LF as a clone would be; unprivileged user, Node 22.23.5, git 2.39.5, pnpm 10.34.5. 6702 passed, 0 failed, 20 skipped. The symlink cases of spec containment run here |
| Packed install (Windows, Linux) | `adopt-tool-agnostic-layout`: `pnpm pack` → `specagile-2.1.2.tgz` in a temporary prefix, faked skills repository (`test/helpers/skill-release.mjs`) | ✅ Passed | `specagile init --tools claude` in a new project leaves `specs/`, `changes/archive/` and `specagile/config.yaml`, no `openspec/`, and 8 `sa-*` skills that name no `openspec/` path. A project made with 2.1.2 (built from `ead634a3`; 2.1.2 is not on npm) gets `specagile list` refused with the `specagile update` fix; `specagile update` moves it and `specagile list` lists its change |
| Release upgrades (Windows) | `OPENSPEC_RELEASE_UPGRADES=1`, `test/cli-e2e/upgrade-from-releases.test.ts` | ✅ Passed | 19 passed: projects made by OpenSpec 0.14.0 to 2.0.0 end with the new layout after one `specagile update`, and `specagile list` lists their changes |
| Windows 11 (local, PowerShell) | `adopt-tool-agnostic-layout`: manual migration (task 5.7) | ✅ Passed | Node 26.13.0, isolated home and config. "Migrar en Windows": `specagile update` moved `openspec\specs\identity\user-auth\spec.md`, `openspec\changes\add-login\` and `openspec\config.yaml` to `specs\`, `changes\` and `specagile\`, and removed `openspec\`. "Un archivo bloqueado": with `openspec\changes\add-login\tasks.md` held by `[System.IO.File]::Open(<path>, 'Open', 'Read', 'None')` in another PowerShell process, update exited 1 with `Could not move openspec/changes/ to changes/ (EPERM). openspec/changes/add-login/tasks.md is open in another program. Nothing was moved`, and the tree was unchanged; after closing it, the same command completed the move. The guide `docs-lab/help/move-to-the-specagile-layout.md` followed step by step (`--dry-run`, `update`, commit): git records the move as renames |

| Windows 11 (local) | `separate-global-folders`: `pnpm build`, `pnpm lint`, `test/fork test/core test/commands test/cli-e2e test/telemetry` | ✅ Passed | Working tree on `8f3bf124`, PowerShell, Node 26.13.0, git 2.37.1, pnpm 10.34.5. 6195 tests: 6005 passed, 49 failed, 141 skipped. The run found two upstream tests still naming the `openspec` global folder (`test/telemetry/index.test.ts`, `test/commands/store-root-selection.test.ts`, 8 failures); they now use `test/helpers/global-folders.ts` and pass. Every other failure also fails on `8f3bf124`: symlinks without the privilege (12, plus 2 in `skill-links`), `EBUSY` on the validation tests' temp folders in the repo root (7), 10 s timeouts under load (11; each passes alone or with `--testTimeout=60000`), editor quoting in `config-edit` (6), the maintainer-skill metadata check in `global-skills`, `skill-templates-parity` (2) and `store-git` (1). `test/fork/global-folders.test.ts` passes, and 22 of its 25 cases fail on `8f3bf124` (the other 3 are the guard's) |
| Release upgrades (Windows) | `separate-global-folders`: `OPENSPEC_RELEASE_UPGRADES=1`, `test/cli-e2e/upgrade-from-releases.test.ts` | ✅ Passed | 19 passed, from the cached releases |
| Packed install (Windows) | `separate-global-folders`: the report, task 5.3 | ✅ Passed | `pnpm pack` → `specagile-3.0.1.tgz` in a temporary npm prefix, `APPDATA`/`LOCALAPPDATA`/`USERPROFILE` in a sandbox, faked skills repository. With `%APPDATA%\openspec\config.json` at `custom` (`propose`, `explore`, `apply`, `archive`), `specagile init --tools claude` in an empty folder leaves the 8 core skills in `.claude\skills`, `sa-specify` and `sa-plan` among them; `config path` prints `%APPDATA%\specagile\config.json`; OpenSpec's file keeps its content and date. `init` saves no global setting, so `%APPDATA%\specagile\` appears with the first one saved (`specagile config profile core`) |
| Linux (Docker, `node:22-bookworm`) | `separate-global-folders`: install, build, lint, full suite | ✅ Passed | Working tree on `8f3bf124` with LF line endings, made a Git checkout as a clone would be; unprivileged user, Node 22.23.5, git 2.39.5, pnpm 10.34.5. 6747 tests: 6725 passed, 2 failed, 20 skipped. The two failures are `skill-templates-parity`, which also fails on `8f3bf124`: `33416288` changed `onboard.ts` without `pnpm regen:parity-hashes`. `test/fork/global-folders.test.ts` and every test moved to `test/helpers/global-folders.ts` pass |
| Windows 11 (local) | Welcome screen (glider) and onboard greeting through `PRODUCT_TEXT_REPLACEMENTS`: `pnpm build`, `pnpm exec tsc --noEmit`, `pnpm lint`, full `pnpm test` | ✅ Passed | Working tree on `f0dd5339` plus the greeting fix, PowerShell. 6760 tests: 6524 passed, 51 failed, 185 skipped. `skill-templates-parity` passes again (`onboard.ts` is upstream's, only the `sa-onboard` hash changed). Every failure is a known Windows one: symlinks without the privilege, `EBUSY` on the validation tests' temp folders in the repo root, 10 s timeouts under load (`update`, `skills-2-0-hardening`, `json-converter`; they pass with `--testTimeout=60000`), editor quoting in `config-edit` (6), the maintainer-skill metadata check in `global-skills`, `store-git` (1), and `update-flake-script`, which needs a Unix `bash` |
| Windows 11 (local, PowerShell) | `rename-change-metadata-to-specagile`: `pnpm build`, `pnpm lint`, `tsc --noEmit`, `test/fork test/utils test/commands test/core` (in parts) and full suite | ✅ Passed | Working tree on `b443c968`, Node 26.13.0, git 2.37.1, pnpm 10.34.5. Build, lint and typecheck clean. Full suite: 6899 tests, 6636 passed, 78 failed, 185 skipped. One failure was this change's (`test/core/templates/plan.test.ts` pinned `.openspec.yaml` in the deployed plan skill); it now takes `CHANGE_METADATA_FILE_NAME` and passes. The rest are the known Windows ones: `apply-instructions-*` (21, also on `b443c968` with the change stashed), `config-edit` (6), symlinks without the privilege (`schema`, `resolver`, `shared-skill-target`, `skill-links`, one `update`), `misplaced-delta-files`, `main-spec-paths`, `released-output-sweep`, `store-git` (1), the maintainer-skill check in `global-skills`, `EBUSY` on the validation tests' temp folders in the repo root, and 10 s timeouts under load. Under that load one timeout in `update.test.ts` left its test home half-written and 21 more cases of the file failed on it, as did one seed of `update-dry-run.property`; alone, `update.test.ts` fails only its symlink and timeout cases, and `update-dry-run.property`, `archive`, `tool-detection`, `store-phantom-root`, `validate.enriched-output` and the validation tests pass. `test/fork` passes |
| Windows 11 (local, PowerShell) | `rename-change-metadata-to-specagile`: manual check (task 6.5) | ✅ Passed | `node bin/specagile.js` in a temporary folder outside the repo, with home, config and data folders isolated and project-scoped skills. `init --tools claude`; `new change add-login` left `changes\add-login\.specagile.yaml` and no `.openspec.yaml`; a hand-written `changes\update-docs\.openspec.yaml` with `skip_specs: true` passed `validate` (`skip_specs is set in .specagile.yaml: … zero deltas accepted`); `update --dry-run` planned `delete changes/update-docs/.openspec.yaml`, `add changes/update-docs/.specagile.yaml` with the note `Update would rename change metadata: changes/update-docs/.openspec.yaml → changes/update-docs/.specagile.yaml.` and changed nothing; `update` printed `Renamed changes/update-docs/.openspec.yaml → changes/update-docs/.specagile.yaml` and the reminder to commit, kept the content, and `validate` still passed |
| Linux (Docker, `node:22-bookworm`) | `rename-change-metadata-to-specagile`: install, build, lint, `tsc --noEmit`, full suite | ✅ Passed | Commit `c08cbe64`, cloned inside the container from the repository mounted read-only, so the checkout has LF line endings as a clone would (no tracked text file with CR); unprivileged user `node`, Node 22.23.5, git 2.39.5, pnpm 10.34.5. Install, build, lint and typecheck clean. 6899 tests: 6879 passed, 0 failed, 20 skipped |
| CI (GitHub Actions) | `rename-change-metadata-to-specagile`: PR #8, every workflow (task 6.4) | ✅ Passed | Commit `65656727`, CI run 44930637628. The test matrix passes on `linux-bash` (`ubuntu-latest`), `macos-bash` (`macos-latest`) and `windows-pwsh` (`windows-latest`, PowerShell) with Node 22.20.0, and on `ubuntu-latest` with Node 22 and 24. Lint & Type Check, Upgrade from releases (`ubuntu-latest`, `windows-latest`), Binaries and Security pass too. 25 checks passed and 3 were skipped: Docs checks and Nix Flake Validation, which a code change that touches no Nix file doesn't run, and Attach to release, which only runs for a release |
| Windows 11 (local, PowerShell) | `rename-copilot-agent-to-specagile`: `pnpm build`, `pnpm lint`, `tsc --noEmit`, `test/fork test/core test/commands test/cli-e2e` | ✅ Passed | Working tree on `b48346ff` plus the change, Node 26.13.0, git 2.37.1, pnpm 10.34.5. Build, lint and typecheck clean. 6292 tests: 6075 passed, 76 failed, 141 skipped. None is this change's; all are the known Windows ones: `apply-instructions-*` (21), `config-edit` (6), symlinks without the privilege (`resolver` (6), `schema`, `shared-skill-target`, `skill-links` (2), `released-output-sweep` (2), one `update`), `misplaced-delta-files` (2), `main-spec-paths`, `store-git` (1), the maintainer-skill check in `global-skills`, and `EBUSY` on the validation tests' temp folders in the repo root (6; both files pass, 93 tests, run from outside the repo). Under load 4 cases of `update.test.ts` timed out at 10 s and 20 more failed on the test home they left half-written, as did one seed of `update-dry-run.property`; alone, `update.test.ts` fails only its symlink case (177 passed) and `update-dry-run` with its property test passes (86). `test/fork` passes (281) |
| Linux (Docker, `node:22-bookworm`) | `rename-copilot-agent-to-specagile`: install, build, `tsc --noEmit`, `test/fork test/core test/commands test/cli-e2e` | ✅ Passed | `b48346ff` cloned inside the container from the repository mounted read-only, plus the working tree's patch and its two new files, so the checkout has LF line endings as a clone would (no text file with CR); unprivileged user `node`, Node 22.23.5, git 2.39.5, pnpm 10.34.5. Build and typecheck clean. 6292 tests: 6272 passed, 0 failed, 20 skipped |
| Windows 11 (local, PowerShell) | `rename-copilot-agent-to-specagile`: the report (task 6.2) | ✅ Passed | `node bin/specagile.js` in a temporary folder outside the repo, config and data folders isolated with `XDG_CONFIG_HOME`/`XDG_DATA_HOME`. `init --tools github-copilot --copilot-cloud` left `.github\agents\specagile.agent.md` (`name: SpecAgile`) and no `openspec.agent.md`. With `test/fixtures/copilot-cloud/specagile-4.0.0.agent.md` saved as `.github\agents\openspec.agent.md` with CRLF, `update --dry-run` planned `delete .github/agents/openspec.agent.md` and changed nothing; `update` removed it, leaving only `specagile.agent.md` |
| Windows 11 (local, PowerShell) | `rename-env-vars-to-specagile`: `pnpm build`, `pnpm lint`, `tsc --noEmit`, `test/fork test/core test/commands test/cli-e2e test/utils test/ui test/telemetry test/binary-installer.test.ts` | ✅ Passed | Working tree on `38d36ed9` plus the change, Node 26.13.0, git 2.37.1, pnpm 10.34.5. Build, lint and typecheck clean. 6885 tests: 6639 passed, 61 failed, 185 skipped (`binary-installer` only runs on Linux). None is this change's; all are the known Windows ones: `apply-instructions-*` (21), `config-edit` (6, editor quoting), symlinks without the privilege (`resolver` (6), `schema`, `shared-skill-target`, `skill-links` (2), `released-output-sweep` (2), one `update`), `misplaced-delta-files` (2), `main-spec-paths`, `store-git` (1), the maintainer-skill check in `global-skills`, one 10 s timeout in `update`, and `EBUSY` on the temp folders in the repo root (`validation`, `validation.skip-specs`, `validation.unknown-metadata-keys`, `json-converter`: 15; the four files pass, 108 tests, run from outside the repo). `test/fork/environment-variables.test.ts` passes (18), and its guard on environment reads in `src/` fails, as it should, with a `process.env.OPENSPEC_EXAMPLE` added by hand to `src/utils/ci.ts` (removed afterwards) |
| Linux (Docker, `node:22-bookworm`) | `rename-env-vars-to-specagile`: install, build, lint, `tsc --noEmit`, the same test folders | ✅ Passed | `38d36ed9` cloned inside the container from the repository mounted read-only, plus the working tree's patch and the new test file, so the checkout has LF line endings as a clone would (no text file with CR outside `test/fixtures/`); unprivileged user `node`, Node 22.23.5, git 2.39.5, pnpm 10.34.5. Install, build, lint and typecheck clean. 6885 tests: 6865 passed, 0 failed, 20 skipped, `binary-installer` included |
| Release upgrades (Windows) | `rename-env-vars-to-specagile`: `test/cli-e2e/upgrade-from-releases.test.ts` | ✅ Passed | Without `SPECAGILE_RELEASE_UPGRADES` the file is skipped (19 skipped); with `SPECAGILE_RELEASE_UPGRADES=1`, 19 passed, from the cached releases |
| Windows 11 (local, PowerShell) | `rename-env-vars-to-specagile`: manual check (task 9.3) | ✅ Passed | `node bin/specagile.js` in a temporary folder outside the repo, with `XDG_CONFIG_HOME`/`XDG_DATA_HOME`, home and app-data folders isolated and the faked skills repository (`test/helpers/skill-release.mjs`). With `$env:SPECAGILE_SKILLS_SCOPE = 'everywhere'`, `init --tools claude` exited 1 with `Invalid SPECAGILE_SKILLS_SCOPE "everywhere". Use global or project.`; with it removed and `$env:OPENSPEC_SKILLS_SCOPE = 'everywhere'`, `init --tools claude --scope project` exited 0, installed `sa-*` skills in the project and printed nothing about `OPENSPEC_SKILLS_SCOPE`; `validate --help` described `--concurrency` as `defaults to env SPECAGILE_CONCURRENCY or 6`; with `$env:SPECAGILE_INSTALL_DIR` set to a new folder, `install` printed `SpecAgile has no standalone install. Install or update it with npm:` and `npm install -g specagile@latest`, exited 1 and did not create the folder |

CI runs on GitHub Actions for pull requests to `main` and pushes to `main`
(`.github/workflows/ci.yml`). A branch gets no run until it has a pull request.
