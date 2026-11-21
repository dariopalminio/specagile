# Proposal

## Why

SpecAgile todavía lee nueve variables de entorno con los nombres de OpenSpec. Una variable puesta para `openspec` cambia lo que hace `specagile`. Por ejemplo, `OPENSPEC_SKILLS_SCOPE=global` cambia dónde instala skills `specagile init`, y `OPENSPEC_NO_UPDATE_CHECK` apaga la búsqueda de versiones de los dos. Además, quien usa solo SpecAgile tiene que configurarlo con nombres de otra herramienta. El fork ya separó la CLI, los skills, el layout y las carpetas globales; el entorno es lo que falta para que las dos herramientas convivan sin influirse.

## What Changes

- **BREAKING**: SpecAgile lee estas variables con nombres `SPECAGILE_*`, con los mismos valores y el mismo efecto:

  | Antes | Ahora | Efecto |
  |---|---|---|
  | `OPENSPEC_SKILLS_SCOPE` | `SPECAGILE_SKILLS_SCOPE` | Alcance de los skills en `init` y `update` (`global` o `project`) |
  | `OPENSPEC_CONCURRENCY` | `SPECAGILE_CONCURRENCY` | Validaciones en paralelo de `validate` |
  | `OPENSPEC_NO_UPDATE_CHECK` | `SPECAGILE_NO_UPDATE_CHECK` | Apaga la búsqueda de nuevas versiones |
  | `OPENSPEC_TELEMETRY` | `SPECAGILE_TELEMETRY` | SpecAgile no envía telemetría; un valor que no sea `1`/`true`/`yes`/`on` apaga la búsqueda de versiones en segundo plano |
  | `OPENSPEC_NO_COMPLETIONS` | `SPECAGILE_NO_COMPLETIONS` | Oculta la sugerencia de instalar el autocompletado |
  | `OPENSPEC_NO_AUTO_CONFIG` | `SPECAGILE_NO_AUTO_CONFIG` | Evita que el autocompletado edite el perfil de Bash y Zsh |
  | `OPENSPEC_NO_ANIMATION` | `SPECAGILE_NO_ANIMATION` | Apaga la animación de bienvenida |
  | `OPENSPEC_ENABLE_CLI_AGENT_OPENERS` | `SPECAGILE_ENABLE_CLI_AGENT_OPENERS` | Reactiva la apertura de worksets en agentes de terminal |
  | `OPEN_SPEC_INTERACTIVE` | `SPECAGILE_INTERACTIVE` | `0` desactiva las preguntas interactivas |

- **BREAKING**: SpecAgile ignora los nueve nombres anteriores. No los lee como respaldo ni avisa cuando están puestos: son de OpenSpec. Quien los usaba para SpecAgile (por ejemplo `OPENSPEC_SKILLS_SCOPE=project` en CI) tiene que pasarlos a `SPECAGILE_*`.
- Las variables genéricas siguen igual: `CI`, `DO_NOT_TRACK`, `NO_COLOR`, `XDG_CONFIG_HOME` y `XDG_DATA_HOME`.
- La ayuda, los mensajes y el autocompletado nombran las variables nuevas: la opción `--concurrency` de `specagile validate` y el error de un `SPECAGILE_SKILLS_SCOPE` inválido.
- Cuando `specagile update` actualiza la CLI y vuelve a ejecutarse con la versión nueva, esa ejecución sigue sin ofrecer la actualización otra vez.

Fuera de alcance:

- Las variables de `src/commands/install-standalone.ts` (`OPENSPEC_INSTALL_DIR`, `OPENSPEC_INSTALL_NAME`, `OPENSPEC_DOWNLOAD_URL`, `OPENSPEC_RELEASES_URL`): SpecAgile nunca llega a ese código.
- Las variables que solo usa la suite de tests: `OPENSPEC_TEST_HOME`, `OPENSPEC_TEST_BINARY` y `OPENSPEC_RELEASE_UPGRADES`. No cambian nada de lo que hace la CLI.
- El aviso de telemetría de `src/telemetry/index.ts`, que nombra `OPENSPEC_TELEMETRY`: SpecAgile no lo muestra nunca.
- Las specs de upstream que nombran las variables anteriores (`cli-validate`, `cli-version`, `telemetry`, …), `docs/` y `SECURITY.md`: siguen describiendo OpenSpec, como pasó con el nombre de la CLI. La spec nueva del fork rige para SpecAgile.

## Capabilities

### New Capabilities

- `fork-environment-variables`: las variables de entorno que lee SpecAgile, con nombres `SPECAGILE_*`, y la independencia del entorno de OpenSpec.

### Modified Capabilities

<!-- Ninguna. -->

## Impact

- **Código**: `src/core/fork/identity.ts` suma la tabla de nombres actuales y anteriores. Cambian las lecturas en `src/core/init.ts`, `src/core/update.ts`, `src/commands/validate.ts`, `src/core/version-check.ts` (también el entorno que pasa a la CLI nueva después de actualizar), `src/telemetry/opt-out.ts`, `src/core/completion-tip.ts`, `src/core/completions/installers/bash-installer.ts` y `zsh-installer.ts`, `src/ui/welcome-screen.ts`, `src/core/openers.ts` y `src/utils/interactive.ts`. Cambian los textos de ayuda en `src/cli/index.ts` y `src/core/completions/command-registry.ts`. Todos son archivos de upstream, salvo `identity.ts`.
- **Tests**: el entorno de la suite (`vitest.config.ts`, `test/helpers/run-cli.ts`) y unos 70 archivos que ponen las variables anteriores. Cambio mecánico de nombre, salvo donde el proceso es OpenSpec. Un test nuevo en `test/fork/` impide que vuelva a leerse un nombre anterior.
- **Scripts y build**: `flake.nix`, `scripts/binary/install-check.sh` y `scripts/binary/smoke.sh` ejecutan `specagile` y pasan a los nombres nuevos. `scripts/capture-released-fingerprints.mjs` ejecuta OpenSpec y queda igual.
- **Docs**: `docs-lab/reference/configuration/environment-variables.md`, `docs-lab/reference/cli.md`, `docs-lab/reference/configuration/config-json.md`, `docs-lab/start/setup.md`, `FORK.md` ("SpecAgile identity") y una entrada **BREAKING** en `CHANGELOG.md`.
- **Usuarios**: scripts, CI y perfiles de shell que configuran SpecAgile con `OPENSPEC_*` u `OPEN_SPEC_INTERACTIVE` dejan de tener efecto hasta que se renombran. El riesgo mayor es `OPENSPEC_SKILLS_SCOPE=project` en CI: sin él, `specagile init` puede instalar los skills para la máquina en vez de en el proyecto.
- **Upstream**: son cambios de una línea en archivos de upstream, más un import. Una variable nueva que agregue upstream hace fallar el test de `test/fork/` hasta que tenga su nombre `SPECAGILE_*`.
