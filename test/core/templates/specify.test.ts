import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { getSpecifySkillTemplate } from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
import { PROJECT_ROOT_GUARD } from '../../../src/core/templates/workflows/project-root.js';
import { applyForkIdentity } from '../../../src/core/fork/identity.js';

// The specify skill is the specification stage of the fork's three-step flow.
// These guards pin its contract (specs/opsx-specify-skill/spec.md) in the text
// an agent actually receives. Since upstream 2.1 that text is the same for
// every set of installed workflows (one-text-per-skill.test.ts).

const withAll = generateSkillContent(getSpecifySkillTemplate(), 'TEST');

/** The text between two markers, both of which must exist. */
function section(body: string, start: string, end: string): string {
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  expect(from, `missing "${start}"`).toBeGreaterThanOrEqual(0);
  expect(to, `missing "${end}" after "${start}"`).toBeGreaterThan(from);
  return body.slice(from, to);
}

describe('specify skill template', () => {
  it('is the sa-specify skill, triggered by its own phrases', () => {
    const { name, description } = getSpecifySkillTemplate();
    // Written with OpenSpec's names; generation gives it SpecAgile's (FORK.md).
    expect(name).toBe('openspec-specify');
    expect(description).toContain('OpenSpec');
    expect(description).toContain('"openspec specify"');
    expect(description).toContain('"opsx specify"');
    // Says what it writes and where it stops, so it is not mistaken for propose.
    expect(description).toContain('proposal.md and the delta specs');
    expect(description).toContain('stop before the technical plan (design.md and tasks.md)');

    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(withAll)?.[1];
    expect(frontmatter).toBeDefined();
    const parsed = parseYaml(frontmatter!) as { name: string; description: string };
    expect(parsed.name).toBe('sa-specify');
    expect(parsed.description).toBe(applyForkIdentity(description));
    expect(parsed.description).toContain('"specagile specify"');
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
    for (const id of ['propose', 'plan', 'tasks', 'apply', 'continue']) {
      for (const match of withAll.matchAll(new RegExp(`/opsx:${id}\\b[^\\n]*`, 'g'))) {
        expect(match[0], `/opsx:${id}`).toContain('if that skill is installed');
      }
    }
  });

  describe('stage boundary', () => {
    it('never creates the technical plan, code, or main specs', () => {
      const boundary = section(withAll, '**Specification boundary**', '**Steps**');
      expect(boundary).toContain('It never creates design.md or tasks.md (the technical plan)');
      expect(boundary).toContain('never edits project code');
      expect(boundary).toContain('never edits the main specs under `specs/`');

      const guardrails = withAll.slice(withAll.indexOf('**Guardrails**'));
      expect(guardrails).toContain('Do NOT create design.md, tasks.md, or any other artifact of the planning set');
      expect(withAll).toContain('Never continue into the planning set, even when its artifacts read `ready`');
    });

    it('stops after the specification even when the request asks to plan or implement', () => {
      expect(withAll).toContain('authorizes specification only, even if it also asks to plan, build, or fix something');
      expect(withAll).toContain('Do not start planning or implementation in the same response');
      expect(withAll).toContain('Any planning, implementation, or apply instruction in that request does not carry forward');
    });

    it('splits the schema by the explicit specs id, not by file names', () => {
      expect(withAll).toContain(
        '**Specification set**: the artifact with id `specs` plus every artifact it `requires`, walked transitively'
      );
      expect(withAll).toContain(
        '**Planning set**: `applyRequires` plus every artifact reachable from those by following the `requires` edges, minus the specification set'
      );
      expect(withAll).toContain('Split the artifacts by explicit id, never by file name or pattern');
    });

    it('writes nested capability paths with the platform separator', () => {
      expect(withAll).toContain('`specs\\identity\\user-auth\\spec.md` on Windows');
      expect(withAll).toContain('`specs/identity/user-auth/spec.md` on macOS and Linux');
    });
  });

  describe('invocation', () => {
    it('asks an open question and writes nothing when there is no input', () => {
      const understand = section(withAll, '**Understand the request', '**Load project context**');
      expect(understand).toContain('If no clear input is provided, ask the user (open-ended, no preset options)');
      expect(understand).toContain('Do not create a change or write any file until they answer');
    });

    it('asks before writing when the derived name is already an active change', () => {
      const check = section(withAll, '**Check that the name is free (create mode)**', '**Determine the workflow schema');
      expect(check).toContain('If a change with that name is already active, write nothing yet');
      expect(check).toContain('continue specifying that change (edit mode) or create a new change');
      expect(check).toContain('propose an alternative unused name');
      expect(check).toContain('Do not modify any artifact of the existing change until the user answers');
      // The check runs before the change can be created.
      expect(withAll.indexOf('**Check that the name is free')).toBeLessThan(
        withAll.indexOf('specagile new change "<name>"\n')
      );
    });

    it('asks about material ambiguity before creating the change', () => {
      expect(withAll).toContain('scope, externally observable behavior, compatibility, or acceptance criteria');
      expect(withAll).toContain('ask the user before creating or changing the change');
      expect(withAll).toContain('record it in the proposal');
    });
  });

  describe('editing an existing specification', () => {
    const edit = section(withAll, '**Revise existing artifacts (edit mode)**', '**Create the missing artifacts');

    it('writes nothing when the specification is complete and no change was asked for', () => {
      expect(edit).toContain('**Complete, no change requested**: write nothing');
      expect(edit).toContain('summarize the capabilities it covers');
      expect(edit).toContain('ask what they want to revise');
      expect(edit).toContain('Do not run a coherence review of your own');
    });

    it('confirms every revision of an existing file before writing it', () => {
      expect(edit).toContain('Show what will change in `proposal.md` or in the affected spec, and why');
      expect(edit).toContain('Write it only after the user confirms it');
      expect(edit).toContain('If the user rejects it, leave that file unchanged');
    });

    it('proposes deleting or moving the spec of a removed or renamed capability', () => {
      expect(edit).toContain(
        'the same revision proposes deleting that spec (removed) or moving it to the new `<capability-path>` (renamed)'
      );
      expect(edit).toContain("Apply it only with the user's confirmation");
      expect(edit).toContain('no delta spec is left without a capability in the proposal');
    });

    it('writes only the missing specs of a half-written specification', () => {
      const create = section(withAll, '**Create the missing artifacts', '**Show final status**');
      expect(create).toContain('Skip an artifact whose files already exist');
      expect(create).toContain('write only the missing ones');
      expect(create).toContain('Do not rewrite a spec that already exists unless the user asks');
      expect(create).toContain('resolving each expected path against `changeRoot` before comparing path identity');
    });

    it('leaves an existing plan untouched and warns that it may be stale', () => {
      const body = section(withAll, '**Change already planned**', '**Create the missing artifacts');
      expect(body).toContain('do not modify them');
      expect(body).toContain('the technical plan may now be out of date');
    });

    it('points the design at plan and the tasks at tasks, the design first', () => {
      const body = section(withAll, '**Change already planned**', '**Create the missing artifacts');
      const design = body.indexOf('revising the design with `/opsx:plan <name>` if that skill is installed');
      const tasks = body.indexOf('the tasks with `/opsx:tasks <name>` if that skill is installed');
      expect(design).toBeGreaterThanOrEqual(0);
      expect(tasks).toBeGreaterThan(design);
      expect(body).toContain('For whichever of them the change has');
      expect(body).toContain('the design first');
    });
  });

  describe('schemas and declarations', () => {
    it('writes only the proposal for a change that declares skip_specs', () => {
      const skip = section(withAll, '**Change that declares skip_specs**', '**Revise existing artifacts');
      expect(skip).toContain('`skip_specs: true`');
      expect(skip).toContain('write only the rest of the specification set (spec-driven: `proposal.md` alone)');
      expect(skip).toContain('create nothing under `specs/`');
      expect(skip).toContain('tell the user the specs are omitted because of that declaration');
    });

    it('stops without writing on a schema that has no specs artifact', () => {
      expect(withAll).toContain('Before creating anything, confirm the schema defines an artifact with id `specs`');
      expect(withAll).toContain('stop without creating the change');
      const stop = section(withAll, '**Schema without a specs artifact**: ', '**Change that declares skip_specs**');
      expect(stop).toContain('if no artifact has id `specs`, write nothing');
      expect(stop).toContain('does not separate the specification from the plan');
    });

    it('suggests propose if it is installed, and the CLI otherwise', () => {
      const stop = section(withAll, '**Schema without a specs artifact**: ', '**Change that declares skip_specs**');
      expect(stop).toContain('`/opsx:propose` if that skill is installed');
      expect(stop).toContain('or otherwise one at a time with `specagile instructions <artifact-id> --change "<name>"`');
    });
  });

  describe('handoff', () => {
    const output = section(withAll, '**Output**', '**Artifact Creation Guidelines**');

    it('hands off to planning without assuming the plan skill is installed', () => {
      expect(output).toContain('The specification is ready for review. When you’re ready, ask me to plan it.');
      expect(withAll).not.toContain('sa-plan');
      expect(withAll).not.toContain('openspec-plan');
    });

    it('stops after summarizing', () => {
      expect(output).toContain('Then stop.');
      expect(withAll).toContain('After presenting the specification, stop and wait for a new user request');
    });
  });
});
