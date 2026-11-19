import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertDiscoveredSpecFile,
  assertSpecFileWithin,
} from '../../src/utils/spec-path-containment.js';
import { RELATIVE_CHANGES_DIR, RELATIVE_SPECS_DIR, getArchiveDir, getChangesDir, getSpecsDir, getToolDir } from '../helpers/layout.js';

const itWithSymlinks = it.skipIf(process.platform === 'win32');

/**
 * Coverage for the containment rule itself rather than for a copy of it in a
 * command. The cases run against real directories because the rule
 * canonicalizes before deciding, so a purely notional path would not exercise
 * it.
 */
describe('spec.md containment', () => {
  let tempDir: string;
  let projectDir: string;
  let specsRoot: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-containment-'));
    projectDir = path.join(tempDir, 'repo');
    specsRoot = getSpecsDir(projectDir);
    // SpecAgile: specagile/ is what makes repo/ the project (src/core/fork/layout.ts).
    await fs.mkdir(getToolDir(projectDir), { recursive: true });
    await fs.mkdir(path.join(specsRoot, 'login'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function link(target: string): Promise<string> {
    const linkPath = path.join(specsRoot, 'login', 'spec.md');
    await fs.symlink(target, linkPath);
    return linkPath;
  }

  for (const [name, assert] of [
    ['assertDiscoveredSpecFile', assertDiscoveredSpecFile],
    ['assertSpecFileWithin', assertSpecFileWithin],
  ] as const) {
    describe(name, () => {
      it('accepts an ordinary spec file', async () => {
        const specFile = path.join(specsRoot, 'login', 'spec.md');
        await fs.writeFile(specFile, '# login\n');
        expect(() => assert(specsRoot, specFile)).not.toThrow();
      });

      it('rejects a path that traverses out of the specs root', () => {
        expect(() =>
          assert(specsRoot, path.join(specsRoot, '..', '..', '..', 'outside.md'))
        ).toThrow('Path is outside the allowed directory');
      });

      itWithSymlinks('accepts a link to a file elsewhere in the project', async () => {
        const docsSpec = path.join(projectDir, 'docs', 'auth', 'specs', 'login.md');
        await fs.mkdir(path.dirname(docsSpec), { recursive: true });
        await fs.writeFile(docsSpec, '# login\n');
        const linkPath = await link(path.relative(path.join(specsRoot, 'login'), docsSpec));

        expect(() => assert(specsRoot, linkPath)).not.toThrow();
      });

      itWithSymlinks('rejects a link that leaves the project', async () => {
        const outside = path.join(tempDir, 'outside.md');
        await fs.writeFile(outside, '# outside\n');
        const linkPath = await link(outside);

        expect(() => assert(specsRoot, linkPath)).toThrow(
          'Path is outside the allowed directory'
        );
      });

      itWithSymlinks('rejects a dangling link rather than assuming it is contained', async () => {
        const linkPath = await link(path.join(projectDir, 'docs', 'missing.md'));

        expect(() => assert(specsRoot, linkPath)).toThrow();
      });

      itWithSymlinks(
        'keeps a specs root with no project to name confined to itself',
        async () => {
          // A specs root reached outside an `openspec` directory (a store given
          // by path) has no project boundary to widen to.
          const bareRoot = path.join(tempDir, 'bare-specs');
          await fs.mkdir(path.join(bareRoot, 'login'), { recursive: true });
          const outside = path.join(tempDir, 'bare-outside.md');
          await fs.writeFile(outside, '# outside\n');
          const linkPath = path.join(bareRoot, 'login', 'spec.md');
          await fs.symlink(outside, linkPath);

          expect(() => assert(bareRoot, linkPath)).toThrow(
            'Path is outside the allowed directory'
          );
        }
      );
    });
  }

  describe('the project boundary a specs root resolves to', () => {
    async function linkedSpecUnder(
      specsRoot: string,
      target: string
    ): Promise<string> {
      await fs.mkdir(path.join(specsRoot, 'login'), { recursive: true });
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, '# login\n');
      const linkPath = path.join(specsRoot, 'login', 'spec.md');
      await fs.symlink(path.relative(path.join(specsRoot, 'login'), target), linkPath);
      return linkPath;
    }

    itWithSymlinks('reaches the project from a change\'s delta specs', async () => {
      const deltaSpecs = path.join(getChangesDir(projectDir), 'c1', 'specs');
      const linkPath = await linkedSpecUnder(
        deltaSpecs,
        path.join(projectDir, 'docs', 'shared-delta.md')
      );

      expect(() => assertDiscoveredSpecFile(deltaSpecs, linkPath)).not.toThrow();
    });

    itWithSymlinks('reaches the project from an archived change\'s delta specs', async () => {
      const deltaSpecs = path.join(getArchiveDir(projectDir), '2026-01-01-c1', 'specs');
      const linkPath = await linkedSpecUnder(
        deltaSpecs,
        path.join(projectDir, 'docs', 'shared-delta.md')
      );

      expect(() => assertDiscoveredSpecFile(deltaSpecs, linkPath)).not.toThrow();
    });

    itWithSymlinks(
      'does not widen for a directory that merely shares the name `openspec`',
      async () => {
        // A store kept at `<somewhere>/openspec/my-store` must not hand out
        // `<somewhere>` as its boundary: without a specagile/ folder there is
        // no project to name.
        const storeSpecs = path.join(tempDir, 'openspec', 'my-store', 'specs');
        const linkPath = await linkedSpecUnder(
          storeSpecs,
          path.join(tempDir, 'elsewhere', 'login.md')
        );

        expect(() => assertDiscoveredSpecFile(storeSpecs, linkPath)).toThrow(
          'Path is outside the allowed directory'
        );
      }
    );
  });

  // SpecAgile: the project is the first ancestor, reached through specs/ or
  // changes/, that has a specagile/ folder (src/utils/spec-path-containment.ts).
  describe('the project boundary in the SpecAgile layout', () => {
    async function linkedSpec(specs: string, target: string): Promise<string> {
      await fs.mkdir(path.join(specs, 'login'), { recursive: true });
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, '# login\n');
      const linkPath = path.join(specs, 'login', 'spec.md');
      await fs.symlink(path.relative(path.join(specs, 'login'), target), linkPath);
      return linkPath;
    }

    itWithSymlinks('accepts a link that stays inside the project', async () => {
      const linkPath = await linkedSpec(path.join(projectDir, 'specs'), path.join(projectDir, 'docs', 'login.md'));

      expect(() => assertDiscoveredSpecFile(path.join(projectDir, 'specs'), linkPath)).not.toThrow();
    });

    itWithSymlinks('rejects a link that leaves the project', async () => {
      const linkPath = await linkedSpec(path.join(projectDir, 'specs'), path.join(tempDir, 'outside', 'login.md'));

      expect(() => assertDiscoveredSpecFile(path.join(projectDir, 'specs'), linkPath)).toThrow(
        'Path is outside the allowed directory'
      );
    });

    itWithSymlinks('takes a store kept at <tmp>/openspec/team as the boundary', async () => {
      const storeRoot = path.join(tempDir, 'openspec', 'team');
      await fs.mkdir(path.join(storeRoot, 'specagile'), { recursive: true });
      const storeSpecs = path.join(storeRoot, 'specs');
      const inside = await linkedSpec(storeSpecs, path.join(storeRoot, 'docs', 'login.md'));
      expect(() => assertDiscoveredSpecFile(storeSpecs, inside)).not.toThrow();

      await fs.rm(path.join(storeSpecs, 'login'), { recursive: true });
      const outside = await linkedSpec(storeSpecs, path.join(tempDir, 'openspec', 'elsewhere.md'));
      expect(() => assertDiscoveredSpecFile(storeSpecs, outside)).toThrow('Path is outside the allowed directory');
    });
  });

  itWithSymlinks(
    'assertDiscoveredSpecFile treats a linked capability directory as its own trust root',
    async () => {
      const external = path.join(tempDir, 'other-repo', 'login');
      await fs.mkdir(external, { recursive: true });
      await fs.writeFile(path.join(external, 'spec.md'), '# login\n');
      const capabilityLink = path.join(specsRoot, 'shared');
      await fs.symlink(external, capabilityLink);

      expect(() =>
        assertDiscoveredSpecFile(specsRoot, path.join(capabilityLink, 'spec.md'))
      ).not.toThrow();
    }
  );

  itWithSymlinks(
    'assertSpecFileWithin refuses a capability directory swapped for a link',
    async () => {
      // The recheck before a read or a write must not trust a directory that
      // became a link after the path was resolved.
      const external = path.join(tempDir, 'other-repo', 'login');
      await fs.mkdir(external, { recursive: true });
      await fs.writeFile(path.join(external, 'spec.md'), '# login\n');
      await fs.rm(path.join(specsRoot, 'login'), { recursive: true });
      await fs.symlink(external, path.join(specsRoot, 'login'));

      expect(() =>
        assertSpecFileWithin(specsRoot, path.join(specsRoot, 'login', 'spec.md'))
      ).toThrow('Path is outside the allowed directory');
    }
  );
});
