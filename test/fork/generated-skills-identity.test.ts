import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { resolveCommandInvocation, resolveCommandSurfaceCapability } from '../../src/core/command-surface.js';
import {
  CLI_WORDS,
  FORMER_SKILL_NAME_BY_WORKFLOW,
  SKILL_NAME_BY_WORKFLOW,
  TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW,
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
  /** How this target refers to the specify skill (plan names it). */
  specifyReference: string;
};

function toolTarget(toolId: string, specifyReference: string): Target {
  return {
    label: toolId,
    transformer: getTransformerForTool(
      toolId,
      'skills',
      resolveCommandSurfaceCapability(toolId),
      resolveCommandInvocation(toolId)
    ),
    specifyReference,
  };
}

const TARGETS: Target[] = [
  toolTarget('claude', '/sa-specify'),
  toolTarget('codex', '$sa-specify'),
  toolTarget('kimi', '/skill:sa-specify'),
  toolTarget('rovodev', 'the sa-specify skill'),
  { label: 'shared copy', transformer: transformToSharedSkillReferences, specifyReference: 'sa-specify' },
];

// The names templates are written with: former ones, and the fork's template-only `openspec-tasks`.
const FORMER_NAMES = [
  ...Object.values(FORMER_SKILL_NAME_BY_WORKFLOW),
  ...Object.values(TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW),
] as string[];
const escapeForRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FORMER_CLI_INVOCATION = new RegExp(
  `(?<![\\w/.@-])openspec (${CLI_WORDS.map(escapeForRegExp).join('|')})(?![\\w-])`
);
// `openspec/` as a folder: not `.openspec-store/` or `~/openspec/<id>` (a store's suggested place).
const FORMER_LAYOUT_PATH = /(?<![\w.~-])openspec\//;
// A change's metadata file is `.specagile.yaml`: `.openspec.yaml` is the former name.
const FORMER_METADATA_FILE = /\.openspec\.yaml/;
const FORMER_NAME = new RegExp(
  `(?<![\\w.-])(${FORMER_NAMES.map(escapeForRegExp).join('|')})(?![\\w-])`
);

function frontmatterOf(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  expect(match, 'generated skill has no frontmatter').not.toBeNull();
  return parseYaml(match![1]) as Record<string, unknown>;
}

describe.each(TARGETS)('skills generated for $label', ({ transformer, specifyReference }) => {
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
      // SpecAgile: the layout of src/core/fork/layout.ts; internal names stay.
      expect(content.match(FORMER_LAYOUT_PATH)?.[0], 'names a path under openspec/').toBeUndefined();
      expect(content.match(FORMER_METADATA_FILE)?.[0], 'names the former change metadata file').toBeUndefined();
    }
  );

  // Since upstream 2.1 propose no longer names the apply skill; plan still
  // names specify and tasks ("if that skill is installed").
  it('refers to another skill in the tool form', () => {
    const plan = entries.find((entry) => entry.workflowId === 'plan')!;
    const content = generateSkillContent(plan.template, '9.9.9-test', transformer);
    expect(content).toContain(specifyReference);
    expect(content).not.toContain('openspec-specify');
    expect(content).toContain(specifyReference.replace('sa-specify', 'sa-tasks'));
    expect(content).not.toContain('openspec-tasks');
  });
});

describe('propose skill commands', () => {
  it('runs specagile and reads the config at specagile/config.yaml', () => {
    const propose = getSkillTemplates().find((entry) => entry.workflowId === 'propose')!;
    const content = generateSkillContent(propose.template, '9.9.9-test', transformToSharedSkillReferences);
    expect(content).toContain('specagile new change');
    expect(content).toContain('specagile status');
    expect(content).toContain('specagile instructions');
    expect(content).toContain('<root.path>/specagile/config.yaml');
    expect(content).not.toContain('openspec/');
  });

  it('sync places each living spec at <planningHome.root>/specs/', () => {
    const sync = getSkillTemplates().find((entry) => entry.workflowId === 'sync')!;
    const content = generateSkillContent(sync.template, '9.9.9-test', transformToSharedSkillReferences);
    expect(content).toContain('<planningHome.root>/specs/<capability-path>/spec.md');
  });

  it('specify names .specagile.yaml as the metadata new change creates and where skip_specs goes', () => {
    const specify = getSkillTemplates().find((entry) => entry.workflowId === 'specify')!;
    const content = generateSkillContent(specify.template, '9.9.9-test', transformToSharedSkillReferences);
    expect(content).toContain('resolved by the CLI with `.specagile.yaml`');
    expect(content).toContain('declares `skip_specs: true` in its `.specagile.yaml`');
    expect(content).not.toContain('.openspec.yaml');
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

// SpecAgile: the static distribution that `init` and `update` fetch.
describe('the skills/ distribution', () => {
  const skillsRoot = path.resolve(__dirname, '..', '..', 'skills');

  function* filesUnder(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) yield* filesUnder(full);
      else yield full;
    }
  }

  function linesMatching(pattern: RegExp): string[] {
    const found: string[] = [];
    for (const file of filesUnder(skillsRoot)) {
      const rel = path.relative(skillsRoot, file).split(path.sep).join('/');
      fs.readFileSync(file, 'utf-8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          if (pattern.test(line)) found.push(`skills/${rel}:${index + 1}`);
        });
    }
    return found;
  }

  it('names no path under openspec/', () => {
    expect(linesMatching(FORMER_LAYOUT_PATH)).toEqual([]);
  });

  it('names no .openspec.yaml (run pnpm generate:skills)', () => {
    expect(linesMatching(FORMER_METADATA_FILE)).toEqual([]);
  });
});
