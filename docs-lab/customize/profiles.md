# Profiles

> Choose which workflows are installed.

A profile is your preference for which OpenSpec workflows (the [skills](../start/setup.md#the-workflow-files-skills) in your AI tool) are installed across your machine. The default profile is `core`. Include or exclude workflows and your selection is saved as the `custom` profile.

## The core set

The `core` profile installs nine workflows, covering the whole loop from idea to archive:

| Workflow | What it's for |
|---|---|
| [`explore`](../reference/skills.md#sa-explore) | Think through an idea before it becomes a change proposal |
| [`propose`](../reference/skills.md#sa-propose) | Create a change proposal and generate all its planning artifacts in one step |
| [`specify`](../reference/skills.md#sa-specify) | Write a change proposal's specification (proposal and spec deltas), stopping before the technical plan |
| [`plan`](../reference/skills.md#sa-plan) | Create or revise the technical design of a change proposal whose specification is complete |
| [`tasks`](../reference/skills.md#sa-tasks) | Create or revise the tasks of a specified change proposal, leaving it ready to implement |
| [`apply`](../reference/skills.md#sa-implement) | Implement a change proposal's tasks |
| [`update`](../reference/skills.md#sa-update-change) | Revise a change proposal's existing planning artifacts |
| [`sync`](../reference/skills.md#sa-sync-specs) | Merge a change proposal's spec updates into `specs/` without archiving it |
| [`archive`](../reference/skills.md#sa-archive) | Move a finished change proposal to the archive |

Each links to its full contract: arguments, what it creates, and what it responds with.

`specify`, `plan` and `tasks` split what `propose` does in one step into three stages: agree on *what* the change does, then design *how* to build it, then break it into tasks, then `apply`. Use `propose` when you don't need the pauses in between.

## Expanding the set: optional workflows

Six more workflows are available beyond the core set. Three of them (`new`, `continue`, `ff`) create a change proposal artifact by artifact, instead of all at once like `propose`.

| Workflow | What it's for |
|---|---|
| [`new`](../reference/skills.md#sa-new-change) | Start a change proposal as an empty scaffold |
| [`continue`](../reference/skills.md#sa-continue-change) | Create the next planning artifact in a change proposal, one at a time |
| [`ff`](../reference/skills.md#sa-ff-change) | Create a change proposal and every planning artifact implementation needs, in one pass |
| [`verify`](../reference/skills.md#sa-verify) | Check that the implementation matches the change proposal's artifacts |
| [`bulk-archive`](../reference/skills.md#sa-bulk-archive-change) | Archive several change proposals at once |
| [`onboard`](../reference/skills.md#sa-onboard) | Learn the workflow by doing one real change proposal end to end |

To change the set, run the interactive picker:

```bash
specagile config profile
```

The picker lists all fifteen workflows as checkboxes, with the installed ones checked. Any selection that isn't exactly the core nine is saved as the `custom` profile, so you can also uncheck core workflows you don't use. A `custom` profile saved before `tasks` joined the core set does not get it: check `tasks` in the picker, or reset with `specagile config profile core`.

## Delivery (retired in 2.0)

OpenSpec 2.0 installs skills only, so the `delivery` setting no longer changes anything. An existing value is kept. `specagile config set delivery <value>` still saves the value, and prints a note that it has no effect.

In 1.x, delivery chose between skills, commands, or both. [Upgrade to 2.0](../help/upgrade-to-2.md) covers what happens to command files.

## Switching profiles

Switching is two steps: change the profile on your machine, then update each project to apply it.

1. Change the profile:

   ```bash
   specagile config profile        # interactive
   specagile config profile core   # reset to the core nine
   ```

2. Run the update in each project you work in:

   ```bash
   specagile update
   ```

When your current directory is an existing OpenSpec project, the interactive flow offers to run step 2 there for you.
