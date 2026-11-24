import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  AUDIT_DESCRIPTION,
  AUDIT_TEXT_REPLACEMENTS,
  getAuditSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
import { SKILL_NAME_BY_WORKFLOW } from '../../../src/core/fork/identity.js';
import { transformToSharedSkillReferences } from '../../../src/utils/command-references.js';
import { withUpstreamVerifyText } from '../../helpers/fork-identity.js';

// The sa-audit skill is upstream's verify skill with the audit's framing
// (src/core/templates/workflows/audit.ts). These guards keep it that way
// (specs/opsx-audit-skill/spec.md): only the texts in AUDIT_TEXT_REPLACEMENTS
// change, so its checks are upstream's by construction, and no verify framing
// is left in the skill an agent receives.

const upstream = getVerifyChangeSkillTemplate();
const audit = getAuditSkillTemplate();

const generated = [
  ['generated skill', generateSkillContent(audit, 'TEST')],
  ['shared copy', generateSkillContent(audit, 'TEST', transformToSharedSkillReferences)],
] as const;

describe('audit skill template', () => {
  it('changes only the texts in its table', () => {
    expect(withUpstreamVerifyText(audit.instructions)).toBe(upstream.instructions);
  });

  it('uses no audit text that upstream already wrote', () => {
    for (const [, auditText] of AUDIT_TEXT_REPLACEMENTS) {
      expect(upstream.instructions, auditText).not.toContain(auditText);
    }
  });

  it("keeps upstream's name and frontmatter fields, with its own description", () => {
    // Written with OpenSpec's names; generation gives it SpecAgile's (FORK.md).
    expect(audit.name).toBe('openspec-verify-change');
    expect(audit.description).toBe(AUDIT_DESCRIPTION);
    expect(audit.license).toBe(upstream.license);
    expect(audit.compatibility).toBe(upstream.compatibility);
    expect(audit.metadata).toEqual(upstream.metadata);

    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(generated[0][1])?.[1];
    const parsed = parseYaml(frontmatter!) as { name: string };
    expect(parsed.name).toBe(SKILL_NAME_BY_WORKFLOW.verify);
  });

  it.each(generated)('%s: has no verify framing left', (_label, content) => {
    expect(content).not.toMatch(/verification/i);
    expect(content).not.toContain('Ready for archive');
    expect(content).not.toContain('before archiv');
    expect(content).not.toContain('archive-readiness');
  });

  it.each(generated)('%s: reports an Audit Report with a PR-readiness verdict', (_label, content) => {
    expect(content).toContain('## Audit Report: <change-name>');
    expect(content).toContain('**Generate the Audit Report**');
    expect(content).toContain('All checks passed. Ready for PR.');
    expect(content).toContain('Ready for PR (with noted improvements).');
    expect(content).toContain('X critical issue(s) found. Fix before opening the PR.');
    expect(content).toContain('(Must fix before the PR)');
  });

  it('says up front that the audit is read-only and runs nothing', () => {
    const intro = audit.instructions.slice(0, audit.instructions.indexOf(STORE_SELECTION_GUIDANCE));
    expect(intro).toContain('Audit a change before its pull request');
    expect(intro).toContain('Definition of Done');
    expect(intro).toContain('static and read-only');
    expect(intro).toContain('do not run tests or builds');
    expect(intro).toContain('do not edit code or artifacts');
  });

  it('keeps the advisory rules about archive as upstream wrote them', () => {
    expect(audit.instructions).toContain('The audit is advisory.');
    expect(audit.instructions).toContain(
      '`Not verified` describes a limit of this report, not a new archive prerequisite. Archive retains its own checks and user-confirmation behavior.'
    );
  });

  it('fails generation when an upstream text in the table is missing', () => {
    const missing = 'Text verify-change.ts never wrote.';
    expect(() => getAuditSkillTemplate([[missing, 'Audit text.']])).toThrow(JSON.stringify(missing));
    expect(() => getAuditSkillTemplate([...AUDIT_TEXT_REPLACEMENTS, [missing, 'Audit text.']])).toThrow(
      /AUDIT_TEXT_REPLACEMENTS/
    );
  });
});
