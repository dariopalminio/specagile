import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  FORK_REMOVED_PATHS,
  isForkRemovedPath,
} from '../../scripts/fork/removed-paths.mjs';

// Git paths use `/` on every platform, so they are built with path.posix.join.
// No literal "<site dir>/" text in this file: test/ci-docs-only.test.ts would
// then require it in ci.yml's docs job (see design.md of remove-website-from-fork).
const SITE = 'website';
const gitPath = (...segments: string[]) => path.posix.join(...segments);

describe('fork-removed paths', () => {
  it('lists the documentation site and its preview test', () => {
    expect(FORK_REMOVED_PATHS).toEqual([SITE, gitPath('test', 'website-preview.test.ts')]);
  });

  it('matches the listed directory and everything inside it', () => {
    expect(isForkRemovedPath(SITE)).toBe(true);
    expect(isForkRemovedPath(gitPath(SITE, 'package.json'))).toBe(true);
    expect(isForkRemovedPath(gitPath(SITE, 'app', 'layout.tsx'))).toBe(true);
  });

  it('matches the listed file exactly', () => {
    expect(isForkRemovedPath(gitPath('test', 'website-preview.test.ts'))).toBe(true);
  });

  it('leaves paths with similar names alone', () => {
    expect(isForkRemovedPath('website-assets')).toBe(false);
    expect(isForkRemovedPath(gitPath('website-assets', 'logo.svg'))).toBe(false);
    expect(isForkRemovedPath(gitPath('test', 'website-preview.helpers.ts'))).toBe(false);
    expect(isForkRemovedPath(gitPath('test', 'website-preview.test.ts.snap'))).toBe(false);
    expect(isForkRemovedPath(gitPath('docs', SITE, 'index.md'))).toBe(false);
    expect(isForkRemovedPath(gitPath('docs', 'index.md'))).toBe(false);
  });

  it('compares case-sensitively, like git paths', () => {
    expect(isForkRemovedPath(gitPath('Website', 'app', 'layout.tsx'))).toBe(false);
  });

  it('expects git-format paths, not native Windows ones', () => {
    // Git prints `/` on Windows too; callers pass its output, never path.join results.
    expect(isForkRemovedPath(path.win32.join(SITE, 'app', 'layout.tsx'))).toBe(false);
  });
});
