/**
 * Static template strings for PowerShell completion scripts.
 * These are PowerShell-specific helper functions that never change.
 */

import { CLI_NAME } from '../../fork/identity.js';

export const POWERSHELL_DYNAMIC_HELPERS = `# Dynamic completion helpers

function Get-OpenSpecChanges {
    $output = ${CLI_NAME} __complete changes 2>$null
    if ($output) {
        $output | ForEach-Object {
            ($_ -split "\\t")[0]
        }
    }
}

function Get-OpenSpecSpecs {
    $output = ${CLI_NAME} __complete specs 2>$null
    if ($output) {
        $output | ForEach-Object {
            ($_ -split "\\t")[0]
        }
    }
}

function Get-OpenSpecSchemas {
    $output = ${CLI_NAME} __complete schemas 2>$null
    if ($output) {
        $output | ForEach-Object {
            ($_ -split "\\t")[0]
        }
    }
}
`;
