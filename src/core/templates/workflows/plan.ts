/**
 * Plan workflow (SpecAgile fork).
 *
 * The design stage of the long flow (specify -> plan -> tasks -> apply): on a
 * change whose specification is complete, it creates or revises the artifacts
 * the change needs for implementation that are neither part of the
 * specification nor its tasks - with spec-driven, design.md. The tasks are
 * left to the tasks workflow (tasks.ts); a schema with no `tasks` artifact gets
 * its whole plan here.
 *
 * Fork-owned. The change-selection and artifact-loop text is adapted from
 * continue-change.ts and propose.ts, and the confirm-before-writing revision
 * rules from update-change.ts; those files are left untouched so upstream syncs
 * do not conflict. Review this file whenever a sync changes any of them.
 */
import type { SkillTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';
import { PROJECT_ROOT_GUARD } from './project-root.js';
import {
  CHANGE_NOT_FOUND,
  NO_SPECS_SCHEMA_SUGGESTION,
  SPECIFY_TO_COMPLETE,
  SPECIFY_TO_RESOLVE,
} from './stage-handoffs.js';

// A skill says the same thing whatever workflows are installed (upstream 2.1,
// test/core/templates/one-text-per-skill.test.ts), so these never assume
// another workflow is there: they hand off as propose.ts does ("ask me to"),
// or name a skill only "if that skill is installed", as archive-change.ts does.

/** The handoff to the tasks stage. */
const TASKS_HANDOFF = 'The design is ready for review. When you’re ready, ask me to write the tasks.';

/** How the tasks get written, whether or not the tasks skill is installed. */
const TASKS_HOW =
  'The tasks are written with `/opsx:tasks <name>` if that skill is installed, or otherwise from the `tasks` artifact\'s rules and template with `openspec instructions tasks --change "<name>" --json`.';

/** The implementation handoff, for a schema with no `tasks` artifact. */
const APPLY_HANDOFF = 'The plan is ready for review. When you’re ready, ask me to implement it.';

export function getPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-plan',
    description: 'Plan an OpenSpec change that is already specified - create or revise its technical design (design.md) from the proposal and delta specs, without writing its tasks or editing the specification or code. Use when the user wants to decide how an agreed specification will be built before breaking it into tasks. Also use when the user says "openspec plan" or "opsx plan".',
    instructions: `Plan a change - create or revise the technical design of a change whose specification is complete, then stop before its tasks.

**Planning boundary**: This workflow writes the design artifacts of one existing change and nothing else: the artifacts the change needs for implementation that are neither part of its specification nor its tasks. With the default spec-driven schema that is:
- design.md (how)

It never creates, revises, or deletes tasks.md (the tasks stage writes it), never creates a change, never edits the proposal or the delta specs, never edits project code, and never edits the main specs under \`openspec/specs/\`. The user request that selected or triggered this workflow authorizes planning only, even if it also asks to write the tasks, build, or fix something. After the design is written, stop. Do not start the tasks or the implementation in the same response; wait for a new user request.

---

${STORE_SELECTION_GUIDANCE}

${PROJECT_ROOT_GUARD}

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   This workflow plans a change that already exists. It never creates one.

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run \`openspec list --json\` to get available changes sorted by most recently modified, and ask the user to select one

   When prompting, present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from \`lastModified\` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to plan.

   If the named change is not active (not listed under \`changes\` in \`openspec list --json\`), write nothing: tell the user it was not found, list the active changes, and ${CHANGE_NOT_FOUND}. Do not create a change or any file.

   Always announce: "Using change: <name>" and how to override (e.g., \`/opsx:plan <other>\`).

2. **Get the artifact graph and split it**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to get:
   - \`artifacts\`: list of all artifacts, each with its \`id\`, its \`status\` and its \`requires\` edges (the artifact IDs it directly depends on)
   - \`applyRequires\`: array of artifact IDs needed before implementation
   - \`planningHome\`, \`changeRoot\`, \`artifactPaths\`, and \`actionContext\`: path and scope context. Use these instead of assuming repo-local paths.

   Split the artifacts by explicit id, never by file name or pattern:
   - **Specification set**: the artifact with id \`specs\` plus every artifact it \`requires\`, walked transitively (spec-driven: \`proposal\`, \`specs\`). This workflow reads these and never edits them.
   - **Planning set**: \`applyRequires\` plus every artifact reachable from those by following the \`requires\` edges, minus the specification set (spec-driven: \`design\`, \`tasks\`).
   - **Tasks set**: the artifact with id \`tasks\`, if the schema defines one (spec-driven: \`tasks\`). The tasks stage writes it; this workflow never creates, revises, or deletes it, even when it reads \`ready\`.
   - **Design set**: the planning set minus the tasks set (spec-driven: \`design\`). These are the only artifacts this workflow writes, whatever their names. When the schema has no \`tasks\` artifact, the design set is the whole planning set.
   - Any other artifact belongs to none of these sets. Leave it alone, even when it reads \`ready\`.

   **Schema without a specs artifact**: if no artifact has id \`specs\`, write nothing. Tell the user this schema does not separate the specification from the plan, and ${NO_SPECS_SCHEMA_SUGGESTION}.

3. **Check that the specification is complete**

   \`status\` is file-existence only, so a \`done\` reading proves nothing about the files inside a glob artifact. Read the proposal from disk and check all of the following, writing nothing until every check passes:
   - Every artifact of the specification set other than \`specs\` reads \`done\` (spec-driven: \`proposal\`). If the proposal is missing, say the specification is missing.
   - \`specs\` reads \`skipped\` - the change declares \`skip_specs: true\` in \`.openspec.yaml\`, which counts as complete - or every capability the proposal's Capabilities section lists has its delta spec (spec-driven: \`specs/<capability-path>/spec.md\`). Resolve each expected path against \`changeRoot\`, verify it remains inside \`changeRoot\` after resolving symlinks, and look for it in \`artifactPaths.specs.existingOutputPaths\`. Name every capability that has no spec.
   - No file in \`artifactPaths.specs.existingOutputPaths\` belongs to a capability the proposal does not list. Name each such file as an inconsistency in the specification.

   **Compare path identity, not text.** The proposal writes capability paths with \`/\`, while \`status --json\` reports absolute paths with the platform's separator (\`\\\` on Windows). Resolve both sides against \`changeRoot\` and compare the resulting paths with the platform file system's rules: on Windows, \`\\\` and \`/\` are the same separator and case does not matter; on Linux, case matters; on macOS, follow the volume (case-insensitive by default). On Windows, the capability \`identity/user-auth\` and the file \`specs\\identity\\user-auth\\spec.md\` are the same spec.

   If any check fails, stop without writing anything: name what is missing or inconsistent, and ${SPECIFY_TO_COMPLETE}.

4. **Find the design work**

   - **Nothing to design**: if the design set is empty, write nothing. When the schema has a \`tasks\` artifact, tell the user the change has no design to write, and hand off to the tasks stage as in **Output**. Otherwise every artifact the schema requires for implementation is part of the specification: tell the user the change is already ready to implement, and hand off as in **Output**.
   - Otherwise, read the proposal and every delta spec from disk - re-read them even if you saw them earlier in the conversation. For each artifact of the design set, check \`artifactPaths.<id>.existingOutputPaths\`: an artifact with files is **existing** (step 5 reviews it) and one without is **missing** (step 6 creates it).

   **If the specification has a problem**: when, at any point, you find a contradiction, a gap, or an infeasible requirement in the proposal or the delta specs, do not edit them. Tell the user what the problem is and ${SPECIFY_TO_RESOLVE}.

   **Change that already has tasks**: if the tasks artifact already has files (spec-driven: \`tasks.md\`), leave them unchanged, even when they look out of date. When this run creates or revises a design artifact, warn the user that the tasks may now be out of date, and suggest revising them with \`/opsx:tasks <name>\` if that skill is installed.

5. **Revise the existing design artifacts**

   Skip this step when no design artifact has files yet.
   - Read each existing design artifact from disk and check it against the current proposal and delta specs: requirements the design does not cover, design for behavior the specs no longer require, decisions that contradict a requirement.
   - If every one is coherent with the specification, tell the user the design is up to date and write nothing to it.
   - Otherwise, draft each revision in the conversation, not in files. Show what would change in each file and why. Write a revision only after the user confirms it. If the user rejects it, leave that file unchanged.
   - When a substantial rewrite is needed, get that artifact's rules and template first with \`openspec instructions <artifact-id> --change "<name>" --json\`.

6. **Create the missing design artifacts**

   Create these without asking for confirmation. Use a todo list to track progress, and loop through the missing artifacts of the design set in dependency order (artifacts with no pending dependencies first):

   a. **For each missing artifact that is \`ready\` (dependencies satisfied)**:
      - Get instructions:
        \`\`\`bash
        openspec instructions <artifact-id> --change "<name>" --json
        \`\`\`
      - The instructions JSON includes:
        - \`context\`: Project background (constraints for you - do NOT include in output)
        - \`rules\`: Artifact-specific rules (constraints for you - do NOT include in output)
        - \`template\`: The structure to use for your output file
        - \`instruction\`: Schema-specific guidance for this artifact type
        - \`resolvedOutputPath\`: Resolved path or pattern to write the artifact
        - \`dependencies\`: Completed artifacts to read for context (entries with \`skipped: true\` have no files - do not look for them)
      - Read any completed dependency files for context - always re-read them from disk, even if you saw them earlier in the conversation (the user may have edited them)
      - **Inspect the relevant project before drafting**: Read \`context\` and \`rules\` first, then inspect relevant implementation, nearby tests, configuration, and documentation outside \`openspec/\`. Keep inspection read-only and proportional to the change; reuse findings for later artifacts and inspect more only as needed.
        - Identify the target project from the request and project context; the planning home may be separate from the code. If the target is unclear, ask. For greenfield or non-code changes, inspect the available structure and relevant documents. If source is unavailable, state the limitation and ask when it materially affects the design.
        - Ground the approach in what you find. Distinguish observed behavior from assumptions and proposed additions; surface conflicts with existing specs instead of silently deciding which is correct.
        - Do this discovery now, rather than leaving generic "explore the codebase" or "make a plan" work for the tasks or the implementation. Keep any necessary follow-up investigation specific to an unresolved question.
      - Choose the output path before creating anything. If \`resolvedOutputPath\` is a glob, follow \`instruction\` to choose a concrete path inside \`changeRoot\` that matches the glob, and verify it remains inside \`changeRoot\` after resolving symlinks, both in its parent directories and in the file itself if it already exists; if it does not, stop and tell the user. Otherwise the output path is \`resolvedOutputPath\`
      - If the \`instruction\` field delegates creation to a specific skill or command, invoke it only if it can write the artifact to that output path; otherwise stop and tell the user. Then verify the artifact file exists at that output path
      - Otherwise create the artifact file using \`template\` as the structure and write it to that output path
      - Apply \`context\` and \`rules\` as constraints - but do NOT copy them into the file
      - Show brief progress: "Created <artifact-id>"

   b. **Continue until every artifact in the design set exists**
      - After creating each artifact, re-run \`openspec status --change "<name>" --json\` - creating one can unblock others
      - Skip one only when its own \`instruction\` says it is conditional: run \`openspec instructions <artifact-id> --change "<name>" --json\` and skip only if its \`instruction\` field marks it optional (e.g. "create only if..."). Spec-driven's \`design.md\` qualifies. Tell the user why you skipped it, and do not reconsider it
      - Dependencies are enablers, not gates: if a design artifact is still \`blocked\` only because you skipped a conditional dependency, write it anyway
      - Never create an artifact outside the design set - in particular, never the tasks artifact, even when it reads \`ready\`
      - Stop when every artifact in the design set is \`done\` or was deliberately skipped

7. **Show final status**
   \`\`\`bash
   openspec status --change "<name>"
   \`\`\`

**Output**

After planning, summarize:
- Change name and location (\`changeRoot\`)
- Design artifacts created, revised, or skipped (and why), and any revision the user rejected
- When the change already has tasks and this run created or revised its design: that the tasks may now be out of date (step 4)
- What's ready, depending on the schema:
  - **The schema has a \`tasks\` artifact**: "The change is ready for its tasks." Then prompt: "${TASKS_HANDOFF}" ${TASKS_HOW}
  - **The schema has no \`tasks\` artifact**: "The change is ready to implement." Then prompt: "${APPLY_HANDOFF}"

Then stop.

**Artifact Creation Guidelines**

- Follow the \`instruction\` field from \`openspec instructions\` for each artifact type - it is the authoritative guidance, even for familiar artifact names
- If the \`instruction\` field directs you to use a specific skill or command to create the artifact, invoke it instead of writing the artifact directly - but only once you have chosen and checked the output path, and only if it can write there
- Use \`template\` as the structure for your output file - fill in its sections
- **IMPORTANT**: \`context\` and \`rules\` are constraints for YOU, not content for the file
  - Do NOT copy \`<context>\`, \`<rules>\`, \`<project_context>\` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- The request that invoked this workflow authorizes planning only. Any tasks, implementation, or apply instruction in that request does not carry forward. Do NOT write the tasks, implement the change, start the apply workflow, or edit project code. After presenting the design, stop and wait for a new user request
- Never create a change, and never edit the proposal, the delta specs, or the main specs under \`openspec/specs/\` - report problems in them instead
- Plan only a change whose specification is complete: check each listed capability against the files on disk, comparing path identity rather than text
- Write only artifacts of the design set, found through \`applyRequires\`, the \`requires\` edges, and the explicit \`specs\` and \`tasks\` ids - never by file name
- Never create, revise, or delete the tasks artifact (spec-driven: \`tasks.md\`); warn that it may be out of date instead
- Create missing design artifacts without asking; confirm every revision of an existing one before writing it, and leave the file unchanged if the user rejects it
- Always re-read artifacts from disk before planning from them or revising them (files may have changed since you last saw them)
- Verify each artifact file exists after writing before proceeding to the next`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}
