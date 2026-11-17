/**
 * SpecAgile: retires skills installed under their former `openspec-*` names
 * (by OpenSpec upstream, or by this fork before the rename), once `init` or
 * `update` has installed the `sa-*` ones that replace them.
 *
 * Only the fourteen names in FORMER_SKILL_NAME_BY_WORKFLOW are looked at,
 * never an `openspec-*` glob. A SKILL.md goes only when it is text OpenSpec
 * wrote: a release's (`isReleasedGeneratedContent`) or what this version
 * generates for the skill once the fork's identity is applied, which covers
 * OpenSpec 2.0.0 and the fork before the rename. Anything else is the user's:
 * kept and reported. A skill recorded with a `keep` line, and a link of the
 * user's, are left alone without a word. Every change goes through the run's
 * `ops` and is read through its `view`, so `update --dry-run` plans it.
 */
import path from 'path';
import * as fs from 'fs';

import type { AIToolOption } from '../config.js';
import type { FileView } from '../file-view.js';
import type { WorkflowId } from '../profiles.js';
import type { UpdateFileOps } from '../update-plan.js';
import { pruneEmptyParents } from '../released-output-sweep.js';
import { readKeptSharedSkills } from '../shared-skill-target.js';
import { isReleasedGeneratedContent, normalizeGeneratedContent } from '../shared/generated-fingerprint.js';
import { ownSkillTexts, sharedSkillTexts } from '../shared/own-skill-texts.js';
import { isSameFolderTree } from '../shared/shared-skill-install.js';
import { classifySkillLinkSpot, isCheckedOutLink } from '../shared/skill-links.js';
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

/** Whether a SKILL.md is OpenSpec's, judged against `texts` with the fork's identity. */
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
  if (isReleasedGeneratedContent(content)) return 'ours';
  const translated = normalizeGeneratedContent(applyForkIdentity(content));
  return texts.some((text) => normalizeGeneratedContent(text) === translated) ? 'ours' : 'user';
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
  const keptByList = anyShared ? readKeptSharedSkills(projectPath, view) : new Set<string>();
  const sharedFate = new Map<string, 'remove' | 'stay' | 'absent'>();
  if (anyShared) {
    for (const workflow of WORKFLOWS) {
      const former = FORMER_SKILL_NAME_BY_WORKFLOW[workflow];
      const skillDir = path.join(sharedDir, former);
      // Recorded as the user's, or a link of theirs: not OpenSpec's to touch.
      if (keptByList.has(former) || view.linkTarget?.(skillDir) !== undefined) {
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
      const verdict = classifyFormerSkill(skillDir, sharedSkillTexts(SKILL_NAME_BY_WORKFLOW[workflow], version), view);
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
      const texts = [...sharedSkillTexts(current, version), ...ownSkillTexts(tool.value, current, version)];
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
