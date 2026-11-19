# SpecAgile skills for skills.sh

Install the SpecAgile workflow skills into any [skills.sh](https://skills.sh)-compatible agent:

```bash
npx skills add dariopalminio/specagile
```

Each `sa-*/SKILL.md` here is the same skill `specagile init` installs in a
project. `specagile init` and `specagile update` fetch them from this folder, at
the tag of the running release (`v<version>`, or `specagile@<version>` until
that tag exists), so each release needs its tag on a commit whose folder
matches the package. The skills drive the `specagile` CLI, so for the full
setup (CLI + the `specs/`, `changes/` and `specagile/` project folders) run:

```bash
npx specagile@latest init
```

They are named `sa-*`, so OpenSpec's `openspec-*` skills can sit beside them.

> These files are generated from the skill templates — do not edit by hand. Run
> `pnpm build && pnpm generate:skills` after changing a template;
> `skillssh-parity.test.ts` fails if they drift.
