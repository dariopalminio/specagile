# Environment variables

> Every environment variable OpenSpec reads.

<!-- Skeleton: headings only. This page is the telemetry opt-out's home
(README TODO): OPENSPEC_TELEMETRY=0, DO_NOT_TRACK=1, auto-disabled in CI, plus
what's collected. start/installation.md's Deno section links here to explain
its network-permission flag. XDG vars move the config/data directories. -->

SpecAgile sends no telemetry. It still reads `OPENSPEC_TELEMETRY` and `DO_NOT_TRACK`: either one turns off the background update check in `specagile update`.

## OPENSPEC_TELEMETRY

## DO_NOT_TRACK

## XDG_CONFIG_HOME and XDG_DATA_HOME

## OPENSPEC_SKILLS_SCOPE

Set to `global` or `project` to choose where `specagile init` installs skills for a new repo. An explicit `--scope` takes precedence. Existing repo skills stay in place.

For a CI job that needs agent skills in its checkout:

```bash
OPENSPEC_SKILLS_SCOPE=project specagile init --tools claude
```

A validation-only job can run `specagile validate --all` directly.
