import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  FORMER_TOOL_DIR_NAME as FORMER_TOOL_DIR_NAME_VALUE,
  getArchiveDir,
  getChangesDir,
  getConfigFilePaths,
  getSpecsDir,
} from '../../src/core/fork/layout.js';

/**
 * The project layout for tests, from src/core/fork/layout.ts: fixtures and
 * assertions build their paths here instead of joining folder names by hand,
 * so they follow the layout in force.
 */
export {
  ARCHIVE_DIR_NAME,
  CHANGE_METADATA_FILE_NAME,
  CHANGE_METADATA_FILE_NAMES,
  CHANGES_DIR_NAME,
  CONFIG_FILE_NAMES,
  FORMER_CHANGE_METADATA_FILE_NAME,
  FORMER_TOOL_DIR_NAME,
  RELATIVE_ARCHIVE_DIR,
  RELATIVE_CHANGES_DIR,
  RELATIVE_CONFIG_FILE,
  RELATIVE_CONFIG_FILES,
  RELATIVE_SCHEMAS_DIR,
  RELATIVE_SPECS_DIR,
  RELATIVE_TOOL_DIR,
  SCHEMAS_DIR_NAME,
  SPECS_DIR_NAME,
  TOOL_DIR_NAME,
  getArchiveDir,
  getChangeMetadataFile,
  getChangesDir,
  getConfigFilePaths,
  getProjectSchemasDir,
  getSpecsDir,
  getToolDir,
  relativeChangeDir,
  relativeSpecFile,
  relativeToolFile,
} from '../../src/core/fork/layout.js';

/** `<root>/specagile/config.yaml`: the config file the CLI creates. */
export function getConfigFile(root: string): string {
  return getConfigFilePaths(root)[0];
}

/** `<root>/specagile/config.yml`: the alternative config file name. */
export function getConfigYmlFile(root: string): string {
  return getConfigFilePaths(root)[1];
}

/** `<root>/changes/<name>`, with optional segments below it. */
export function getChangeDir(root: string, name: string, ...segments: string[]): string {
  return path.join(getChangesDir(root), name, ...segments);
}

/** `<root>/changes/archive/<name>`, with optional segments below it. */
export function getArchivedChangeDir(root: string, name: string, ...segments: string[]): string {
  return path.join(getArchiveDir(root), name, ...segments);
}

/** `<root>/specs/<capability-path>/spec.md`: a living spec. */
export function getSpecFile(root: string, capabilityPath: string): string {
  return path.join(getSpecsDir(root), ...capabilityPath.split('/'), 'spec.md');
}

/**
 * The former layout, on purpose: `openspec/` with everything inside, as
 * OpenSpec and SpecAgile 2.1 made it. Tests of detection and migration (and of
 * releases) use this, so they read apart from fixtures that follow the layout.
 * `files` maps paths relative to `openspec/` to their content; without it, a
 * freshly initialized 2.1 project.
 */
export function createFormerLayout(
  root: string,
  files: Record<string, string> = {
    'config.yaml': 'schema: spec-driven\n',
    'specs/.gitkeep': '',
    'changes/archive/.gitkeep': '',
  }
): string {
  const former = path.join(root, FORMER_TOOL_DIR_NAME_VALUE);
  fs.mkdirSync(former, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(former, ...relative.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return former;
}
