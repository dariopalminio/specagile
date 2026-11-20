import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getStoreMetadataPath } from '../../src/core/store/foundation.js';

import {
  ARCHIVE_DIR_NAME,
  CHANGES_DIR_NAME,
  CONFIG_FILE_NAMES,
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
  STORE_METADATA_FILE,
  TOOL_DIR_NAME,
  detectFormerLayout,
  getArchiveDir,
  getChangesDir,
  getConfigFilePaths,
  getProjectSchemasDir,
  getRootOfChangeDir,
  getRootOfChangesDir,
  getRootOfSpecsDir,
  getSpecsDir,
  getToolDir,
  isLayoutRoot,
  relativeChangeDir,
  relativeSpecFile,
  relativeToolFile,
} from '../../src/core/fork/layout.js';

// This file pins the layout itself, so its expectations are spelled out with
// path.join instead of going through test/helpers/layout.ts.
const root = path.join(path.parse(process.cwd()).root, 'work', 'project');

describe('layout names', () => {
  it('names the folders of the layout', () => {
    expect(SPECS_DIR_NAME).toBe('specs');
    expect(CHANGES_DIR_NAME).toBe('changes');
    expect(ARCHIVE_DIR_NAME).toBe('archive');
    expect(TOOL_DIR_NAME).toBe('specagile');
    expect(CONFIG_FILE_NAMES).toEqual(['config.yaml', 'config.yml']);
    expect(SCHEMAS_DIR_NAME).toBe('schemas');
    expect(FORMER_TOOL_DIR_NAME).toBe('openspec');
  });
});

describe('layout paths', () => {
  it('builds each path with path.join', () => {
    expect(getSpecsDir(root)).toBe(path.join(root, 'specs'));
    expect(getChangesDir(root)).toBe(path.join(root, 'changes'));
    expect(getArchiveDir(root)).toBe(path.join(root, 'changes', 'archive'));
    expect(getToolDir(root)).toBe(path.join(root, 'specagile'));
    expect(getConfigFilePaths(root)).toEqual([
      path.join(root, 'specagile', 'config.yaml'),
      path.join(root, 'specagile', 'config.yml'),
    ]);
    expect(getProjectSchemasDir(root)).toBe(path.join(root, 'specagile', 'schemas'));
  });

  it('finds the root back from the specs, changes and change folders', () => {
    expect(getRootOfSpecsDir(getSpecsDir(root))).toBe(root);
    expect(getRootOfChangesDir(getChangesDir(root))).toBe(root);
    expect(getRootOfChangeDir(path.join(getChangesDir(root), 'add-login'))).toBe(root);
  });

  it('gives the relative forms with / on every platform', () => {
    expect(RELATIVE_SPECS_DIR).toBe('specs');
    expect(RELATIVE_CHANGES_DIR).toBe('changes');
    expect(RELATIVE_ARCHIVE_DIR).toBe('changes/archive');
    expect(RELATIVE_TOOL_DIR).toBe('specagile');
    expect(RELATIVE_CONFIG_FILES).toEqual(['specagile/config.yaml', 'specagile/config.yml']);
    expect(RELATIVE_CONFIG_FILE).toBe('specagile/config.yaml');
    expect(RELATIVE_SCHEMAS_DIR).toBe('specagile/schemas');
    expect(relativeChangeDir('add-login')).toBe('changes/add-login');
    expect(relativeSpecFile('identity/user-auth')).toBe('specs/identity/user-auth/spec.md');
    expect(relativeToolFile('project.md')).toBe('specagile/project.md');
  });
});

/**
 * Every path into the layout in src/ is built from src/core/fork/layout.ts. This
 * guard walks src/ (the skill templates are translated when skills are
 * generated, and pinned in generated-skills-identity) and fails on a string
 * that names `openspec/` or an `'openspec'` path segment, so a sync that brings
 * a new hand-built path is caught here. Comment lines don't count.
 */

const repoRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(repoRoot, 'src');
const TEMPLATES = path.join(srcRoot, 'core', 'templates', 'workflows');

