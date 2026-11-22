/**
 * Handoff texts shared by the fork's stage workflows (SpecAgile fork).
 *
 * plan.ts and tasks.ts select a change and check its specification the same
 * way, so they say the same thing when the change is missing, its
 * specification is incomplete or has a problem, or its schema has no `specs`
 * artifact. Fork-owned, like those two files.
 *
 * A skill says the same thing whatever workflows are installed (upstream 2.1,
 * test/core/templates/one-text-per-skill.test.ts), so these never assume
 * another workflow is there: they name a skill only "if that skill is
 * installed", as archive-change.ts does.
 */

/** A named change that does not exist: point at the specification stage. */
export const CHANGE_NOT_FOUND =
  'suggest specifying a new change first: with `/opsx:specify` if that skill is installed, or otherwise by creating it with `openspec new change "<name>"` and writing its specification before planning it';

/** An incomplete or inconsistent specification is fixed in the specification stage. */
export const SPECIFY_TO_COMPLETE =
  'explain that the specification stage must be finished first: a proposal, one delta spec for each capability it lists, and none for capabilities it does not list. Suggest `/opsx:specify <name>` to complete or fix it if that skill is installed';

/** A problem found in the specification while planning. */
export const SPECIFY_TO_RESOLVE =
  'suggest resolving it in the specification before continuing (with `/opsx:specify <name>` if that skill is installed)';

/** A schema with no `specs` artifact cannot be split into stages. */
export const NO_SPECS_SCHEMA_SUGGESTION =
  'suggest generating all of its artifacts in one step with `/opsx:propose` if that skill is installed, or otherwise one at a time with `openspec instructions <artifact-id> --change "<name>"`';
