/**
 * Audit workflow (SpecAgile fork).
 *
 * The skill the `verify` workflow installs as `sa-audit`: the static,
 * read-only audit of a change before its pull request. It checks what
 * upstream's verify skill checks, with the same rules, and frames the result
 * as an Audit Report whose verdict says whether the change is ready for its
 * PR.
 *
 * Fork-owned, derived from verify-change.ts at generation time, which is left
 * untouched so upstream syncs do not conflict: the description is the fork's,
 * and the instructions are upstream's with each text in
 * AUDIT_TEXT_REPLACEMENTS swapped for the audit's. Every entry must match, so
 * a sync that rewrites one of those texts fails generation instead of leaving
 * the skill half translated; the entry is then updated to the new text. See
 * "The audit skill" in FORK.md.
 */
import type { SkillTemplate } from '../types.js';
import { getVerifyChangeSkillTemplate } from './verify-change.js';

/**
 * The skill's description, written with OpenSpec's names like every template.
 * It is an unquoted YAML scalar in the frontmatter, so no `: ` in it, and it
 * says "OpenSpec", as every skill description must (#1645,
 * test/core/templates/project-root-guard.test.ts).
 */
export const AUDIT_DESCRIPTION =
  'Audit an OpenSpec change before its pull request - check that the implementation is complete, correct, and coherent with the change artifacts, and report drift between spec and code. Read-only - it reports issues and never fixes them. Use when the user wants to know whether a change is ready for its PR. Also use when the user says "openspec audit" or "opsx verify".';

/**
 * Each exact upstream text in verify-change.ts's instructions that frames the
 * skill as a verification before archiving, with the audit's. Every occurrence
 * is replaced. Only the framing is here: the checks, their rules and the
 * generic verb "verify" in a step ("verify task completion only") stay as
 * upstream wrote them, and so do the sentences saying `Not verified` is no new
 * archive prerequisite and that archive keeps its own checks.
 */
export const AUDIT_TEXT_REPLACEMENTS: ReadonlyArray<readonly [upstream: string, audit: string]> = [
  [
    'Verify that an implementation matches the change artifacts (specs, tasks, design).',
    'Audit a change before its pull request: check that the implementation matches the change artifacts (specs, tasks, design), to tell whether the change meets its Definition of Done and whether the code has drifted from the spec.\n\n' +
      'The audit is static and read-only. Read the artifacts, the code, and its tests; do not run tests or builds, and do not edit code or artifacts. Report what you find: what to fix is the user\'s decision.',
  ],
  [
    'not a verification verdict. Do not implement tasks or archive the change during verification.',
    'not an audit verdict. Do not implement tasks or archive the change during the audit.',
  ],
  ['**Initialize verification report structure**', '**Initialize the audit report structure**'],
  ['Verification is advisory.', 'The audit is advisory.'],
  ['the archive-readiness assessment', 'the PR-readiness assessment'],
  ['**Verify Completeness**', '**Audit Completeness**'],
  ['**Verify Correctness**', '**Audit Correctness**'],
  ['**Verify Coherence**', '**Audit Coherence**'],
  ['**Generate Verification Report**', '**Generate the Audit Report**'],
  ['## Verification Report: <change-name>', '## Audit Report: <change-name>'],
  ['(Must fix before archive)', '(Must fix before the PR)'],
  ['Fix before archiving.', 'Fix before opening the PR.'],
  ['Ready for archive (with noted improvements).', 'Ready for PR (with noted improvements).'],
  ['All checks passed. Ready for archive.', 'All checks passed. Ready for PR.'],
  ['**Verification Heuristics**', '**Audit Heuristics**'],
];

/**
 * Applies `replacements` to `instructions`, every occurrence of each. Throws,
 * naming the entry, when an upstream text is missing.
 */
function applyAuditText(
  instructions: string,
  replacements: ReadonlyArray<readonly [upstream: string, audit: string]>
): string {
  let result = instructions;
  for (const [upstream, audit] of replacements) {
    if (!result.includes(upstream)) {
      throw new Error(
        `Cannot build the sa-audit skill: verify-change.ts no longer contains ${JSON.stringify(upstream)} ` +
          '(an AUDIT_TEXT_REPLACEMENTS entry in src/core/templates/workflows/audit.ts). ' +
          'Update the entry to the new upstream text.'
      );
    }
    result = result.split(upstream).join(audit);
  }
  return result;
}

/**
 * The `sa-audit` skill: upstream's verify skill with the fork's description
 * and the audit's framing (AUDIT_TEXT_REPLACEMENTS).
 *
 * `name` stays `openspec-verify-change`, upstream's: templates are written
 * with OpenSpec's names, and generation translates this one to the `verify`
 * workflow's skill name (`sa-audit`). That translation is also what turns a
 * `/opsx:verify` reference into `sa-audit`, and what lets tests read the skill
 * back in upstream's names.
 *
 * @param replacements - The table to apply; tests pass their own.
 */
export function getAuditSkillTemplate(
  replacements: ReadonlyArray<readonly [upstream: string, audit: string]> = AUDIT_TEXT_REPLACEMENTS
): SkillTemplate {
  const upstream = getVerifyChangeSkillTemplate();
  return {
    ...upstream,
    description: AUDIT_DESCRIPTION,
    instructions: applyAuditText(upstream.instructions, replacements),
  };
}
