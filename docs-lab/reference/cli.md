# CLI

> The `specagile` terminal commands.

<!-- Installing, updating, and uninstalling the CLI itself live in installation.md. -->

## Commands

**Set up**

| Command | What it does |
|---|---|
| [`specagile init`](#specagile-init) | Initialize OpenSpec in a project. |
| [`specagile update`](#specagile-update) | Update OpenSpec's installed instruction files. |
| [`specagile config`](#specagile-config) | View and change global configuration. |

**Changes and specs**

| Command | What it does |
|---|---|
| [`specagile list`](#specagile-list) | List changes, or specs with `--specs`. |
| [`specagile show`](#specagile-show) | Print a change or spec, as markdown or JSON. |
| [`specagile view`](#specagile-view) | One-screen dashboard of specs and changes. |
| [`specagile validate`](#specagile-validate) | Check changes and specs for structural issues. |
| [`specagile archive`](#specagile-archive) | Move a completed change to the archive and update the main specs. |

**Workflows and schemas**

Your agent runs most of these during the workflow.

| Command | What it does |
|---|---|
| [`specagile new`](#specagile-new) | Create a new change directory. |
| [`specagile status`](#specagile-status) | Artifact completion status for one or every active change. |
| [`specagile instructions`](#specagile-instructions) | Instructions for creating an artifact, applying, or archiving. |
| [`specagile templates`](#specagile-templates) | Resolved template paths for a schema's artifacts. |
| [`specagile schemas`](#specagile-schemas) | List available workflow schemas. |
| [`specagile schema`](#specagile-schema) | Inspect, fork, or create a schema (experimental). |

**Multi-repo (beta)**

| Command | What it does |
|---|---|
| [`specagile store`](#specagile-store) | Create and manage stores: standalone OpenSpec repos registered on your machine. |
| [`specagile doctor`](#specagile-doctor) | Report relationship health for the resolved OpenSpec root. |
| [`specagile context`](#specagile-context) | Print the working context for the resolved OpenSpec root. |
| [`specagile workset`](#specagile-workset) | Compose, keep, and open personal working views. |

**Utilities**

| Command | What it does |
|---|---|
| [`specagile version`](#specagile-version) | Report the installed version and optionally check for an update. |
| [`specagile install`](#specagile-install) | Not available in SpecAgile: points you to `npm install -g specagile@latest`. |
| [`specagile feedback`](#specagile-feedback) | Submit feedback about OpenSpec. |
| [`specagile completion`](#specagile-completion) | Install or generate shell completions. |

**Deprecated**

| Command | What it does |
|---|---|
| [`specagile change`](#specagile-change) | Noun form of show, list, and validate for changes. The CLI warns and points to the verb-first commands. |
| [`specagile spec`](#specagile-spec) | Noun form of show, list, and validate for specs, with the same warning. |

Every command takes `-h, --help`. The bare `specagile` command also takes:

- `-V, --version`: print the CLI version.
- `--no-color`: disable colored output.

## specagile init

Initializes OpenSpec in a project.

```bash
specagile init                        # current directory, interactive tool picker
specagile init --tools claude,cursor  # set up specific tools, no prompts
specagile init --tools none           # specs/, changes/ and specagile/ only, no tool files
```

With no `--tools`, init prompts you to pick tools in an interactive terminal. Outside one, it sets up the tools it detects in the project. With none detected it exits 1 and lists the valid ids, unless the [global skills](../start/setup.md#install-the-skills-once-for-every-project) are installed: then the project uses those.

**Store-only repositories**

When `specagile/config.yaml` contains a `store:` line and the repo has no local specs or changes, run init from the repository root:

```bash
# install Claude Code integration files in the code repo
specagile init --scope project --tools claude
```

- **Integration files**: written in the code repo.
- **`specagile/config.yaml`**: preserved byte-for-byte.
- **`specs/` and `changes/`**: not created in the code repo.

Running init from a subdirectory exits 1 and tells you to run it from the repository root. `--language` also exits 1 because the language belongs in the external store's config. Run init in the store root or edit that config directly.

**Arguments**

| Argument | What it is |
|---|---|
| `path` | The project directory to initialize. Default: current directory. Created if missing. |

**Options**

| Flag | Effect |
|---|---|
| `--tools <tools>` | Comma-separated tool ids, `all`, or `none`. Skips the picker. Ids are listed in [Supported tools](supported-tools.md). |
| `--language <language>` | Add a language instruction to a new project config. Rejected when the repo's `store:` line points to an external store. |
| `--force` | Remove files from older OpenSpec layouts without asking. Interactive runs otherwise confirm the cleanup first. |
| `--profile <profile>` | Override the global config profile for this run: `core` (the standard workflow set) or `custom` (the workflows saved in global config). |
| `--no-animation` | Show a static welcome screen instead of the animated one. |
| `--copilot-cloud`, `--no-copilot-cloud` | Write, or don't write, the files GitHub's hosted Copilot agent needs. They need the skills in the project. See [GitHub Copilot](supported-tools.md#github-copilot). |
| `--scope <scope>` | Install skills for this machine (`global`) or commit them with the repo (`project`). |

Without `--scope`, existing repo skills stay in the project. `--scope global` in such a repo installs the skills on your machine and removes the repo copies without asking. For new setups, `--scope` takes precedence over `SPECAGILE_SKILLS_SCOPE`, then the machine’s `skillsScope` setting. The default is global unless a requested tool needs project scope or you request hosted Copilot.

**Output**

With the skills in the project (`--scope project`), OpenSpec writes them once, to `.agents/skills/`. Tools that need them get links in their own folder. Windows uses copies.

```
▌ OpenSpec structure created
✔ Setup complete for Claude Code

OpenSpec Setup Complete

Created: Claude Code
8 skills in .agents/skills/ (also in .claude/skills/)
Config: specagile/config.yaml (schema: spec-driven)

Getting started:
  Start your first change: /sa-propose "your idea"
```

With the skills on this machine, the summary line reads `8 skills in ~/.agents/skills/ for every project on this machine` and the project holds only `specs/`, `changes/` and `specagile/`.

`--tools none` creates only the `specs/`, `changes/` and `specagile/` folders and sets up no tool. On an already-initialized project, init rewrites the installed files in place and the summary reads `Refreshed: Claude Code` with `Config: specagile/config.yaml (exists)`.

**Exit codes**

- `0`: setup completed.
- `1`: invalid `--tools`, `--profile` or `--scope` value (or `SPECAGILE_SKILLS_SCOPE`), a non-interactive run with no tools detected and no `--tools`, a global install that failed or that none of the selected tools can use, or an invalid store-only invocation.

## specagile update

Updates OpenSpec's installed instruction files.

```bash
specagile update             # refresh tools whose files are older than the CLI
specagile update --force     # rewrite files even when they're current
specagile update --dry-run   # list what an update would change, and change nothing
```

Run update in a terminal to switch an existing project to global skills. Enter keeps the project skills. After the maintainer commits the removals, teammates run update in their checkouts to set up their tools. Runs without a terminal keep the current scope.

Update refreshes the installed instructions from the running CLI, including after a downgrade. A pending global refresh appears as a note in the dry-run plan. Set `SPECAGILE_NO_UPDATE_CHECK=1` to skip the CLI upgrade offer.

**Arguments**

| Argument | What it is |
|---|---|
| `path` | The project directory to update. Default: current directory. |

**Options**

| Flag | Effect |
|---|---|
| `--force` | Rewrite every configured tool's files even when they're up to date. |
| `--dry-run` | Report every file the update would add, change, or delete, and write nothing. No CLI upgrade check, no prompts. Combine with `--force` to preview a forced update. |
| `--json` | With `--dry-run`, print the plan as JSON. Without `--dry-run` it exits 1. |

**Previewing an update**

`--dry-run` plans the update a non-interactive run would make: the same code path, with every write and delete recorded instead of performed. Every file the real update would touch is listed, including:

- moving OpenSpec files out of a tool's former directory (`.kimi/` to `.kimi-code/`, `.windsurf/` to `.devin/`, `.codex/` and `.agent/` to `.agents/`);
- syncing the GitHub Copilot cloud agent files;
- with `--force`, setting up tools found only in legacy artifacts and cleaning those artifacts up, including retired global Codex prompts.

```bash
specagile update --dry-run
```

```
2 file(s) would change:
  update  .agents/skills/sa-propose/SKILL.md  (openspec)
  add     .agents/skills/sa-specify/SKILL.md  (openspec)
```

`--dry-run --json` prints the same plan as one JSON document:

```json
{
  "changes": [
    { "path": ".agents/skills/sa-propose/SKILL.md", "action": "update", "tool": "openspec" },
    { "path": ".agents/skills/sa-specify/SKILL.md", "action": "add", "tool": "openspec" }
  ],
  "notes": [],
  "failures": []
}
```

| Field | What it holds |
|---|---|
| `changes[].path` | Project-relative path. A file outside the project, such as a global skill, is shown from your home directory as `~/...`, or as an absolute path when it is outside home too. |
| `changes[].action` | `add`, `update`, or `delete`. A file whose new bytes match the old ones is not listed. |
| `changes[].tool` | The configured tool the file belongs to, such as `claude`. Files that belong to no one tool are `openspec`: the shared skills in `.agents/skills/` and legacy-artifact cleanup. |
| `notes[]` | `{ code, message }` for a step a terminal user would be asked about or warned of. `legacy-tool-directories`: a move that an interactive run asks about first; `changes` lists it as made. `legacy-artifacts`: files from OpenSpec's older layout were found, such as `openspec-proposal.md` slash commands or OpenSpec marker blocks in `AGENTS.md`. Without `--force` a non-interactive update leaves them alone, so `changes` does too; `--dry-run --force` lists their cleanup. Empty for an ordinary refresh. |
| `failures[]` | `{ tool, error }` for each tool the real update would fail on, including a write it cannot make: a directory where a file belongs, a file where a directory belongs, or a file or folder without write permission. For that tool, `changes` stops where the real update stops; the other tools are still planned. Failures the disk only reports while writing, such as running out of space, cannot be foreseen. |

A failure before planning, such as no OpenSpec directory, still prints exactly one JSON document: the empty plan plus a `status` array with `severity`, `code` (`update_error`), and `message`. The exit code is 1.

**Output**

When every tool's files match the CLI version:

```
✓ All 1 tool(s) up to date (v1.7.0)
  Tools: claude

Use --force to refresh files anyway.
```

When a tool's files came from an older CLI (or with `--force`, which prints `Force updating 1 tool(s): claude` instead):

```
Updating 1 tool(s): claude (1.6.0 → 1.7.0)

✔ Updated Claude Code

✓ Updated: Claude Code (v1.7.0)
Tools: Claude Code
```

An update that touches an IDE-based tool, such as Cursor or Kiro, ends with `Restart your IDE to refresh skills.`

In a directory without OpenSpec, update refuses:

```
✖ Error: No OpenSpec directory found. Run 'specagile init' first.
```

**Exit codes**

- `0`: files updated, or everything already up to date.
- `1`: no OpenSpec directory at the path, or the update failed.

## specagile config

Views and changes global configuration.

```bash
specagile config list                  # see current settings
specagile config set profile core      # change one value
specagile config profile               # interactive workflow picker
```

| Subcommand | What it does |
|---|---|
| `path` | Print the config file location. |
| `list` | Show all current settings. |
| `get <key>` | Print one value, raw and scriptable. |
| `set <key> <value>` | Set a value, coercing its type. |
| `unset <key>` | Remove a key so its default applies. |
| `reset` | Reset all configuration to defaults. |
| `edit` | Open the config file in `$EDITOR`. |
| `profile [preset]` | Configure which workflows are installed. |

Config is global to your machine, stored as JSON where `config path` points: `$XDG_CONFIG_HOME/specagile/config.json` if set, else `~/.config/specagile/config.json` (macOS, Linux) or `%APPDATA%\specagile\config.json` (Windows). OpenSpec's own config, in its `openspec` folder, is never read. Every subcommand accepts `--scope <scope>`, but only `global` works today. Any other scope exits 1 with `Error: Project-local config is not yet implemented`.

### specagile config path

```bash
specagile config path
```

```
/Users/you/.config/specagile/config.json
```

### specagile config list

```bash
specagile config list          # readable settings plus profile summary
specagile config list --json   # raw config as JSON
```

**Options**

| Flag | Effect |
|---|---|
| `--json` | Print the config object as JSON. |

**Output**

Each setting, then a profile summary. It marks the profile as explicit or default and flags `delivery` as retired:

```
featureFlags: {}
profile: core
delivery: skills

Profile settings:
  profile: core (default)
  delivery: skills (retired in 2.0, ignored)
  workflows: propose, explore, apply, update, sync, archive (from core profile)
```

### specagile config get

```bash
specagile config get profile
```

**Arguments**

| Argument | What it is |
|---|---|
| `key` | The key to read. Dots reach nested values (`featureFlags.workspaces`). |

**Output**

The bare value, ready for scripts. Objects print as compact JSON:

```
core
```

**Exit codes**

- `0`: value printed.
- `1`: key has no value, and nothing is printed.

### specagile config set

```bash
specagile config set profile core
specagile config set featureFlags.workspaces true
```

**Arguments**

| Argument | What it is |
|---|---|
| `key` | The key to write, dotted for nested values. |
| `value` | The new value. `true`/`false` become booleans, numeric strings become numbers. |

**Options**

| Flag | Effect |
|---|---|
| `--string` | Store the value as a string, skipping type coercion. |
| `--allow-unknown` | Permit keys the schema doesn't know. |

**Output**

```
Set featureFlags.workspaces = true
```

`delivery` is still accepted, so older scripts keep working, but it no longer changes anything ([Upgrade to 2.0](../help/upgrade-to-2.md)):

```
Set delivery = "skills"
Note: delivery no longer changes anything; OpenSpec 2.0 installs skills only.
```

Unknown keys and invalid values fail with exit 1 before anything is saved:

```
Error: Invalid configuration key "bogus.key". Unknown top-level key "bogus".
Use "specagile config list" to see available keys.
Pass --allow-unknown to bypass this check.
```

```
Error: Invalid configuration - profile: Invalid option: expected one of "core"|"custom"
```

If the config file exists but does not hold a JSON object, whether because it is not valid JSON at all or because its root is something else such as `null` or an array, `config set`, `config unset` and `config profile` exit 1 and leave the file unchanged. Fix it with `specagile config edit`, or replace it with `specagile config reset --all`:

```
Error: /home/you/.config/specagile/config.json could not be parsed, so it was left unchanged.
Fix it with "specagile config edit", or reset it with "specagile config reset --all".
```

Until it is fixed, the background update check in `specagile update` stays off. An explicit `specagile version --check` still runs.

### specagile config unset

```bash
specagile config unset profile
```

Removes the key so the default applies again. Keys with built-in defaults always count as set, so this reports success even if you never set them:

```
Unset profile (reverted to default)
```

A key with no value at all prints `Key "featureFlags.nothere" was not set`. Both cases exit 0. A config file that cannot be parsed exits 1 instead, as for `config set`.

### specagile config reset

```bash
specagile config reset --all      # asks for confirmation
specagile config reset --all -y   # no prompt
```

**Options**

| Flag | Effect |
|---|---|
| `--all` | Required. Reset everything. |
| `-y, --yes` | Skip the confirmation prompt. |

**Output**

```
Configuration reset to defaults
```

Without `--all` it exits 1 and prints the usage line.

**Exit codes**

- `0`: reset done, or you answered no at the prompt.
- `1`: `--all` missing.
- `130`: prompt cancelled with Ctrl-C.

### specagile config edit

```bash
specagile config edit
```

Opens the config file in `$EDITOR` (falling back to `$VISUAL`), creating it with defaults first if missing. When the editor closes, the file is validated. Invalid JSON or an invalid config exits 1.

The editor value may carry arguments and quoted paths, for example `code --wait` or `"/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl" -w`. It is split into words without a shell, so `$VAR`, `~` and `;` are passed through literally. An editor that cannot start, or exits non-zero, prints a one-line error and exits 1.

With no editor configured it exits 1:

```
Error: No editor configured
Set the EDITOR or VISUAL environment variable to your preferred editor
Example: export EDITOR=vim
```

### specagile config profile

```bash
specagile config profile        # interactive picker (needs a terminal)
specagile config profile core   # apply the core preset directly
```

**Arguments**

| Argument | What it is |
|---|---|
| `preset` | Optional preset name. Only `core` exists. It selects the core workflows. |

With no preset, an interactive picker shows your current workflows, lets you change them (a checkbox list), prints the diff, and inside an OpenSpec project offers to run `specagile update` for you. Outside a terminal it exits 1:

```
Interactive mode required. Use `specagile config profile core` or set config via environment/flags.
```

**Output**

Changed config doesn't reach projects until they update:

```
Config updated. Run `specagile update` in your projects to apply.
```

**Exit codes**

- `0`: profile saved, or you kept current settings.
- `1`: unknown preset, no terminal, or the offered `specagile update` failed.
- `130`: picker cancelled with Ctrl-C.

## specagile list

Lists changes, or specs with `--specs`.

```bash
specagile list                    # active changes, most recently modified first
specagile list --archived         # archived changes
specagile list --all              # active and archived changes
specagile list --specs            # specs with requirement counts
specagile list --json             # machine-readable, includes the resolved root
```

Rows come from `changes/` and `specs/` under the resolved root. The default change listing skips `changes/archive/`.

**Options**

| Flag | Effect |
|---|---|
| `--specs` | List specs instead of changes. |
| `--changes` | List changes. This is the default. |
| `--archived` | List only archived changes. Can't be combined with `--specs`. |
| `--all` | List active and archived changes. Can't be combined with `--specs`. Takes precedence over `--archived`. |
| `--sort <order>` | `recent` (last modified first) or `name`. Default: `recent`. Specs always sort by name. |
| `--json` | Print JSON instead of the table. |
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

**Output**

One row per change: name, task status, last modified. The status column reads `No tasks`, `2/5 tasks`, or `✓ Complete`.

```
Changes:
  add-rate-limit     No tasks      just now
```

`--all` groups active and archived changes under separate headings. Each group uses the selected sort order:

```
Changes:
  add-rate-limit     No tasks      just now

Archived Changes:
  2026-08-10-add-login     ✓ Complete    2d ago
```

```
Specs:
  api     requirements 1
```

`--json` adds task counts and a `status` of `no-tasks`, `in-progress`, or `complete`:

```json
{
  "changes": [
    {
      "name": "add-rate-limit",
      "completedTasks": 0,
      "totalTasks": 0,
      "lastModified": "2026-08-11T13:44:40.171Z",
      "status": "no-tasks"
    }
  ],
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  }
}
```

With `--archived` or `--all`, every change object includes an `archived` boolean. The combined array uses the selected sort order. An archived change can still have an `in-progress` status when its tracked task file has unchecked tasks. Without either flag, the JSON shape stays unchanged.

An empty listing prints `No active changes found.`, `No archived changes found.`, `No changes found.`, or `No specs found.` and still exits 0.

A change is a directory directly under `changes/`. Unlike specs, changes cannot be nested in a namespace folder. A folder like `changes/mobile/` that only wraps a change (`changes/mobile/refresh-token/`) is listed with the status `not a change`, followed by a warning that names the nested directories. `--json` marks that entry with a `nested` array and adds a top-level `warnings` array. `show`, `status`, `validate` and `archive` refuse the folder with the same message. To fix it, move the change up and fold the namespace into its name:

```bash
mv changes/mobile/refresh-token changes/mobile-refresh-token
rmdir changes/mobile
```

**Exit codes**

- `0`: listing printed, even when empty.
- `1`: no OpenSpec root found (outside a project, no `--store`).

## specagile show

Prints a change or spec, as markdown or JSON.

```bash
specagile show add-rate-limit              # change: prints proposal.md
specagile show add-rate-limit --diff       # change: append requirement diffs
specagile show api                         # spec: prints spec.md
specagile show api --json --no-scenarios   # spec JSON without scenario text
```

With no name, show asks change or spec, then lists items to pick from. Outside an interactive terminal it exits 1 and prints the direct forms instead.

**Arguments**

| Argument | What it is |
|---|---|
| `item-name` | The change or spec to show, by folder name (`add-rate-limit`, `api`). |

**Options**

| Flag | Effect |
|---|---|
| `--json` | Print structured JSON instead of raw markdown. |
| `--type <change\|spec>` | Pick the type when a change and a spec share a name. |
| `--no-interactive` | Never prompt: a missing name becomes an error. |
| `--deltas-only` | JSON, change: restrict output to deltas. Change JSON is already delta-only, so output matches plain `--json`. |
| `--requirements-only` | Deprecated alias for `--deltas-only`. Warns on stderr. |
| `--diff` | Change: append per-requirement delta diffs. Ignored with a warning for specs. |
| `--requirements` | JSON, spec: keep requirement text, empty the `scenarios` arrays. |
| `--no-scenarios` | JSON, spec: same output as `--requirements`. |
| `-r, --requirement <id>` | JSON, spec: output one requirement by 1-based position. Can't combine with `--requirements`. |
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

Flags that don't apply to the resolved type are ignored with a warning on stderr.

**Output**

Text mode is a raw passthrough: a change prints its `proposal.md`, a spec prints its `spec.md`.

```
# Add rate limiting

## Why
Unauthenticated clients can exhaust the API.

## What Changes
- Add per-client rate limiting to the public API.
```

For a change, `--diff` prints the proposal first, then a `Specifications Changed (diffs)` section. ADDED requirements include their full text. REMOVED requirements retain the authored Reason and Migration. RENAMED requirements show FROM and TO. MODIFIED requirements show a unified diff against the matching main requirement.

If a MODIFIED header matches only after folding case or whitespace, the output includes both the diff and a warning that archive matching is exact. If the main spec or requirement is missing, the output warns and prints the full delta block. A MODIFIED block with no textual difference prints `(no textual changes)`.

A change with `--json` is delta-shaped:

```json
{
  "id": "add-rate-limit",
  "title": "Add rate limiting",
  "deltaCount": 1,
  "deltas": [
    {
      "spec": "api",
      "operation": "ADDED",
      "description": "Add requirement: The API SHALL limit each client to 100 requests per minute.",
      "requirement": {
        "name": "Rate limit",
        "text": "The API SHALL limit each client to 100 requests per minute.",
        "scenarios": [
          {
            "name": "Client exceeds the limit",
            "rawText": "- **WHEN** a client sends its 101st request within a minute\n- **THEN** the API responds 429"
          }
        ]
      },
      ...
    }
  ],
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  }
}
```

Each requirement carries its `name`, the header text after `Requirement:`. This is the name archive matches MODIFIED, REMOVED and RENAMED entries against. Each scenario carries its `name`, the header text after `Scenario:`. A closing `#` run on either header is not part of the name.

`--json --diff` keeps this top-level shape. A MODIFIED delta gains a `diff` string, a `warning` string, or both. Other operations are unchanged. An empty `diff` string means the main and delta blocks are textually identical.

A spec with `--json` lists its requirements with scenarios. Requirements and scenarios carry the same `name` fields as change JSON:

```json
{
  "id": "api",
  "title": "api",
  "overview": "Public HTTP API behavior.",
  "requirementCount": 1,
  "requirements": [
    {
      "name": "Health endpoint",
      "text": "The API SHALL expose a health endpoint.",
      "scenarios": [
        {
          "name": "Health check succeeds",
          "rawText": "- **WHEN** a client requests GET /health\n- **THEN** the API responds 200"
        }
      ]
    }
  ],
  "metadata": {
    "version": "1.0.0",
    "format": "openspec"
  },
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  }
}
```

An unknown name suggests near matches: `Unknown item 'does-not-exist'. Did you mean: add-rate-limit, api?`. A name that matches both a change and a spec errors and asks for `--type`.

**Exit codes**

- `0`: item printed.
- `1`: unknown or ambiguous name, no name outside a terminal, an out-of-range `-r` index, `--requirements` combined with `-r`, or a delta or main spec cannot be read for `--diff`.

## specagile view

Prints a one-screen dashboard of specs and changes.

```bash
specagile view   # project summary in one screen
```

view prints the dashboard once and exits. It reads no keystrokes. Changes group by task progress: Draft (no tasks yet), Active (tasks underway, with a progress bar and percent), Completed (every task checked). Specs list with requirement counts, largest first.

**Options**

| Flag | Effect |
|---|---|
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

**Output**

```
OpenSpec Dashboard

════════════════════════════════════════════════════════════
Summary:
  ● Specifications: 1 specs, 1 requirements
  ● Draft Changes: 1
  ● Active Changes: 0 in progress
  ● Completed Changes: 0

Draft Changes
────────────────────────────────────────────────────────────
  ○ add-rate-limit

Specifications
────────────────────────────────────────────────────────────
  ▪ api                            1 requirement

════════════════════════════════════════════════════════════

Use specagile list --changes or specagile list --specs for detailed views
```

A `Task Progress` summary line appears when any change has tasks underway.

Each active change also shows its schema and artifact states below its task progress bar:

```text
    └─ [spec-driven] proposal✓ specs→ design→ tasks✓
```

| Marker | Artifact state |
|---|---|
| `✓` | Its output exists. An existing tasks artifact is done even when its checklist is unfinished. |
| `→` | It is ready to create. |
| No marker | It is blocked by a missing dependency. |
| `(skipped)` | The change skips it. |

If a workflow cannot be loaded, view prints a warning and keeps that change's task progress visible. Run `specagile status --change <name>` to inspect the workflow separately. After `specagile view --store <id>`, pass the same `--store <id>` to status.

**Exit codes**

- `0`: dashboard printed.
- `1`: no OpenSpec root found (outside a project, no `--store`).

## specagile validate

Checks changes and specs for structural issues.

```bash
specagile validate add-rate-limit   # one change or spec, by name
specagile validate --all            # every change and spec
```

With no name and no bulk flag, validate prompts you to pick items. Outside an interactive terminal it exits 1 and prints the bulk flags instead.

**Arguments**

| Argument | What it is |
|---|---|
| `item-name` | The change or spec to validate, by folder name (`add-rate-limit`, `api`). |

**Options**

| Flag | Effect |
|---|---|
| `--all` | Validate every change and spec. |
| `--changes` | Validate every change. |
| `--specs` | Validate every spec. |
| `--archived` | Check task completion in archived changes, without validating their applied spec deltas. |
| `--strict` | Treat warnings as failures. |
| `--type <change\|spec>` | Pick the type when a change and a spec share a name. |
| `--json` | Print a structured report instead of text. |
| `--report <mode>` | Bulk output: `full` (default) or `findings`. Requires an explicit bulk scope. |
| `--concurrency <n>` | Max parallel validations in bulk runs. Default: `SPECAGILE_CONCURRENCY`, else 6. |
| `--no-interactive` | Never prompt: a missing or ambiguous name becomes an error. |
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

**Output**

Bulk runs print one status line per item, followed by any findings, and end with totals:

```
✓ change/add-rate-limit
✓ spec/api
Totals: 2 passed, 0 failed (2 items)
```

**Task checkbox findings**

Progress counts checkboxes and nothing else, so a task file written as plain bullets reads as zero tasks: `specagile list` and `specagile status` report no work, and `specagile archive` has nothing to flag as incomplete. Validate reports a `WARNING` on each tracked task file that lists work without a checkbox:

```text
⚠ [WARNING] tasks.md: This change counts as 0 tasks: no line in its tracked task files is a checkbox, so "specagile list" and "specagile status" report no work and "specagile archive" has nothing to flag as incomplete. Write each task as "- [ ] 1.1 Description".
```

The warning fires only when the change's whole tracked set holds no checkbox at all. One file of prose beside a real checklist is not reported, and a change mid-authoring keeps its progress the moment a single checkbox exists. `--strict` turns the warning into a failure. The line number is in the `--json` report.

Fenced blocks, HTML comments, YAML front matter and indented code are not scanned, so a pasted terminal sample is never mistaken for a task list.

**Archive merge findings**

For changes, validate runs archive's merge builder against the current main specs without writing files. It reports merge conflicts, such as a missing `MODIFIED` target or a conflicting `ADDED` requirement, as `INFO`:

```text
ℹ [INFO] api/spec.md: Archive would refuse this delta: api MODIFIED failed for header "### Requirement: Rate limiting" - not found
```

These findings appear even when validation passes, in both text and JSON output. `INFO` never changes the exit code, including under `--strict`: a missing target may belong to a sibling change that has not archived yet. Deltas already synced into the main specs follow archive's existing merge rules.

This check does not run archive's later merged-spec validation or retirement checks. A clean report does not guarantee that archive will succeed.

If the merge preflight cannot start, an `INFO` finding explains why. Existing validation findings and the exit code stay unchanged.

A failing item lists each issue and the fix:

```
Change 'add-rate-limit' has issues
✗ [ERROR] api/spec.md: ADDED "Rate limiting" must include at least one scenario
Next steps:
  - Ensure change has deltas in specs/: use headers ## ADDED/MODIFIED/REMOVED/RENAMED Requirements
  - Each requirement MUST include at least one #### Scenario: block
  - Debug parsed deltas: specagile show add-rate-limit --json --deltas-only
```

`--json` prints one report for the run:

```json
{
  "items": [
    {
      "id": "add-rate-limit",
      "type": "change",
      "valid": true,
      "issues": [],
      "durationMs": 2
    }
  ],
  "summary": {
    "totals": {
      "items": 1,
      "passed": 1,
      "failed": 0
    },
    "byType": {
      "change": {
        "items": 1,
        "passed": 1,
        "failed": 0
      }
    }
  },
  "version": "1.0",
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  }
}
```

`issues` entries carry a `level` of `ERROR`, `WARNING`, or `INFO`.

**Exit codes**

- `0`: every validated item passed, including an empty bulk scope.
- `1`: an item failed, the report request is invalid, `specagile/config.yaml` cannot be read or is not valid YAML, or the run failed (for example an unknown name or no OpenSpec root). A config that cannot be read or parsed stops the run before any item is checked; with `--json` it is reported as a single `status` entry with the code `unreadable_config` or `unparseable_config`.

### --report full|findings

Selects the output for an explicit bulk validation scope:

- **`full`**: every item. This is the default. Explicit `--report full` keeps the existing output shape without adding report metadata.
- **`findings`**: only items with issues, including passing items with warnings or information. Every item is still validated. Totals, strict-mode behavior, and exit codes are unchanged.

```bash
specagile validate --all --report findings
specagile validate --archived --report findings --json
```

**Scopes**

| Flags | Findings `report.scope` |
|---|---|
| `--all` | `all` |
| `--changes` | `changes` |
| `--specs` | `specs` |
| `--changes --specs`, or `--all` with either flag | `all` |
| `--archived` | `archived` |

Both explicit report modes reject a positional item name, a missing bulk scope, or archive and active scopes combined.

#### Findings text output

**Human output**: stdout prints `Scope: <scope> (<count> items)`, then totals. With no issue-bearing items:

```text
Scope: all (2 items)
No item findings.
Totals: 2 passed, 0 failed (2 items)
```

Issue-bearing item labels, severity labels, paths, and messages print to stderr. Active-scope failures keep the `Details:` rerun hint after totals. The existing root banner and progress output may precede the report.

#### Findings JSON output

`--report findings --json` prints one document. This example has two clean items:

```json
{
  "report": {
    "kind": "validation-findings",
    "version": "1.0",
    "scope": "all",
    "returnedItems": 0,
    "totalItems": 2
  },
  "itemFindings": [],
  "summary": {
    "totals": { "items": 2, "passed": 2, "failed": 0 },
    "byType": {
      "change": { "items": 1, "passed": 1, "failed": 0 },
      "spec": { "items": 1, "passed": 1, "failed": 0 }
    }
  },
  "root": { "path": "/Users/you/projects/my-app", "source": "nearest" }
}
```

- **`report.kind` and `report.version`**: identify the `validation-findings` shape, version `1.0`. There is no top-level `version` or `items`.
- **`report.returnedItems` and `report.totalItems`**: count the returned records and all validated items, respectively.
- **`itemFindings`**: complete item records whose `issues` array is nonempty. Includes `ERROR`, `WARNING`, and `INFO` issues. Each record retains `id`, `type`, `valid`, `issues`, and `durationMs`. Archived items use `type: "change"`.
- **`summary`**: full-run totals and per-type counts, not counts of the returned subset. An empty scope has zero totals and exits 0.
- **`root`**: the same selected-root metadata as the full report.

**Record preservation**: returned items keep their full-report order and any additive fields on items or issues. Filtering does not rewrite messages or locations, including optional `line` and `column` fields.

**Command failures**: root-selection or item-discovery failures retain the existing `status` diagnostic and exit 1. They do not return a completed findings report or a successful empty report.

#### Invalid report requests

Both explicit report modes reject these requests before root selection or item discovery:

- An unsupported report value, including an empty string.
- A positional item name, even with a bulk flag.
- No explicit bulk scope.
- `--archived` combined with `--all`, `--changes`, or `--specs`.

In JSON mode, a rejected request exits 1 with only a single-element `status` array. It has no `root` or report payload:

```bash
specagile validate --all --report bogus --json
```

```json
{
  "status": [
    {
      "severity": "error",
      "code": "invalid_validation_report_request",
      "message": "Unknown validation report 'bogus'.",
      "fix": "Use --report full|findings with --all, --changes, --specs, or --archived, without an item name. Do not combine archived and active scopes."
    }
  ]
}
```

Human mode prints the error to stderr. A bare `--report` with no value is a Commander syntax error on stderr, including with `--json`; it does not use this diagnostic envelope.

#### Filter a full report externally

For a custom JSON view, filter the full report with `jq` or PowerShell. These script examples preserve the validation exit code and leave command-error documents intact.

In Bash with `jq`:

```bash
if validation_json=$(specagile validate --all --json); then
  validation_exit=0
else
  validation_exit=$?
fi
printf '%s\n' "$validation_json" |
  jq 'if has("items") then .items |= map(select(.issues | length > 0)) else . end'
exit "$validation_exit"
```

In PowerShell:

```powershell
$validationJson = specagile validate --all --json
$validationExit = $LASTEXITCODE
$validationReport = $validationJson | ConvertFrom-Json
if ($validationReport.PSObject.Properties.Name -contains 'items') {
  $validationReport.items = @($validationReport.items | Where-Object { $_.issues.Count -gt 0 })
}
$validationReport | ConvertTo-Json -Depth 100
exit $validationExit
```

These custom views keep the full report's keys but omit clean items. They are neither complete full-v1 reports nor the versioned `--report findings` shape.

## specagile archive

Moves a completed change to the archive and updates the main specs.

```bash
specagile archive add-rate-limit -y                # archive one change, merge its deltas
specagile archive add-rate-limit -y --skip-specs   # archive without touching the specs
```

With no name, archive prompts you to pick a change. Outside an interactive terminal it exits 1 and prints the rerun command instead.

**Arguments**

| Argument | What it is |
|---|---|
| `change-name` | The change to archive, by folder name (`add-rate-limit`). |

**Options**

| Flag | Effect |
|---|---|
| `-y, --yes` | Answer yes to every confirmation: spec updates, incomplete tasks, skipped validation. |
| `--skip-specs` | Archive without touching the main specs (infrastructure, tooling, or doc-only changes). |
| `--no-validate` | Skip validation. Archive asks you to confirm first, and `-y` answers it. |
| `--json` | Print a structured result instead of text. Needs `--yes` to confirm spec updates. |
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

**Output**

A successful run reports task status, previews the spec updates, applies them, and names the archive folder:

```
Task status: ✓ Complete

Specs to update:
  api: update
Applying changes to specs/api/spec.md:
  + 1 added
Totals: + 1, ~ 0, - 0, → 0
Specs updated successfully.
Change 'add-rate-limit' archived as '2026-08-11-add-rate-limit'.
```

The change folder moves whole to `changes/archive/2026-08-11-add-rate-limit/`, today's date prefixed to its name. Each delta merges into its main spec: the ADDED requirement above was appended to `specs/api/spec.md`. Without `-y`, archive shows the preview and asks before updating. Declining still archives the change and leaves the specs alone.

With `--json --yes`:

```json
{
  "archive": {
    "change": "add-rate-limit",
    "archivedAs": "2026-08-11-add-rate-limit",
    "path": "/Users/you/projects/my-app/changes/archive/2026-08-11-add-rate-limit",
    "specsUpdated": true,
    "totals": {
      "added": 1,
      "modified": 0,
      "removed": 0,
      "renamed": 0
    }
  },
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  }
}
```

Archive validates the change first and refuses one that fails:

```
Validation errors in change delta specs:
  ✗ ADDED "Rate limiting" must include at least one scenario

Validation failed. Please fix the errors before archiving.
To skip validation (not recommended), use --no-validate flag.
```

Incomplete tasks warn but don't block. Interactively archive asks whether to continue, and `-y` continues on its own:

```
Task status: 1/2 tasks
Warning: 1 incomplete task(s) found. Continuing due to --yes flag.
```

**Exit codes**

- `0`: the change was archived, with or without spec updates.
- `1`: validation failed, the change name is unknown, or a confirmation was needed and no answer could be read.

## specagile new

Creates a new change directory.

```bash
specagile new change add-caching                                # metadata only
specagile new change add-search --goal "Users can search docs"  # record a goal
```

`new` has one subcommand, `new change <name>`. It creates `changes/<name>/` containing a single [`.specagile.yaml` metadata file](configuration/change-metadata.md):

```yaml
schema: spec-driven
created: 2026-08-11
```

Artifacts (proposal, specs, design, tasks) aren't scaffolded here. You write them later, and `specagile status` tells you which one is next.

**Arguments**

| Argument | What it is |
|---|---|
| `name` | Folder name for the change (`add-caching`). |

**Options**

| Flag | Effect |
|---|---|
| `--description <text>` | Also create a `README.md` in the change directory with this text. |
| `--goal <text>` | Store a `goal:` line in `.specagile.yaml`. |
| `--schema <name>` | Workflow schema for the change. Default: `spec-driven`, the only schema that ships. |
| `--json` | Print the created change as JSON instead of text. |
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

**Output**

```
Created change 'add-caching' at changes/add-caching/
Schema: spec-driven
Next: specagile status --change add-caching
```

When no `specagile/` directory was found, `new change` creates the project folders where you are and says so:

```
Created change 'add-caching' at changes/add-caching/
Schema: spec-driven
Next: specagile status --change add-caching

Note: no OpenSpec root was found here, so one was created at specs/, changes/, specagile/.
Run `specagile init` to finish setting this project up, or delete that directory if you meant a different project.
```

The notice goes to stdout with the rest of the human output, and never appears with `--json`.

With `--json`, in a project that already has `specagile/`:

```json
{
  "change": {
    "id": "add-caching",
    "path": "/Users/you/projects/my-app/changes/add-caching",
    "metadataPath": "/Users/you/projects/my-app/changes/add-caching/.specagile.yaml",
    "schema": "spec-driven"
  },
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  }
}
```

When no `specagile/` directory was found and `new change` created one, the JSON has the same shape. `root.path` is the directory you ran it from, and `root.source` reads `implicit`:

```json
"root": {
  "path": "/Users/you/projects/my-app",
  "source": "implicit"
}
```

**Exit codes**

- `0`: change created.
- `1`: the change already exists, or the schema is unknown.

## specagile status

Reports artifact completion status for one change or every active change.

```bash
specagile status --change add-rate-limit          # checklist view
specagile status --change add-rate-limit --json   # structured report
specagile status --all                            # every active change
specagile status --all --json                     # one batch report
```

When active changes exist, use exactly one of `--change` or `--all`. Without either, status exits 1 and lists the available changes, even when only one exists:

```text
✖ Error: Missing required option --change (or --all for every active change). Available changes:
  add-rate-limit
```

When the project has no active changes, status prints `No active changes. Create one with: specagile new change <name>` and exits 0 even without either flag. With `--all --json`, the same empty state is `{ "changes": [], "message": "No active changes.", "root": ... }`.

**Options**

| Flag | Effect |
|---|---|
| `--change <id>` | The change to report on, by folder name. |
| `--all` | Report every active change, sorted by name. Can't be combined with `--change`. |
| `--schema <name>` | Override the schema auto-detected from `specagile/config.yaml`. An unknown name is an error. |
| `--json` | Print a structured report instead of text. |
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

**Output**

A checklist of the schema's artifacts: `[x]` done, `[ ]` ready to write, `[-]` blocked until the artifacts it depends on exist.

```
Change: add-rate-limit
Schema: spec-driven
Change root: /Users/you/projects/my-app/changes/add-rate-limit
Progress: 2/4 artifacts complete

[x] proposal
[x] specs
[ ] design
[-] tasks (blocked by: design)

Next: specagile instructions design --change "add-rate-limit" --json
```

The `Next:` line names the one command that moves the change forward, so `specagile status` is enough to pick a change back up in a fresh session. It names the next ready artifact while planning is unfinished, and `specagile instructions apply` once every planning artifact exists:

```
[x] proposal
[x] specs
[x] design
[x] tasks

All planning artifacts complete!
Next: specagile instructions apply --change "add-rate-limit" --json
```

It carries `--store <id>` whenever the resolved root is a store, and names the same command as the JSON `nextSteps` sentence.

`--json` adds per-artifact dependencies, resolved file paths, and a suggested next step. Trimmed:

```json
{
  "changeName": "add-rate-limit",
  "schemaName": "spec-driven",
  "isComplete": false,
  "nextSteps": [
    "Run specagile instructions design --change \"add-rate-limit\" --json before writing that artifact."
  ],
  "artifacts": [
    {
      "id": "proposal",
      "outputPath": "proposal.md",
      "status": "done",
      "requires": []
    },
    {
      "id": "design",
      "outputPath": "design.md",
      "status": "ready",
      "requires": [
        "proposal"
      ]
    },
    {
      "id": "tasks",
      "outputPath": "tasks.md",
      "status": "blocked",
      "requires": [
        "specs",
        "design"
      ],
      "missingDeps": [
        "design"
      ]
    }
  ]
}
```

With `--all --json`, `changes` contains the same status object for each change, without a per-change `root`. The selected root appears once on the envelope. This example trims the per-change status fields shown above:

```json
{
  "changes": [
    {
      "changeName": "add-rate-limit",
      "schemaName": "spec-driven",
      "artifacts": []
    }
  ],
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest"
  }
}
```

If one change can't load, the batch continues. Its entry contains `changeName` and a `status` diagnostic while the other entries remain available. The command exits 1, including in JSON mode, so CI doesn't accept an incomplete report as successful. JSON output remains one parseable document.

**Exit codes**

- `0`: every requested status printed; an empty `--all` report also exits 0.
- `1`: a requested change failed to load, `--change` or `--all` is missing, the two flags were combined, the change doesn't exist, or the schema override is unknown.

## specagile instructions

Prints instructions for creating an artifact, applying, or archiving. Your agent runs this during the workflow to fetch the instruction text for its next step.

```bash
specagile instructions proposal --change add-rate-limit   # how to write one artifact
specagile instructions apply --change add-rate-limit      # how to implement the change
specagile instructions archive --change add-rate-limit    # inputs for archiving
```

**Arguments**

| Argument | What it is |
|---|---|
| `artifact` | An artifact id from the schema (`proposal`, `specs`, `design`, `tasks` in `spec-driven`), or the reserved words `apply` and `archive`. |

**Options**

| Flag | Effect |
|---|---|
| `--change <id>` | The change to generate instructions for. Required. |
| `--schema <name>` | Override the schema. Auto-detected from `config.yaml` otherwise. |
| `--json` | Print a structured object instead of text. |
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |

**Output**

The artifact form prints one instruction block: the task, the file to write, how to write it, the artifact's template, and what completing it unlocks.

```
<artifact id="proposal" change="add-rate-limit" schema="spec-driven">

<task>
Create the proposal artifact for change "add-rate-limit".
Initial proposal document outlining the change
</task>

<output>
Write to: /Users/you/projects/my-app/changes/add-rate-limit/proposal.md
</output>

<instruction>
Create the proposal document that establishes WHY this change is needed.
...
```

`apply` prints context files, task progress, and the working instruction:

```
## Apply: add-rate-limit
Schema: spec-driven

### Context Files
- proposal: /Users/you/projects/my-app/changes/add-rate-limit/proposal.md
- specs: /Users/you/projects/my-app/changes/add-rate-limit/specs/api/spec.md
- tasks: /Users/you/projects/my-app/changes/add-rate-limit/tasks.md

### Progress
1/3 complete

### Tasks
- [x] 1.1 Add rate limit middleware
- [ ] 1.2 Return 429 with Retry-After header
- [ ] 1.3 Add tests for burst traffic

### Instruction
Read context files, work through pending tasks, mark complete as you go.
Pause if you hit blockers or need clarification.

No project context or operation guidance configured.
```

When required artifacts are missing, `apply` reports `### ⚠️ Blocked` and names them instead. `archive` prints the change name plus any project context and operation guidance from config. With none configured it says so and nothing more.

With `--json`, each form returns one object. The artifact form starts:

```json
{
  "changeName": "add-rate-limit",
  "artifactId": "proposal",
  "schemaName": "spec-driven",
  "changeDir": "/Users/you/projects/my-app/changes/add-rate-limit",
  ...
```

and continues with `outputPath`, `existingOutputPaths`, the full `instruction` and `template` strings, `dependencies`, `unlocks`, and `root`. The `apply` form carries `contextFiles`, `progress`, `tasks`, `taskTrackingConfigured`, `state` (`blocked`, `ready`, `all_done`), and `instruction`.

Each `tasks` entry carries `id`, `description`, `done`, `sourcePath`, and `line`. `sourcePath` is the absolute path to the tracked file that supplied the task. `line` is the task checkbox's one-based line number in that file. `description` is the task's full text: a task wrapped onto several lines comes back as one line, with a trailing `\` line break removed.

`taskTrackingConfigured` is always a boolean: `true` when the schema sets a non-null [`apply.tracks`](schemas/schema-yaml.md#tracks), even if no file matches, and `false` otherwise. If a matched tracking file cannot be read, `unavailableTrackingFiles` contains its absolute `path` and error `reason`. This field is omitted when every matched file is readable. Readable files still contribute to `tasks` and `progress`, but `state` cannot be `all_done` until every matched file is read.

**Exit codes**

- `0`: instructions printed.
- `1`: unknown artifact, unknown change, unknown schema, or missing `--change`. Each error lists the valid values.

## specagile templates

Prints the resolved template paths for a schema's artifacts.

```bash
specagile templates          # default schema: spec-driven
specagile templates --json   # map of artifact ids to paths
```

**Options**

| Flag | Effect |
|---|---|
| `--schema <name>` | Schema to resolve. Default: `spec-driven`. |
| `--json` | Print a JSON map of artifact ids to template paths. |

**Output**

```
Schema: spec-driven
Source: package

proposal:
  /usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/proposal.md
specs:
  /usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/spec.md
design:
  /usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/design.md
tasks:
  /usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/tasks.md
```

`Source` names where the schema resolved from: `project` (`specagile/schemas/` in your project), `user` (a global override), or `package` (built into the CLI). Project wins over user, user over package.

```json
{
  "proposal": {
    "path": "/usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/proposal.md",
    "source": "package"
  },
  "specs": {
    "path": "/usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/spec.md",
    "source": "package"
  },
  "design": {
    "path": "/usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/design.md",
    "source": "package"
  },
  "tasks": {
    "path": "/usr/local/lib/node_modules/specagile/schemas/spec-driven/templates/tasks.md",
    "source": "package"
  }
}
```

**Exit codes**

- `0`: paths printed.
- `1`: unknown schema. The error lists available schemas.

## specagile schemas

Lists available workflow schemas.

```bash
specagile schemas          # names, descriptions, artifact order
specagile schemas --json   # machine-readable, for agent use
```

**Options**

| Flag | Effect |
|---|---|
| `--json` | Output as JSON (for agent use). |

**Output**

```
Available schemas:

  spec-driven
    Default OpenSpec workflow - proposal → specs → design → tasks
    Artifacts: proposal → specs → design → tasks
```

Schemas from your project are labeled `(project)`, and global overrides are labeled `(user override)`.

```json
[
  {
    "name": "spec-driven",
    "description": "Default OpenSpec workflow - proposal → specs → design → tasks",
    "artifacts": [
      "proposal",
      "specs",
      "design",
      "tasks"
    ],
    "source": "package"
  }
]
```

**Exit codes**

- `0`: schemas listed.
- `1`: the schema list couldn't be read.

## specagile schema

Inspects, forks, or creates a schema (experimental). Every subcommand first prints `Note: Schema commands are experimental and may change.` on stderr.

```bash
specagile schema which spec-driven          # where a schema resolves from
specagile schema fork spec-driven my-flow   # copy a schema into the project
specagile schema init my-schema             # create a schema from scratch
```

| Subcommand | What it does |
|---|---|
| `which` | Show where a schema resolves from. |
| `validate` | Check a schema's structure and templates. |
| `fork` | Copy an existing schema into the project for customization. |
| `init` | Create a new project-local schema. |

Schemas resolve from three locations. The first match wins:

| Source | Location |
|---|---|
| `project` | `specagile/schemas/` in the current project. |
| `user` | `~/.local/share/specagile/schemas/` (`XDG_DATA_HOME` and Windows `%LOCALAPPDATA%` respected). |
| `package` | The schemas shipped with the CLI. `spec-driven` lives here. |

### specagile schema which

Shows which copy of a schema the CLI will use.

```bash
specagile schema which spec-driven
specagile schema which --all        # every schema, grouped by source
```

**Arguments**

| Argument | What it is |
|---|---|
| `name` | The schema to look up. Required unless `--all` is set. Without either, which exits 1. |

**Options**

| Flag | Effect |
|---|---|
| `--all` | List every schema with its resolution source. |
| `--json` | Print the resolution as JSON. |

**Output**

```
Schema: spec-driven
Source: package
Path: /usr/local/lib/node_modules/specagile/schemas/spec-driven
```

When a higher-priority copy hides another, a `Shadows:` section lists the hidden copies. With `--json`:

```json
{
  "name": "my-flow",
  "source": "project",
  "path": "/Users/you/projects/my-app/specagile/schemas/my-flow",
  "shadows": []
}
```

An unknown name exits 1 and lists the available schemas.

### specagile schema validate

Checks a schema's structure and templates.

```bash
specagile schema validate spec-driven   # one schema, from any source
specagile schema validate               # every project-local schema
```

It verifies that `schema.yaml` exists and parses, that the structure matches the schema format, that every artifact's template file exists inside the schema's `templates/` directory, and that the dependency graph has no cycles or unknown references, including in `apply.requires`. An `apply.tracks` value that isn't exactly equal to some artifact's `generates` value prints a `warning:` line but does not fail validation, because OpenSpec then can't tell which artifact's progress that file belongs to.

**Options**

| Flag | Effect |
|---|---|
| `--json` | Print a structured report instead of text. |
| `--verbose` | Print each validation step. |

**Output**

```
✓ Schema 'spec-driven' is valid
```

With no name, each project schema gets one line under a `Validation Results:` header. A failing schema lists its issues and the run exits 1:

```
✗ Schema 'my-schema' has errors:
  error: Template file 'tasks.md' not found for artifact 'tasks'
```

### specagile schema fork

Copies an existing schema into the project so you can customize it.

```bash
specagile schema fork spec-driven my-flow
```

**Arguments**

| Argument | What it is |
|---|---|
| `source` | The schema to copy, from any source location. |
| `name` | Name for the copy. Kebab-case (`my-workflow`). Default: `<source>-custom`. |

**Options**

| Flag | Effect |
|---|---|
| `--force` | Overwrite an existing destination schema. |
| `--json` | Print the result as JSON. |

**Output**

```
✔ Forked 'spec-driven' to 'my-flow'

Source: /usr/local/lib/node_modules/specagile/schemas/spec-driven (package)
Destination: /Users/you/projects/my-app/specagile/schemas/my-flow
```

The fork lands in `specagile/schemas/`, and the `name:` field in its `schema.yaml` is rewritten to the new name:

```
specagile/schemas/my-flow/
├── schema.yaml
└── templates/
    ├── design.md
    ├── proposal.md
    ├── spec.md
    └── tasks.md
```

An existing destination is an error unless you pass `--force`. A fork that keeps the source's name shadows the original.

### specagile schema init

Creates a new project-local schema with starter templates.

```bash
specagile schema init my-schema --description "Lightweight flow" --artifacts proposal,tasks
```

With no `--description` and no `--artifacts` in an interactive terminal, init prompts for a description, an artifact checklist, and whether to make the schema the project default. Outside a terminal it uses the defaults below.

**Arguments**

| Argument | What it is |
|---|---|
| `name` | Name for the new schema. Kebab-case (`my-workflow`). |

**Options**

| Flag | Effect |
|---|---|
| `--description <text>` | Schema description. Default: `Custom workflow schema for <name>`. |
| `--artifacts <list>` | Comma-separated artifact IDs from `proposal`, `specs`, `design`, `tasks`. Default: all four. |
| `--default` | Writes `schema: <name>` to the existing `specagile/config.yaml` or `specagile/config.yml`. Creates `specagile/config.yaml` if neither exists. New changes use this schema. |
| `--no-default` | Skip the prompt about the default. |
| `--force` | Overwrite an existing schema with the same name. |
| `--json` | Print the result as JSON. |

Schema creation and the `--default` config update are one operation. If OpenSpec cannot validate or write the config, it leaves both the config and any existing schema unchanged.

**Output**

```
✔ Created schema 'my-schema'

Schema created at: /Users/you/projects/my-app/specagile/schemas/my-schema

Artifacts: proposal, tasks
```

The layout on disk:

```
specagile/schemas/my-schema/
├── schema.yaml
└── templates/
    ├── proposal.md
    └── tasks.md
```

`schema.yaml` wires the selected artifacts with their dependencies. When `tasks` is included it also gets an `apply` phase that tracks `tasks.md`. Use the schema with `specagile new --schema my-schema`.

## specagile store

Creates and manages stores: standalone OpenSpec repos registered on your machine.

```bash
specagile store setup team-context --path ~/openspec/team-context   # create and register
specagile store register ~/stores/design-system                     # register an existing checkout
specagile store list                                                # see what's registered
```

Registrations live in a per-machine registry: `~/.local/share/specagile/stores/registry.yaml` (`%LOCALAPPDATA%\specagile\stores\registry.yaml` on Windows), or `$XDG_DATA_HOME/specagile/stores/registry.yaml` when `XDG_DATA_HOME` is set. Stores registered with OpenSpec are not listed; register them again with `specagile store register <folder>`. Every subcommand takes `--json` to print a structured report instead of text. Running `specagile store` with a missing or unknown subcommand exits 1 and lists the subcommands.

| Subcommand | What it does |
|---|---|
| `setup [id]` | Create a store folder and register it. |
| `register [path]` | Register an existing store folder. |
| `unregister <id>` | Forget the registration. The folder stays on disk. |
| `remove <id>` | Forget the registration and delete the folder. |
| `list` (alias `ls`) | List registered stores. |
| `doctor [id]` | Check registration, metadata, and Git state for registered stores. |

### specagile store setup

Creates a store folder and registers it.

```bash
specagile store setup team-context --path ~/openspec/team-context
```

In an interactive terminal, setup prompts for a missing name and location and confirms before creating anything. Outside one, a missing name or `--path` exits 1 with the flag to pass. Rerunning setup for a registered store reports `Registry: already registered`.

Setup exits 1 with `store_setup_inside_git_repo` when `--path` is inside another Git repository, because initializing the store there would nest one repository in another. `--no-init-git` creates no repository, so it skips that check. Use it to keep a store at `~/openspec/<id>` when your home directory is itself a Git repository, such as a dotfiles repo.

**Arguments**

| Argument | What it is |
|---|---|
| `id` | The store name. It becomes the id you pass to `--store`. |

**Options**

| Flag | Effect |
|---|---|
| `--path <path>` | Folder where the store should live (`~` expands). |
| `--init-git` | Initialize a Git repository with an initial commit. Default. |
| `--no-init-git` | Skip every Git action: no init, no initial commit. |
| `--remote <url>` | Canonical clone source recorded in `store.yaml`. |

**Output**

```
Store ready: team-context
Location: /Users/you/stores/team-context
OpenSpec root: ready
Registry: registered

Next: run normal OpenSpec commands against this store, for example:
  specagile new change <change-id> --store team-context
Share this store by committing and pushing it like any Git repo.
```

`--json` reports what was created and where it was registered:

```json
{
  "store": {
    "id": "design-system",
    "root": "/Users/you/stores/design-system",
    "metadata_path": "/Users/you/stores/design-system/.openspec-store/store.yaml"
  },
  "registry": {
    "path": "/Users/you/.local/share/specagile/stores/registry.yaml",
    "registered": true,
    "already_registered": false
  },
  "git": {
    "is_repository": true,
    "initialized": true,
    "committed": true
  },
  "created_files": [
    "specagile/",
    "specs/",
    "changes/",
    "changes/archive/",
    "specagile/config.yaml",
    "specs/.gitkeep",
    "changes/archive/.gitkeep",
    ".openspec-store/store.yaml"
  ],
  "status": []
}
```

### specagile store register

Registers an existing store folder, for example a teammate's store you cloned.

```bash
specagile store register ~/stores/design-system
```

The folder must contain a healthy root: `specagile/` with its config, `specs/` and `changes/`. A store with the former `openspec/` layout must be moved first with `specagile update` in its folder. With `.openspec-store/store.yaml` present, register reuses the recorded id. Without it, register asks before creating that metadata. Outside an interactive terminal, pass `--yes` instead. A machine can register one checkout per store id. A second path under the same id, or the same path under a second id, exits 1.

**Arguments**

| Argument | What it is |
|---|---|
| `path` | The store folder to register (`~` expands). Required. |

**Options**

| Flag | Effect |
|---|---|
| `--id <id>` | Store id. Defaults to metadata or folder name. |
| `--yes` | Confirm creating store identity metadata for a healthy OpenSpec root. |

**Output**

```
Store registered: design-system
Location: /Users/you/stores/design-system
OpenSpec root: ready
Registry: registered
```

`--json` prints the same document shape as `store setup --json`.

### specagile store unregister

Forgets the registration. The folder stays on disk.

```bash
specagile store unregister design-system
```

```
Unregistered store: design-system
Files kept at: /Users/you/stores/design-system
```

### specagile store remove

Forgets the registration and deletes the folder.

```bash
specagile store remove design-system --yes
```

Interactively, remove asks before deleting. With `--json` or outside an interactive terminal, deletion requires `--yes`:

```
Error: Pass --yes to delete store files non-interactively.
Fix: specagile store remove design-system --yes
```

Remove exits 1 and deletes nothing when the folder lacks matching store metadata, or when it contains another registered store (for example a store vendored as a Git submodule). In that case the error is `store_remove_contains_registered_store`: run `specagile store unregister <nested-id>` first, or `specagile store unregister <id>` to forget the store without deleting files.

**Options**

| Flag | Effect |
|---|---|
| `--yes` | Confirm local store folder deletion. |

**Output**

```
Removed store: design-system
Deleted: /Users/you/stores/design-system
```

### specagile store list

Lists registered stores. `ls` is an alias.

```bash
specagile store list
```

```
OpenSpec stores (2)

ID              Location
design-system   /Users/you/stores/design-system
team-context    /Users/you/stores/team-context
```

With nothing registered, list prints `No stores registered.` and the setup and register commands to run next.

### specagile store doctor

Checks registration, metadata, and Git state for registered stores.

```bash
specagile store doctor                # every registered store
specagile store doctor team-context  # one store
```

**Output**

```
Store doctor

team-context
  Location: /Users/you/stores/team-context
  OpenSpec root: ok
  Metadata: ok
  Git: repository detected (commits: yes, uncommitted changes: no, remote: none)
  Issues: none
```

**Exit codes**

- `0`: the report printed, even when a store reports issues.
- `1`: the report couldn't run (for example an unknown store id).

## specagile doctor

Reports relationship health for the resolved OpenSpec root.

```bash
specagile doctor                       # nearest specagile/ root above your cwd
specagile doctor --store team-context  # a registered store as the root
```

Doctor is read-only: it never clones, syncs, or repairs. It reports whether the root is healthy and whether each reference declared in `specagile/config.yaml` resolves on this machine. With no root above your cwd and no `--store`, it exits 1 and names your registered stores.

**Options**

| Flag | Effect |
|---|---|
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |
| `--json` | Print the health report as JSON. |

**Output**

```
Doctor

Root
  Location: /Users/you/projects/my-app
  OpenSpec root: ok

References
  - team-context: ok (/Users/you/stores/team-context)
```

With `--store`, the root is the store and the report adds a store line:

```
Using OpenSpec root: team-context (/Users/you/stores/team-context)
Doctor

Root
  Location: /Users/you/stores/team-context
  OpenSpec root: ok
  Store: team-context (metadata ok)

References
  (none declared)
```

```json
{
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest",
    "healthy": true,
    "status": []
  },
  "store": null,
  "references": [
    {
      "store_id": "team-context",
      "root": "/Users/you/stores/team-context",
      "status": []
    }
  ],
  "status": []
}
```

**Exit codes**

- `0`: the report printed, including when it lists issues.
- `1`: no root resolved (no `specagile/` above your cwd and no `--store`), or an unknown `--store` id.

## specagile context

Prints the working context for the resolved OpenSpec root: the root plus every referenced store declared in `specagile/config.yaml`, each with a fetch command.

```bash
specagile context                       # nearest specagile/ root above your cwd
specagile context --store team-context  # a registered store as the root
specagile context --json                # agent brief
```

References that don't resolve on this machine land in a `Not available on this machine` section, each with a fix.

**Options**

| Flag | Effect |
|---|---|
| `--store <id>` | Use a registered store as the OpenSpec root instead of the current project. |
| `--json` | Print the agent brief as JSON. |
| `--code-workspace <path>` | Also write a VS Code workspace file for the set. |
| `--force` | Overwrite an existing `--code-workspace` file. |

**Output**

```
Working context for my-app (/Users/you/projects/my-app)

OpenSpec root
  my-app  /Users/you/projects/my-app

Referenced stores
  team-context  /Users/you/stores/team-context
    Fetch: specagile show <spec-id> --type spec --store team-context
```

With `--store`, the store is the whole set:

```
Using OpenSpec root: team-context (/Users/you/stores/team-context)
Working context for team-context (/Users/you/stores/team-context)

OpenSpec root
  team-context  /Users/you/stores/team-context

No references declared; the working set is this root alone.
```

```json
{
  "root": {
    "path": "/Users/you/projects/my-app",
    "source": "nearest",
    "role": "openspec_root"
  },
  "members": [
    {
      "role": "referenced_store",
      "id": "team-context",
      "path": "/Users/you/stores/team-context",
      "fetch": "specagile show <spec-id> --type spec --store team-context",
      "status": []
    }
  ],
  "status": []
}
```

**Writing a workspace file**

`--code-workspace` writes a VS Code workspace file at the path you give: one folder for the root, one `ref:<id>` folder per available referenced store. Unavailable references are skipped and named in the summary line, `Wrote /Users/you/projects/my-app/openspec.code-workspace (2 folders)`. The summary prints on stderr, so `--json` stdout stays one JSON document. An existing file exits 1 unless you pass `--force`.

```json
{
  "folders": [
    {
      "name": "my-app",
      "path": "/Users/you/projects/my-app"
    },
    {
      "name": "ref:team-context",
      "path": "/Users/you/stores/team-context"
    }
  ]
}
```

**Exit codes**

- `0`: the report printed.
- `1`: no root resolved (no `specagile/` above your cwd and no `--store`), or the `--code-workspace` write was refused.

## specagile workset

Composes, keeps, and opens personal working views. A workset is a saved, named list of folders you work across together.

```bash
specagile workset create checkout --member ~/projects/checkout-api --member web=~/projects/checkout-web
specagile workset list
specagile workset remove checkout --yes
```

| Subcommand | What it does |
|---|---|
| `create [name]` | Compose and save a named working view of folders you choose. |
| `list`, `ls` | Show saved worksets with their members. |
| `open <name>` | Open a saved workset in your tool (editor window or agent session). |
| `remove <name>` | Delete a saved workset (member folders are never touched). |

A workset is purely local:

- Its state lives in one folder: `~/.local/share/specagile/worksets/` (`$XDG_DATA_HOME/specagile/worksets/` when set; `%LOCALAPPDATA%\specagile\worksets\` on Windows).
- Nothing is written into the member folders, and nothing is committed or shared.
- Deleting that one folder removes every trace.

### specagile workset create

Saves a named working view of folders.

```bash
specagile workset create checkout \
  --member ~/projects/checkout-api \
  --member web=~/projects/checkout-web
```

In an interactive terminal, create prompts for whatever the flags didn't provide: the name, folders one at a time, a tool, then an offer to open the workset now. Outside one, a missing name or member is an error. A name that's already saved is always an error. Remove it first.

**Arguments**

| Argument | What it is |
|---|---|
| `name` | The workset name. Kebab-case: lowercase letters, numbers, single hyphens. Required outside an interactive terminal. |

**Options**

| Flag | Effect |
|---|---|
| `--member <member>` | Member folder as `<path>` or `<name>=<path>`, repeatable. The first is the primary. The path must be an existing folder, and the label defaults to the folder's own name. |
| `--tool <id>` | Preferred tool to open this workset with. Built-in ids: `code` (VS Code), `cursor` (Cursor). `claude` and `codex` are temporarily disabled. |
| `--json` | Print the saved workset as JSON. |

**Output**

```
Saved workset 'checkout' (2 members) to your machine.
Open it any time with: specagile workset open checkout
```

### specagile workset list

Shows saved worksets with their members, sorted by name.

```bash
specagile workset list   # alias: ls
```

**Options**

| Flag | Effect |
|---|---|
| `--json` | Print the worksets as JSON. |

**Output**

One block per workset: the name, its tool when it has one, then one `name  path` row per member. With nothing saved, list prints `No worksets saved. Create one with: specagile workset create`.

```
checkout
  checkout-api  /Users/you/projects/checkout-api
  web           /Users/you/projects/checkout-web
checkout-tool  (opens in VS Code)
  checkout-api  /Users/you/projects/checkout-api
```

With `--json`:

```json
{
  "worksets": [
    {
      "name": "checkout",
      "members": [
        {
          "name": "checkout-api",
          "path": "/Users/you/projects/checkout-api"
        },
        {
          "name": "web",
          "path": "/Users/you/projects/checkout-web"
        }
      ]
    }
  ],
  "status": []
}
```

### specagile workset open

Opens a saved workset in your tool. Editor tools (`code`, `cursor`) get a generated `.code-workspace` file. A window opens and the command returns. CLI agent tools (`claude`, `codex`) would take over this terminal with every member attached. They are temporarily disabled while that flow is reworked, so worksets open in an IDE for now.

```bash
specagile workset open checkout                # saved tool, or a prompt
specagile workset open checkout --tool cursor  # this tool just this once
```

**Arguments**

| Argument | What it is |
|---|---|
| `name` | The workset to open. |

**Options**

| Flag | Effect |
|---|---|
| `--tool <id>` | Open with this tool just this once. |

With no `--tool` and no saved tool, open prompts you to pick an installed tool. Outside an interactive terminal it exits 1 instead.

- A member folder that no longer exists is skipped with a warning. When the primary is missing, the next surviving member becomes the primary for this open. When no member folder exists, the open fails.
- `--json` is rejected: open hands the terminal to the tool and has no JSON mode.
- When the launch fails, the error ends with the manual route: the workspace file's path and the member list.

**Exit codes**

- Mirrors the tool: the command exits with the tool's own exit code, and a signal becomes `128+n` (`130` after Ctrl-C).
- `1`: unknown workset, no member folder available, or no usable tool.

### specagile workset remove

Deletes a saved workset and its generated `.code-workspace` file. Member folders are never touched.

```bash
specagile workset remove checkout --yes
```

In an interactive terminal, remove shows the workset and asks you to confirm. With `--json`, or outside a terminal, it requires `--yes` and exits 1 without it.

**Options**

| Flag | Effect |
|---|---|
| `--yes` | Confirm removal non-interactively. |
| `--json` | Print the removal as JSON. |

**Output**

```
Removed workset 'checkout'. Member folders were not touched.
```

## specagile version

Reports the running OpenSpec version and how this copy was installed.

```bash
specagile version                 # local version and install details
specagile version --json          # structured local report
specagile version --check         # also check for an update
specagile version --check --json  # structured local and update report
```

Without `--check`, this command is local and makes no network request. It works outside an OpenSpec project. The existing `specagile --version` flag remains the shortest form and prints only the bare version number.

**Options**

| Flag | Effect |
|---|---|
| `--json` | Print one versioned JSON document instead of text. |
| `--check` | Check for a newer release of the `specagile` package on the configured npm registry. |

**Output**

For a global npm install:

```text
OpenSpec 1.13.2 (npm, global)
```

The install scope is `global`, `project`, `temporary` for an ephemeral runner such as npx, or `source` for a checkout. OpenSpec omits details it cannot identify instead of guessing.

`--json` keeps unknown details as explicit `null` values:

```json
{
  "schemaVersion": 1,
  "version": "1.13.2",
  "install": {
    "location": "/opt/homebrew/lib/node_modules/specagile",
    "packageManager": "npm",
    "scope": "global"
  }
}
```

With `--check`, an available update adds the latest version and a command when OpenSpec can identify a safe command for that install:

```text
OpenSpec 1.13.2 (npm, global)
Update available: 1.14.0
  npm install -g specagile@latest
```

```json
{
  "schemaVersion": 1,
  "version": "1.13.2",
  "install": {
    "location": "/opt/homebrew/lib/node_modules/specagile",
    "packageManager": "npm",
    "scope": "global"
  },
  "update": {
    "status": "available",
    "latest": "1.14.0",
    "command": "npm install -g specagile@latest",
    "canSelfUpgrade": true
  }
}
```

Update status values:

| Status | Meaning |
|---|---|
| `available` | A safe version newer than the running version can be installed. |
| `current` | The check completed and found no newer version. |
| `disabled` | `SPECAGILE_NO_UPDATE_CHECK` is set, or (npm installs only) a registry override was rejected. `latest` is `null`. |
| `offline` | The registry was unavailable, refused the request (for example a rate limit), or returned an unusable response. `latest` is `null`. |

Because `--check` is an explicit request, it runs even when `DO_NOT_TRACK`, `SPECAGILE_TELEMETRY=0` or `telemetry.enabled: false` is set, and in CI. (SpecAgile sends no telemetry; these settings only turn off the background check.) It is turned off only by `SPECAGILE_NO_UPDATE_CHECK`, or, for npm installs, by a rejected non-HTTPS registry override. The background check in `specagile update` still stays off for all of these. Disabled and offline checks still exit 0 because update availability is advisory. This command never upgrades OpenSpec; `canSelfUpgrade` only reports whether the existing `specagile update` path could safely upgrade this copy.

**Exit codes**

- `0`: the local report printed, including disabled or offline update checks.
- `1`: command syntax was invalid, such as the unsupported `--upgrade` option.

## specagile install

SpecAgile has no standalone install: it is installed and updated with npm. The command is kept so a habit from OpenSpec gets an answer. It downloads nothing, prints the npm command and exits with code 1:

```text
SpecAgile has no standalone install. Install or update it with npm:
  npm install -g specagile@latest
```

## specagile feedback

Submits feedback about OpenSpec.

```bash
specagile feedback "Validate output is hard to scan"
specagile feedback "Archive fails on Windows" --body "Steps: init, propose, archive. Error: EPERM."
```

The CLI files your message as a GitHub issue on the `dariopalminio/specagile` repo through your `gh` CLI. The title becomes `Feedback: <message>`. The body uses the bug form's headings: your message under `What happened`, your `--body` text under `Details`, and a `Minimal steps to reproduce` section asking you to add the steps, since the CLI can't fill those in. A footer adds CLI version, platform, and timestamp. The issue gets the `feedback` label. If the repo doesn't define that label, the CLI retries without it and says so.

**Arguments**

| Argument | What it is |
|---|---|
| `message` | One-line summary. Becomes the issue title. Required. |

**Options**

| Flag | Effect |
|---|---|
| `--body <text>` | Longer description added to the issue body. |

**Output**

On success:

```
✓ Feedback submitted successfully!
Issue URL: https://github.com/dariopalminio/specagile/issues/1234
```

Without `gh` installed, or with `gh` not logged in, nothing is submitted. The CLI prints your formatted feedback between `--- FORMATTED FEEDBACK ---` markers, then a link that opens the bug report form with the title, what happened (your message and `--body` text), CLI version, and environment (platform and Node version) filled in. You complete the rest of the form in the browser. The not-logged-in path adds `To auto-submit in the future: gh auth login`.

**Exit codes**

- `0`: issue created, or the manual-submission fallback ran (no `gh`, or `gh` not logged in).
- `1`: no message given.
- `gh`'s own code: `gh` failed after authentication (network, rate limit, issues disabled). The CLI reprints your feedback and the manual-submission URL first.

## specagile completion

Installs or generates shell completions.

```bash
specagile completion install        # detect your shell, install, wire up config
specagile completion generate zsh   # print the script to stdout
```

Supported shells: `zsh`, `bash`, `fish`, `powershell`. Every subcommand takes an optional shell argument. Omit it and the CLI detects your shell from the environment.

| Subcommand | What it does |
|---|---|
| `generate [shell]` | Print the completion script to stdout. |
| `install [shell]` | Write the script and configure your shell startup file. |
| `uninstall [shell]` | Remove the script and the config block. |

Built with the repository's Nix flake, completions are already in place: the package ships the Bash, Fish, and Zsh scripts at the standard locations, so `install` is not needed.

### specagile completion generate

Prints the script and writes nothing.

```
#compdef specagile

# Zsh completion script for OpenSpec CLI
# Auto-generated - do not edit manually

_openspec() {
  local context state line
  typeset -A opt_args
...
```

### specagile completion install

Writes the script and edits your shell config. Config edits sit between `# SPECAGILE:START` and `# SPECAGILE:END` markers. An existing script is backed up first (`.backup-<timestamp>` copy).

| Shell | Script location | Config edited |
|---|---|---|
| zsh | `~/.zsh/completions/_specagile` | `$ZDOTDIR/.zshrc` when `ZDOTDIR` is an absolute path, otherwise `~/.zshrc` |
| bash | `~/.local/share/bash-completion/completions/specagile` | `~/.bashrc` |
| fish | `~/.config/fish/completions/specagile.fish` | None: fish auto-loads it. |
| powershell | `SpecAgileCompletion.ps1` beside your profile | `$PROFILE` |

With Oh My Zsh installed, the script lands in `$ZSH_CUSTOM/completions/_specagile` instead (default `~/.oh-my-zsh/custom/completions/_specagile`).

A relative or `~`-prefixed `ZDOTDIR` is ignored, and `~/.zshrc` is edited instead. Running install again when the script is already current still adds the block to the `.zshrc` zsh reads.

**Options**

| Flag | Effect |
|---|---|
| `--verbose` | Also print the installed path, any backup path, and which config file was edited. |

**Output**

```
✓ Completion script installed and .zshrc configured successfully

Restart your shell or run: exec zsh
```

### specagile completion uninstall

Removes the script and the marked config block. It asks before touching your config (default: No).

For zsh, it cleans the `.zshrc` that install edits, and also `~/.zshrc` when an older install left a block there under `ZDOTDIR`. If a block can't be removed, uninstall names the file and exits 1.

**Options**

| Flag | Effect |
|---|---|
| `-y, --yes` | Skip confirmation prompts. |

**Output**

```
✓ Completion script removed from /Users/you/.zsh/completions/_specagile. Removed OpenSpec configuration from ~/.zshrc
```

**Exit codes**

- `0`: script generated, installed, or removed. A cancelled uninstall also exits 0.
- `1`: shell not supported or not detected, or an install or uninstall step failed.

## specagile change

Deprecated noun form of `show`, `list`, and `validate`. Every run warns and points to the verb-first commands, then runs anyway:

```
Warning: The "specagile change ..." commands are deprecated. Prefer verb-first commands (e.g., "specagile list", "specagile validate --changes").
Warning: "specagile change list" is deprecated. Use "specagile list".
add-rate-limit
```

| Deprecated | Use instead |
|---|---|
| `specagile change show <name>` | `specagile show <name>` |
| `specagile change list` | `specagile list` |
| `specagile change validate <name>` | `specagile validate <name>` (all changes: `specagile validate --changes`) |

The verb-first sections document the flags.

## specagile spec

Deprecated noun form of `show`, `list`, and `validate`. Every run warns and points to the verb-first commands, then runs anyway:

```
Warning: The "specagile spec ..." commands are deprecated. Prefer verb-first commands (e.g., "specagile show", "specagile validate --specs").
api
```

| Deprecated | Use instead |
|---|---|
| `specagile spec show <id>` | `specagile show <id>` |
| `specagile spec list` | `specagile list --specs` |
| `specagile spec validate <id>` | `specagile validate <id>` (all specs: `specagile validate --specs`) |

The verb-first sections document the flags.
