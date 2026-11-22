---
name: sa-tasks
description: Write the tasks of an OpenSpec change that is already specified - create or revise its implementation checklist (tasks.md) from the proposal, delta specs and design, without editing them or code. Use when the user wants to break an agreed specification and design into implementation tasks. Also use when the user says "specagile tasks" or "opsx tasks".
allowed-tools: Bash(specagile:*)
license: MIT
compatibility: Requires specagile CLI.
metadata:
  author: openspec
  version: "1.0"
---

Write the tasks of a change - create or revise the implementation checklist of a change whose specification is complete, then stop before implementation.

**Tasks boundary**: This workflow writes the tasks artifact of one existing change and nothing else: the artifact the schema identifies with the id `tasks`. With the default spec-driven schema that is:
- tasks.md (implementation steps)

It never creates a change, never edits the proposal, the delta specs, or the design (design.md), never edits project code, and never edits the main specs under `specs/`. The user request that selected or triggered this workflow authorizes writing the tasks only, even if it also asks to build or fix something. After the tasks are written, stop. Do not start implementation in the same response; wait for a new user request.

---

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `specagile store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`). Once selected, treat `--store <id>` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run `specagile status --change "<name>" --json --store "<id>"`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `specagile/` root.

**Project check:** These steps expect a project that already uses OpenSpec. Before the first step that writes anything (`new change`, `archive`, `sync specs`, or authoring an artifact file), confirm the project has a root: run `specagile list --json` (with `--store <id>` when a store is selected, since the store is then the root) and read `root`. A root object means the project is set up. `"root": null` means it is not - there is no `specagile/` directory here, and a write such as `specagile new change` would create one as a side effect. The command also exits non-zero, which is that answer rather than a broken CLI, so read the JSON instead of retrying or working around it.

One `"root": null` is not about setup: when a `status` error message starts with `Declared in` or `Invalid store declaration in` and names this project's `specagile/config.yaml` (or `config.yml`), the project does use OpenSpec through a store it declares, which this machine cannot resolve (the store is not registered, or the `store:` line is malformed). Do not treat it as uninitialized and skip the branches below: stop before writing and show the user that error's `message` and `fix`.

Otherwise, with no root, what happens next depends on how this workflow was reached:

- **Auto-selected**: you chose this workflow yourself, without the user naming OpenSpec, naming this skill, or invoking this skill by name. Stop using OpenSpec and answer the request normally, as you would with no OpenSpec installed. Do not ask them to set anything up and do not mention OpenSpec setup.
- **Explicit OpenSpec request**: the user named OpenSpec, named this skill, or invoked this skill by name. Stop before writing and ask how to proceed: set this project up (`specagile init`), target a store they already have (`--store <id>`), or continue without OpenSpec for this request. Wait for their answer.

In both branches, never create the root as a side effect: do not run `specagile init` until the user asks for it, do not hand-create `specagile/`, `specs/` or `changes/` files, and do not let a command create it.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   This workflow writes the tasks of a change that already exists. It never creates one.

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `specagile list --json` to get available changes sorted by most recently modified, and ask the user to select one

   When prompting, present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to break into tasks.

   If the named change is not active (not listed under `changes` in `specagile list --json`), write nothing: tell the user it was not found, list the active changes, and suggest specifying a new change first: with `sa-specify` if that skill is installed, or otherwise by creating it with `specagile new change "<name>"` and writing its specification before planning it. Do not create a change or any file.

   Always announce: "Using change: <name>" and how to override (e.g., `sa-tasks <other>`).

