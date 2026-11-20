# CLI settings (config.json)

> Every field of config.json: how the openspec CLI behaves on your machine.

## Location

The CLI keeps its machine-level settings at `~/.config/specagile/config.json` on macOS and Linux, and `%APPDATA%\specagile\config.json` on Windows. `$XDG_CONFIG_HOME` wins on every platform when set. The `specagile config` command reads and edits it.

These are SpecAgile's own settings: OpenSpec's config, in its `openspec` folder, is never read, so an OpenSpec installed on the same machine keeps its settings and SpecAgile starts from the defaults. Without `profile`, the `core` profile applies; SpecAgile never infers one from the skills installed in a project.

## Fields

| Key | Type | Required | Effect |
| --- | --- | --- | --- |
| `profile` | string: `core` or `custom` | No | Picks the workflow set `specagile init` installs |
| `delivery` | string: `both`, `skills`, or `commands` | No | Retired in 2.0: read, but no longer changes anything |
| `workflows` | list of strings | No | The workflow list a `custom` profile installs |
| `featureFlags` | map: flag → boolean | No | Boolean feature toggles |
| `defaultStore` | string | No | Machine-level fallback store for root resolution |
| `skillsScope` | string: `global` or `project` | No | Where `specagile init` puts skills in a project that has none |
| `openers` | map: tool id → settings | No | The tools worksets open in, and how each is launched |
| `telemetry` | map | No | Telemetry opt-out, anonymous id, and notice-seen state |

### profile

Which workflow set `specagile init` installs. Defaults to `core`: propose, explore, apply, update, sync, and archive. Setting `custom` installs exactly the `workflows` list instead.

### delivery

Retired in OpenSpec 2.0, which installs skills only. The value is still accepted and read, so older configs stay valid, but it no longer changes what `init` and `update` install. Defaults to `skills`. In 1.x it chose between skills, slash commands, or both ([Upgrade to 2.0](../../help/upgrade-to-2.md)).

### workflows

The workflows a `custom` profile installs; ignored when the profile is `core`. Valid ids: `propose`, `explore`, `new`, `continue`, `apply`, `update`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`.

### featureFlags

Boolean toggles keyed by flag name, set with `specagile config set featureFlags.<flag> true`. No flag is read by the CLI today.

### defaultStore

The machine-level fallback store id for root resolution, consulted only when no `--store` flag, local `specagile/`, or project `store:` pointer resolves. The full ladder is [Root resolution](../../multi-repo/stores.md#where-artifacts-get-created-when-using-stores).

### skillsScope

Set `specagile config set skillsScope project` to keep skills in new repos on this machine. The default is `global`. A project that already has skills keeps them. See [setup](../../start/setup.md#install-the-skills-once-for-every-project) to switch a repo.

### openers

The tools a workset can open in, keyed by tool id. Edit `openers` in the global `config.json` with `specagile config edit` in your terminal.

| Field | Contract |
| --- | --- |
| `style` | `workspace-file` or `attach-dirs`. Required for a new tool; optional for a built-in. |
| `label` | Non-empty string shown in the tool picker. Defaults to the id for a new tool. |
| `command` | Non-empty executable name or path. Defaults to the id for a new tool. Put arguments in `args`, not in this string. |
| `args` | Array of strings passed before the workspace file or attach flags. Defaults to `[]` for a new tool. |
| `attach_flag` | Non-empty string paired with each member path for `attach-dirs`. Defaults to `--add-dir` for a new tool. Ignored for `workspace-file`. |

**Built-in overrides:** `code`, `cursor`, `claude`, and `codex` retain any fields you omit. Setting `args` replaces the entire argument list; `[]` clears it.

**Launch styles:** `workspace-file` passes the generated `.code-workspace` path to the executable. `attach-dirs` passes one flag/path pair per member, including the primary member.

**Availability:** `attach-dirs` openers, including Claude Code and Codex, are disabled by default. You cannot select or save them with `--tool`, and OpenSpec refuses to open a workset that already names one. Configuration overrides do not enable the `attach-dirs` launch style.

**Validation:** unknown fields, invalid types, and a new tool without `style` fail when a workset command reads the opener table.

This example adds VS Code Insiders and passes `--new-window` whenever the built-in VS Code opener launches:

```json
{
  "openers": {
    "code-insiders": {
      "style": "workspace-file",
      "label": "VS Code Insiders"
    },
    "code": {
      "args": ["--new-window"]
    }
  }
}
```

The corresponding `code-insiders` or `code` executable must be installed and available on `PATH`.

### telemetry

SpecAgile sends no telemetry and writes nothing here. OpenSpec, which reads the same file, stores its anonymous id and whether its first-run notice was shown; `telemetry.enabled: false` turns OpenSpec's telemetry off. In SpecAgile, `telemetry.enabled: false` (like `OPENSPEC_TELEMETRY=0` or `DO_NOT_TRACK=1`) only turns off the background update check in `specagile update`.

## Example

A filled-in config.json:

```json
{
  "profile": "core",
  "featureFlags": {},
  "telemetry": {
    "anonymousId": "5f8a2c1e-4b6d-4f9a-9c3d-7e1b2a8d4c6f",
    "noticeSeen": true
  }
}
```
