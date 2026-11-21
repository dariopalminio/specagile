# Move to the SpecAgile layout

> SpecAgile keeps your specs and changes at the root of the project, not inside `openspec/`. What moves, and how to move a project over.

**In short:** after updating SpecAgile, run `specagile update` once in each project and each store, then commit the move. Until you do, the other commands stop and ask you to.

## What's changing

Earlier versions of SpecAgile, like OpenSpec, kept everything in one folder named after the tool. Your living specs, the source of truth of your system, sat under `openspec/specs/`. Now the planning lives at the root, under names that don't depend on the tool that writes it:

```text
specs/                    living specs, the source of truth
└── <capability-path>/spec.md
changes/                  work in progress
├── <change>/             proposal.md, design.md, tasks.md, .specagile.yaml
│   └── specs/<capability-path>/spec.md   the delta
└── archive/              archived changes
specagile/                SpecAgile's own files: config.yaml, schemas/, ...
```

Inside a change, its delta specs are still in `specs/<capability-path>/spec.md`. Its metadata file is now `.specagile.yaml`: see [Change metadata](#change-metadata) below.

A folder is a SpecAgile project when it has `specagile/` with a config file, or `specagile/` next to `specs/` or `changes/`. A `specs/` folder alone doesn't count, so a repo that keeps its tests in `specs/` is not taken for a project.

## What moves

`specagile update` moves each entry of `openspec/` once, without changing any file:

| Before | After |
|---|---|
| `openspec/specs/` | `specs/` |
| `openspec/changes/`, with `archive/` | `changes/` |
| `openspec/config.yaml` | `specagile/config.yaml` |
| everything else in `openspec/` (`schemas/`, `explorations/`, …) | `specagile/<the same name>` |

Then it removes the empty `openspec/` and prints each move:

```text
Moved openspec/specs/ → specs/
Moved openspec/changes/ → changes/
Moved openspec/config.yaml → specagile/config.yaml
Commit the move: SpecAgile now keeps specs/, changes/ and specagile/ at the project root.
```

`specagile init` on a project that is already set up moves it the same way before it does anything else.

## Change metadata

Each change keeps its metadata (`schema`, `created`, `skip_specs`, …) in `.specagile.yaml`. OpenSpec and SpecAgile 4.0.0 and earlier named that file `.openspec.yaml`. Right after moving the layout, in the same run, `specagile update` (and `specagile init`) renames it in each active change, without changing its content:

```text
Renamed changes/add-login/.openspec.yaml → changes/add-login/.specagile.yaml
Commit the renames: SpecAgile now keeps each change's metadata in .specagile.yaml.
```

A project already on the new layout gets only the renames.

- **Archived changes** keep `.openspec.yaml`: they are history, and SpecAgile still reads them.
- **A change that has both files** keeps both. `specagile update` warns that it uses `.specagile.yaml`; move what you still need from `.openspec.yaml` into it and delete `.openspec.yaml`.
- **Until a change is renamed**, it keeps working: SpecAgile reads `.openspec.yaml` when there is no `.specagile.yaml`. Messages already name `.specagile.yaml`.

Unlike the move of the layout, the renames are not all or nothing. If a file can't be renamed, for example because another program has it open on Windows, it stays as it is and keeps working, the output names it, and the rest of the update goes on. Close the program and run `specagile update` again.

## See it first

```bash
specagile update --dry-run
```

The plan lists each file that would move or be renamed, and changes nothing. If something stops the move, the plan says what.

## What stops the move

The move is all or nothing. If `specs/`, `changes/` or `specagile/` already exists at the root with something in it, even a `.gitkeep`, nothing moves. The message names the folder:

```text
Cannot move openspec/ to the SpecAgile layout: specs/ already exists with content. Nothing was moved.
Move or rename it, then run specagile update again.
```

A common case is a repo that keeps its tests in `specs/`. Rename that folder (for example to `test/`), then run `specagile update` again. SpecAgile never mixes your files with the living specs. An empty folder doesn't stop the move.

## On Windows

Moving a folder fails while another program has a file in it open: an editor, a terminal sitting in that folder, a sync client, sometimes the antivirus. SpecAgile waits a moment and retries. If the file stays open, it puts back whatever it had already moved, so `openspec\` is as it was, and names the file:

```text
Could not move openspec/changes/ to changes/ (EBUSY). openspec/changes/add-login/tasks.md is open in another program.
Nothing was moved: openspec/ is as it was. Close any program that has a file there open, then run specagile update again.
```

Close it and run `specagile update` again.

## Commit the move

Commit the moved folders together. Git records them as renames, so the history of each spec follows it.

```bash
git add -A specs changes specagile openspec
git commit -m "Move planning to the SpecAgile layout"
```

## Teams

- **Update SpecAgile on every machine first.** An earlier SpecAgile doesn't find the moved project, and SpecAgile 4.0.0 or earlier doesn't read `.specagile.yaml`: for it, renamed changes have no metadata. Until everyone is on the new version, nobody should commit the move or the renames.
- **OpenSpec in the same repo.** If part of the team uses OpenSpec upstream (`openspec`), it stops finding the planning once the repo is moved. The two can no longer share it.
- **Stores.** Run `specagile update` in the folder of each store too. Until then, `--store <id>` and `specagile store doctor` say the store needs it. `.openspec-store/` stays where it is.

## A folder `openspec/` that stays

If the project already has the new layout and still has an `openspec/` folder, SpecAgile leaves that folder alone: it doesn't read it, move it or delete it. `specagile update` says it isn't used. Move what you still need out of it and delete it.

## Go back

- **Before you commit:** put the tree back with git, for example `git stash --include-untracked`, and install the earlier version of SpecAgile.
- **After you commit:** move `specs/`, `changes/` and the contents of `specagile/` back into `openspec/`, and install the earlier version of SpecAgile.
- **Change metadata:** SpecAgile 4.0.0 and earlier ignore `.specagile.yaml`. Rename it back to `.openspec.yaml` in each active change, including the ones created after updating.

Coming from an older version? [Upgrade to 2.1](upgrade-to-2-1.md) and [Upgrade to 2.0](upgrade-to-2.md) cover what changed before.
