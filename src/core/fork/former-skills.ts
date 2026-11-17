/**
 * SpecAgile: retires skills installed under their former `openspec-*` names
 * (by OpenSpec upstream, or by this fork before the rename), once `init` or
 * `update` has installed the `sa-*` ones that replace them.
 *
 * Only the fourteen names in FORMER_SKILL_NAME_BY_WORKFLOW are looked at,
 * never an `openspec-*` glob. A SKILL.md goes only when it is text OpenSpec
 * wrote: a release's (`isReleasedGeneratedContent`) or what this version
 * generates for the skill once the fork's identity is applied, which covers
 * OpenSpec 2.0.0 and the fork before the rename (see FORMER_RELEASE_FINGERPRINTS).
 * Anything else is the user's: kept and reported. A link of the user's is left
 * alone without a word. Every change goes through the run's `ops` and is read
 * through its `view`, so `update --dry-run` plans it.
 */
import path from 'path';
import * as fs from 'fs';

import type { AIToolOption } from '../config.js';
import type { FileView } from '../file-view.js';
import type { WorkflowId } from '../profiles.js';
import type { UpdateFileOps } from '../update-plan.js';
import { pruneEmptyParents } from '../released-output-sweep.js';
import { projectSkillText } from '../skill-installer.js';
import { resolveCommandInvocation, resolveCommandSurfaceCapability } from '../command-surface.js';
import {
  fingerprintGeneratedContent,
  isReleasedGeneratedContent,
  normalizeGeneratedContent,
} from '../shared/generated-fingerprint.js';
import { generateSkillContent, getSkillTemplates, stripVolatileFrontmatter } from '../shared/skill-generation.js';
import { classifySkillLinkSpot, isCheckedOutLink } from '../shared/skill-links.js';
import { getTransformerForTool, transformToSharedSkillReferences } from '../../utils/command-references.js';
import { FORMER_RELEASE_FINGERPRINTS } from './former-release-fingerprints.js';
import {
  resolveFormerOwnSkillsDir,
  resolveSharedSkillsDir,
  resolveSkillLinkDir,
  resolveToolSkillsDir,
  toolSupportsSkills,
  usesSharedSkills,
} from '../shared/skill-paths.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { FORMER_SKILL_NAME_BY_WORKFLOW, SKILL_NAME_BY_WORKFLOW, applyForkIdentity } from './identity.js';

export interface FormerSkillMigrationInput {
  projectPath: string;
  /** Every tool set up in the project. */
  tools: readonly AIToolOption[];
  /** The version this run stamps into the `sa-*` skills. */
  version: string;
  ops: UpdateFileOps;
  /** The tree as this run has it so far. */
  view: FileView;
  /** Whether this run writes to disk (false for a dry run). */
  writesToDisk: boolean;
}

export interface FormerSkillMigrationResult {
  /** Skill folders and links removed (or, in a dry run, planned). */
  removed: string[];
  /** Skill folders kept because their SKILL.md is not OpenSpec's text. */
  kept: string[];
}

const WORKFLOWS = Object.keys(FORMER_SKILL_NAME_BY_WORKFLOW) as WorkflowId[];
const toPosix = (p: string) => p.split(path.sep).join('/');
const FORMER_RELEASES = new Set<string>(FORMER_RELEASE_FINGERPRINTS);

/**
 * A skill's text as it compares across releases and install paths: line
 * endings, BOM and the `generatedBy` line (which the published copies in
 * `skills/` leave out) don't count.
 */
const comparable = (text: string) => stripVolatileFrontmatter(normalizeGeneratedContent(text));

/**
 * What this version writes for skill `dirName` in `.agents/skills`, and, given
 * a tool, the forms of it that tool's own folder can hold.
 */
function currentSkillTexts(dirName: string, version: string, toolId?: string): string[] {
  const entry = getSkillTemplates().find((candidate) => candidate.dirName === dirName);
  if (!entry) return [];
  const shared = generateSkillContent(entry.template, version, transformToSharedSkillReferences);
  if (!toolId) return [shared];
  const transformer = getTransformerForTool(
    toolId,
    'skills',
    resolveCommandSurfaceCapability(toolId),
    resolveCommandInvocation(toolId)
  );
  return [shared, projectSkillText(toolId, shared), generateSkillContent(entry.template, version, transformer)];
}

