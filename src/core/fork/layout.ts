/**
 * SpecAgile project layout: where a project or a store keeps its planning.
 *
 *   specs/        living specs, the source of truth
 *   changes/      changes in progress, archived ones in changes/archive/
 *   specagile/    the tool's own files: config.yaml, schemas/, ...
 *
 * This file is the fork's own (upstream has no `src/core/fork/`), so a sync
 * never conflicts here. Every path into the layout in src/ is built from this
 * module; test/fork/layout.test.ts fails on one built by hand. See "Project
 * layout" in FORK.md.
 */

// Only node: modules here. The CLI loads this file at startup, and a command
// loads nothing beyond what it needs (test/cli-e2e/startup-modules.test.ts).
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Folder of the living specs, and of each change's delta specs. */
export const SPECS_DIR_NAME = 'specs';

/** Folder of the changes in progress. */
export const CHANGES_DIR_NAME = 'changes';

/** Folder of the archived changes, inside the changes folder. */
export const ARCHIVE_DIR_NAME = 'archive';

/** Folder of the tool's own files: config, project schemas, ... */
export const TOOL_DIR_NAME = 'specagile';

/** Config file names inside the tool folder, in order of preference. */
export const CONFIG_FILE_NAMES = ['config.yaml', 'config.yml'] as const;

/** Folder of the project's own schemas, inside the tool folder. */
export const SCHEMAS_DIR_NAME = 'schemas';

/** The folder OpenSpec and SpecAgile 2.1 kept everything in. Detection and migration only. */
export const FORMER_TOOL_DIR_NAME = 'openspec';

/** A change's metadata file: the one the CLI writes and names in messages. */
export const CHANGE_METADATA_FILE_NAME = '.specagile.yaml';

/**
 * The metadata file OpenSpec and SpecAgile 4.0.0 wrote. Reading, detection and
 * migration only: the CLI never writes it.
 */
export const FORMER_CHANGE_METADATA_FILE_NAME = '.openspec.yaml';

/** A change's metadata file names, in reading order: the first that exists rules. */
export const CHANGE_METADATA_FILE_NAMES = [
  CHANGE_METADATA_FILE_NAME,
  FORMER_CHANGE_METADATA_FILE_NAME,
] as const;

/**
 * The layout in force, as path segments from the root: the folder that holds
 * `specs/` and `changes/` (empty for the root itself) and the tool folder.
 * This is the one place that decides it.
 */
const CURRENT_LAYOUT: { readonly planning: readonly string[]; readonly tool: readonly string[] } = {
  planning: [],
  tool: [TOOL_DIR_NAME],
};

const posix = (...segments: string[]): string => segments.join('/');

// -----------------------------------------------------------------------------
// Absolute paths, built with path.join
// -----------------------------------------------------------------------------

/** `<root>/specs`: the living specs. */
export function getSpecsDir(root: string): string {
  return path.join(root, ...CURRENT_LAYOUT.planning, SPECS_DIR_NAME);
}

/** The root a `getSpecsDir(root)` path belongs to: its inverse. */
export function getRootOfSpecsDir(specsDir: string): string {
  let root = path.resolve(specsDir);
  for (let i = 0; i <= CURRENT_LAYOUT.planning.length; i++) root = path.dirname(root);
  return root;
}

/** `<root>/changes`: the changes in progress. */
export function getChangesDir(root: string): string {
  return path.join(root, ...CURRENT_LAYOUT.planning, CHANGES_DIR_NAME);
}

/** The root a `getChangesDir(root)` path belongs to: its inverse. */
export function getRootOfChangesDir(changesDir: string): string {
  return getRootOfSpecsDir(changesDir);
}

/** The root of a change folder directly under `<root>/changes`. */
export function getRootOfChangeDir(changeDir: string): string {
  return getRootOfChangesDir(path.dirname(path.resolve(changeDir)));
}

/** `<root>/changes/archive`: the archived changes. */
export function getArchiveDir(root: string): string {
  return path.join(getChangesDir(root), ARCHIVE_DIR_NAME);
}

/** `<root>/specagile`: the tool's own files. */
export function getToolDir(root: string): string {
  return path.join(root, ...CURRENT_LAYOUT.tool);
}

/** The config file candidates, in order of preference: `config.yaml`, then `config.yml`. */
export function getConfigFilePaths(root: string): string[] {
  return CONFIG_FILE_NAMES.map((name) => path.join(getToolDir(root), name));
}

