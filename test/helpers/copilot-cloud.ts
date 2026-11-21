import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The Copilot cloud agent SpecAgile 3.0.0 to 4.0.0 wrote at
 * `.github/agents/openspec.agent.md` (`name: OpenSpec`), frozen from the 4.0.0
 * build with LF line endings. Tests compare against this file rather than a
 * text built with the functions under test.
 */
export const SPECAGILE_4_0_0_AGENT: string = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'fixtures',
    'copilot-cloud',
    'specagile-4.0.0.agent.md'
  ),
  'utf8'
);
