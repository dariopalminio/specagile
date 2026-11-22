import path from 'path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { getTasksSkillTemplate } from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
import { PROJECT_ROOT_GUARD } from '../../../src/core/templates/workflows/project-root.js';
import { applyForkIdentity } from '../../../src/core/fork/identity.js';
import { transformToSharedSkillReferences } from '../../../src/utils/command-references.js';
import { CHANGE_METADATA_FILE_NAME } from '../../helpers/layout.js';

// The tasks skill is the tasks stage of the fork's long flow (specify -> plan
// -> tasks -> apply). These guards pin its contract
// (specs/opsx-tasks-skill/spec.md) in the text an agent actually receives. Since
// upstream 2.1 that text is the same for every set of installed workflows
// (one-text-per-skill.test.ts).

const withAll = generateSkillContent(getTasksSkillTemplate(), 'TEST');

/** The text between two markers, both of which must exist. */
function section(body: string, start: string, end: string): string {
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  expect(from, `missing "${start}"`).toBeGreaterThanOrEqual(0);
  expect(to, `missing "${end}" after "${start}"`).toBeGreaterThan(from);
  return body.slice(from, to);
}

const completeness = section(withAll, '**Check that the specification is complete**', '**Check the design**');
const design = section(withAll, '**Check the design**', '**Revise the existing tasks**');
const revise = section(withAll, '**Revise the existing tasks**', '**Create the missing tasks**');
const create = section(withAll, '**Create the missing tasks**', '**Show final status**');
const output = section(withAll, '**Output**', '**Artifact Creation Guidelines**');