/** `<root>/specagile/schemas`: the project's own schemas. */
export function getProjectSchemasDir(root: string): string {
  return path.join(getToolDir(root), SCHEMAS_DIR_NAME);
}

/**
 * The metadata file of the change in `changeDir`: the first of
 * CHANGE_METADATA_FILE_NAMES that exists there, or `.specagile.yaml` when none
 * does (where a new one is written, and the one errors name). Precedence goes
 * by existence, not validity: an invalid `.specagile.yaml` never falls back to
 * `.openspec.yaml`, so a former file can't authorize what the current one does
 * not declare.
 */
export function getChangeMetadataFile(changeDir: string): string {
  for (const name of CHANGE_METADATA_FILE_NAMES) {
    const candidate = path.join(changeDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(changeDir, CHANGE_METADATA_FILE_NAME);
}

// -----------------------------------------------------------------------------
// Relative forms for messages, always with `/`
// -----------------------------------------------------------------------------

/** `specs`: the living specs, relative to the root. */
export const RELATIVE_SPECS_DIR = posix(...CURRENT_LAYOUT.planning, SPECS_DIR_NAME);

/** `changes`: the changes in progress, relative to the root. */
export const RELATIVE_CHANGES_DIR = posix(...CURRENT_LAYOUT.planning, CHANGES_DIR_NAME);

/** `changes/archive`: the archived changes, relative to the root. */
export const RELATIVE_ARCHIVE_DIR = posix(RELATIVE_CHANGES_DIR, ARCHIVE_DIR_NAME);

/** `specagile`: the tool folder, relative to the root. */
export const RELATIVE_TOOL_DIR = posix(...CURRENT_LAYOUT.tool);

/** `specagile/config.yaml` and `specagile/config.yml`, relative to the root. */
export const RELATIVE_CONFIG_FILES: readonly string[] = CONFIG_FILE_NAMES.map((name) =>
  posix(RELATIVE_TOOL_DIR, name)
);

/** `specagile/config.yaml`: the config file the CLI creates and names in messages. */
export const RELATIVE_CONFIG_FILE = RELATIVE_CONFIG_FILES[0];

/** `specagile/schemas`: the project's own schemas, relative to the root. */
export const RELATIVE_SCHEMAS_DIR = posix(RELATIVE_TOOL_DIR, SCHEMAS_DIR_NAME);

/** `changes/<name>`: a change folder, relative to the root. */
export function relativeChangeDir(name: string): string {
  return posix(RELATIVE_CHANGES_DIR, name);
}

/** `specs/<capability-path>/spec.md`: a living spec, relative to the root. */
export function relativeSpecFile(capabilityPath: string): string {
  return posix(RELATIVE_SPECS_DIR, capabilityPath, 'spec.md');
}

/** `specagile/<name>`: a file in the tool folder, relative to the root. */
export function relativeToolFile(name: string): string {
  return posix(RELATIVE_TOOL_DIR, name);
}

// -----------------------------------------------------------------------------
// Recognizing a root, and the former layout
// -----------------------------------------------------------------------------

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

/**
 * A `specs/` or `changes/` folder that holds planning. One with store metadata
 * is a store kept at `~/openspec/<id>` whose id is `specs` or `changes`, not
 * planning of the folder above it.
 */
function isPlanningDirectory(candidate: string): boolean {
  return isDirectory(candidate) && !fs.existsSync(path.join(candidate, ...STORE_METADATA_FILE));
}

/**
 * A store's metadata file, as getStoreMetadataPath (store/foundation.ts) names
 * it; spelled out so this file loads no package. test/fork/layout.test.ts pins
 * that they match.
 */
export const STORE_METADATA_FILE: readonly string[] = ['.openspec-store', 'store.yaml'];

/** `<dir>/openspec`: the folder OpenSpec and SpecAgile 2.1 kept everything in. */
export function getFormerToolDir(dir: string): string {
  return path.join(dir, FORMER_TOOL_DIR_NAME);
}

/**
 * Whether `dir` is a root with the layout in force: a `specagile/` folder with
 * a config file, or with `specs/` or `changes/` beside it.
 */
export function isLayoutRoot(dir: string): boolean {
  if (!isDirectory(getToolDir(dir))) return false;
  return (
    getConfigFilePaths(dir).some((candidate) => fs.existsSync(candidate)) ||
    isPlanningDirectory(getSpecsDir(dir)) ||
    isPlanningDirectory(getChangesDir(dir))
  );
}

/**
 * Whether `dir` has the former layout: an `openspec/` folder with a config
 * file, or with `specs/` or `changes/` inside that are not stores. The rule is
 * the one that made it a root before, so a `~/openspec/` that only holds
 * stores is never taken for a project to migrate.
 */
export function detectFormerLayout(dir: string): boolean {
  const former = getFormerToolDir(dir);
  if (!isDirectory(former)) return false;
  return (
    CONFIG_FILE_NAMES.some((name) => fs.existsSync(path.join(former, name))) ||
    isPlanningDirectory(path.join(former, SPECS_DIR_NAME)) ||
    isPlanningDirectory(path.join(former, CHANGES_DIR_NAME))
  );
}

// -----------------------------------------------------------------------------
// The layout in skill and agent text
// -----------------------------------------------------------------------------

/**
 * Upstream's skill templates (and the Copilot agent text) name its layout. Each
 * entry turns one text into the layout in force. The texts are whole, with
 * enough context that a translation never appears in upstream's text, so
 * test/helpers/fork-identity.ts can undo the table exactly. They are sorted
 * longest first, so a longer text is translated before a shorter one inside
 * it. A bare `openspec/specs/` → `specs/` is never an entry: upstream already
 * writes `specs/` for a change's deltas, and the two would mix.
 */
const SPECS = `${RELATIVE_SPECS_DIR}/`;
const CHANGES = `${RELATIVE_CHANGES_DIR}/`;
const TOOL = `${RELATIVE_TOOL_DIR}/`;
const CONFIG = RELATIVE_CONFIG_FILE;
/** A Markdown code span. */
const code = (text: string): string => '`' + text + '`';

export const LAYOUT_TEXT_REPLACEMENTS: ReadonlyArray<readonly [upstream: string, fork: string]> = (
  [
    // The living specs, at the planning root.
    ['<planningHome.root>/openspec/specs/', `<planningHome.root>/${SPECS}`],
    ['" log -p -- openspec/specs/', `" log -p -- ${SPECS}`],
    ['" show <commit>^:./openspec/specs/', `" show <commit>^:./${SPECS}`],
    ['main specs under `openspec/specs/`', `main specs under ${code(SPECS)}`],
    // The project config.
    ['<root.path>/openspec/config.yaml', `<root.path>/${CONFIG}`],
    ["names this project's `openspec/config.yaml`", `names this project's ${code(CONFIG)}`],
    ['templates, or `openspec/config.yaml` is a change', `templates, or ${code(CONFIG)} is a change`],
    // The changes.
    ['under `openspec/changes/` by hand', `under ${code(CHANGES)} by hand`],
    // The folder as a whole.
    ['documentation outside `openspec/`', `documentation outside ${code(SPECS)}, ${code(CHANGES)} and ${code(TOOL)}`],
    ['there is no `openspec/` directory here', `there is no ${code(TOOL)} directory here`],
    ['do not hand-create `openspec/` files', `do not hand-create ${code(TOOL)}, ${code(SPECS)} or ${code(CHANGES)} files`],
    ['the nearest local `openspec/` root', `the nearest local ${code(TOOL)} root`],
    ['Matches in `openspec/` artifacts or docs', `Matches in ${code(SPECS)}, ${code(CHANGES)} or ${code(TOOL)} artifacts or docs`],
    // The GitHub Copilot cloud agent (src/core/github-copilot/cloud-agent.ts).
    ['- `openspec/` — Root OpenSpec directory', `- ${code(SPECS)} — Living specs, the source of truth`],
    ['- `openspec/changes/` — Active changes with their artifacts', `- ${code(CHANGES)} — Active changes with their artifacts`],
    ['- `openspec/config.yaml` — Project configuration', `- ${code(CONFIG)} — Project configuration`],
    ['- `openspec/explorations/` — Exploration documents', `- ${code(`${TOOL}explorations/`)} — Exploration documents`],
    ['under `openspec/changes/<change-name>/`', `under ${code(`${CHANGES}<change-name>/`)}`],
    // A change's metadata file. `.specagile.yaml` is in no upstream text, so the
    // name alone is enough context.
    [FORMER_CHANGE_METADATA_FILE_NAME, CHANGE_METADATA_FILE_NAME],
  ] as const
)
  .slice()
  .sort((a, b) => b[0].length - a[0].length);

/** Rewrites upstream's layout paths in `text` with LAYOUT_TEXT_REPLACEMENTS. Idempotent. */
export function applyLayoutText(text: string): string {
  let result = text;
  for (const [upstream, fork] of LAYOUT_TEXT_REPLACEMENTS) {
    result = result.split(upstream).join(fork);
  }
  return result;
}
