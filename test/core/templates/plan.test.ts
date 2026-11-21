import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { getPlanSkillTemplate } from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
import { PROJECT_ROOT_GUARD } from '../../../src/core/templates/workflows/project-root.js';
import { applyForkIdentity } from '../../../src/core/fork/identity.js';
import { CHANGE_METADATA_FILE_NAME } from '../../helpers/layout.js';

// The plan skill is the planning stage of the fork's three-step flow. These
// guards pin its contract (specs/opsx-plan-skill/spec.md) in the text an agent
// actually receives. Since upstream 2.1 that text is the same for every set of
// installed workflows (one-text-per-skill.test.ts).

const withAll = generateSkillContent(getPlanSkillTemplate(), 'TEST');

/** The text between two markers, both of which must exist. */
function section(body: string, start: string, end: string): string {
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  expect(from, `missing "${start}"`).toBeGreaterThanOrEqual(0);
  expect(to, `missing "${end}" after "${start}"`).toBeGreaterThan(from);
  return body.slice(from, to);
}

const completeness = (body: string) =>
  section(body, '**Check that the specification is complete**', '**Find the planning work**');

describe('plan skill template', () => {
  it('is the sa-plan skill, triggered by its own phrases', () => {
    const { name, description } = getPlanSkillTemplate();
    // Written with OpenSpec's names; generation gives it SpecAgile's (FORK.md).
    expect(name).toBe('openspec-plan');
    expect(description).toContain('OpenSpec');
    expect(description).toContain('"openspec plan"');
    expect(description).toContain('"opsx plan"');
    expect(description).toContain('(design.md and tasks.md)');
    expect(description).toContain('without editing the specification or code');

    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(withAll)?.[1];
    expect(frontmatter).toBeDefined();
    const parsed = parseYaml(frontmatter!) as { name: string; description: string };
    expect(parsed.name).toBe('sa-plan');
    expect(parsed.description).toBe(applyForkIdentity(description));
    expect(parsed.description).toContain('"specagile plan"');
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
    for (const id of ['apply', 'specify', 'propose', 'continue']) {
      for (const match of withAll.matchAll(new RegExp(`/opsx:${id}\\b[^\\n]*`, 'g'))) {
        expect(match[0], `/opsx:${id}`).toContain('if that skill is installed');
      }
    }
  });

  describe('change selection', () => {
    const select = section(withAll, '**Select the change**', '**Get the artifact graph');

    it('never creates a change', () => {
      expect(select).toContain('It never creates one');
      expect(select).toContain('Do not create a change or any file');
      expect(withAll).not.toMatch(/```bash\s*\n\s*specagile new change/);
      expect(withAll).toContain('Never create a change, and never edit the proposal, the delta specs');
    });

    it('infers or asks for the change and announces the choice', () => {
      expect(select).toContain('Auto-select if only one active change exists');
      expect(select).toContain('ask the user to select one');
      expect(select).toContain('Always announce: "Using change: <name>" and how to override');
    });

    it('lists active changes and points at specify when the change does not exist', () => {
      expect(select).toContain('tell the user it was not found, list the active changes');
      expect(select).toContain('suggest specifying a new change first: with `/opsx:specify` if that skill is installed');
      expect(select).toContain('or otherwise by creating it with `specagile new change "<name>"`');
    });
  });

  describe('complete specification', () => {
    it('stops when the proposal is missing', () => {
      expect(completeness(withAll)).toContain('If the proposal is missing, say the specification is missing');
    });

    it('stops when a listed capability has no spec', () => {
      expect(completeness(withAll)).toContain(
        "every capability the proposal's Capabilities section lists has its delta spec"
      );
      expect(completeness(withAll)).toContain('Name every capability that has no spec');
    });

    it('stops on a spec whose capability the proposal does not list', () => {
      expect(completeness(withAll)).toContain(
        'No file in `artifactPaths.specs.existingOutputPaths` belongs to a capability the proposal does not list'
      );
      expect(completeness(withAll)).toContain('as an inconsistency in the specification');
    });

    it('writes nothing until every check passes and points at specify', () => {
      const body = completeness(withAll);
      expect(body).toContain('writing nothing until every check passes');
      expect(body).toContain('If any check fails, stop without writing anything');
      expect(body).toContain('the specification stage must be finished first');
      expect(body).toContain('`/opsx:specify <name>` to complete or fix it if that skill is installed');
    });

    it('does not trust a done status for the glob specs artifact', () => {
      expect(completeness(withAll)).toContain('`status` is file-existence only');
    });

    it('compares path identity with the platform rules, not text', () => {
      const body = completeness(withAll);
      expect(body).toContain('**Compare path identity, not text.**');
      expect(body).toContain('Resolve both sides against `changeRoot`');
      expect(body).toContain('on Windows, `\\` and `/` are the same separator and case does not matter');
      expect(body).toContain('on Linux, case matters');
      expect(body).toContain(
        'the capability `identity/user-auth` and the file `specs\\identity\\user-auth\\spec.md` are the same spec'
      );
      expect(body).toContain('verify it remains inside `changeRoot` after resolving symlinks');
    });

    it('counts a change that declares skip_specs as complete', () => {
      expect(completeness(withAll)).toContain(
        `\`specs\` reads \`skipped\` - the change declares \`skip_specs: true\` in \`${CHANGE_METADATA_FILE_NAME}\`, which counts as complete`
      );
    });

    it('stops without writing on a schema that has no specs artifact', () => {
      const stop = section(withAll, '**Schema without a specs artifact**', '**Check that the specification');
      expect(stop).toContain('if no artifact has id `specs`, write nothing');
      expect(stop).toContain('`/opsx:propose` if that skill is installed');
      expect(stop).toContain('or otherwise one at a time with `specagile instructions <artifact-id> --change "<name>"`');
    });
  });

  describe('planning stage boundary', () => {
    it('writes whatever planning artifacts the schema defines, found by graph and not by name', () => {
      expect(withAll).toContain(
        '**Planning set**: `applyRequires` plus every artifact reachable from those by following the `requires` edges, minus the specification set'
      );
      expect(withAll).toContain('These are the only artifacts this workflow writes, whatever their names');
      expect(withAll).toContain('Never create an artifact outside the planning set');
      expect(withAll).toContain('Split the artifacts by explicit id, never by file name or pattern');
    });

    it('writes nothing and hands off to apply when there is nothing to plan', () => {
      const work = section(withAll, '**Find the planning work**', '**Revise the existing planning artifacts**');
      expect(work).toContain('**Nothing to plan**: if the planning set is empty');
      expect(work).toContain('write nothing');
      expect(work).toContain('Tell the user the change is already ready to implement, and hand off as in **Output**');
    });

    it('skips a conditional design and still writes the tasks', () => {
      expect(withAll).toContain("Spec-driven's `design.md` qualifies. Tell the user why you skipped it");
      expect(withAll).toContain(
        'if a planning artifact is still `blocked` only because you skipped a conditional dependency, write it anyway'
      );
    });

    it('never edits the specification and reports its problems instead', () => {
      expect(withAll).toContain('It never creates a change, never edits the proposal or the delta specs, never edits project code');
      const problem = section(withAll, '**If the specification has a problem**', '**Revise the existing planning artifacts**');
      expect(problem).toContain('do not edit them');
      expect(problem).toContain('Tell the user what the problem is');
      expect(problem).toContain('(with `/opsx:specify <name>` if that skill is installed)');
    });

    it('stops after the plan even when the request asks to implement', () => {
      expect(withAll).toContain('authorizes planning only, even if it also asks to build or fix something');
      expect(withAll).toContain('Do not start implementation in the same response');
      expect(withAll).toContain('Any implementation or apply instruction in that request does not carry forward');
    });
  });

  describe('revising an existing plan', () => {
    const revise = section(withAll, '**Revise the existing planning artifacts**', '**Create the missing planning artifacts**');

    it('confirms each revision of design.md or tasks.md before writing it', () => {
      expect(revise).toContain('Show what would change in each file and why');
      expect(revise).toContain('Write a revision only after the user confirms it');
      expect(revise).toContain('If the user rejects it, leave that file unchanged');
    });

    it('writes nothing when the plan is already coherent', () => {
      expect(revise).toContain('tell the user the plan is up to date and write nothing to it');
    });

    it('keeps completed tasks unless the user explicitly confirms otherwise', () => {
      expect(revise).toContain('a revision keeps every task already marked `[x]`, with its mark');
      expect(revise).toContain('only when the user explicitly confirms that in the revision');
    });

    it('creates a missing planning artifact without asking', () => {
      const create = section(withAll, '**Create the missing planning artifacts**', '**Show final status**');
      expect(create).toContain('Create these without asking for confirmation');
    });
  });

  describe('handoff', () => {
    const output = section(withAll, '**Output**', '**Artifact Creation Guidelines**');

    it('hands off to implementation without assuming the apply skill is installed', () => {
      expect(output).toContain('The change is ready to implement.');
      expect(output).toContain('The plan is ready for review. When you’re ready, ask me to implement it.');
      expect(withAll).not.toContain('/opsx:apply');
    });

    it('stops after summarizing', () => {
      expect(output).toContain('Then stop.');
      expect(withAll).toContain('After presenting the plan, stop and wait for a new user request');
    });
  });
});
