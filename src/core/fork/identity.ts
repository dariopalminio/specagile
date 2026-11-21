/**
 * SpecAgile identity: the CLI name and the skill names this fork installs.
 *
 * This file is the fork's own (upstream has no `src/core/fork/`), so a sync
 * never conflicts here. Upstream lists that name skills read these tables, and
 * upstream skill templates are never edited: generated text goes through
 * `applyForkIdentity`, which swaps OpenSpec's CLI and skill names for the
 * fork's (`applyForkNames`) and upstream's layout paths for SpecAgile's
 * (`applyLayoutText`, src/core/fork/layout.ts). See "SpecAgile identity" in
 * FORK.md.
 */

import type { WorkflowId } from '../profiles.js';
import { applyLayoutText } from './layout.js';

/** The executable users run: `specagile init`, `specagile update`, ... */
export const CLI_NAME = 'specagile';

/**
 * The name of SpecAgile's global config and data folders: `specagile` under
 * `$XDG_CONFIG_HOME`/`%APPDATA%`/`~/.config` and `$XDG_DATA_HOME`/
 * `%LOCALAPPDATA%`/`~/.local/share`. OpenSpec's `openspec` folders are never
 * read. See "SpecAgile identity" in FORK.md.
 */
export const GLOBAL_FOLDER_NAME = CLI_NAME;

/** The npm package SpecAgile is published as: `npm install -g specagile`. */
export const PACKAGE_NAME = 'specagile';

/** SpecAgile's repository, where its links and feedback go. */
export const REPOSITORY_URL = 'https://github.com/dariopalminio/specagile';

/** The banner `specagile init` prints above its tool picker. */
export const SPECAGILE_BANNER: string = [
  '█▀▀ █▀▄ █▀▀ █▀▀  ▄▀█ █▀▀ █ █   █▀▀',
  '▄▄█ █▀  ██▄ █▄▄  █▀█ █▄█ █ █▄▄ ██▄',
].join('\n');

/** The name OpenSpec upstream gives its executable. */
export const FORMER_CLI_NAME = 'openspec';

/** The skill each workflow installs as: folder name and `name:` field. */
export const SKILL_NAME_BY_WORKFLOW: Readonly<Record<WorkflowId, string>> = {
  explore: 'sa-explore',
  propose: 'sa-propose',
  specify: 'sa-specify',
  plan: 'sa-plan',
  apply: 'sa-implement',
  verify: 'sa-verify',
  archive: 'sa-archive',
  new: 'sa-new-change',
  continue: 'sa-continue-change',
  ff: 'sa-ff-change',
  'bulk-archive': 'sa-bulk-archive-change',
  onboard: 'sa-onboard',
  update: 'sa-update-change',
  sync: 'sa-sync-specs',
};

/**
 * The name each workflow's skill had before (OpenSpec upstream and earlier
 * versions of this fork). Migration looks up exactly these names, never a
 * `openspec-*` glob, so a user's `openspec-helpers` is never touched.
 */
export const FORMER_SKILL_NAME_BY_WORKFLOW: Readonly<Record<WorkflowId, string>> = {
  explore: 'openspec-explore',
  propose: 'openspec-propose',
  specify: 'openspec-specify',
  plan: 'openspec-plan',
  apply: 'openspec-apply-change',
  verify: 'openspec-verify-change',
  archive: 'openspec-archive-change',
  new: 'openspec-new-change',
  continue: 'openspec-continue-change',
  ff: 'openspec-ff-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  onboard: 'openspec-onboard',
  update: 'openspec-update-change',
  sync: 'openspec-sync-specs',
};

/** Skills this version writes (`sa-*`). */
export const CURRENT_SKILL_NAMES: readonly string[] = Object.values(SKILL_NAME_BY_WORKFLOW);

/** Skill names from before the rename (`openspec-*`). */
export const FORMER_SKILL_NAMES: readonly string[] = Object.values(FORMER_SKILL_NAME_BY_WORKFLOW);

/**
 * Every skill name OpenSpec or SpecAgile has installed: used to detect a set-up
 * project and to honor `keep` lines, never to decide what to write.
 */
export const KNOWN_SKILL_NAMES: readonly string[] = [...CURRENT_SKILL_NAMES, ...FORMER_SKILL_NAMES];

/**
 * The CLI's subcommands, hidden ones included. A test compares this list with
 * `program.commands` in src/cli/index.ts, so a subcommand upstream adds fails
 * that test instead of staying untranslated.
 */
export const CLI_SUBCOMMANDS: readonly string[] = [
  'version',
  'init',
  'experimental',
  'update',
  'install',
  'list',
  'view',
  'change',
  'archive',
  'spec',
  'config',
  'schema',
  'store',
  'doctor',
  'context',
  'workset',
  'validate',
  'show',
  'feedback',
  'completion',
  '__complete',
  'status',
  'instructions',
  'templates',
  'schemas',
  'new',
];

