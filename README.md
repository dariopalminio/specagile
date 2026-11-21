<p align="center">
  <a href="https://github.com/dariopalminio/specagile">
    <picture>
      <source srcset="assets/specagile_bg.png">
      <img src="assets/specagile_bg.png" alt="SpecAgile logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/dariopalminio/specagile/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/dariopalminio/specagile/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/specagile"><img alt="npm version" src="https://img.shields.io/npm/v/specagile?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
</p>

<details>
<summary><strong>Project stats</strong></summary>

[![Stars](https://img.shields.io/github/stars/dariopalminio/specagile?style=flat-square&label=Stars)](https://github.com/dariopalminio/specagile/stargazers)
[![Downloads](https://img.shields.io/npm/dm/specagile?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/specagile)
[![Contributors](https://img.shields.io/github/contributors/dariopalminio/specagile?style=flat-square&label=Contributors)](https://github.com/dariopalminio/specagile/graphs/contributors)

</details>
<p></p>

# SpecAgile

Our philosophy:

```text
→ Fluid not rigid
→ Flexible for Iterative or Phased Development
→ Easy not complex
→ Built for brownfield or greenfield
→ Scalable from personal projects to enterprises
→ Tool-agnostic
→ Maintain the Living spec actively
```

<!-- TODO: Add GIF demo of /sa-propose → /sa-archive workflow -->

> [!NOTE]
> **SpecAgile** is a fork of [OpenSpec](https://github.com/Fission-AI/OpenSpec). Its CLI is `specagile` and its skills are named `sa-*` (`/sa-propose`, `/sa-implement`, …). Use one of the two tools in a project, OpenSpec or SpecAgile, not both: each one refreshes its own skills. See the [SpecAgile documentation](#documentation) for its commands and guides.

## See it in action

```text
You: /sa-explore
AI:  What would you like to explore?
You: I want dark mode but I'm not sure how to do it cleanly.
AI:  Let me look at your styling setup...
     Cleanest path here: CSS variables + a small theme context,
     with system-preference detection. No new dependencies. Scope it?
You: Yes, let's do it.

You: /sa-specify add-dark-mode
AI:  Created changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     Ready for plan!

You: /sa-plan add-dark-mode
AI:
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /sa-implement
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /sa-archive
AI:  Archived to changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

<details>
<summary><strong>What do the specs actually look like?</strong></summary>

Plain Markdown — requirements with concrete scenarios, no special syntax to learn. Here's what goes in the `specs/` folder created above:

```markdown
## ADDED Requirements

### Requirement: Theme selection
The app SHALL let users switch between light and dark themes,
defaulting to the system preference.

#### Scenario: User toggles dark mode
- **WHEN** the user clicks the theme toggle
- **THEN** the app switches to dark mode and persists the choice
```

Your AI writes these; you review the plan before any code is written.

</details>

## Why teams adopt SpecAgile

Solo, SpecAgile keeps you and your AI honest on a single repo. On a team, the hard part moves: a feature spans the API server, the web app, and a shared library; requirements are owned by one team and consumed by others; planning starts before any code exists.

**[Stores](docs-lab/multi-repo/stores.md)** let you keep planning in a repo of its own. The same shape you already know (`specs/` and `changes/`), shared by `git push` like anything else. One source of truth your whole team and every coding agent can read, across every repo.

- **Cross-repo features** — one change, one plan, even when the code lands in three repos.
- **Shared requirements** — a platform team owns the specs; product teams reference them read-only, right where their coding agent can read them. No drifting wiki.
- **Plan before code** — capture the plan in the store now; the code repos catch up later.

> Stores are in **beta**. Start with the [Stores guide](docs-lab/multi-repo/stores.md).

## Quick Start

Install SpecAgile from npm (needs Node.js 22.20.0 or higher):

```bash
npm install -g specagile
```

With another package manager: `pnpm add -g specagile`, `yarn global add specagile` or `bun add -g specagile`.

That puts `specagile` on your `PATH`. SpecAgile is its own npm package, so it never installs an `openspec` executable: an OpenSpec installed beside it keeps working as `openspec`. (The curl, PowerShell and Homebrew installers on openspec.dev, and `npm install -g @fission-ai/openspec`, install OpenSpec, not SpecAgile.)

To work on SpecAgile itself, install it from a clone of [its repository](https://github.com/dariopalminio/specagile) instead (needs pnpm):

```bash
pnpm install
pnpm build
pnpm link --global
```

> [!NOTE]
> If you installed an earlier build of this fork globally from its tarball, it was named `@fission-ai/openspec` and replaced any OpenSpec in the same npm folder. Remove it with `npm uninstall -g @fission-ai/openspec`, install `specagile`, and reinstall OpenSpec if you also use it.

Then navigate to your project directory and initialize:

```bash
cd your-project
specagile init
```

Now talk to your AI:

- **Not sure what to build yet?** Start with `/sa-explore`, a no-stakes thinking partner that reads your code, weighs options, and shapes a plan before any code gets written. ([Quickstart](docs-lab/start/quickstart.md))
- **Already know what you want?** Go straight to `/sa-propose <what-you-want-to-build>`.
- **Want to agree on *what* before *how*?** Use the three-step flow: `/sa-specify <what-you-want-to-build>` writes the proposal and specs and stops there, so your team can review them; then `/sa-plan` writes the design and tasks, and `/sa-implement` implements them. `/sa-propose` remains the one-step shortcut for both planning stages.

All of these are in the default profile. If you want the expanded workflow (`sa-new-change`, `sa-continue-change`, `sa-ff-change`, `sa-verify`, `sa-bulk-archive-change`, `sa-onboard`), select it with `specagile config profile` and apply with `specagile update`.

These are skills. Most tools invoke them as `/sa-propose` and Codex as `$sa-propose`, or you can ask for the work in plain words. `specagile init` prints the right form for the tools you picked — see [Supported Tools](docs-lab/reference/supported-tools.md). Coming from 1.x and its `/opsx:*` commands? See [Upgrade to 2.0](docs-lab/help/upgrade-to-2.md).

**Coming from OpenSpec?** In a project set up with `openspec init`, run `specagile update`. It installs the `sa-*` skills and removes the `openspec-*` skills OpenSpec wrote, as long as they are unchanged; a skill you edited stays where it is and is listed in the output. It also moves the project's `openspec/` folder to the SpecAgile layout, with `specs/`, `changes/` and `specagile/` at the root, and renames each active change's `.openspec.yaml` to `.specagile.yaml`; commit the move (see [Move to the SpecAgile layout](docs-lab/help/move-to-the-specagile-layout.md)). After that, use `specagile` in that project: OpenSpec no longer finds its planning there.

## Documentation

Start with the SpecAgile guides in this repository:

→ **[Installation](docs-lab/start/installation.md)**: install and update the CLI<br>
→ **[Quickstart](docs-lab/start/quickstart.md)**: your first change, start to finish<br>
→ **[Set up your project](docs-lab/start/setup.md)**: what `specagile init` installs<br>
→ **[CLI](docs-lab/reference/cli.md)**: terminal reference<br>
→ **[Supported tools](docs-lab/reference/supported-tools.md)**: tool integrations and install paths<br>
→ **[Customize](docs-lab/customize/overview.md)**: profiles, project config, and schemas<br>
→ **[Stores](docs-lab/multi-repo/stores.md)**: plan in a separate repo, shared across your team (beta)

## Why SpecAgile?

AI coding assistants are powerful but unpredictable when requirements live only in chat history. SpecAgile adds a lightweight spec layer so you agree on what to build before any code is written.

- **Agree before you build** — human and AI align on specs before code gets written
- **Stay organized** — each change gets its own folder with proposal, specs, design, and tasks
- **Work fluidly** — update any artifact anytime, no rigid phase gates
- **Use your tools** — works with 30+ AI assistants via skills

## Updating SpecAgile

**Upgrade the CLI**

```bash
npm install -g specagile@latest
```

`specagile update` tells you when a newer version is out, and offers to run that command for an npm install. From a clone, run `git pull`, `pnpm install` and `pnpm build` instead; the global link picks up the new build.

**Refresh agent instructions**

Run this once to refresh the skills installed on your machine. If your team keeps skills in Git, run it in each project that commits them.

```bash
specagile update
```

## Usage Notes

**Model selection**: SpecAgile works best with models that can reason over your codebase for both planning and implementation.

**Context hygiene**: SpecAgile benefits from a clean context window. Clear your context before starting implementation and maintain good context hygiene throughout your session.

## Contributing

Report bugs and propose improvements in [SpecAgile issues](https://github.com/dariopalminio/specagile/issues).

## Other

<details>
<summary><strong>Telemetry</strong></summary>

SpecAgile sends no telemetry: it records no usage and shows no first-run notice, whatever `telemetry.enabled` says in the config. (OpenSpec collects anonymous usage stats; SpecAgile turned that off.)

</details>

## License

MIT
