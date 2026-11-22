import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { program } from '../../src/cli/index.js';
import {
  CLI_NAME,
  CLI_SUBCOMMANDS,
  CLI_WORDS,
  FORMER_SKILL_NAME_BY_WORKFLOW,
  FORMER_SKILL_NAMES,
  KNOWN_SKILL_NAMES,
  PACKAGE_NAME,
  PRODUCT_TEXT_REPLACEMENTS,
  REPOSITORY_URL,
  SKILL_NAME_BY_WORKFLOW,
  TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW,
  applyForkIdentity,
  applyForkNames,
  formerSkillNames,
} from '../../src/core/fork/identity.js';
import { LAYOUT_TEXT_REPLACEMENTS } from '../../src/core/fork/layout.js';
import { ALL_WORKFLOWS, type WorkflowId } from '../../src/core/profiles.js';
import {
  generateSkillContent,
  getCommandTemplates,
  getSkillTemplates,
} from '../../src/core/shared/skill-generation.js';
import { withUpstreamIdentity } from '../helpers/fork-identity.js';

// `former` is undefined only for a workflow the fork added after the rename.
const EXPECTED_SKILL_NAMES: Record<WorkflowId, [former: string | undefined, current: string]> = {
  explore: ['openspec-explore', 'sa-explore'],
  propose: ['openspec-propose', 'sa-propose'],
  specify: ['openspec-specify', 'sa-specify'],
  plan: ['openspec-plan', 'sa-plan'],
  tasks: [undefined, 'sa-tasks'],
  apply: ['openspec-apply-change', 'sa-implement'],
  verify: ['openspec-verify-change', 'sa-verify'],
  archive: ['openspec-archive-change', 'sa-archive'],
  new: ['openspec-new-change', 'sa-new-change'],
  continue: ['openspec-continue-change', 'sa-continue-change'],
  ff: ['openspec-ff-change', 'sa-ff-change'],
  'bulk-archive': ['openspec-bulk-archive-change', 'sa-bulk-archive-change'],
  onboard: ['openspec-onboard', 'sa-onboard'],
  update: ['openspec-update-change', 'sa-update-change'],
  sync: ['openspec-sync-specs', 'sa-sync-specs'],
};

describe('fork identity tables', () => {
  it('names the CLI specagile', () => {
    expect(CLI_NAME).toBe('specagile');
  });

  it('is published as the specagile package, with only the specagile executable', () => {
    const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')) as {
      name: string;
      bin: Record<string, string>;
      repository: { url: string };
      homepage: string;
    };
    expect(PACKAGE_NAME).toBe('specagile');
    expect(pkg.name).toBe(PACKAGE_NAME);
    expect(pkg.bin).toEqual({ [CLI_NAME]: './bin/specagile.js' });
    expect(pkg.repository.url).toBe(REPOSITORY_URL);
    expect(pkg.homepage).toBe(REPOSITORY_URL);
  });

  it('maps every workflow to the names in the spec', () => {
    expect(Object.keys(SKILL_NAME_BY_WORKFLOW).sort()).toEqual([...ALL_WORKFLOWS].sort());
    for (const workflow of ALL_WORKFLOWS) {
      const [former, current] = EXPECTED_SKILL_NAMES[workflow];
      expect(FORMER_SKILL_NAME_BY_WORKFLOW[workflow]).toBe(former);
      expect(formerSkillNames(workflow)).toEqual(former === undefined ? [] : [former]);
      expect(SKILL_NAME_BY_WORKFLOW[workflow]).toBe(current);
    }
  });

  it('has a former name for every workflow but tasks, which never had one', () => {
    expect(Object.keys(FORMER_SKILL_NAME_BY_WORKFLOW).sort()).toEqual(
      ALL_WORKFLOWS.filter((workflow) => workflow !== 'tasks').sort()
    );
    expect(formerSkillNames('tasks')).toEqual([]);
    expect(FORMER_SKILL_NAMES).toHaveLength(14);
    expect(FORMER_SKILL_NAMES).not.toContain('openspec-tasks');
    expect(KNOWN_SKILL_NAMES).not.toContain('openspec-tasks');
  });

  it("translates the tasks template's name without making it a former name", () => {
    expect(TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW).toEqual({ tasks: 'openspec-tasks' });
    expect(applyForkIdentity('name: openspec-tasks\n')).toBe('name: sa-tasks\n');
    expect(applyForkIdentity('/openspec-tasks')).toBe('/sa-tasks');
    expect(applyForkIdentity('$openspec-tasks (Codex) or /openspec-tasks (other agents)')).toBe(
      '$sa-tasks (Codex) or /sa-tasks (other agents)'
    );
    expect(applyForkIdentity('"openspec tasks"')).toBe('"specagile tasks"');
  });

  it('knows both the current and the former names', () => {
    expect(new Set(KNOWN_SKILL_NAMES)).toEqual(
      new Set(Object.values(EXPECTED_SKILL_NAMES).flat().filter((name) => name !== undefined))
    );
  });

  it('lists exactly the subcommands the CLI registers', () => {
    const registered = program.commands.map((command) => command.name()).sort();
    expect([...CLI_SUBCOMMANDS].sort()).toEqual(registered);
    for (const subcommand of CLI_SUBCOMMANDS) {
      expect(CLI_WORDS).toContain(subcommand);
    }
  });
});