/**
 * Trigger phrases in skill descriptions ("openspec apply", "openspec
 * implement", ...) that are not subcommands.
 */
export const TRIGGER_VERBS: readonly string[] = [
  'propose',
  'explore',
  'specify',
  'plan',
  'apply',
  'implement',
  'verify',
  'continue',
  'ff',
  'bulk-archive',
  'onboard',
  'sync',
];

/**
 * The words that, after `openspec `, make a CLI invocation or a trigger
 * phrase: `openspec status ...`, `openspec --version`, "openspec implement".
 */
export const CLI_WORDS: readonly string[] = [
  ...new Set([...CLI_SUBCOMMANDS, '--version', ...TRIGGER_VERBS]),
];

const SKILL_NAME_BY_FORMER: ReadonlyMap<string, string> = new Map(
  (Object.keys(FORMER_SKILL_NAME_BY_WORKFLOW) as WorkflowId[]).map((workflow) => [
    FORMER_SKILL_NAME_BY_WORKFLOW[workflow],
    SKILL_NAME_BY_WORKFLOW[workflow],
  ])
);

const CLI_WORD_SET: ReadonlySet<string> = new Set(CLI_WORDS);

// `openspec-<x>` as a whole token. Not after a word character, `.` or `-`, so
// `.openspec-target` and `my-openspec-propose` stay; after `/`, `$` or `:` it
// matches, so `/openspec-propose` and `/skill:openspec-propose` translate.
const FORMER_SKILL_TOKEN = /(?<![\w.-])openspec-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/g;

// `openspec <word>`. Not after `/`, `@`, `.`, `-` or a word character, so
// `@fission-ai/openspec ...` (the npm package) stays.
const CLI_INVOCATION = /(?<![\w/.@-])openspec ([\w-]+)(?![\w-])/g;

/** Exact texts that name the CLI outside an `openspec <word>` form. */
const EXACT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['Bash(openspec:*)', `Bash(${CLI_NAME}:*)`],
  ['Requires openspec CLI.', `Requires ${CLI_NAME} CLI.`],
  ['Get-Command openspec ', `Get-Command ${CLI_NAME} `],
];

/**
 * Rewrites text written with OpenSpec's names into SpecAgile's: each former
 * skill name in FORMER_SKILL_NAME_BY_WORKFLOW becomes its `sa-*` name, each
 * `openspec <word>` with a word in CLI_WORDS becomes `specagile <word>`, and a
 * few exact frontmatter texts name the `specagile` CLI. Project paths
 * (`openspec/changes/`), internal files (`.openspec-target`), "OpenSpec" in
 * prose and anything outside the tables are left as written. This is the
 * whole translation SpecAgile 2.1 applied, so it also tells its output apart.
 *
 * Idempotent: text that already has the fork's names comes back unchanged.
 */
export function applyForkNames(text: string): string {
  let result = text.replace(FORMER_SKILL_TOKEN, (token) => SKILL_NAME_BY_FORMER.get(token) ?? token);
  result = result.replace(CLI_INVOCATION, (match, word: string) =>
    CLI_WORD_SET.has(word) ? `${CLI_NAME} ${word}` : match
  );
  for (const [from, to] of EXACT_REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
}

/**
 * Whole upstream texts that greet the user as OpenSpec in a generated skill,
 * each with SpecAgile's. Exact texts, no patterns: "OpenSpec" elsewhere in
 * prose stays as upstream wrote it.
 */
export const PRODUCT_TEXT_REPLACEMENTS: ReadonlyArray<readonly [upstream: string, fork: string]> = [
  // The onboard skill's first screen (src/core/templates/workflows/onboard.ts).
  ['## Welcome to OpenSpec!', '## Welcome to SpecAgile!'],
];

/** Rewrites each text in PRODUCT_TEXT_REPLACEMENTS. */
export function applyProductText(text: string): string {
  let result = text;
  for (const [upstream, fork] of PRODUCT_TEXT_REPLACEMENTS) {
    result = result.split(upstream).join(fork);
  }
  return result;
}

/**
 * Rewrites text written by upstream into SpecAgile's identity: its names
 * (`applyForkNames`), then its layout paths (`applyLayoutText`), so
 * `<planningHome.root>/openspec/specs/` reads `<planningHome.root>/specs/`,
 * `<root.path>/openspec/config.yaml` reads `<root.path>/specagile/config.yaml`
 * and a change's `.openspec.yaml` reads `.specagile.yaml`, then the greetings
 * in PRODUCT_TEXT_REPLACEMENTS (`applyProductText`). Internal files
 * (`.openspec-target`, `.openspec-store/`), the store location
 * `~/openspec/<id>` and any other "OpenSpec" in prose stay.
 *
 * Idempotent: text that already has the fork's identity comes back unchanged.
 */
export function applyForkIdentity(text: string): string {
  return applyProductText(applyLayoutText(applyForkNames(text)));
}
