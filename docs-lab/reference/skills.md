# Skills

> Every OpenSpec skill: arguments, what it creates, and what it responds with.

<!-- Drafted 2026-08-11 via one subagent per entry, each verifying every claim against
its workflow template in src/core/templates/workflows/; assembled and uniformity-passed
by the main session. Terminology: "change proposal", never bare "change" (user call,
2026-08-11). Shape (user-reviewed): intro bullets define Core/Optional, then ONE index
table (Skill / Job / Type) and a flat run of H2 entries matching
cli.md's shape - no group sections. Recipe per entry: one-line job sentence, then a
two-column key-value table (header row "Contract | Description", uniform across
entries) holding the pure input/output contract,
one row per fact: Arguments (what you pass; each cell self-contains its
optional/ambiguous behavior) / Creates (exact paths written; always states the code
boundary) / Response (what the agent reports back and where it stops). No judgment
rows: no when-to-use beyond the job sentence, no Not-for routing, no guide links
(guides link here, not the reverse). The ff job says "create a change proposal"
because its template unconditionally scaffolds a new one (redirects if the name
exists), contradicting the old "remaining artifacts" framing. Paths shown are the
default single-repo layout, stated without a caveat: reference pages state defaults,
and the store-moves-the-planning-home fact is multi-repo/stores.md's to teach (the
per-tool command spelling story likewise stays with setup.md and supported-tools.md;
user cut the NOTE carrying both, 2026-08-11). H2 entries double as the site's
right-rail TOC and the anchors guides deep-link. No frontmatter in source: sync-docs.mjs lifts H1 to title and the > line to
description (README pins the > line verbatim in its page index). Deliberately
excluded, each with an owner elsewhere: per-tool command spellings and syntax
(reference/supported-tools.md), example transcripts (quickstart and guides), tips and
when-to-use judgment (guides own it), troubleshooting (help/troubleshooting.md),
legacy /openspec:* commands (help/legacy/migration.md). Source: old docs/commands.md
maps here per sources.md; its unsupported claims (apply "runs tests", bulk-archive
name arguments, fixed tasks.md filename) were checked against templates and dropped.
Skill names from WORKFLOW_TO_SKILL_DIR (src/core/profile-sync-drift.ts) and the
templates in src/core/templates/workflows/; core set src/core/profiles.ts:14. "Optional"
is the docs' set label (was "Expanded"; renamed 2026-08-12: the product's only stored
profile values are core and custom, so "expanded" reads as a third profile). -->

The skills come in two sets:

- **Core**: installed by default, the main planning loop.
- **Optional**: installed only when you add them, via [Profiles](../customize/profiles.md).

Every skill expects a project that already uses OpenSpec. Before its first step that writes anything, a skill checks for a resolved root. What happens when there is none depends on how the skill was reached:

- **Auto-selected**: your agent picked the skill on its own, without you naming OpenSpec. It drops OpenSpec and answers your request normally, the way it would with OpenSpec not installed.
- **Explicit OpenSpec request**: you named OpenSpec or invoked the skill by name. It stops before writing and asks how to proceed: run `specagile init` here, target a store with `--store <id>`, or continue without OpenSpec. It waits for your answer.

Invoking a skill by name is always the second case. A project whose `specagile/config.yaml` names a store this machine cannot resolve (not registered, or a malformed `store:` line) is not treated as uninitialized: the skill stops and shows the store error with its fix. No skill creates `specagile/`, `specs/` or `changes/` on its own in either case. The entries below describe what each skill does once a root is in place.

