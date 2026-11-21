# Supported tools

> Which AI coding tools OpenSpec supports, and how to invoke each one's skills.

Every tool in the matrix runs the same OpenSpec workflows, installed as skills. Earlier
versions also wrote command files. [Upgrade to 2.0](../help/upgrade-to-2.md) covers what
happens to them.

## Where skills go

New projects use machine-wide skills by default. With `--scope project`, the installer writes to `.agents/skills/` and gives tools that need their own folder a link or copy of each skill.

A project set up for Claude Code, Cursor, and Codex:

```
my-project/
├── .agents/skills/
│   ├── .openspec-target           the tools set up here, one per line
│   └── sa-propose/SKILL.md  the one copy every tool reads
└── .claude/
    └── skills/sa-propose    link to ../../.agents/skills/sa-propose
```

Cursor and Codex read `.agents/skills/` themselves, so they need nothing else.

Project installs leave `skills-lock.json` alone.

`.openspec-target` is how `specagile update` knows which tools are set up and what is OpenSpec's. Each line is one of:

| Line | Meaning |
|---|---|
| `<tool>` | A tool set up in this project, such as `cursor`. |
| `<tool> own-files` | OpenSpec gave the tool links in its own folder, such as `claude own-files`. Delete that folder and `update` removes the tool. |

Vercel’s `skills` package places the skills in the folders each agent reads. Windows project installs use copies. Run `specagile init --help` for the full list, including tools such as AiderDesk (`aider-desk`). Existing OpenSpec IDs still work: use `claude` for Claude Code and `windsurf` for Devin Desktop.

With global scope, tools share `~/.agents/skills/` or read from their own global skills folder. Eve and PromptScript need project scope.

