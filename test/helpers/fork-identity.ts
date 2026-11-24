import {
  CLI_NAME,
  CLI_WORDS,
  FORMER_SKILL_NAME_BY_WORKFLOW,
  PRODUCT_TEXT_REPLACEMENTS,
  SKILL_NAME_BY_WORKFLOW,
  TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW,
  applyForkIdentity,
} from '../../src/core/fork/identity.js';
import { LAYOUT_TEXT_REPLACEMENTS } from '../../src/core/fork/layout.js';
import type { WorkflowId } from '../../src/core/profiles.js';
import { AUDIT_TEXT_REPLACEMENTS } from '../../src/core/templates/workflows/audit.js';

/**
 * The inverse of `applyForkIdentity` for text generated from upstream
 * templates: the greetings back to OpenSpec's (the inverse of
 * PRODUCT_TEXT_REPLACEMENTS), the layout paths back to `openspec/…` (the
 * inverse of LAYOUT_TEXT_REPLACEMENTS), `sa-*` names back to `openspec-*`,
 * `specagile <word>` back to `openspec <word>`. Upstream tests that pin a
 * template's wording on a generated skill compare through this, so they stay as
 * upstream wrote them (and merge cleanly on sync); the fork's identity itself
 * is pinned in test/fork/.
 */
export function withUpstreamIdentity(text: string): string {
  let result = text;
  for (const [upstream, fork] of PRODUCT_TEXT_REPLACEMENTS) {
    result = result.split(fork).join(upstream);
  }
  for (const [upstream, fork] of LAYOUT_BY_LENGTH) {
    result = result.split(fork).join(upstream);
  }
  result = result.replace(
    /(?<![\w.-])sa-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/g,
    (token) => UPSTREAM_BY_CURRENT.get(token) ?? token
  );
  result = result.replace(
    new RegExp(`(?<![\\w/.@-])${CLI_NAME} ([\\w-]+)(?![\\w-])`, 'g'),
    (match, word: string) => (CLI_WORD_SET.has(word) ? `openspec ${word}` : match)
  );
  for (const [upstream, fork] of EXACT) {
    result = result.split(fork).join(upstream);
  }
  return result;
}

/**
 * The inverse of AUDIT_TEXT_REPLACEMENTS (src/core/templates/workflows/audit.ts):
 * sa-audit's text with upstream's verify framing put back, applied after
 * `withUpstreamIdentity` for a generated file. Tests that pin upstream's verify
 * wording read the sa-audit skill through this; audit.test.ts checks that it
 * gives back upstream's text exactly.
 */
export function withUpstreamVerifyText(text: string): string {
  let result = text;
  for (const [upstream, audit] of [...AUDIT_TEXT_REPLACEMENTS].reverse()) {
    result = result.split(audit).join(upstream);
  }
  return result;
}

/**
 * The released-output fixtures keep the names releases wrote (`openspec-*`):
 * the fixture folder for a skill now installed as `sa-*`.
 */
export function releasedFixtureSkillName(name: string): string {
  return FORMER_BY_CURRENT.get(name) ?? name;
}

// Only OpenSpec's names a release installed (`tasks` has none). SpecAgile's
// former `sa-verify` is not one: templates and the released fixtures never say it.
const FORMER_BY_CURRENT = new Map(
  (Object.keys(FORMER_SKILL_NAME_BY_WORKFLOW) as WorkflowId[]).map(
    (workflow) => [SKILL_NAME_BY_WORKFLOW[workflow], FORMER_SKILL_NAME_BY_WORKFLOW[workflow]!] as const
  )
);
// The names templates are written with: the former ones, and the fork's
// template-only ones (`openspec-tasks`).
const UPSTREAM_BY_CURRENT = new Map([
  ...FORMER_BY_CURRENT,
  ...(Object.keys(TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW) as WorkflowId[]).map(
    (workflow) => [SKILL_NAME_BY_WORKFLOW[workflow], TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW[workflow]!] as const
  ),
]);
const CLI_WORD_SET = new Set(CLI_WORDS);
// Longest translation first, as the table is applied longest upstream text first.
const LAYOUT_BY_LENGTH = [...LAYOUT_TEXT_REPLACEMENTS].sort((a, b) => b[1].length - a[1].length);
const EXACT = ['Bash(openspec:*)', 'Requires openspec CLI.', 'Get-Command openspec '].map(
  (upstream) => [upstream, applyForkIdentity(upstream)] as const
);