| Skill | Job | Type |
|---|---|---|
| [sa-explore](#sa-explore) | Think through an idea before it becomes a change proposal | Core |
| [sa-propose](#sa-propose) | Create a change proposal with all its planning artifacts in one step | Core |
| [sa-specify](#sa-specify) | Write a change proposal's specification, stopping before the technical plan | Core |
| [sa-plan](#sa-plan) | Create or revise the technical design of a specified change proposal | Core |
| [sa-tasks](#sa-tasks) | Create or revise the tasks of a specified change proposal | Core |
| [sa-implement](#sa-implement) | Implement a change proposal's tasks | Core |
| [sa-update-change](#sa-update-change) | Revise a change proposal's plan | Core |
| [sa-sync-specs](#sa-sync-specs) | Merge a change proposal's spec updates into `specs/` | Core |
| [sa-archive](#sa-archive) | Move a finished change proposal to the archive | Core |
| [sa-new-change](#sa-new-change) | Start a change proposal as an empty scaffold | Optional |
| [sa-continue-change](#sa-continue-change) | Create the next planning artifact, one at a time | Optional |
| [sa-ff-change](#sa-ff-change) | Create a change proposal with every artifact implementation needs, in one pass | Optional |
| [sa-audit](#sa-audit) | Audit a change proposal against its artifacts before the pull request | Optional |
| [sa-bulk-archive-change](#sa-bulk-archive-change) | Archive several change proposals at once | Optional |
| [sa-onboard](#sa-onboard) | Learn the workflow by doing one real change proposal end to end | Optional |

Each entry below names the skill that owns the next step. A skill reads the same whatever your profile, so it can't assume the next skill is there. Where a step belongs to another skill, it either checks when it runs ("if that skill is installed, otherwise…") or follows the recovery step the CLI prints. Which set you get is [Profiles](../customize/profiles.md).

## sa-explore

Think through an idea before it becomes a change proposal.

| Contract | Description |
|---|---|
| **Arguments** | A topic: an idea, a problem, a comparison, or the name of an existing change proposal to explore in context. With nothing given it enters explore mode. |
| **Creates** | Nothing by default. It reads and investigates only. On request it captures insights: a new change proposal under `changes/<name>/`, or updates to an existing one's proposal, design, specs, or tasks. Never code. |
| **Response** | An open conversation with no required output. When thinking crystallizes it summarizes the problem, approach, open questions, and next steps, and offers to capture them. You decide. Implementation never starts here. |

## sa-propose

Create a change proposal and generate all its planning artifacts in one step.

| Contract | Description |
|---|---|
| **Arguments** | A kebab-case name (`add-dark-mode`) or a plain description. Asks if you give neither. |
| **Creates** | `changes/<name>/` with every artifact the schema defines, in dependency order (spec-driven: proposal, spec deltas, design, tasks). Never code. |
| **Response** | The created artifacts, ready for review, and the next step. Stops there; implementation waits for `sa-implement`. |

## sa-specify

Write a change proposal's specification, the proposal and its spec deltas, and stop before the technical plan.

| Contract | Description |
|---|---|
| **Arguments** | A plain description to start a new change proposal, or the name of an active one to continue or revise. Asks if you give neither. If the name derived from a description is already taken, it asks whether to continue that change proposal or start one under another name before writing anything. |
| **Creates** | Only the specification artifacts (spec-driven: `proposal.md` and one `specs/<capability-path>/spec.md` per capability the proposal lists; the proposal alone when the change proposal declares `skip_specs`). A new change proposal goes in `changes/<name>/`. In an existing one it writes the missing artifacts and revises existing ones only after you confirm each, including deleting or moving the spec delta of a capability you removed or renamed. A schema with no `specs` artifact gets nothing; it points to `sa-propose` instead. Never design, tasks, main specs, or code. |
| **Response** | The artifacts created or revised, and a warning when an existing plan may now be out of date, pointing to `sa-plan` for the design and `sa-tasks` for the tasks, the design first. A complete specification with nothing to change is summarized instead, and it asks what to revise. Stops there; planning waits for `sa-plan`. |

## sa-plan

Create or revise the technical design of a change proposal whose specification is complete.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. If the target is ambiguous it lists the active change proposals and asks you to pick. It never creates one: a name that matches none lists the active change proposals and points to `sa-specify`. |
| **Creates** | The artifacts the schema requires for implementation beyond the specification and the tasks, in dependency order (spec-driven: `design.md`, unless its conditions do not apply). Existing ones are revised against the current proposal and spec deltas only after you confirm each. Never `tasks.md`: when the change proposal already has tasks, it leaves them as they are and warns they may be out of date. A schema with no `tasks` artifact gets its whole plan here. Writes nothing while the specification is incomplete or inconsistent: a missing proposal, a capability without its spec delta, or a spec delta for a capability the proposal does not list. It points to `sa-specify` instead. Never the proposal, spec deltas, main specs, or code. |
| **Response** | The design artifacts created, revised, or skipped and why, and that the change proposal is ready for its tasks. Problems it finds in the specification are reported, not fixed. Stops there; the tasks wait for `sa-tasks` (or `specagile instructions tasks` when that skill is not installed). With a schema that has no `tasks` artifact, implementation waits for `sa-implement`. |

## sa-tasks

Create or revise the tasks of a change proposal whose specification is complete, and leave it ready to implement.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. If the target is ambiguous it lists the active change proposals and asks you to pick. It never creates one: a name that matches none lists the active change proposals and points to `sa-specify`. |
| **Creates** | Only the artifact the schema identifies with the id `tasks` (spec-driven: `tasks.md`), from the proposal, the spec deltas and the design. Without `design.md` it still writes the tasks, since spec-driven marks the design conditional, and says the change proposal has no technical design; a missing design artifact the schema requires stops it and points to `sa-plan`. Open questions in the design are settled with you first. Existing tasks are revised only after you confirm, and completed tasks keep their marks. Writes nothing while the specification is incomplete or inconsistent (it points to `sa-specify`), or when the schema has no `specs` or `tasks` artifact (it points to `sa-propose`). Never the proposal, spec deltas, design, main specs, or code. |
| **Response** | Whether the tasks were created, revised, or left unchanged, whether the change proposal has no technical design, and that it is ready to implement. Problems it finds in the specification or the design are reported, not fixed. Stops there; implementation waits for `sa-implement`. |

## sa-implement

Implement a change proposal's tasks, working through the list until done or blocked.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name (`add-auth`), optional. If the target is ambiguous it lists the active change proposals and asks you to pick. |
| **Creates** | Code: the minimal changes each task calls for, in your project files. In the change proposal it checks off each finished task (`- [ ]` to `- [x]`) in the tracked file identified by `sourcePath` and one-based `line`. A schema may track tasks across multiple files. |
| **Response** | Progress per task, then an overall count (N/M tasks complete). All done: suggests `sa-archive`. Blocked by missing artifacts: shows them and the recovery step from the CLI's `instruction` field. Unclear tasks or errors: pauses and asks. |

## sa-update-change

Revise a change proposal's existing planning artifacts and keep them coherent with each
other.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional, plus the revision you want. With no revision stated it runs a coherence review: artifacts checked against each other for contradictions, gaps, and duplication. |
| **Creates** | Edits artifact files that already exist. One exception: for an artifact written as a glob, such as `specs/**/*.md`, that already has at least one file, it can add a missing companion file once you confirm the path. For an artifact with no files yet, it shows how to create the next ready one with `specagile instructions`. Never code. |
| **Response** | Shows each proposed revision and writes it only after you confirm, one artifact at a time. Ends with what was revised and the next step; implementation waits for `sa-implement`. |

## sa-sync-specs

Merge a change proposal's spec updates into `specs/` without archiving it.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. You can also name a subset of its delta specs, and only those sync. |
| **Creates** | Edits or creates `specs/<capability-path>/spec.md` for each delta spec, merging added, modified, removed, and renamed requirements into the main spec. Never code. |
| **Response** | A per-capability summary of requirements added, modified, removed, or renamed, after the updated specs validate. The change proposal stays active; archiving waits for `sa-archive`. |

## sa-archive

Move a finished change proposal to the archive.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. |
| **Creates** | Moves the change proposal folder to `changes/archive/YYYY-MM-DD-<name>/` (no date added if the name already starts with one). With your approval it first syncs outstanding delta specs. When `sa-sync-specs` is installed, it runs that workflow. Otherwise, it merges the delta specs into the main specs itself. Never code. |
| **Response** | Warns and asks before archiving with incomplete artifacts or tasks, and asks whether to sync when delta specs exist. Ends with a summary: name, schema, archive location, spec sync status, and any warnings. |

## sa-new-change

Start a change proposal as an empty scaffold.

| Contract | Description |
|---|---|
| **Arguments** | A kebab-case name (`add-user-auth`) or a plain description, plus a schema name only for a non-default workflow. Asks what you want to build if you give neither. |
| **Creates** | `changes/<name>/` as an empty scaffold: no artifacts yet, never code. |
| **Response** | The scaffold's name and location, the workflow's artifact sequence, status (0/N complete), and the first artifact's template. Drafting artifacts waits for `sa-continue-change`. |

## sa-continue-change

Create the next planning artifact in a change proposal, one at a time.

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. If still ambiguous it asks you to pick from the most recently modified. |
| **Creates** | The single next ready artifact in the schema's sequence, written into the change proposal folder. One artifact per run, never code. |
| **Response** | The created artifact, progress (N of M complete), and which artifacts that unlocked. When planning is complete it says so; implementation moves to `sa-implement`. |

## sa-ff-change

Create a change proposal and every planning artifact implementation needs, in one pass.

| Contract | Description |
|---|---|
| **Arguments** | A kebab-case name or a plain description. Asks if you give neither. If the named change proposal already exists it suggests continuing it instead. |
| **Creates** | `changes/<name>/` and every planning artifact implementation requires, in dependency order (spec-driven: proposal, specs, design, tasks), leaving out only artifacts marked skipped or conditional. Never code. |
| **Response** | The change proposal's name and location, each artifact created, and any conditional artifact skipped and why. Stops there; implementation waits for `sa-implement`. |

## sa-audit

Audit a change proposal before its pull request: does the implementation match the artifacts (specs, tasks, design), so the change proposal meets its Definition of Done, and has the code drifted from the spec? It is the `verify` workflow; ask for it as "specagile audit".

| Contract | Description |
|---|---|
| **Arguments** | A change proposal name, optional. Otherwise it infers one from the conversation, or picks the only active change proposal. When ambiguous it asks, listing every active change proposal, including those with no tasks. |
| **Creates** | Nothing. The audit is static and read-only: it reads the change proposal's artifacts, the code, and its tests, without running tests or builds, and without editing code or artifacts. |
| **Response** | An Audit Report: a scorecard for Completeness, Correctness, and Coherence, then CRITICAL, WARNING, and SUGGESTION issues with recommendations, and a verdict on whether the change proposal is ready for its pull request ("Ready for PR", or "Fix before opening the PR"). The findings are advisory: it changes nothing and does not archive, and `sa-archive` keeps its own checks either way. |

## sa-bulk-archive-change

Archive several change proposals at once.

| Contract | Description |
|---|---|
| **Arguments** | None. It lists the active change proposals and asks you to select any number, with an option for all. If none are active it says so and stops. |
| **Creates** | `changes/archive/YYYY-MM-DD-<name>/` per archived change proposal (already-dated names keep their prefix). Each one's spec deltas sync first via `sa-sync-specs`. Never code. |
| **Response** | A status table per change proposal and one confirmation for the whole batch, then a summary of archived, skipped, and failed, plus spec sync results. When two change proposals touch the same spec it checks the codebase and syncs implemented deltas oldest first. |

## sa-onboard

Learn the workflow by doing one real change proposal end to end.

| Contract | Description |
|---|---|
| **Arguments** | None. It scans your codebase for small starter tasks and asks you to pick one or describe your own. |
| **Creates** | A real change proposal for the chosen task, one artifact at a time, then real code once you confirm implementation. Archives the change proposal at the end. |
| **Response** | A narrated walkthrough of the full cycle with pauses for your input: explore, create, build each artifact, implement, archive. Ends with a recap and a pointer to `sa-propose`. Takes about 15 to 20 minutes. |
