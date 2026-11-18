import * as fs from 'node:fs';
import * as path from 'node:path';

import { getArchiveDir, getConfigFile, getSpecsDir, getToolDir } from './layout.js';

/** Minimal healthy OpenSpec root layout shared by slice test suites. */
export function createOpenSpecRoot(rootDir: string): void {
  fs.mkdirSync(getSpecsDir(rootDir), { recursive: true });
  fs.mkdirSync(getArchiveDir(rootDir), { recursive: true });
  fs.mkdirSync(getToolDir(rootDir), { recursive: true });
  fs.writeFileSync(getConfigFile(rootDir), 'schema: spec-driven\n');
}

/** Writes a spec file under the root's specs/<id>/spec.md. */
export function writeSpec(rootDir: string, specId: string, body: string): void {
  const specDir = path.join(getSpecsDir(rootDir), specId);
  fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(path.join(specDir, 'spec.md'), body);
}
