# Environment variables

> Every environment variable SpecAgile reads.

SpecAgile reads its settings from variables named `SPECAGILE_*`. It ignores the names OpenSpec reads, so a variable set for `openspec` never changes what `specagile` does: see [OpenSpec's names](#openspecs-names).

## Setting a variable

In Bash or Zsh, for one command or for the rest of the session:

```bash
SPECAGILE_SKILLS_SCOPE=project specagile init --tools claude
export SPECAGILE_NO_UPDATE_CHECK=1
```

In PowerShell, for the rest of the session:

```powershell
$env:SPECAGILE_NO_UPDATE_CHECK = '1'
Remove-Item Env:SPECAGILE_NO_UPDATE_CHECK
```

In `cmd`, for the rest of the session:

```bat
set SPECAGILE_NO_UPDATE_CHECK=1
set SPECAGILE_NO_UPDATE_CHECK=
```

On Windows, variable names are not case-sensitive.

## SPECAGILE_SKILLS_SCOPE

Set to `global` or `project` to choose where `specagile init` installs skills for a repo that has none yet. An explicit `--scope` takes precedence, and this variable takes precedence over the machine's `skillsScope` setting. Existing repo skills stay in place. Any other value makes `init` fail with `Invalid SPECAGILE_SKILLS_SCOPE "<value>". Use global or project.`

With `project`, `specagile update` doesn't offer to install the skills for this machine.

For a CI job that needs agent skills in its checkout:

```bash
SPECAGILE_SKILLS_SCOPE=project specagile init --tools claude
```

A validation-only job can run `specagile validate --all` directly.

## SPECAGILE_CONCURRENCY

How many items `specagile validate` checks at once in a bulk run (`--all`, `--changes`, `--specs`). A positive integer; any other value is ignored. `--concurrency` takes precedence. Default: 6.

## SPECAGILE_NO_UPDATE_CHECK

Set to any value to stop SpecAgile from asking the npm registry for a newer version: `specagile update` doesn't check in the background or offer to upgrade the CLI, and `specagile version --check` reports `disabled` without a network request. Useful offline or without access to npm.

## SPECAGILE_TELEMETRY

SpecAgile sends no telemetry. Set to anything but `1`, `true`, `yes` or `on` (in any case), this variable turns off the background update check in `specagile update`, as `DO_NOT_TRACK` and `telemetry.enabled: false` do. `specagile version --check` still checks, because it is an explicit request.

## SPECAGILE_NO_COMPLETIONS

`1` hides the tip that suggests `specagile completion install`. The tip is also hidden in CI.

## SPECAGILE_NO_AUTO_CONFIG

`1` makes `specagile completion install` install the Bash or Zsh completion script without editing `.bashrc` or `.zshrc`. The command then shows what to add by hand.

## SPECAGILE_NO_ANIMATION

Set to any value, even an empty one, to show the welcome screen of `specagile init` without animation. The animation is also off when the output isn't a terminal, `NO_COLOR` is set, the terminal is narrow, or the system asks for reduced motion.

## SPECAGILE_ENABLE_CLI_AGENT_OPENERS

Opening a workset in a terminal agent, such as Claude Code or Codex, is turned off by default: `specagile workset open <name> --tool claude` refuses it. `1` turns it back on. Tools that open an editor window work either way.

## SPECAGILE_INTERACTIVE

`0` turns off prompts, as `--no-interactive` does, even in a terminal: a command goes on with what its options say, or stops with a message that names the missing option.

## Variables shared with other tools

### CI

Any value turns off prompts. A value other than `false`, `0`, `no`, `off` or an empty one also turns off the background update check and the completions tip.

### DO_NOT_TRACK

A value other than `false`, `0`, `no`, `off` or an empty one turns off the background update check in `specagile update`.

### NO_COLOR

Turns off the welcome animation and the colors of the artifact statuses in `specagile status`. `--no-color` turns off colors for one command.

### XDG_CONFIG_HOME and XDG_DATA_HOME

Move SpecAgile's global folders, on every platform: its config to `$XDG_CONFIG_HOME/specagile/` and its data to `$XDG_DATA_HOME/specagile/`. See [CLI settings (config.json)](config-json.md#location).

## OpenSpec's names

SpecAgile ignores the variables OpenSpec reads: with or without them, `specagile` does the same and says nothing about them. They keep configuring `openspec`, so both tools can share a machine or a CI job. To configure SpecAgile, use the name in the second column:

| OpenSpec | SpecAgile |
|---|---|
| `OPENSPEC_SKILLS_SCOPE` | [`SPECAGILE_SKILLS_SCOPE`](#specagile_skills_scope) |
| `OPENSPEC_CONCURRENCY` | [`SPECAGILE_CONCURRENCY`](#specagile_concurrency) |
| `OPENSPEC_NO_UPDATE_CHECK` | [`SPECAGILE_NO_UPDATE_CHECK`](#specagile_no_update_check) |
| `OPENSPEC_TELEMETRY` | [`SPECAGILE_TELEMETRY`](#specagile_telemetry) |
| `OPENSPEC_NO_COMPLETIONS` | [`SPECAGILE_NO_COMPLETIONS`](#specagile_no_completions) |
| `OPENSPEC_NO_AUTO_CONFIG` | [`SPECAGILE_NO_AUTO_CONFIG`](#specagile_no_auto_config) |
| `OPENSPEC_NO_ANIMATION` | [`SPECAGILE_NO_ANIMATION`](#specagile_no_animation) |
| `OPENSPEC_ENABLE_CLI_AGENT_OPENERS` | [`SPECAGILE_ENABLE_CLI_AGENT_OPENERS`](#specagile_enable_cli_agent_openers) |
| `OPEN_SPEC_INTERACTIVE` | [`SPECAGILE_INTERACTIVE`](#specagile_interactive) |

Versions of SpecAgile before this change read the names in the first column. While scripts or CI jobs still run both versions, set both names: each version reads its own.
