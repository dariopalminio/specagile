/**
 * Static template strings for Bash completion scripts.
 * These are Bash-specific helper functions that never change.
 */

import { CLI_NAME } from '../../fork/identity.js';

export const BASH_DYNAMIC_HELPERS = `# Dynamic completion helpers

_openspec_complete_changes() {
  local changes
  changes=$(${CLI_NAME} __complete changes 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$changes" -- "$cur"))
}

_openspec_complete_specs() {
  local specs
  specs=$(${CLI_NAME} __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$specs" -- "$cur"))
}

_openspec_complete_items() {
  local items
  items=$(${CLI_NAME} __complete changes 2>/dev/null | cut -f1; ${CLI_NAME} __complete specs 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$items" -- "$cur"))
}

_openspec_complete_schemas() {
  local schemas
  schemas=$(${CLI_NAME} __complete schemas 2>/dev/null | cut -f1)
  COMPREPLY=($(compgen -W "$schemas" -- "$cur"))
}`;
