---
name: openspec-plan
description: Plan an OpenSpec change that is already specified - create or revise its technical plan (design.md and tasks.md) from the proposal and delta specs, without editing the specification or code. Use when the user wants to turn an agreed specification into an implementation plan. Also use when the user says "openspec plan" or "opsx plan".
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Plan a change - create or revise the technical plan of a change whose specification is complete, then stop before implementation.

**Planning boundary**: This workflow writes the planning artifacts of one existing change and nothing else: the artifacts the change needs for implementation that are not part of its specification. With the default spec-driven schema that is:
- design.md (how)
- tasks.md (implementation steps)

It never creates a change, never edits the proposal or the delta specs, never edits project code, and never edits the main specs under `openspec/specs/`. The user request that selected or triggered this workflow authorizes planning only, even if it also asks to build or fix something. After the plan is written, stop. Do not start implementation in the same response; wait for a new user request.

---

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`). Once selected, treat `--store <id>` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run `openspec status --change "<name>" --json --store "<id>"`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Project check:** These steps expect a project that already uses OpenSpec. Before the first step that writes anything (`new change`, `archive`, `sync specs`, or authoring an artifact file), confirm the project has a root: run `openspec list --json` (with `--store <id>` when a store is selected, since the store is then the root) and read `root`. A root object means the project is set up. `"root": null` means it is not - there is no `openspec/` directory here, and a write such as `openspec new change` would create one as a side effect. The command also exits non-zero, which is that answer rather than a broken CLI, so read the JSON instead of retrying or working around it.

One `"root": null` is not about setup: when a `status` error message starts with `Declared in` or `Invalid store declaration in` and names this project's `openspec/config.yaml` (or `config.yml`), the project does use OpenSpec through a store it declares, which this machine cannot resolve (the store is not registered, or the `store:` line is malformed). Do not treat it as uninitialized and skip the branches below: stop before writing and show the user that error's `message` and `fix`.

Otherwise, with no root, what happens next depends on how this workflow was reached:

- **Auto-selected**: you chose this workflow yourself, without the user naming OpenSpec, naming this skill, or invoking this skill by name. Stop using OpenSpec and answer the request normally, as you would with no OpenSpec installed. Do not ask them to set anything up and do not mention OpenSpec setup.
- **Explicit OpenSpec request**: the user named OpenSpec, named this skill, or invoked this skill by name. Stop before writing and ask how to proceed: set this project up (`openspec init`), target a store they already have (`--store <id>`), or continue without OpenSpec for this request. Wait for their answer.

In both branches, never create the root as a side effect: do not run `openspec init` until the user asks for it, do not hand-create `openspec/` files, and do not let a command create it.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   This workflow plans a change that already exists. It never creates one.

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes sorted by most recently modified, and ask the user to select one

   When prompting, present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to plan.

   If the named change is not active (not listed under `changes` in `openspec list --json`), write nothing: tell the user it was not found, list the active changes, and suggest `/openspec-specify` to create and specify a new change. Do not create a change or any file.

   Always announce: "Using change: <name>" and how to override (e.g., `/openspec-plan <other>`).

2. **Get the artifact graph and split it**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `artifacts`: list of all artifacts, each with its `id`, its `status` and its `requires` edges (the artifact IDs it directly depends on)
   - `applyRequires`: array of artifact IDs needed before implementation
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

   Split the artifacts by explicit id, never by file name or pattern:
   - **Specification set**: the artifact with id `specs` plus every artifact it `requires`, walked transitively (spec-driven: `proposal`, `specs`). This workflow reads these and never edits them.
   - **Planning set**: `applyRequires` plus every artifact reachable from those by following the `requires` edges, minus the specification set (spec-driven: `design`, `tasks`). These are the only artifacts this workflow writes, whatever their names.
   - Any other artifact belongs to neither set. Leave it alone, even when it reads `ready`.

   **Schema without a specs artifact**: if no artifact has id `specs`, write nothing. Tell the user this schema does not separate the specification from the plan, and suggest `/openspec-propose`, which generates all of its artifacts in one step.

3. **Check that the specification is complete**

   `status` is file-existence only, so a `done` reading proves nothing about the files inside a glob artifact. Read the proposal from disk and check all of the following, writing nothing until every check passes:
   - Every artifact of the specification set other than `specs` reads `done` (spec-driven: `proposal`). If the proposal is missing, say the specification is missing.
   - `specs` reads `skipped` - the change declares `skip_specs: true` in `.openspec.yaml`, which counts as complete - or every capability the proposal's Capabilities section lists has its delta spec (spec-driven: `specs/<capability-path>/spec.md`). Resolve each expected path against `changeRoot`, verify it remains inside `changeRoot` after resolving symlinks, and look for it in `artifactPaths.specs.existingOutputPaths`. Name every capability that has no spec.
   - No file in `artifactPaths.specs.existingOutputPaths` belongs to a capability the proposal does not list. Name each such file as an inconsistency in the specification.

   **Compare path identity, not text.** The proposal writes capability paths with `/`, while `status --json` reports absolute paths with the platform's separator (`\` on Windows). Resolve both sides against `changeRoot` and compare the resulting paths with the platform file system's rules: on Windows, `\` and `/` are the same separator and case does not matter; on Linux, case matters; on macOS, follow the volume (case-insensitive by default). On Windows, the capability `identity/user-auth` and the file `specs\identity\user-auth\spec.md` are the same spec.

   If any check fails, stop without writing anything: name what is missing or inconsistent, and suggest `/openspec-specify <name>` to complete or fix the specification.

4. **Find the planning work**

   - **Nothing to plan**: if the planning set is empty - every artifact the schema requires for implementation is part of the specification - write nothing. Tell the user the change is already ready to implement, and hand off as in **Output**.
   - Otherwise, read the proposal and every delta spec from disk - re-read them even if you saw them earlier in the conversation. For each artifact of the planning set, check `artifactPaths.<id>.existingOutputPaths`: an artifact with files is **existing** (step 5 reviews it) and one without is **missing** (step 6 creates it).

   **If the specification has a problem**: when, at any point, you find a contradiction, a gap, or an infeasible requirement in the proposal or the delta specs, do not edit them. Tell the user what the problem is and suggest resolving it in the specification with `/openspec-specify <name>` before continuing.

5. **Revise the existing planning artifacts**

   Skip this step when no planning artifact has files yet.
   - Read each existing planning artifact from disk and check it against the current proposal and delta specs: requirements the plan does not cover, tasks for behavior the specs no longer require, decisions that contradict a requirement.
   - If every one is coherent with the specification, tell the user the plan is up to date and write nothing to it.
   - Otherwise, draft each revision in the conversation, not in files. Show what would change in each file and why. Write a revision only after the user confirms it. If the user rejects it, leave that file unchanged.
   - **Completed tasks**: a revision keeps every task already marked `[x]`, with its mark. Remove or uncheck a completed task only when the user explicitly confirms that in the revision.
   - When a substantial rewrite is needed, get that artifact's rules and template first with `openspec instructions <artifact-id> --change "<name>" --json`.

6. **Create the missing planning artifacts**

   Create these without asking for confirmation. Use a todo list to track progress, and loop through the missing artifacts of the planning set in dependency order (artifacts with no pending dependencies first):

   a. **For each missing artifact that is `ready` (dependencies satisfied)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you - do NOT include in output)
        - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `resolvedOutputPath`: Resolved path or pattern to write the artifact
        - `dependencies`: Completed artifacts to read for context (entries with `skipped: true` have no files - do not look for them)
      - Read any completed dependency files for context - always re-read them from disk, even if you saw them earlier in the conversation (the user may have edited them)
      - **Inspect the relevant project before drafting**: Read `context` and `rules` first, then inspect relevant implementation, nearby tests, configuration, and documentation outside `openspec/`. Keep inspection read-only and proportional to the change; reuse findings for later artifacts and inspect more only as needed.
        - Identify the target project from the request and project context; the planning home may be separate from the code. If the target is unclear, ask. For greenfield or non-code changes, inspect the available structure and relevant documents. If source is unavailable, state the limitation and ask when it materially affects the plan.
        - Ground the approach and tasks in what you find. Distinguish observed behavior from assumptions and proposed additions; surface conflicts with existing specs instead of silently deciding which is correct.
        - Do this discovery now, rather than leaving generic "explore the codebase" or "make a plan" tasks for implementation. Keep any necessary follow-up investigation specific to an unresolved question.
      - Choose the output path before creating anything. If `resolvedOutputPath` is a glob, follow `instruction` to choose a concrete path inside `changeRoot` that matches the glob, and verify it remains inside `changeRoot` after resolving symlinks, both in its parent directories and in the file itself if it already exists; if it does not, stop and tell the user. Otherwise the output path is `resolvedOutputPath`
      - If the `instruction` field delegates creation to a specific skill or command, invoke it only if it can write the artifact to that output path; otherwise stop and tell the user. Then verify the artifact file exists at that output path
      - Otherwise create the artifact file using `template` as the structure and write it to that output path
      - Apply `context` and `rules` as constraints - but do NOT copy them into the file
      - Show brief progress: "Created <artifact-id>"

   b. **Continue until every artifact in the planning set exists**
      - After creating each artifact, re-run `openspec status --change "<name>" --json` - creating one can unblock others
      - Skip one only when its own `instruction` says it is conditional: run `openspec instructions <artifact-id> --change "<name>" --json` and skip only if its `instruction` field marks it optional (e.g. "create only if..."). Spec-driven's `design.md` qualifies. Tell the user why you skipped it, and do not reconsider it
      - Dependencies are enablers, not gates: if a planning artifact is still `blocked` only because you skipped a conditional dependency, write it anyway
      - Never create an artifact outside the planning set
      - Stop when every artifact in the planning set is `done` or was deliberately skipped

7. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After planning, summarize:
- Change name and location (`changeRoot`)
- Planning artifacts created, revised, or skipped (and why), and any revision the user rejected
- What's ready: "The change is ready to implement."
- Prompt: "When you are ready, use `/openspec-apply-change` to start implementing it."

Then stop.

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type - it is the authoritative guidance, even for familiar artifact names
- If the `instruction` field directs you to use a specific skill or command to create the artifact, invoke it instead of writing the artifact directly - but only once you have chosen and checked the output path, and only if it can write there
- Use `template` as the structure for your output file - fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- The request that invoked this workflow authorizes planning only. Any implementation or apply instruction in that request does not carry forward. Do NOT implement the change, start the apply workflow, or edit project code. After presenting the plan, stop and wait for a new user request
- Never create a change, and never edit the proposal, the delta specs, or the main specs under `openspec/specs/` - report problems in them instead
- Plan only a change whose specification is complete: check each listed capability against the files on disk, comparing path identity rather than text
- Write only artifacts of the planning set, found through `applyRequires`, the `requires` edges, and the explicit `specs` id - never by file name
- Create missing planning artifacts without asking; confirm every revision of an existing one before writing it, and leave the file unchanged if the user rejects it
- Keep completed tasks and their marks unless the user explicitly confirms removing or unchecking them
- Always re-read artifacts from disk before planning from them or revising them (files may have changed since you last saw them)
- Verify each artifact file exists after writing before proceeding to the next
