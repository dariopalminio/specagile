import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { getSpecifySkillTemplate } from '../../../src/core/templates/skill-templates.js';
import { resolveOptionalWorkflows } from '../../../src/core/templates/optional-workflow.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
import { PROJECT_ROOT_GUARD } from '../../../src/core/templates/workflows/project-root.js';
import { ALL_WORKFLOWS } from '../../../src/core/profiles.js';

// The specify skill is the specification stage of the fork's three-step flow.
// These guards pin its contract (specs/opsx-specify-skill/spec.md) in the text
// an agent actually receives, for each set of installed workflows it can be
// generated against.

const EVERY = [...new Set<string>([...ALL_WORKFLOWS, 'specify', 'plan'])];
const without = (...ids: string[]) => EVERY.filter((id) => !ids.includes(id));

function render(workflows: readonly string[]): string {
  const template = getSpecifySkillTemplate();
  return generateSkillContent(
    { ...template, instructions: resolveOptionalWorkflows(template.instructions, new Set(workflows)) },
    'TEST'
  );
}

const withAll = render(EVERY);

/** The text between two markers, both of which must exist. */
function section(body: string, start: string, end: string): string {
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  expect(from, `missing "${start}"`).toBeGreaterThanOrEqual(0);
  expect(to, `missing "${end}" after "${start}"`).toBeGreaterThan(from);
  return body.slice(from, to);
}

describe('specify skill template', () => {
  it('is the openspec-specify skill, triggered by its own phrases', () => {
    const { name, description } = getSpecifySkillTemplate();
    expect(name).toBe('openspec-specify');
    expect(description).toContain('OpenSpec');
    expect(description).toContain('"openspec specify"');
    expect(description).toContain('"opsx specify"');
    // Says what it writes and where it stops, so it is not mistaken for propose.
    expect(description).toContain('proposal.md and the delta specs');
    expect(description).toContain('stop before the technical plan (design.md and tasks.md)');

    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(withAll)?.[1];
    expect(frontmatter).toBeDefined();
    expect((parseYaml(frontmatter!) as { description: string }).description).toBe(description);
  });

  it('reads store selection and the project check before any step', () => {
    const store = withAll.indexOf(STORE_SELECTION_GUIDANCE);
    expect(store).toBeGreaterThanOrEqual(0);
    expect(withAll.indexOf(PROJECT_ROOT_GUARD)).toBe(store + STORE_SELECTION_GUIDANCE.length + 2);
    expect(withAll.indexOf(PROJECT_ROOT_GUARD)).toBeLessThan(withAll.indexOf('**Steps**'));
  });

  it('renders cleanly for every combination of the workflows it names', () => {
    for (const workflows of [EVERY, without('plan'), without('propose'), without('plan', 'propose')]) {
      expect(() => render(workflows)).not.toThrow();
      expect(render(workflows)).not.toContain('[[opsx:');
    }
  });

  describe('stage boundary', () => {
    it('never creates the technical plan, code, or main specs', () => {
      const boundary = section(withAll, '**Specification boundary**', '**Steps**');
      expect(boundary).toContain('It never creates design.md or tasks.md (the technical plan)');
      expect(boundary).toContain('never edits project code');
      expect(boundary).toContain('never edits the main specs under `openspec/specs/`');

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
        withAll.indexOf('openspec new change "<name>"\n')
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
      for (const workflows of [EVERY, without('plan')]) {
        const body = section(render(workflows), '**Change already planned**', '**Create the missing artifacts');
        expect(body).toContain('do not modify them');
        expect(body).toContain('the technical plan may now be out of date');
      }
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

    it('suggests propose only when it is installed', () => {
      const stop = (workflows: readonly string[]) =>
        section(render(workflows), '**Schema without a specs artifact**: ', '**Change that declares skip_specs**');
      expect(stop(EVERY)).toContain('`/opsx:propose`');
      expect(stop(without('propose'))).not.toContain('/opsx:propose');
      expect(stop(without('propose'))).toContain('`openspec instructions <artifact-id> --change "<name>"`');
      expect(render(without('propose'))).not.toContain('/opsx:propose');
    });
  });

  describe('handoff', () => {
    const output = (workflows: readonly string[]) => section(render(workflows), '**Output**', '**Artifact Creation Guidelines**');

    it('hands off to plan when plan is installed', () => {
      expect(output(EVERY)).toContain('The specification is ready for review. When you are ready, use `/opsx:plan`');
    });

    it('never names plan when it is not installed, and points at the CLI instead', () => {
      const body = render(without('plan'));
      expect(body).not.toContain('/opsx:plan');
      expect(body).not.toContain('openspec-plan');
      expect(output(without('plan'))).toContain(
        'generate the next artifact with `openspec instructions <artifact-id> --change "<name>"`'
      );
    });

    it('stops after summarizing', () => {
      expect(output(EVERY)).toContain('Then stop.');
      expect(withAll).toContain('After presenting the specification, stop and wait for a new user request');
    });
  });
});
