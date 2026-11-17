# Installation

> Install the `specagile` CLI on your machine, update it, and uninstall it.

SpecAgile is the npm package `specagile`. It installs one command, `specagile`, and never an `openspec` command, so an OpenSpec installed beside it keeps working. Use one of the two in each project.

## Install

SpecAgile needs Node.js 22.20.0 or newer. In your terminal:

```bash
node --version
```

If that prints `v22.20.0` or higher, install with npm:

```bash
npm install -g specagile
```

If not, install a newer Node from [nodejs.org](https://nodejs.org) or through your version manager (nvm, fnm, asdf, volta).

With another package manager:

| Package manager | Command |
|---|---|
| pnpm | `pnpm add -g specagile` |
| Yarn | `yarn global add specagile` |
| Bun | `bun add -g specagile` |

SpecAgile has no standalone install: [`specagile install`](../reference/cli.md#specagile-install) only points you to npm. The curl, PowerShell and Homebrew installers on openspec.dev, and `npm install -g @fission-ai/openspec`, install OpenSpec, not SpecAgile.

> [!NOTE]
> An earlier build of this fork, installed globally from its tarball, was named `@fission-ai/openspec` and replaced any OpenSpec in the same npm folder. Remove it with `npm uninstall -g @fission-ai/openspec`, install `specagile`, and reinstall OpenSpec if you also use it.

## From source

To work on SpecAgile itself, clone [its repository](https://github.com/dariopalminio/specagile) and, inside it (needs pnpm):

```bash
pnpm install
pnpm build
pnpm link --global
```

The global `specagile` now runs your clone.

## Check it worked

In your terminal:

```bash
specagile --version
```

It prints the version. Then set up a project with [`specagile init`](setup.md).

## Updating

Upgrade the CLI the way you installed it:

```bash
npm install -g specagile@latest
```

(`pnpm add -g specagile@latest`, `yarn global add specagile@latest` or `bun add -g specagile@latest` with the others.) From a clone, run `git pull`, `pnpm install` and `pnpm build`.

Then, in your terminal:

```bash
specagile update
```

When a newer CLI is out, [`specagile update`](../reference/cli.md#specagile-update) says so, and for an npm install it can run the upgrade for you. Every run refreshes your skills, which never update on their own. With global skills, running it once from any folder is enough, and it prints `✓ The 8 skills for this machine are up to date (v2.1.0)`. With skills kept in a project, run it in each project; a current one prints `✓ All 2 tool(s) up to date (v2.1.0)`.

> [!NOTE]
> A global npm install belongs to one Node installation. Switch Node versions with nvm and the `specagile` command doesn't come along, so install it again under the new version.

## Uninstalling

To uninstall SpecAgile, run through the steps below; none of them touch your source code.

**1. Remove [shell completions](../reference/cli.md#specagile-completion)**, if you set them up, while the CLI can still do it. In your terminal:

```bash
specagile completion uninstall
```

**2. Remove the CLI**, with the package manager you installed it with:

```bash
npm uninstall -g specagile
```

(`pnpm remove -g specagile`, `yarn global remove specagile` or `bun remove -g specagile`; from a clone, `pnpm unlink --global` inside it.) Your shell should no longer find `specagile`.

**3. Delete what's left, or keep it.**

- Skills installed for this machine: remove them with `npx skills remove --global`, picking the `sa-` ones, or delete the `sa-*` folders in `~/.agents/skills/` and the `sa-*` links in tool folders like `~/.claude/skills/`.
- Generated agent files, per project: the `sa-*` skills and `.openspec-target` in `.agents/skills/`, and the `sa-*` links in tool folders like `.claude/skills/`. [Supported tools](../reference/supported-tools.md) lists which tools get links.
- The `openspec/` folder: pause first. `specs/` and `changes/archive/` are your record of the system, plain Markdown that reads fine without SpecAgile.
- Per-machine state: settings in `~/.config/openspec/`; schema overrides and store registrations in `~/.local/share/openspec/` (Windows: `%APPDATA%\openspec`, `%LOCALAPPDATA%\openspec`). OpenSpec uses the same folders, so keep them if you also use OpenSpec. Registrations are pointers; the store repos they point to are untouched.
