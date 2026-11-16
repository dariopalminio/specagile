// Paths this fork deliberately removed from upstream OpenSpec.
//
// This list is the single source of truth: scripts/fork/sync-upstream.mjs prunes
// these paths after every upstream merge, test/fork/ checks them, and FORK.md
// documents them (test/fork/fork-docs.test.ts keeps the two in step).
//
// Entries use git's path format: forward slashes on every platform, Windows
// included, exactly as git records and prints them. A directory entry has no
// trailing slash and covers everything inside it.
export const FORK_REMOVED_PATHS = Object.freeze([
  'website',
  'test/website-preview.test.ts',
]);

/**
 * True when `gitPath` (a path as git prints it, with `/` separators) is one of
 * FORK_REMOVED_PATHS or lies inside a listed directory. Explicit lookup only:
 * `website-assets/x` or `test/website-preview.helpers.ts` do not match, and the
 * comparison is case-sensitive, like git's own paths.
 */
export function isForkRemovedPath(gitPath) {
  return FORK_REMOVED_PATHS.some(
    (entry) => gitPath === entry || gitPath.startsWith(`${entry}/`)
  );
}
