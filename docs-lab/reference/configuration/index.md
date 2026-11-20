# Overview

> Every file and setting that changes how OpenSpec behaves, and where each lives.

| File | Lives at | Controls |
| --- | --- | --- |
| [Project configuration (config.yaml)](config-yaml.md) | `specagile/config.yaml` | The schema, context, and rules this project plans with |
| [Change metadata (.openspec.yaml)](change-metadata.md) | `changes/<name>/.openspec.yaml` | The workflow schema, goal, scope, and spec exceptions for one change |
| [CLI settings (config.json)](config-json.md) | `~/.config/specagile/config.json` (Windows varies) | How the specagile CLI behaves on your machine |
| Environment variables | Your shell or CI environment | Telemetry opt-out, and where the config and data directories live |
| Stores | `~/.local/share/specagile/stores/` (Windows varies) | The registry and metadata behind multi-repo stores |