/**
 * Whether a SKILL.md is OpenSpec's: a release's text (upstream's fingerprints,
 * and this fork's for OpenSpec 2.0.0 and the fork before the rename), or one
 * of `texts` once the fork's identity is applied.
 */
function classifyFormerSkill(
  skillDir: string,
  texts: readonly string[],
  view: FileView
): 'missing' | 'ours' | 'user' {
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (view.linkTarget?.(skillFile) !== undefined) return 'user';
  if (!view.exists(skillFile)) return 'missing';
  if (view.isDirectory(skillFile)) return 'user';
  let content: string;
  try {
    content = view.read(skillFile);
  } catch {
    return 'user';
  }
  if (isReleasedGeneratedContent(content) || FORMER_RELEASES.has(fingerprintGeneratedContent(content))) return 'ours';
  const translated = comparable(applyForkIdentity(content));
  return texts.some((text) => comparable(text) === translated) ? 'ours' : 'user';
}

function isWithin(root: string, target: string): boolean {
  try {
    FileSystemUtils.assertPathWithin(root, target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether two folders are, through links, the same folder or one inside the
 * other: then a tool's own skills folder is the shared one.
 */
function isSameFolderTree(a: string, b: string): boolean {
  const real = (p: string): string | undefined => {
    try {
      const resolved = fs.realpathSync.native(p);
      return process.platform === 'linux' ? resolved : resolved.toLowerCase();
    } catch {
      return undefined;
    }
  };
  const [ra, rb] = [real(a), real(b)];
  if (ra === undefined || rb === undefined) return false;
  const within = (inner: string, outer: string) =>
    inner === outer || inner.startsWith(outer.endsWith(path.sep) ? outer : outer + path.sep);
  return within(ra, rb) || within(rb, ra);
}

/**
 * Removes the untouched skills (and OpenSpec's links to them) left under
 * their former names, and reports the ones it keeps.
 */
export async function migrateFormerSkills(input: FormerSkillMigrationInput): Promise<FormerSkillMigrationResult> {
  const { projectPath, ops, view, version } = input;
  const removed: string[] = [];
  const kept = new Set<string>();
  const result = (): FormerSkillMigrationResult => ({ removed, kept: [...kept] });
  const tools = input.tools.filter(toolSupportsSkills);
  if (tools.length === 0) return result();

  const display = (p: string) => (isWithin(projectPath, p) ? toPosix(path.relative(projectPath, p)) : p);
  const removedInProject: string[] = [];
  const removedElsewhere: string[] = [];
  const removeSkillFile = async (skillDir: string, label: string) => {
    const skillFile = path.join(skillDir, 'SKILL.md');
    await ops.removeFile(skillFile, label);
    removed.push(display(skillDir));
    if (isWithin(projectPath, skillFile)) removedInProject.push(toPosix(path.relative(projectPath, skillFile)));
    else removedElsewhere.push(skillDir);
  };

  // 1. The shared copies, decided first: OpenSpec's link to one goes with it.
  const sharedDir = resolveSharedSkillsDir(projectPath);
  const anyShared = tools.some(usesSharedSkills);
  const sharedFate = new Map<string, 'remove' | 'stay' | 'absent'>();
  if (anyShared) {
    for (const workflow of WORKFLOWS) {
      const former = FORMER_SKILL_NAME_BY_WORKFLOW[workflow];
      const skillDir = path.join(sharedDir, former);
      // A link of the user's: not OpenSpec's to touch.
      if (view.linkTarget?.(skillDir) !== undefined) {
        sharedFate.set(former, 'stay');
        continue;
      }
      if (!view.exists(skillDir)) {
        sharedFate.set(former, 'absent');
        continue;
      }
      if (!view.isDirectory(skillDir)) {
        sharedFate.set(former, 'stay');
        kept.add(display(skillDir));
        continue;
      }
      const verdict = classifyFormerSkill(skillDir, currentSkillTexts(SKILL_NAME_BY_WORKFLOW[workflow], version), view);
      if (verdict === 'ours') {
        sharedFate.set(former, 'remove');
      } else {
        // A folder of the user's files with no SKILL.md is left alone quietly.
        sharedFate.set(former, verdict === 'missing' ? 'absent' : 'stay');
        if (verdict === 'user') kept.add(display(skillDir));
      }
    }
  }

  // 2. Each tool's own folder: links to a shared former copy, and copies.
  const visited: string[] = [];
  for (const tool of tools) {
    const shared = usesSharedSkills(tool);
    const ownDir = shared
      ? resolveSkillLinkDir(projectPath, tool) ?? resolveFormerOwnSkillsDir(projectPath, tool)
      : resolveToolSkillsDir(projectPath, tool);
    if (!ownDir || visited.includes(path.resolve(ownDir))) continue;
    visited.push(path.resolve(ownDir));
    if (shared && (isSameFolderTree(ownDir, sharedDir) || !isWithin(projectPath, ownDir))) continue;

    for (const workflow of WORKFLOWS) {
      const former = FORMER_SKILL_NAME_BY_WORKFLOW[workflow];
      const current = SKILL_NAME_BY_WORKFLOW[workflow];
      const spot = path.join(ownDir, former);
      const sharedTarget = path.join(sharedDir, former);
      // OpenSpec's link (or what git checked out for it) goes with the shared
      // copy it points at; one to a skill the user keeps stays with it.
      const linkGoes = () => sharedFate.get(former) === 'remove' || sharedFate.get(former) === 'absent';
      if (view.linkTarget?.(spot) !== undefined) {
        if (shared && classifySkillLinkSpot(spot, sharedTarget, [], view) === 'link' && linkGoes()) {
          await ops.removeDirectory(spot, tool.value);
          removed.push(display(spot));
        }
        // Any other link is the user's.
        continue;
      }
      if (!view.exists(spot)) continue;
      if (!view.isDirectory(spot)) {
        if (shared && isCheckedOutLink(spot, sharedTarget, view)) {
          if (linkGoes()) {
            await ops.removeFile(spot, tool.value);
            removed.push(display(spot));
          }
          continue;
        }
        kept.add(display(spot));
        continue;
      }
      // A copy: of the shared copy (made where a link couldn't be), or one an
      // earlier version wrote in the tool's own folder.
      const texts = currentSkillTexts(current, version, tool.value);
      const verdict = classifyFormerSkill(spot, texts, view);
      if (verdict === 'ours') await removeSkillFile(spot, tool.value);
      else if (verdict === 'user') kept.add(display(spot));
    }
  }

  // 3. The shared copies decided above.
  for (const workflow of WORKFLOWS) {
    const former = FORMER_SKILL_NAME_BY_WORKFLOW[workflow];
    if (sharedFate.get(former) === 'remove') await removeSkillFile(path.join(sharedDir, former), 'openspec');
  }

  // 4. Folders left empty; the user's other files keep theirs.
  if (input.writesToDisk) {
    await pruneEmptyParents(projectPath, removedInProject);
    for (const dir of removedElsewhere) {
      try {
        if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      } catch {
        // Missing or not removable: nothing to tidy.
      }
    }
  }
  return result();
}

/** What `init` and `update` print about skills under their former names. */
export function formatFormerSkillMigration(
  result: FormerSkillMigrationResult,
  options: { reportKept?: boolean } = {}
): string[] {
  const lines: string[] = [];
  const { removed, kept } = result;
  if (removed.length > 0) {
    lines.push(
      `Removed ${removed.length} unchanged skill${removed.length === 1 ? '' : 's'} under ${
        removed.length === 1 ? 'its' : 'their'
      } former OpenSpec name (replaced by sa-*): ${removed.join(', ')}.`
    );
  }
  if ((options.reportKept ?? true) && kept.length > 0) {
    lines.push(formerSkillsKeptMessage(kept));
  }
  return lines;
}

/** The note about skills kept under their former names (also used by `update --dry-run`). */
export function formerSkillsKeptMessage(kept: readonly string[]): string {
  const one = kept.length === 1;
  return (
    `Kept ${kept.length} skill${one ? '' : 's'} under ${one ? 'its' : 'their'} former OpenSpec name ` +
    `that ${one ? 'differs' : 'differ'} from what OpenSpec wrote (edited, or not recognized): ${kept.join(', ')}. ` +
    `Nothing was changed there; the sa-* skills replace ${one ? 'it' : 'them'}. ` +
    `Delete ${one ? 'it' : 'them'} once you have kept what you need.`
  );
}
