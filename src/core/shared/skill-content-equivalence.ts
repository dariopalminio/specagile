import { OPENSPEC_SKILL_NAMES } from '../config.js';
import {
  isReleasedGeneratedContent,
  normalizeGeneratedContent as normalizeGeneratedSkill,
} from './generated-fingerprint.js';

// SpecAgile: built from the skill names this version writes (`sa-*`), not a
// fixed `openspec-` prefix.
const escapeForRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DUAL_CODEX_REFERENCE = new RegExp(
  `\\$(${[...OPENSPEC_SKILL_NAMES].sort((a, b) => b.length - a.length).map(escapeForRegExp).join('|')}) \\(Codex\\) or \\/\\1 \\(other agents\\)`,
  'g'
);

/**
 * Converts only known generated dual references in current Codex content back
 * to the direct syntax used by legacy `.codex` output.
 */
function toLegacyCodexReferences(content: string): string {
  return content.replace(DUAL_CODEX_REFERENCE, (_match, skillName: string) => `$${skillName}`);
}

/**
 * Returns whether a legacy Codex skill differs from the current canonical
 * replacement only by generated version, checkout line endings/BOM, or the
 * known Codex/generic dual-reference expansion.
 */
export function isLegacyCodexSkillEquivalentToCurrent(
  legacyContent: string,
  currentContent: string
): boolean {
  const normalizedLegacy = normalizeGeneratedSkill(legacyContent);
  const normalizedCurrent = normalizeGeneratedSkill(currentContent);
  return (
    normalizedLegacy === normalizedCurrent ||
    normalizedLegacy === toLegacyCodexReferences(normalizedCurrent)
  );
}

/**
 * Whether a legacy copy of an OpenSpec-managed file can be dropped once its
 * current replacement exists: it matches the replacement, or it is untouched
 * output of some released OpenSpec version. Either way no user edit is lost.
 * Anything else may hold the user's changes and must be kept.
 */
export function isRedundantLegacyCopy(
  legacyContent: string,
  currentContent: string,
  isSkillFile: boolean
): boolean {
  return (
    legacyContent === currentContent ||
    (isSkillFile && isLegacyCodexSkillEquivalentToCurrent(legacyContent, currentContent)) ||
    isReleasedGeneratedContent(legacyContent)
  );
}