/** Files that name the former folder throughout, with the reason. */
const ALLOWED_FILES: Record<string, string> = {
  'src/core/fork/layout.ts': 'defines the former folder name, for detection and migration',
  'src/core/fork/layout-migration.ts': 'moves the former layout into the new one',
  'src/core/shared/released-generated-fingerprints.ts':
    'generated record of the files earlier releases wrote, tool command folders included',
};

/** Texts that name `openspec` without being a path into the layout, with the reason. */
const ALLOWED_TEXTS: ReadonlyArray<{ file: string; text: RegExp; reason: string }> = [
  { file: 'src/cli/commands/store.ts', text: /~\/openspec\/<id>/, reason: 'suggested location for a store, outside any project' },
  { file: 'src/commands/store.ts', text: /\['~', 'openspec', id\]|~\/openspec\//, reason: 'suggested location for a store' },
  { file: 'src/core/store/operations.ts', text: /~\/openspec\/\$\{id\}/, reason: 'suggested location for a store' },
  { file: 'src/core/references.ts', text: /path\.join\(os\.homedir\(\), 'openspec', id\)/, reason: 'suggested location for a store' },
  { file: 'src/core/command-generation/adapters/costrict.ts', text: /'\.cospec', 'openspec', 'commands'/, reason: "CoStrict's command folder" },
  { file: 'src/core/legacy-cleanup.ts', text: /\.cospec\/openspec\/commands\//, reason: "CoStrict's legacy command folder" },
  { file: 'src/commands/install-standalone.ts', text: /'openspec\.exe' : 'openspec'|'Programs', 'openspec'/, reason: "OpenSpec's standalone install; SpecAgile never runs it" },
  { file: 'src/utils/executable-path.ts', text: /\['openspec\.exe', 'openspec\.cmd'\] : \['openspec'\]/, reason: "OpenSpec's executable names" },
  { file: 'src/core/fork/identity.ts', text: /FORMER_CLI_NAME = 'openspec'/, reason: "upstream's executable name" },
  { file: 'src/commands/spec.ts', text: /format: 'openspec'/, reason: 'spec metadata format, not a path' },
  { file: 'src/core/parsers/markdown-parser.ts', text: /format: 'openspec'/, reason: 'spec metadata format, not a path' },
  { file: 'src/core/schemas/spec.schema.ts', text: /z\.literal\('openspec'\)/, reason: 'spec metadata format, not a path' },
  { file: 'src/core/shared/skill-generation.ts', text: /author \|\| 'openspec'\}/, reason: "skill frontmatter author: 'openspec'" },
  { file: 'src/core/init.ts', text: /removeFile\(.*, 'openspec'\);$/, reason: 'owner tag of a removeFile call' },
  { file: 'src/core/update.ts', text: /^\s*'openspec'$|removeFile\(fullPath, 'openspec'\)|fileOps\('openspec'\)/, reason: 'owner tag of a file operation' },
  { file: 'src/core/fork/former-skills.ts', text: /removeSkillFile\(.*, 'openspec'\);$/, reason: 'owner tag of a file operation' },
  { file: 'src/core/shared/shared-skill-install.ts', text: /\[\[shared, 'openspec'\]\]|(removeDirectory|writeFile|removeFile)\(\w+(, list)?, 'openspec'\)/, reason: 'owner tag of the shared skills folder' },
  { file: 'src/core/shared/tool-detection.ts', text: /\? toolId : 'openspec';/, reason: 'owner tag of the shared skills folder' },
  { file: 'src/core/github-copilot/cloud-agent.ts', text: /`openspec\/|`openspec\\?` CLI/, reason: "upstream's Copilot text, translated with applyForkIdentity when written" },
];

const FORMER_PATH = /openspec[\\/]|['"`]openspec['"`]/;
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
const withoutTrailingComment = (line: string) => line.replace(/\s\/\/\s.*$/, '');

/** The lines of `source` (a file at `rel`) that name the former folder outside the allow list. */
function formerLayoutPaths(rel: string, source: string): string[] {
  if (ALLOWED_FILES[rel]) return [];
  const allowed = ALLOWED_TEXTS.filter((entry) => entry.file === rel).map((entry) => entry.text);
  const found: string[] = [];
  source.split(/\r?\n/).forEach((line, index) => {
    if (isComment(line)) return;
    const code = withoutTrailingComment(line);
    if (!FORMER_PATH.test(code)) return;
    if (allowed.some((text) => text.test(code))) return;
    found.push(`${rel}:${index + 1}: ${code.trim()}`);
  });
  return found;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full !== TEMPLATES) yield* sourceFiles(full);
    } else if (entry.name.endsWith('.ts')) {
      yield full;
    }
  }
}

