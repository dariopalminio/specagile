import {
  CLI_NAME,
  CLI_WORDS,
  FORMER_SKILL_NAME_BY_WORKFLOW,
  SKILL_NAME_BY_WORKFLOW,
  applyForkIdentity,
} from '../../src/core/fork/identity.js';
import type { WorkflowId } from '../../src/core/profiles.js';

/**
 * The inverse of `applyForkIdentity` for text generated from upstream
 * templates: `sa-*` names back to `openspec-*`, `specagile <word>` back to
 * `openspec <word>`. Upstream tests that pin a template's wording on a
 * generated skill compare through this, so they stay as upstream wrote them
 * (and merge cleanly on sync); the fork's identity itself is pinned in
 * test/fork/.
 */
export function withUpstreamIdentity(text: string): string {
  let result = text.replace(
    /(?<![\w.-])sa-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/g,
    (token) => FORMER_BY_CURRENT.get(token) ?? token
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
 * The released-output fixtures keep the names releases wrote (`openspec-*`):
 * the fixture folder for a skill now installed as `sa-*`.
 */
export function releasedFixtureSkillName(name: string): string {
  return FORMER_BY_CURRENT.get(name) ?? name;
}

const FORMER_BY_CURRENT = new Map(
  (Object.keys(SKILL_NAME_BY_WORKFLOW) as WorkflowId[]).map((workflow) => [
    SKILL_NAME_BY_WORKFLOW[workflow],
    FORMER_SKILL_NAME_BY_WORKFLOW[workflow],
  ])
);
const CLI_WORD_SET = new Set(CLI_WORDS);
const EXACT = ['Bash(openspec:*)', 'Requires openspec CLI.', 'Get-Command openspec '].map(
  (upstream) => [upstream, applyForkIdentity(upstream)] as const
);
