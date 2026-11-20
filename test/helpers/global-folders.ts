import * as path from 'node:path';

import { GLOBAL_FOLDER_NAME } from '../../src/core/fork/identity.js';

/**
 * SpecAgile's global folders for tests, from src/core/fork/identity.ts: tests
 * that point `XDG_CONFIG_HOME` or `XDG_DATA_HOME` at a temporary folder build
 * the paths below it here instead of joining `'openspec'` by hand, so they
 * follow the name in force.
 */
export { GLOBAL_FOLDER_NAME };

/** `<base>/specagile`: the global config folder under `XDG_CONFIG_HOME` (or `%APPDATA%`). */
export function globalConfigDir(base: string): string {
  return path.join(base, GLOBAL_FOLDER_NAME);
}

/** `<base>/specagile/config.json`: the global config file under `XDG_CONFIG_HOME` (or `%APPDATA%`). */
export function globalConfigFile(base: string): string {
  return path.join(globalConfigDir(base), 'config.json');
}

/** `<base>/specagile`, with optional segments below it: the global data folder under `XDG_DATA_HOME` (or `%LOCALAPPDATA%`). */
export function globalDataDir(base: string, ...segments: string[]): string {
  return path.join(base, GLOBAL_FOLDER_NAME, ...segments);
}
