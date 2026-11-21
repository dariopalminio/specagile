# Change metadata (.specagile.yaml)

> The supported fields and validation rules for the metadata stored with each change.

## Location

Each change keeps its metadata at `changes/<change-name>/.specagile.yaml`, next to its artifacts. Creating a change writes the file with `schema` and `created` filled in.

### Changes with `.openspec.yaml`

OpenSpec and SpecAgile 4.0.0 and earlier wrote the same metadata to `.openspec.yaml`. A change that has no `.specagile.yaml` is read from its `.openspec.yaml` with the same effect: the schema, `skip_specs`, `retire_capabilities`, `initiative` and extension keys all keep working, in active and archived changes, in a project or a store.

- **Which file is read**: if a change has `.specagile.yaml`, only that file is read, even when it is invalid; `.openspec.yaml` beside it is ignored. Otherwise `.openspec.yaml` is read.
- **Migration**: `specagile update` and `specagile init` rename `.openspec.yaml` to `.specagile.yaml` in each active change, without changing its content. Archived changes keep `.openspec.yaml`. See [Move to the SpecAgile layout](../../help/move-to-the-specagile-layout.md).
- **Messages** name `.specagile.yaml`, also for a change that still has `.openspec.yaml`.
- **Tools and scripts** that read `.openspec.yaml`, for example to read your extension keys, need to read `.specagile.yaml`, and fall back to `.openspec.yaml` for changes that have no `.specagile.yaml`. A teammate on SpecAgile 4.0.0 or earlier does not read `.specagile.yaml`: for that CLI those changes have no metadata.

## Fields

| Key | Type | Required | Effect |
| --- | --- | --- | --- |
| `schema` | string | Yes | The workflow schema this change follows |
| `created` | string, YYYY-MM-DD | No | Records the date the change was created |
| `goal` | string | No | Records what the change sets out to do |
| `affected_areas` | list of strings | No | Records the areas the change expects to touch |
| `initiative` | map: `store` and `id` | No | Records the initiative this change belongs to |
| `skip_specs` | boolean | No | Declares the change makes no spec deltas, so zero deltas validate |
| `retire_capabilities` | boolean | No | Authorizes archive to delete a capability this change empties |

### schema

The workflow schema this change follows. It is set when the change is created and wins over the project config, so a change keeps its schema even if `specagile/config.yaml` changes afterwards. Run [`specagile schemas`](../cli.md#specagile-schemas) to list the available schema names.

### initiative

The initiative this change belongs to, as a store id and an initiative id, both kebab-case:

```yaml
initiative:
  store: platform-specs
  id: unify-billing
```

Keys other than `store` and `id` are rejected. No command reads the link today.

### skip_specs

Declares the change intentionally makes no spec deltas: a pure refactor, tooling, or docs change. With it set, validation accepts zero deltas, and artifacts that would generate spec files count as complete. Setting it while spec files exist under specs/ is a validation error.

### retire_capabilities

Authorizes archive to retire a capability. When this change's REMOVED deltas take away the last requirement a capability has, archive deletes that capability's main spec instead of stopping. The flag exists because the deletion is only recoverable from git, so it stays the author's call.

### Extension keys

A top-level key that starts with a lowercase `x-` is yours, for data another tool or your team keeps beside the change, such as a tracker id or an owner:

```yaml
schema: spec-driven
x-tracker: SB-5497
x-jiraKey: ABC-1
x-owner:
  team: payments
```

- **Name**: the lowercase `x-` prefix followed by at least one character, with no whitespace anywhere. Any case or spelling works after the prefix, so `x-jiraKey` and `x-trackerID` qualify. `X-Tracker`, a bare `x-`, and `x- tracker` do not, and are reported as unknown keys.
- **Value**: any YAML value. OpenSpec does not read or validate it, and it changes no behavior.
- **Scope**: top-level only. An `x-` key inside `initiative` is still rejected, like any other key there.
- **Validation**: extension keys are never reported as unknown, so `specagile validate --strict` passes on a change that carries them.
- **Archive**: the file moves with the change unchanged, extension keys included.

## Example

A filled-in .specagile.yaml:

```yaml
schema: spec-driven
created: 2026-08-14
goal: Add magic-link login to the API
affected_areas:
  - auth
  - api
```

## Validation

The file is validated whenever a command writes or reads it. A write that fails validation throws and writes nothing. Reading an existing file fails on invalid YAML, a field that breaks its contract, or a schema name that is not available. A missing file is not an error, and the change is treated as having no metadata.

Unlike [config.yaml](config-yaml.md), bad values are never dropped with a warning. A metadata error stops the command.

- **Unknown top-level keys**: OpenSpec ignores them. `status`, `instructions`, `validate`, and `archive` report that they have no effect. JSON output carries the warning in its structured result. [Extension keys](#extension-keys) are not unknown and are never reported.
- **Strict validation**: `specagile validate --strict` treats an unknown-key warning as a failure. A change whose only extra keys are extension keys passes.