describe('tasks skill template', () => {
  it('is the sa-tasks skill, triggered by its own phrases', () => {
    const { name, description } = getTasksSkillTemplate();
    // Written with OpenSpec's names; generation gives it SpecAgile's (FORK.md).
    expect(name).toBe('openspec-tasks');
    expect(description).toContain('OpenSpec');
    expect(description).toContain('"openspec tasks"');
    expect(description).toContain('"opsx tasks"');
    expect(description).toContain('implementation checklist (tasks.md)');
    expect(description).toContain('without editing them or code');

    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(withAll)?.[1];
    expect(frontmatter).toBeDefined();
    const parsed = parseYaml(frontmatter!) as { name: string; description: string };
    expect(parsed.name).toBe('sa-tasks');
    expect(parsed.description).toBe(applyForkIdentity(description));
    expect(parsed.description).toContain('"specagile tasks"');
    expect(parsed.description).not.toContain('"openspec tasks"');
  });

  it('reads store selection and the project check before any step', () => {
    const storeGuidance = applyForkIdentity(STORE_SELECTION_GUIDANCE);
    const rootGuard = applyForkIdentity(PROJECT_ROOT_GUARD);
    const store = withAll.indexOf(storeGuidance);
    expect(store).toBeGreaterThanOrEqual(0);
    expect(withAll.indexOf(rootGuard)).toBe(store + storeGuidance.length + 2);
    expect(withAll.indexOf(rootGuard)).toBeLessThan(withAll.indexOf('**Steps**'));
  });

  it('names another skill only if that skill is installed', () => {
    expect(withAll).not.toContain('[[opsx:');
    for (const id of ['apply', 'specify', 'plan', 'propose', 'continue']) {
      for (const match of withAll.matchAll(new RegExp(`/opsx:${id}\\b[^\\n]*`, 'g'))) {
        expect(match[0], `/opsx:${id}`).toContain('if that skill is installed');
      }
    }
  });

  it('refers to the other skills by their sa-* names in the shared copy', () => {
    const shared = generateSkillContent(getTasksSkillTemplate(), 'TEST', transformToSharedSkillReferences);
    expect(shared).toContain('`sa-plan <name>` if that skill is installed');
    expect(shared).toContain('`sa-implement <name>` as the way to start it if that skill is installed');
    expect(shared).toContain('`sa-tasks <other>`');
    expect(shared).not.toMatch(/openspec-(tasks|plan|specify|propose|apply-change)\b/);
  });

  describe('change selection', () => {
    const select = section(withAll, '**Select the change**', '**Get the artifact graph');

    it('never creates a change', () => {
      expect(select).toContain('It never creates one');
      expect(select).toContain('Do not create a change or any file');
      expect(withAll).not.toMatch(/```bash\s*\n\s*specagile new change/);
      expect(withAll).toContain('Never create a change, and never edit the proposal, the delta specs, the design');
    });

    it('infers or asks for the change and announces the choice', () => {
      expect(select).toContain('Auto-select if only one active change exists');
      expect(select).toContain('ask the user to select one');
      expect(select).toContain('Always announce: "Using change: <name>" and how to override (e.g., `/opsx:tasks <other>`)');
    });

    it('lists active changes and points at specify when the change does not exist', () => {
      expect(select).toContain('tell the user it was not found, list the active changes');
      expect(select).toContain('suggest specifying a new change first: with `/opsx:specify` if that skill is installed');
      expect(select).toContain('or otherwise by creating it with `specagile new change "<name>"`');
    });
  });

  describe('complete specification', () => {
    it('stops when the proposal is missing or a listed capability has no spec', () => {
      expect(completeness).toContain('If the proposal is missing, say the specification is missing');
      expect(completeness).toContain("every capability the proposal's Capabilities section lists has its delta spec");
      expect(completeness).toContain('Name every capability that has no spec');
    });

    it('stops on a spec whose capability the proposal does not list', () => {
      expect(completeness).toContain(
        'No file in `artifactPaths.specs.existingOutputPaths` belongs to a capability the proposal does not list'
      );
    });

    it('writes nothing until every check passes and points at specify', () => {
      expect(completeness).toContain('writing nothing until every check passes');
      expect(completeness).toContain('If any check fails, stop without writing anything');
      expect(completeness).toContain('`/opsx:specify <name>` to complete or fix it if that skill is installed');
    });

    it('does not trust a done status for the glob specs artifact', () => {
      expect(completeness).toContain('`status` is file-existence only');
    });

    it('compares path identity with the platform rules, so a Windows spec path matches the capability', () => {
      // The proposal writes the capability with `/`; status reports the file
      // with the platform's separator, which is `\` on Windows.
      const capability = path.posix.join('identity', 'user-auth');
      const windowsSpec = path.win32.join('specs', 'identity', 'user-auth', 'spec.md');
      expect(completeness).toContain('**Compare path identity, not text.**');
      expect(completeness).toContain('Resolve both sides against `changeRoot`');
      expect(completeness).toContain('on Windows, `\\` and `/` are the same separator and case does not matter');
      expect(completeness).toContain('on Linux, case matters');
      expect(completeness).toContain(
        `the capability \`${capability}\` and the file \`${windowsSpec}\` are the same spec`
      );
      expect(completeness).toContain('verify it remains inside `changeRoot` after resolving symlinks');
    });

    it('writes the tasks at the path the CLI reports, with the platform separator', () => {
      expect(create).toContain('the output path is `resolvedOutputPath`, with the platform\'s separator as the CLI reports it');
    });

    it('counts a change that declares skip_specs as complete', () => {
      expect(completeness).toContain(
        `\`specs\` reads \`skipped\` - the change declares \`skip_specs: true\` in \`${CHANGE_METADATA_FILE_NAME}\`, which counts as complete`
      );
    });

    it('stops without writing on a schema that has no specs or no tasks artifact', () => {
      const stop = section(withAll, '**Schema without a specs or tasks artifact**', '**Check that the specification');
      expect(stop).toContain('if no artifact has id `specs`, or no artifact has id `tasks`, write nothing');
      expect(stop).toContain('this schema does not separate the tasks stage');
      expect(stop).toContain('`/opsx:propose` if that skill is installed');
      expect(stop).toContain('or otherwise one at a time with `specagile instructions <artifact-id> --change "<name>"`');
    });
  });

  describe('tasks stage boundary', () => {
    const split = section(withAll, '**Get the artifact graph and split it**', '**Schema without a specs or tasks artifact**');

    it('writes only the artifact with the explicit tasks id, never found by file name', () => {
      expect(split).toContain('Split the artifacts by explicit id, never by file name or pattern');
      expect(split).toContain('**Tasks set**: the artifact with id `tasks` (spec-driven: `tasks`). This is the only artifact this workflow writes');
      expect(split).toContain('**Design set**: the planning set minus the tasks set (spec-driven: `design`). This workflow reads these and never edits them');
      expect(create).toContain('Never create an artifact outside the tasks set');
      expect(withAll).toContain('Write only the artifact with the explicit `tasks` id, found through the artifact graph - never by file name');
    });

    it('never edits the proposal, the specs, the design or code', () => {
      const boundary = section(withAll, '**Tasks boundary**', '---\n');
      expect(boundary).toContain('- tasks.md (implementation steps)');
      expect(boundary).not.toContain('- design.md');
      expect(boundary).toContain(
        'never edits the proposal, the delta specs, or the design (design.md), never edits project code'
      );
    });

    it('stops after the tasks even when the request asks to implement', () => {
      expect(withAll).toContain('authorizes writing the tasks only, even if it also asks to build or fix something');
      expect(withAll).toContain('Do not start implementation in the same response');
      expect(withAll).toContain('Any implementation or apply instruction in that request does not carry forward');
    });
  });

  describe('design check', () => {
    it('reads a written design from disk', () => {
      expect(design).toContain('**Written**: it has files. Read them from disk');
    });

    it('writes the tasks without a design the schema marks conditional, and says so', () => {
      expect(design).toContain('Run `specagile instructions <artifact-id> --change "<name>" --json` and read its `instruction` field');
      expect(design).toContain("**Conditional**: if the `instruction` marks the artifact optional");
      expect(design).toContain("spec-driven's `design.md` qualifies");
      expect(design).toContain('tell the user the change has no technical design');
      expect(design).toContain('suggest writing it first with `/opsx:plan <name>` if that skill is installed');
      expect(create).toContain(
        'if the tasks artifact reads `blocked` only because a conditional design artifact was left out (step 4), write it anyway'
      );
      expect(output).toContain('Whether the change has no technical design (step 4)');
    });

    it('stops without writing when a required design artifact is missing', () => {
      expect(design).toContain('**Required**: otherwise, stop without writing anything: name the missing artifact');
      expect(design).toContain('`/opsx:plan <name>` if that skill is installed');
      expect(design).toContain('or otherwise from its rules and template with `specagile instructions <artifact-id> --change "<name>" --json`');
    });

    it("resolves the design's open questions with the user before writing", () => {
      expect(design).toContain(
        '**Open questions in the design**: if the design lists open questions that would change what gets built, ask the user about each one before writing any task'
      );
      expect(design).toContain('Do not record the answers in the design');
      expect(withAll).toContain("Resolve the design's open questions with the user before writing the tasks");
    });

    it('reports problems in the specification or the design without editing them', () => {
      const problem = section(design, '**If the specification or the design has a problem**', '\n\n');
      expect(problem).toContain('in the proposal, the delta specs, or the design, do not edit them');
      expect(problem).toContain('Tell the user what the problem is');
      expect(problem).toContain('the specification with `/opsx:specify <name>` if that skill is installed');
      expect(problem).toContain('the design with `/opsx:plan <name>` if that skill is installed');
    });
  });

  describe('revising existing tasks', () => {
    it('confirms the revision before writing it', () => {
      expect(revise).toContain('Show what would change in the tasks and why');
      expect(revise).toContain('Write the revision only after the user confirms it');
      expect(revise).toContain('If the user rejects it, leave the file unchanged');
    });

    it('writes nothing when the tasks are already coherent', () => {
      expect(revise).toContain('tell the user the tasks are up to date and write nothing');
    });

    it('keeps completed tasks unless the user explicitly confirms otherwise', () => {
      expect(revise).toContain('a revision keeps every task already marked `[x]`, with its mark');
      expect(revise).toContain('only when the user explicitly confirms that in the revision');
      expect(withAll).toContain('Keep completed tasks and their marks unless the user explicitly confirms removing or unchecking them');
    });

    it('creates missing tasks without asking', () => {
      expect(create).toContain('create it without asking for confirmation');
      expect(create).toContain('specagile instructions tasks --change "<name>" --json');
    });
  });

  describe('handoff', () => {
    it('hands off to implementation without assuming the apply skill is installed', () => {
      expect(output).toContain('"The change is ready to implement."');
      expect(output).toContain('The tasks are ready for review. When you’re ready, ask me to implement them.');
      expect(output).toContain('Mention `/opsx:apply <name>` as the way to start it if that skill is installed');
    });

    it('says whether the tasks were created, revised, or left unchanged, then stops', () => {
      expect(output).toContain('Whether the tasks were created, revised, or left unchanged');
      expect(output).toContain('Then stop.');
      expect(withAll).toContain('After presenting the tasks, stop and wait for a new user request');
    });
  });
});