describe('paths into the layout in src/', () => {
  it('builds every path into the layout from src/core/fork/layout.ts', () => {
    const found: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      const rel = path.relative(repoRoot, file).split(path.sep).join('/');
      found.push(...formerLayoutPaths(rel, fs.readFileSync(file, 'utf-8')));
    }
    expect(found, `build these paths with src/core/fork/layout.ts:\n${found.join('\n')}`).toEqual([]);
  });

  it('catches a path built by hand, also in a file with allowed texts', () => {
    const line = "  const specsDir = path.join(root, 'openspec', 'specs');";
    expect(formerLayoutPaths('src/core/list.ts', line)).toHaveLength(1);
    expect(formerLayoutPaths('src/core/update.ts', line)).toHaveLength(1);
    expect(formerLayoutPaths('src/core/list.ts', "  console.log('Config: openspec/config.yaml');")).toHaveLength(1);
    expect(formerLayoutPaths('src/core/list.ts', "  // openspec/changes is read here")).toEqual([]);
  });

  it('keeps every allowed file and text pointing at a file that exists and still uses it', () => {
    for (const rel of Object.keys(ALLOWED_FILES).filter((rel) => !rel.endsWith('layout-migration.ts'))) {
      expect(fs.existsSync(path.join(repoRoot, ...rel.split('/'))), rel).toBe(true);
    }
    for (const { file, text } of ALLOWED_TEXTS) {
      const source = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf-8');
      expect(source.split(/\r?\n/).some((line) => text.test(withoutTrailingComment(line))), `${file}: ${text}`).toBe(true);
    }
  });
});

describe('detectFormerLayout and isLayoutRoot', () => {
  let box: string;

  beforeEach(() => {
    box = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'specagile-layout-detect-')));
  });

  afterEach(() => {
    fs.rmSync(box, { recursive: true, force: true });
  });

  function write(relative: string, content = ''): void {
    const file = path.join(box, ...relative.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  it('detects a project made by SpecAgile 2.1', () => {
    write('openspec/config.yaml', 'schema: spec-driven\n');
    write('openspec/specs/.gitkeep');
    write('openspec/changes/archive/.gitkeep');

    expect(detectFormerLayout(box)).toBe(true);
    expect(isLayoutRoot(box)).toBe(false);
  });

  it('detects a repo whose only planning is an openspec/config.yaml that declares a store', () => {
    write('openspec/config.yaml', 'store: team\n');

    expect(detectFormerLayout(box)).toBe(true);
  });

  it('does not detect a home folder whose openspec/ holds stores', () => {
    fs.mkdirSync(path.join(box, 'openspec', 'team', '.openspec-store'), { recursive: true });
    write('openspec/specs/.openspec-store/store.yaml', 'id: specs\n');

    expect(detectFormerLayout(box)).toBe(false);
  });

  it('recognizes the layout in force by specagile/', () => {
    fs.mkdirSync(path.join(box, 'specs'));
    expect(isLayoutRoot(box)).toBe(false);
    fs.mkdirSync(path.join(box, 'specagile'));
    expect(isLayoutRoot(box)).toBe(true);
  });

  it('names the store metadata file as store/foundation.ts does', () => {
    expect(path.join(box, ...STORE_METADATA_FILE)).toBe(getStoreMetadataPath(box));
  });
});