For a tool outside the installer’s list, use `--tools agents` or the tool’s existing OpenSpec ID. Veai reads the universal folder in either scope. GigaCode documents the project folder. For EasyCode, keep working per-skill links or [link the skills](#link-another-tool) into its own folder.

## Support matrix

Invocations are shown for the apply workflow. Every workflow follows the same shape.
The id goes to `specagile init --tools <id>` to skip the picker ([CLI](cli.md)).

| Tool | `--tools` id | Skills | Skill invocation |
|---|---|---|---|
| Amp | `amp` | `.agents/skills/` | `/sa-implement` |
| Antigravity | `antigravity` | `.agents/skills/` | `/sa-implement` |
| AtomCode | `atomcode` | `.agents/skills/` | `/sa-implement` |
| Auggie (Augment CLI) | `auggie` | `.agents/skills/` (also in `.augment/skills/`) | `/sa-implement` |
| IBM Bob | `bob` | `.agents/skills/` (also in `.bob/skills/`) | `/sa-implement` |
| Claude Code | `claude` | `.agents/skills/` (also in `.claude/skills/`) | `/sa-implement` |
| Cline | `cline` | `.agents/skills/` | `/sa-implement` |
| CodeArts | `codeartsagent` | `.agents/skills/` (also in `.codeartsdoer/skills/`) | `/sa-implement` |
| CodeBuddy Code (CLI) | `codebuddy` | `.agents/skills/` (also in `.codebuddy/skills/`) | `/sa-implement` |
| Code Studio | `codestudio` | `.agents/skills/` (also in `.codestudio/skills/`) | `/sa-implement` |
| Codex | `codex` | `.agents/skills/` | `$sa-implement` |
| Continue | `continue` | `.agents/skills/` (also in `.continue/skills/`) | `/sa-implement` |
| CoStrict | `costrict` | `.agents/skills/` | `/sa-implement` |
| Crush | `crush` | `.agents/skills/` (also in `.crush/skills/`) | `/sa-implement` |
| Cursor | `cursor` | `.agents/skills/` | `/sa-implement` |
| DeepSeek Harness | `dsh` | `.agents/skills/` | `/sa-implement` |
| Devin Desktop (formerly Windsurf) | `devin` | `.agents/skills/` (also in `.devin/skills/`) | `/sa-implement` |
| EasyCode | `easycode` | `.agents/skills/` | `/sa-implement` |
| Factory Droid | `factory` | `.agents/skills/` | `/sa-implement` |
| ForgeCode | `forgecode` | `.agents/skills/` (also in `.forge/skills/`) | `/sa-implement` |
| Gemini CLI | `gemini` | `.agents/skills/` | `/sa-implement` |
| GigaCode | `gigacode` | `.agents/skills/` | `/sa-implement` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `/sa-implement` |
| Grok Build | `grok` | `.agents/skills/` (also in `.grok/skills/`) | `/sa-implement` |
| GSD | `gsd` | `.agents/skills/` | ask for `sa-implement` |
| Hermes Agent | `hermes` | `.agents/skills/` (also in `.hermes/skills/`) | `/sa-implement` |
| iFlow | `iflow` | `.agents/skills/` (also in `.iflow/skills/`) | `/sa-implement` |
| Junie | `junie` | `.agents/skills/` (also in `.junie/skills/`) | `/sa-implement` |
| Kilo Code | `kilocode` | `.agents/skills/` | `/sa-implement` |
| Kimi Code | `kimi` | `.agents/skills/` | `/skill:sa-implement` |
| Kiro | `kiro` | `.agents/skills/` (also in `.kiro/skills/`) | `/sa-implement` |
| Lingma | `lingma` | `.agents/skills/` (also in `.lingma/skills/`) | `/sa-implement` |
| MiniMax Code | `minimax-code` | `.agents/skills/` (also in `.minimax/skills/`) | `/sa-implement` |
| Mistral Vibe | `vibe` | `.agents/skills/` (also in `.vibe/skills/`) | `/sa-implement` |
| Oh My Pi | `oh-my-pi` | `.agents/skills/` | `/sa-implement` |
| OpenCode | `opencode` | `.agents/skills/` | `/sa-implement` |
| Pi | `pi` | `.agents/skills/` | `/sa-implement` |
| Qoder | `qoder` | `.agents/skills/` (also in `.qoder/skills/`) | `/sa-implement` |
| Qwen Code | `qwen` | `.agents/skills/` (also in `.qwen/skills/`) | `/sa-implement` |
| Rovo Dev CLI | `rovodev` | `.agents/skills/` (also in `.rovodev/skills/`) | ask for `sa-implement` |
| Trae | `trae` | `.agents/skills/` (also in `.trae/skills/`) | `/sa-implement` |
| [Veai](https://veai.ru/docs/veai/download) | `veai` | `.agents/skills/` | `/sa-implement` |
| Warp | `warp` | `.agents/skills/` | `/sa-implement` |
| ZCode | `zcode` | `.agents/skills/` (also in `.zcode/skills/`) | `/sa-implement` |
| Zoo Code | `roocode` | `.agents/skills/` (also in `.roo/skills/`) | `/sa-implement` |
| Other / Universal | `agents` | `.agents/skills/` | `/sa-implement` |

- **Skill invocation**: whether a tool registers skills as typed entries is the tool's
  own behavior. The column shows the spelling OpenSpec uses in generated files and in
  the hint init prints. Check your tool's docs if typing it does nothing.

## Link another tool

A tool that reads `.agents/skills/` needs nothing: pick `agents` at init ([Other / Universal](#other--universal-shared-agents-skills)). A tool that reads only its own folder can be pointed at the shared copy with one link. In your terminal, from the project root:

```bash
mkdir -p .mytool
ln -s ../.agents/skills .mytool/skills
```

On Windows, in Command Prompt:

```
mkdir .mytool
mklink /J .mytool\skills .agents\skills
```

With global skills, make the link in your home folder instead: `ln -s ~/.agents/skills ~/.mytool/skills`.

Replace `.mytool` with your tool's folder. If the tool already has a `skills/` folder of its own, link each skill instead: `ln -s ../../.agents/skills/sa-propose .mytool/skills/sa-propose`.

**Committing links**: Git stores links as links. A teammate on Windows should run `git config --global core.symlinks true` (or clone with `git clone -c core.symlinks=true <url>`) and enable Developer Mode so links can be created. Otherwise each link checks out as a small text file, which `specagile update` replaces with a plain copy of the skill. A junction made with `mklink /J` is not committed as a link; recreate it on each machine.

## Per-tool notes

A tool not listed here behaves exactly as its row reads.

### Amazon Q Developer (retired)

OpenSpec 2.0 no longer supports Amazon Q Developer: it can't load skills, and AWS is
retiring it in favor of Kiro. `specagile init --tools amazon-q` stops with that
message. In a project set up for it, `specagile update` removes the prompts and skills
OpenSpec wrote in `.amazonq/`, and keeps and lists any you edited. Set up Kiro
instead: `specagile init --tools kiro`.

### Antigravity

- **Current folder**: Antigravity v1.20.5 and later read workspace skills and
  workflows from `.agents/`.
- **Legacy folder**: after OpenSpec writes replacements, it removes equivalent
  generated files from `.agent/`. Custom files and changed generated files stay in
  `.agent/` for you to review.
- **Shared skills**: Antigravity reads the same `.agents/skills/` copy as every other
  tool. Workflows OpenSpec wrote to `.agents/workflows/` before 2.0 are removed on
  update.
- **Global skills**: for a [machine-wide install](../start/setup.md#install-the-skills-once-for-every-project),
  the `skills` package keeps Antigravity's skills in `~/.gemini/config/skills/`,
  as links to the shared copy or as copies. `specagile update` keeps them current.

### Cline

Skills are the shared copy in `.agents/skills/`. Workflows OpenSpec wrote to
`.clinerules/workflows/` before 2.0 are removed on update; your own rules there are
left alone.

### Codex

- **CLI and IDE extension**: mention `$sa-propose` with your idea, or run
  `/skills` to select the skill. Codex does not recognize `/sa-propose`
  ([upstream issue](https://github.com/openai/codex/issues/11817)).
- **Desktop app**: open Skills in the sidebar and select `sa-propose`.
  [OpenAI's skills documentation](https://learn.chatgpt.com/docs/build-skills)
  describes both interfaces.
- **Shared folder**: Codex reads the same `.agents/skills/` copy as every other tool.
  Skills name each other by skill name (`sa-implement`), which Codex
  invokes as `$sa-implement`.
- **Legacy path**: skills installed under `.codex/skills/` by older versions are
  migrated on the next `specagile update`.

### DeepSeek Harness

- **Project root**: DSH uses the nearest `.git` ancestor, or the current directory
  outside Git. Run `specagile init --tools dsh` there. For a nested OpenSpec project,
  add the absolute path to its `.agents/skills/` directory to DSH's `customSkillDirs`.
  Git-root skills still win if names overlap
  ([upstream discovery rules](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/skill/skill-filesystem)).
- **Old copies**: a `.dsh/skills/` copy from before 2.0 would take precedence over
  `.agents/skills/`. `specagile update` removes untouched ones and reports any you
  changed.

### Devin Desktop (formerly Windsurf)

- **Both agents**: Devin Desktop and Devin Local both run the shared skills.
  Workflows OpenSpec wrote to `.devin/workflows/` before 2.0 are removed on update.
- **Rename**: `--tools windsurf` still resolves to `devin`. A project holding
  OpenSpec files in the legacy `.windsurf/` folder is offered the move on the next
  `specagile update`.

### GitHub Copilot

- **Skills**: Copilot loads `.agents/skills/sa-*/SKILL.md`. Invoke a skill as
  `/sa-<skill>`. In the CLI, if a skill disappears while its file still exists,
  run `/skills reload`, then `/skills info sa-propose` to confirm discovery. In
  an IDE, restart it.
- **Old prompt files**: the `.github/prompts/opsx-*.prompt.md` files OpenSpec wrote
  before 2.0 are removed on update.
- **Cloud files** (`--copilot-cloud`): for the GitHub-hosted Copilot coding agent,
  not Copilot in your editor. `specagile init --copilot-cloud` writes
  `.github/workflows/copilot-setup-steps.yml`, which installs `specagile`, and
  `.github/agents/specagile.agent.md`, the agent Copilot lists as **SpecAgile**. A
  file you edited is kept as it is. If you keep your own agent in
  `.github/agents/specagile.md`, SpecAgile writes none. `specagile update` replaces
  the `.github/agents/openspec.agent.md` that OpenSpec, or SpecAgile up to 4.0.0,
  wrote. If you edited that file, it is kept and `update` says so; delete it once
  you no longer need it. Commit the rename.

### GSD

- **Project skills**: GSD reads OpenSpec workflows from
  [`.agents/skills/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/skills.md).
- **Invocation**: ask GSD to use the `sa-<workflow>` skill. GSD can also select
  a matching skill through its skill discovery setting.
- **No subagent files**: [`.gsd/agents/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/subagents.md)
  contains GSD subagent definitions. OpenSpec does not write workflow skills there.

### Hermes Agent

OpenSpec links each skill into the project's `.hermes/skills/` folder. Hermes
v2026.6.5 and later load that folder once you trust the repo: run
`hermes skills trust` inside the project. Until then, Hermes shows a notice that it
found project skills but did not load them. On older versions, add the project's
`.hermes/skills/` folder to `skills.external_dirs` in `~/.hermes/config.yaml`
instead. Init prints this reminder after install.

### MiniMax Code

Project installs use `.minimax/skills/`. Global installs use `~/.minimax/skills/`.

### Warp

- **What OpenSpec claims**: nothing in `.warp/`. Warp settings and `WARP.md` are not
  created or edited.

### Other / Universal (shared `.agents` skills)

- **When it fits**: any tool that reads the shared `.agents/skills/` folder,
  including tools with no row in the matrix. It is the entry to pick when your
  assistant is not listed. The init picker's search box finds it by `universal`,
  `other`, `generic`, `custom`, `proprietary`, `unlisted`, `unsupported`,
  `vendor-neutral`, or `agents.md`.
- **Alongside other tools**: every tool reads this one skill tree. `.openspec-target`
  lists the tools set up in the project. To remove a tool, delete its folder (or, for a tool
  with no folder of its own, its line in `.openspec-target`).
- **Custom skills**: choose a name distinct from the built-in `sa-*` skills and their former `openspec-*` names, which SpecAgile migrates. Update replaces built-ins with the instructions from the running CLI’s GitHub release tag and leaves separately named skills alone.
- **`AGENTS.md`**: not created or edited. The target is the `.agents/` folder, not
  the file.
