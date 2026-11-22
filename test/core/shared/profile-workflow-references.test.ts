import { describe, expect, it } from 'vitest';

import {
  getSkillTemplates,
  getCommandContents,
} from '../../../src/core/shared/skill-generation.js';
import {
  ALL_WORKFLOWS,
  CORE_WORKFLOWS,
  getProfileWorkflows,
} from '../../../src/core/profiles.js';

describe('workflow handoffs with custom profiles', () => {
  it.each([['propose'], ['propose', 'apply']])('stops a proposal at review (%s)', (...workflows) => {
    const skill = getSkillTemplates(workflows).find(entry => entry.workflowId === 'propose')!;
    expect(skill.template.instructions).toContain('The plan is ready for review. When you’re ready, ask me to apply it.');
  });

  it.each([['apply'], ['apply', 'continue']])('uses the CLI recovery step when apply is blocked (%s)', (...workflows) => {
    const skill = getSkillTemplates(workflows).find(entry => entry.workflowId === 'apply')!;
    expect(skill.template.instructions).toContain('show the message and pause implementation');
    expect(skill.template.instructions).toContain('recovery step from the CLI’s `instruction` field');
  });

  it('offers only workflows available to the agent during onboarding', () => {
    const skill = getSkillTemplates(['onboard', 'explore']).find(entry => entry.workflowId === 'onboard')!;
    expect(skill.template.instructions).toContain('List the OpenSpec workflows available to you in this session');
    expect(skill.template.instructions).not.toContain('| `/opsx:ff');
  });
  // A skill's text is the same for every profile, so a workflow the profile
  // leaves out may only be named "if that skill is installed".
  it.each<[string, readonly string[]]>([
    ['only plan', ['plan']],
    ['all but tasks', ALL_WORKFLOWS.filter((workflow) => workflow !== 'tasks')],
  ])('names no workflow outside the profile as installed (%s)', (_label, workflows) => {
    const installed = new Set<string>(workflows);
    const skills = getSkillTemplates(workflows);
    expect(skills.map((entry) => entry.workflowId).sort()).toEqual([...workflows].sort());
    for (const { workflowId, template } of skills) {
      for (const [line, id] of template.instructions.matchAll(/\/opsx:([a-z-]+)[^\n]*/g)) {
        if (installed.has(id)) continue;
        expect(line, `${workflowId} names /opsx:${id}`).toContain('if that skill is installed');
      }
    }
  });

  it('keeps the core profile as the default workflow set', () => {
    expect([...getProfileWorkflows('core')].sort()).toEqual([...CORE_WORKFLOWS].sort());
  });

  // Archiving merges delta specs into main specs, which is the sync workflow's
  // job. Selecting archive in a custom profile pulls sync in with it.
  it('injects sync for a custom profile that selects archive', () => {
    expect(getProfileWorkflows('custom', ['archive'])).toContain('sync');
    expect(getProfileWorkflows('custom', ['bulk-archive'])).toContain('sync');
  });
});