2. **Get the artifact graph and split it**
   ```bash
   specagile status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `artifacts`: list of all artifacts, each with its `id`, its `status` and its `requires` edges (the artifact IDs it directly depends on)
   - `applyRequires`: array of artifact IDs needed before implementation
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

   Split the artifacts by explicit id, never by file name or pattern:
   - **Specification set**: the artifact with id `specs` plus every artifact it `requires`, walked transitively (spec-driven: `proposal`, `specs`). This workflow reads these and never edits them.
   - **Planning set**: `applyRequires` plus every artifact reachable from those by following the `requires` edges, minus the specification set (spec-driven: `design`, `tasks`).
   - **Tasks set**: the artifact with id `tasks` (spec-driven: `tasks`). This is the only artifact this workflow writes, whatever its file name.
   - **Design set**: the planning set minus the tasks set (spec-driven: `design`). This workflow reads these and never edits them.
   - Any other artifact belongs to none of these sets. Leave it alone, even when it reads `ready`.

   **Schema without a specs or tasks artifact**: if no artifact has id `specs`, or no artifact has id `tasks`, write nothing. Tell the user this schema does not separate the tasks stage, and suggest generating all of its artifacts in one step with `sa-propose` if that skill is installed, or otherwise one at a time with `specagile instructions <artifact-id> --change "<name>"`.

3. **Check that the specification is complete**

   `status` is file-existence only, so a `done` reading proves nothing about the files inside a glob artifact. Read the proposal from disk and check all of the following, writing nothing until every check passes:
   - Every artifact of the specification set other than `specs` reads `done` (spec-driven: `proposal`). If the proposal is missing, say the specification is missing.
   - `specs` reads `skipped` - the change declares `skip_specs: true` in `.specagile.yaml`, which counts as complete - or every capability the proposal's Capabilities section lists has its delta spec (spec-driven: `specs/<capability-path>/spec.md`). Resolve each expected path against `changeRoot`, verify it remains inside `changeRoot` after resolving symlinks, and look for it in `artifactPaths.specs.existingOutputPaths`. Name every capability that has no spec.
   - No file in `artifactPaths.specs.existingOutputPaths` belongs to a capability the proposal does not list. Name each such file as an inconsistency in the specification.

   **Compare path identity, not text.** The proposal writes capability paths with `/`, while `status --json` reports absolute paths with the platform's separator (`\` on Windows). Resolve both sides against `changeRoot` and compare the resulting paths with the platform file system's rules: on Windows, `\` and `/` are the same separator and case does not matter; on Linux, case matters; on macOS, follow the volume (case-insensitive by default). On Windows, the capability `identity/user-auth` and the file `specs\identity\user-auth\spec.md` are the same spec.

   If any check fails, stop without writing anything: name what is missing or inconsistent, and explain that the specification stage must be finished first: a proposal, one delta spec for each capability it lists, and none for capabilities it does not list. Suggest `sa-specify <name>` to complete or fix it if that skill is installed.

4. **Check the design**

   For each artifact of the design set, check `artifactPaths.<id>.existingOutputPaths`:
   - **Written**: it has files. Read them from disk - re-read them even if you saw them earlier in the conversation.
   - **Missing**: it has no files. Run `specagile instructions <artifact-id> --change "<name>" --json` and read its `instruction` field.
     - **Conditional**: if the `instruction` marks the artifact optional (e.g. "create only if..."), the change may go without it - spec-driven's `design.md` qualifies. Continue, and tell the user the change has no technical design; if it needs one, suggest writing it first with `sa-plan <name>` if that skill is installed.
     - **Required**: otherwise, stop without writing anything: name the missing artifact and suggest writing it with `sa-plan <name>` if that skill is installed, or otherwise from its rules and template with `specagile instructions <artifact-id> --change "<name>" --json`.

   Then read the proposal and every delta spec from disk - re-read them even if you saw them earlier in the conversation.

   **Open questions in the design**: if the design lists open questions that would change what gets built, ask the user about each one before writing any task, and write the tasks from the answers. Do not record the answers in the design; if an answer changes the design, say so and suggest revising it with `sa-plan <name>` if that skill is installed.

   **If the specification or the design has a problem**: when, at any point, you find a contradiction, a gap, or an infeasible requirement in the proposal, the delta specs, or the design, do not edit them. Tell the user what the problem is and suggest resolving it in the stage it belongs to before continuing: the specification with `sa-specify <name>` if that skill is installed, the design with `sa-plan <name>` if that skill is installed.

5. **Revise the existing tasks**

   Skip this step when the tasks artifact has no files yet (`artifactPaths.tasks.existingOutputPaths` is empty).
   - Read the tasks from disk and check them against the current proposal, delta specs and design: requirements no task covers, tasks for behavior the specs no longer require, tasks that contradict a design decision.
   - If they are coherent with the specification and the design, tell the user the tasks are up to date and write nothing.
   - Otherwise, draft the revision in the conversation, not in files. Show what would change in the tasks and why. Write the revision only after the user confirms it. If the user rejects it, leave the file unchanged.
   - **Completed tasks**: a revision keeps every task already marked `[x]`, with its mark. Remove or uncheck a completed task only when the user explicitly confirms that in the revision.
   - When a substantial rewrite is needed, get the artifact's rules and template first with `specagile instructions tasks --change "<name>" --json`.

6. **Create the missing tasks**

   Skip this step when the tasks artifact already has files (step 5 reviewed them). Otherwise create it without asking for confirmation:
   - Get instructions:
     ```bash
     specagile instructions tasks --change "<name>" --json
     ```
   - The instructions JSON includes:
     - `context`: Project background (constraints for you - do NOT include in output)
     - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
     - `template`: The structure to use for your output file
     - `instruction`: Schema-specific guidance for this artifact type
     - `resolvedOutputPath`: Resolved path or pattern to write the artifact
     - `dependencies`: Completed artifacts to read for context (entries with `skipped: true` have no files - do not look for them)
   - Read every completed dependency file for context - always re-read them from disk, even if you saw them earlier in the conversation (the user may have edited them)
   - **Inspect the relevant project before drafting**: Read `context` and `rules` first, then inspect relevant implementation, nearby tests, configuration, and documentation outside `specs/`, `changes/` and `specagile/`. Keep inspection read-only and proportional to the change.
     - Identify the target project from the request and project context; the planning home may be separate from the code. If the target is unclear, ask. For greenfield or non-code changes, inspect the available structure and relevant documents. If source is unavailable, state the limitation and ask when it materially affects the tasks.
     - Ground the tasks in what you find and in the design's decisions. Distinguish observed behavior from assumptions and proposed additions; surface conflicts with existing specs instead of silently deciding which is correct.
     - Do this discovery now, rather than leaving generic "explore the codebase" or "make a plan" tasks for implementation. Keep any necessary follow-up investigation specific to an unresolved question.
   - Choose the output path before creating anything. If `resolvedOutputPath` is a glob, follow `instruction` to choose a concrete path inside `changeRoot` that matches the glob, and verify it remains inside `changeRoot` after resolving symlinks, both in its parent directories and in the file itself if it already exists; if it does not, stop and tell the user. Otherwise the output path is `resolvedOutputPath`, with the platform's separator as the CLI reports it
   - If the `instruction` field delegates creation to a specific skill or command, invoke it only if it can write the artifact to that output path; otherwise stop and tell the user. Then verify the artifact file exists at that output path
   - Otherwise create the artifact file using `template` as the structure and write it to that output path
   - Apply `context` and `rules` as constraints - but do NOT copy them into the file
   - Dependencies are enablers, not gates: if the tasks artifact reads `blocked` only because a conditional design artifact was left out (step 4), write it anyway
   - Never create an artifact outside the tasks set
   - Show brief progress: "Created tasks", then re-run `specagile status --change "<name>" --json` and check that the tasks artifact reads `done`

7. **Show final status**
   ```bash
   specagile status --change "<name>"
   ```

**Output**

After writing the tasks, summarize:
- Change name and location (`changeRoot`)
- Whether the tasks were created, revised, or left unchanged, and any revision the user rejected
- Whether the change has no technical design (step 4)
- What's ready: "The change is ready to implement."
- Prompt: "The tasks are ready for review. When you’re ready, ask me to implement them." Mention `sa-implement <name>` as the way to start it if that skill is installed.

Then stop.

**Artifact Creation Guidelines**

- Follow the `instruction` field from `specagile instructions` for each artifact type - it is the authoritative guidance, even for familiar artifact names
- If the `instruction` field directs you to use a specific skill or command to create the artifact, invoke it instead of writing the artifact directly - but only once you have chosen and checked the output path, and only if it can write there
- Use `template` as the structure for your output file - fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- The request that invoked this workflow authorizes writing the tasks only. Any implementation or apply instruction in that request does not carry forward. Do NOT implement the change, start the apply workflow, or edit project code. After presenting the tasks, stop and wait for a new user request
- Never create a change, and never edit the proposal, the delta specs, the design, or the main specs under `specs/` - report problems in them instead
- Write tasks only for a change whose specification is complete: check each listed capability against the files on disk, comparing path identity rather than text
- Write only the artifact with the explicit `tasks` id, found through the artifact graph - never by file name
- A missing design artifact stops this workflow unless its own `instruction` marks it conditional
- Resolve the design's open questions with the user before writing the tasks
- Create the missing tasks without asking; confirm every revision of existing tasks before writing it, and leave the file unchanged if the user rejects it
- Keep completed tasks and their marks unless the user explicitly confirms removing or unchecking them
- Always re-read artifacts from disk before writing tasks from them or revising them (files may have changed since you last saw them)
- Verify the tasks file exists after writing it
