import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { resolveCommandInvocation, resolveCommandSurfaceCapability } from '../../src/core/command-surface.js';
import {
  CLI_WORDS,
  FORMER_SKILL_NAME_BY_WORKFLOW,
  SKILL_NAME_BY_WORKFLOW,
} from '../../src/core/fork/identity.js';
import type { WorkflowId } from '../../src/core/profiles.js';
import { generateSkillContent, getSkillTemplates } from '../../src/core/shared/skill-generation.js';
import { getTransformerForTool, transformToSharedSkillReferences } from '../../src/utils/command-references.js';

/**
 * Every skill SpecAgile generates carries the fork's identity: `sa-*` names,
 * the `specagile` CLI, and references to other skills in the tool's own form.
 * Upstream templates are not edited, so a sync that adds a new wording fails
 * here instead of shipping an `openspec` invocation.
 */

type Target = {
  label: string;
  transformer: ((text: string) => string) | undefined;
  /** How this target refers to the implement skill. */
  implementReference: string;
};

function toolTarget(toolId: string, implementReference: string): Target {
  return {
    label: toolId,
    transformer: getTransformerForTool(
      toolId,
      'skills',
      resolveCommandSurfaceCapability(toolId),
      resolveCommandInvocation(toolId)
    ),
    implementReference,
  };
}

const TARGETS: Target[] = [
  toolTarget('claude', '/sa-implement'),
  toolTarget('codex', '$sa-implement'),
  toolTarget('kimi', '/skill:sa-implement'),
  toolTarget('rovodev', 'the sa-implement skill'),
  { label: 'shared copy', transformer: transformToSharedSkillReferences, implementReference: 'sa-implement' },
];

const FORMER_NAMES = Object.values(FORMER_SKILL_NAME_BY_WORKFLOW);
const escapeForRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FORMER_CLI_INVOCATION = new RegExp(
  `(?<![\\w/.@-])openspec (${CLI_WORDS.map(escapeForRegExp).join('|')})(?![\\w-])`
);
const FORMER_NAME = new RegExp(
  `(?<![\\w.-])(${FORMER_NAMES.map(escapeForRegExp).join('|')})(?![\\w-])`
);

function frontmatterOf(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  expect(match, 'generated skill has no frontmatter').not.toBeNull();
  return parseYaml(match![1]) as Record<string, unknown>;
}

describe.each(TARGETS)('skills generated for $label', ({ transformer, implementReference }) => {
  const entries = getSkillTemplates();

  it.each(entries.map((entry) => [entry.workflowId, entry] as const))(
    '%s carries the SpecAgile identity',
    (workflowId, entry) => {
      const content = generateSkillContent(entry.template, '9.9.9-test', transformer);
      const frontmatter = frontmatterOf(content);

      expect(entry.dirName).toBe(SKILL_NAME_BY_WORKFLOW[workflowId as WorkflowId]);
      expect(frontmatter.name).toBe(entry.dirName);
      expect(frontmatter['allowed-tools']).toBe('Bash(specagile:*)');
      expect(frontmatter.compatibility).toBe('Requires specagile CLI.');

      expect(content.match(FORMER_NAME)?.[0], 'names a former skill').toBeUndefined();
      expect(content.match(FORMER_CLI_INVOCATION)?.[0], 'invokes the former CLI').toBeUndefined();
    }
  );

  it('refers to the implement skill in the tool form', () => {
    const propose = entries.find((entry) => entry.workflowId === 'propose')!;
    const content = generateSkillContent(propose.template, '9.9.9-test', transformer);
    expect(content).toContain(implementReference);
    expect(content).not.toContain('openspec-apply-change');
  });
});

describe('propose skill commands', () => {
  it('runs specagile and keeps the project paths', () => {
    const propose = getSkillTemplates().find((entry) => entry.workflowId === 'propose')!;
    const content = generateSkillContent(propose.template, '9.9.9-test', transformToSharedSkillReferences);
    expect(content).toContain('specagile new change');
    expect(content).toContain('specagile status');
    expect(content).toContain('specagile instructions');
    expect(content).toContain('openspec/config.yaml');
  });

  it('names the "specagile implement" trigger phrase for the implement skill', () => {
    const apply = getSkillTemplates().find((entry) => entry.workflowId === 'apply')!;
    const frontmatter = frontmatterOf(generateSkillContent(apply.template, '9.9.9-test'));
    expect(frontmatter.description).toContain('"specagile implement"');
  });

  it('archive refers to the sync skill by its sa-* name in the shared copy', () => {
    const archive = getSkillTemplates().find((entry) => entry.workflowId === 'archive')!;
    const content = generateSkillContent(archive.template, '9.9.9-test', transformToSharedSkillReferences);
    expect(content).toContain('sa-sync-specs');
  });

  it('codex refers to the archive skill as $sa-archive', () => {
    const codex = TARGETS.find((target) => target.label === 'codex')!;
    const texts = getSkillTemplates().map((entry) =>
      generateSkillContent(entry.template, '9.9.9-test', codex.transformer)
    );
    expect(texts.some((text) => text.includes('$sa-archive'))).toBe(true);
  });
});
