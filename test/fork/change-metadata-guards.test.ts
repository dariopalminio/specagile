import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * A change's metadata file is `.specagile.yaml`, and readers also take the
 * former `.openspec.yaml` through getChangeMetadataFile (src/core/fork/layout.ts).
 * Two guards keep a sync from undoing that without notice:
 *
 * - No `.openspec.yaml` literal in src/ outside layout.ts: a message upstream
 *   adds names the file with CHANGE_METADATA_FILE_NAME instead. The skill
 *   templates are left out: they are translated when skills are generated, and
 *   generated-skills-identity.test.ts pins the result.
 * - METADATA_FILENAME is only used where a new file is written (or named): a
 *   read with `path.join(changeDir, METADATA_FILENAME)` would miss every change
 *   that still has `.openspec.yaml`.
 *
 * Comment lines don't count.
 */

const repoRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(repoRoot, 'src');
const TEMPLATES = path.join(srcRoot, 'core', 'templates', 'workflows');

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
const withoutTrailingComment = (line: string) => line.replace(/\s\/\/\s.*$/, '');

function* sourceFiles(dir: string, skip?: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full !== skip) yield* sourceFiles(full, skip);
    } else if (entry.name.endsWith('.ts')) {
      yield full;
    }
  }
}

function relative(file: string): string {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

/** The code lines of `source`, with their 1-based numbers. */
function codeLines(source: string): Array<{ number: number; code: string }> {
  const lines: Array<{ number: number; code: string }> = [];
  source.split(/\r?\n/).forEach((line, index) => {
    if (!isComment(line)) lines.push({ number: index + 1, code: withoutTrailingComment(line) });
  });
  return lines;
}

// -----------------------------------------------------------------------------
// The former name as a literal
// -----------------------------------------------------------------------------

/** The one file that spells the former name: it defines it. */
const FORMER_NAME_FILE = 'src/core/fork/layout.ts';
const FORMER_NAME = /\.openspec\.yaml/;

/** The lines of `source` (a file at `rel`) that spell `.openspec.yaml`. */
function formerNameLiterals(rel: string, source: string): string[] {
  if (rel === FORMER_NAME_FILE) return [];
  return codeLines(source)
    .filter(({ code }) => FORMER_NAME.test(code))
    .map(({ number, code }) => `${rel}:${number}: ${code.trim()}`);
}

describe('the former change metadata name in src/', () => {
  it('is only spelled in src/core/fork/layout.ts', () => {
    const found: string[] = [];
    for (const file of sourceFiles(srcRoot, TEMPLATES)) {
      found.push(...formerNameLiterals(relative(file), fs.readFileSync(file, 'utf-8')));
    }
    expect(
      found,
      `name the file with CHANGE_METADATA_FILE_NAME (src/core/fork/layout.ts):\n${found.join('\n')}`
    ).toEqual([]);
  });

  it('catches a message that names .openspec.yaml, but not a comment', () => {
    const message = "      bullets.push('- Or remove skip_specs from .openspec.yaml and add delta specs instead');";
    expect(formerNameLiterals('src/commands/validate.ts', message)).toHaveLength(1);
    expect(formerNameLiterals('src/core/fork/change-metadata-migration.ts', "const name = '.openspec.yaml';")).toHaveLength(1);
    expect(formerNameLiterals('src/commands/change.ts', '      // only .openspec.yaml, and a custom schema')).toEqual([]);
    expect(formerNameLiterals(FORMER_NAME_FILE, "export const FORMER_CHANGE_METADATA_FILE_NAME = '.openspec.yaml';")).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Uses of METADATA_FILENAME
// -----------------------------------------------------------------------------

/**
 * Where METADATA_FILENAME may be used, at most `count` times per file: the
 * definition, the writes of a new change's file, and the issue path validate
 * shows. Naming it inside a message (`${METADATA_FILENAME}`) and importing it
 * are always fine.
 */
const ALLOWED_USES: ReadonlyArray<{ file: string; text: RegExp; count: number; reason: string }> = [
  {
    file: 'src/utils/change-metadata.ts',
    text: /export const METADATA_FILENAME = CHANGE_METADATA_FILE_NAME;/,
    count: 1,
    reason: 'the definition',
  },
  {
    file: 'src/utils/change-metadata.ts',
    text: /const metaPath = path\.join\(changeDir, METADATA_FILENAME\);/,
    count: 1,
    reason: "writeChangeMetadata writes a new change's file",
  },
  {
    file: 'src/commands/workflow/new-change.ts',
    text: /metadataPath: path\.join\(result\.changeDir, METADATA_FILENAME\),/,
    count: 1,
    reason: 'the file new change just wrote',
  },
  {
    file: 'src/core/validation/validator.ts',
    text: /path: METADATA_FILENAME,?/,
    count: 3,
    reason: 'the file a validation issue names, for display',
  },
];

const USE = /\bMETADATA_FILENAME\b/g;
const IMPORT_SPECIFIER = /^\s*METADATA_FILENAME,?\s*$|^\s*import\s*\{[^}]*\bMETADATA_FILENAME\b[^}]*\}\s*from\b/;
const IN_MESSAGE = /\$\{METADATA_FILENAME\}/g;

/** Whether the line uses METADATA_FILENAME other than to import it or name it in a message. */
function usesMetadataFilename(code: string): boolean {
  if (IMPORT_SPECIFIER.test(code)) return false;
  return (code.match(USE)?.length ?? 0) > (code.match(IN_MESSAGE)?.length ?? 0);
}

/** The uses of METADATA_FILENAME in `source` (a file at `rel`) beyond ALLOWED_USES. */
function unexpectedMetadataFilenameUses(rel: string, source: string): string[] {
  const entries = ALLOWED_USES.filter((entry) => entry.file === rel);
  const seen = new Map<(typeof ALLOWED_USES)[number], number>();
  const found: string[] = [];
  for (const { number, code } of codeLines(source)) {
    if (!usesMetadataFilename(code)) continue;
    const entry = entries.find((candidate) => candidate.text.test(code));
    const count = entry ? (seen.get(entry) ?? 0) + 1 : 0;
    if (entry) seen.set(entry, count);
    if (!entry || count > entry.count) found.push(`${rel}:${number}: ${code.trim()}`);
  }
  return found;
}

describe('uses of METADATA_FILENAME in src/', () => {
  it('only writes a new file with it; reads resolve the file with getChangeMetadataFile', () => {
    const found: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      found.push(...unexpectedMetadataFilenameUses(relative(file), fs.readFileSync(file, 'utf-8')));
    }
    expect(
      found,
      'read the metadata with getChangeMetadataFile(changeDir) (src/core/fork/layout.ts), ' +
        `or add a write to ALLOWED_USES with the reason:\n${found.join('\n')}`
    ).toEqual([]);
  });

  it('catches a read, also in a file with allowed uses', () => {
    const read = "    raw = fs.readFileSync(path.join(changeDir, METADATA_FILENAME), 'utf-8');";
    expect(unexpectedMetadataFilenameUses('src/core/list.ts', read)).toHaveLength(1);
    expect(unexpectedMetadataFilenameUses('src/utils/change-metadata.ts', read)).toHaveLength(1);
    // A second write in the same file goes past the count.
    const write = '  const metaPath = path.join(changeDir, METADATA_FILENAME);';
    expect(unexpectedMetadataFilenameUses('src/utils/change-metadata.ts', `${write}\n${write}`)).toHaveLength(1);
  });

  it('lets an import, a message and a comment through', () => {
    const source = [
      "import { METADATA_FILENAME } from '../utils/change-metadata.js';",
      '  METADATA_FILENAME,',
      '      `The ${METADATA_FILENAME} retirement authorization is unavailable.`',
      '  // path.join(changeDir, METADATA_FILENAME) would miss .openspec.yaml',
    ].join('\n');
    expect(unexpectedMetadataFilenameUses('src/core/archive.ts', source)).toEqual([]);
  });

  it('keeps every allowed use pointing at a line that still exists', () => {
    for (const { file, text } of ALLOWED_USES) {
      const source = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf-8');
      expect(codeLines(source).some(({ code }) => text.test(code)), `${file}: ${text}`).toBe(true);
    }
  });
});