describe('applyForkIdentity', () => {
  it.each(Object.entries(EXPECTED_SKILL_NAMES).filter(([, [former]]) => former !== undefined))(
    'renames the %s skill in every reference form',
    (_workflow, [former, current]) => {
      expect(applyForkIdentity(`/${former}`)).toBe(`/${current}`);
      expect(applyForkIdentity(`$${former}`)).toBe(`$${current}`);
      expect(applyForkIdentity(`/skill:${former}`)).toBe(`/skill:${current}`);
      expect(applyForkIdentity(`the ${former} skill`)).toBe(`the ${current} skill`);
      expect(applyForkIdentity(`name: ${former}\n`)).toBe(`name: ${current}\n`);
      expect(applyForkIdentity(`Use \`${former}\`.`)).toBe(`Use \`${current}\`.`);
      expect(applyForkIdentity(`$${former} (Codex) or /${former} (other agents)`)).toBe(
        `$${current} (Codex) or /${current} (other agents)`
      );
    }
  );

  it('translates CLI invocations', () => {
    expect(applyForkIdentity('openspec status --change foo')).toBe('specagile status --change foo');
    expect(applyForkIdentity('`openspec new change "x"`')).toBe('`specagile new change "x"`');
    expect(applyForkIdentity('openspec --version 2>&1')).toBe('specagile --version 2>&1');
    expect(applyForkIdentity('run `openspec init`.')).toBe('run `specagile init`.');
  });

  it('translates trigger phrases', () => {
    expect(applyForkIdentity('"openspec apply"')).toBe('"specagile apply"');
    expect(applyForkIdentity('"openspec implement"')).toBe('"specagile implement"');
    expect(applyForkIdentity('"openspec update change"')).toBe('"specagile update change"');
    expect(applyForkIdentity('"openspec bulk-archive"')).toBe('"specagile bulk-archive"');
  });

  it('translates the frontmatter texts that name the CLI', () => {
    expect(applyForkIdentity('allowed-tools: Bash(openspec:*)')).toBe('allowed-tools: Bash(specagile:*)');
    expect(applyForkIdentity('compatibility: Requires openspec CLI.')).toBe(
      'compatibility: Requires specagile CLI.'
    );
    expect(
      applyForkIdentity('if (Get-Command openspec -ErrorAction SilentlyContinue) { openspec --version }')
    ).toBe('if (Get-Command specagile -ErrorAction SilentlyContinue) { specagile --version }');
  });

  it('leaves paths, internal files, prose and unknown names alone', () => {
    const untouched = [
      'openspec/changes/<name>/',
      'openspec/config.yaml',
      '.agents/skills/openspec-helpers/SKILL.md',
      'openspec-helpers',
      '.agents/skills/.openspec-target',
      '.openspec-store/',
      'An OpenSpec change',
      'the openspec CLI',
      'OpenSpec CLI is not installed',
      'npm install -g @fission-ai/openspec@latest',
      'npx @fission-ai/openspec init',
      'openspec -ErrorAction',
      'author: openspec',
      'my-openspec-propose',
      'openspec-propose-extra',
      'openspec listing',
    ];
    for (const text of untouched) {
      expect(applyForkIdentity(text), text).toBe(text);
    }
  });

  it('is idempotent', () => {
    const text = [
      'name: openspec-propose',
      'allowed-tools: Bash(openspec:*)',
      'compatibility: Requires openspec CLI.',
      'Run `openspec status --change "x" --json`, then /openspec-apply-change.',
      'Also use when the user says "openspec implement".',
      'Files live in openspec/changes/x/.',
    ].join('\n');
    const once = applyForkIdentity(text);
    expect(applyForkIdentity(once)).toBe(once);
    expect(once).not.toMatch(/openspec-propose|openspec-apply-change|openspec status|openspec implement/);
    expect(once).toContain('openspec/changes/x/');
  });
});

