import { describe, expect, it } from 'vitest';

import { program } from '../../src/cli/index.js';
import {
  CLI_NAME,
  CLI_SUBCOMMANDS,
  CLI_WORDS,
  FORMER_SKILL_NAME_BY_WORKFLOW,
  KNOWN_SKILL_NAMES,
  SKILL_NAME_BY_WORKFLOW,
  applyForkIdentity,
} from '../../src/core/fork/identity.js';
import { ALL_WORKFLOWS, type WorkflowId } from '../../src/core/profiles.js';

const EXPECTED_SKILL_NAMES: Record<WorkflowId, [former: string, current: string]> = {
  explore: ['openspec-explore', 'sa-explore'],
  propose: ['openspec-propose', 'sa-propose'],
  specify: ['openspec-specify', 'sa-specify'],
  plan: ['openspec-plan', 'sa-plan'],
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

  it('maps every workflow to the names in the spec', () => {
    expect(Object.keys(SKILL_NAME_BY_WORKFLOW).sort()).toEqual([...ALL_WORKFLOWS].sort());
    expect(Object.keys(FORMER_SKILL_NAME_BY_WORKFLOW).sort()).toEqual([...ALL_WORKFLOWS].sort());
    for (const workflow of ALL_WORKFLOWS) {
      const [former, current] = EXPECTED_SKILL_NAMES[workflow];
      expect(FORMER_SKILL_NAME_BY_WORKFLOW[workflow]).toBe(former);
      expect(SKILL_NAME_BY_WORKFLOW[workflow]).toBe(current);
    }
  });

  it('knows both the current and the former names', () => {
    expect(new Set(KNOWN_SKILL_NAMES)).toEqual(
      new Set(Object.values(EXPECTED_SKILL_NAMES).flat())
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
  it.each(Object.entries(EXPECTED_SKILL_NAMES))(
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