// SpecAgile: the layout paths in upstream's text (src/core/fork/layout.ts).
describe('the layout in generated text', () => {
  const templateTexts = (): Array<[string, string]> => [
    ...getSkillTemplates().flatMap(({ template, workflowId }) => [
      [`${workflowId} skill instructions`, template.instructions] as [string, string],
      [`${workflowId} skill description`, template.description] as [string, string],
    ]),
    ...getCommandTemplates().map(({ template, id }) => [`${id} command`, template.content] as [string, string]),
  ];

  it('translates each entry of the table', () => {
    for (const [upstream, fork] of LAYOUT_TEXT_REPLACEMENTS) {
      expect(applyForkIdentity(upstream), upstream).toBe(fork);
      expect(fork, upstream).not.toContain('openspec/');
    }
  });

  it('keeps the names-only translation of SpecAgile 2.1 apart', () => {
    const upstream = 'Read `<root.path>/openspec/config.yaml`, then run `openspec status`.';
    expect(applyForkNames(upstream)).toBe('Read `<root.path>/openspec/config.yaml`, then run `specagile status`.');
    expect(applyForkIdentity(upstream)).toBe('Read `<root.path>/specagile/config.yaml`, then run `specagile status`.');
  });

  it('is idempotent on every template', () => {
    for (const [label, text] of templateTexts()) {
      const once = applyForkIdentity(text);
      expect(applyForkIdentity(once), label).toBe(once);
    }
  });

  it("translates a change's metadata file, and nothing that only resembles it", () => {
    expect(applyForkIdentity('changes/<name>/.openspec.yaml')).toBe('changes/<name>/.specagile.yaml');
    expect(applyForkIdentity("the change's `.openspec.yaml` declares `retire_capabilities: true`")).toBe(
      "the change's `.specagile.yaml` declares `retire_capabilities: true`"
    );
    expect(applyForkIdentity('Preserve .openspec.yaml when moving to archive')).toBe(
      'Preserve .specagile.yaml when moving to archive'
    );
    for (const text of ['.openspec-store/store.yaml', '.agents/skills/.openspec-target', 'openspec.yaml', '.openspec.yml']) {
      expect(applyForkIdentity(text), text).toBe(text);
    }
  });

  it('leaves internal files, the store location and the npm package alone', () => {
    const untouched = [
      '.agents/skills/.openspec-target',
      '<store>/.openspec-store/store.yaml',
      'specagile store setup team --path ~/openspec/team',
      'npm install -g @fission-ai/openspec@latest',
    ];
    for (const text of untouched) {
      expect(applyForkIdentity(text), text).toBe(text);
    }
  });

  it('goes back to the upstream text, exactly, from every template', () => {
    for (const [label, text] of templateTexts()) {
      expect(withUpstreamIdentity(applyForkIdentity(text)), label).toBe(text);
    }
  });
});

// SpecAgile: the greetings in upstream's text (PRODUCT_TEXT_REPLACEMENTS).
describe('the greetings in generated text', () => {
  const onboard = () => {
    const entry = getSkillTemplates().find(({ workflowId }) => workflowId === 'onboard');
    if (!entry) throw new Error('no onboard skill');
    return entry.template;
  };

  it('translates each entry of the table, and only greets as SpecAgile', () => {
    for (const [upstream, fork] of PRODUCT_TEXT_REPLACEMENTS) {
      expect(applyForkIdentity(upstream), upstream).toBe(fork);
      expect(applyForkIdentity(fork), fork).toBe(fork);
      expect(fork, upstream).not.toContain('OpenSpec');
    }
  });

  it("still matches upstream's text, so a sync that rewords a greeting fails here", () => {
    const upstreamText = getSkillTemplates()
      .map(({ template }) => template.instructions)
      .join('\n');
    for (const [upstream] of PRODUCT_TEXT_REPLACEMENTS) {
      expect(upstreamText, upstream).toContain(upstream);
    }
  });

  it("greets the user as SpecAgile in the generated onboard skill, from upstream's template", () => {
    expect(onboard().instructions).toContain('## Welcome to OpenSpec!');

    const generated = generateSkillContent(onboard(), '0.0.0');
    expect(generated).toContain('## Welcome to SpecAgile!');
    expect(generated).not.toContain('Welcome to OpenSpec');
  });
});
