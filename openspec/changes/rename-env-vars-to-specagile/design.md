# Design

## Context

Las nueve lecturas están repartidas en archivos de upstream, una por archivo salvo `OPENSPEC_SKILLS_SCOPE` (`init.ts` y `update.ts`) y `OPENSPEC_NO_AUTO_CONFIG` (los instaladores de Bash y de Zsh):

| Variable | Dónde se lee | Valor que cuenta |
|---|---|---|
| `OPENSPEC_SKILLS_SCOPE` | `src/core/init.ts` (`resolveSkillScope`), `src/core/update.ts` (pregunta de skills globales) | `global` o `project`; otro valor es error en `init` |
| `OPENSPEC_CONCURRENCY` | `src/commands/validate.ts` | entero positivo |
| `OPENSPEC_NO_UPDATE_CHECK` | `src/core/version-check.ts` (`isCheckEnabled`) | definida, con cualquier valor |
| `OPENSPEC_TELEMETRY` | `src/telemetry/opt-out.ts` (`isTelemetryDisabledByEnv`), que usan `version-check.ts` y el módulo de telemetría | todo lo que no sea `1`/`true`/`yes`/`on` |
| `OPENSPEC_NO_COMPLETIONS` | `src/core/completion-tip.ts` | `1` |
| `OPENSPEC_NO_AUTO_CONFIG` | `src/core/completions/installers/bash-installer.ts`, `zsh-installer.ts` | `1` |
| `OPENSPEC_NO_ANIMATION` | `src/ui/welcome-screen.ts` (`canAnimate`) | definida, también vacía |
| `OPENSPEC_ENABLE_CLI_AGENT_OPENERS` | `src/core/openers.ts` (`isCliAgentOpenersEnabled`) | `1` |
| `OPEN_SPEC_INTERACTIVE` | `src/utils/interactive.ts` (`isInteractive`) | `0` |

Además, `version-check.ts` escribe dos de ellas: cuando `specagile update` actualiza la CLI, vuelve a ejecutar `update` con la versión nueva y le pasa `OPENSPEC_NO_UPDATE_CHECK=1` y `OPENSPEC_TELEMETRY=0` (`rerunUpdateWithUpgradedCli`), para que no ofrezca la actualización otra vez.

Los textos: la ayuda de `--concurrency` (`src/cli/index.ts`) y su descripción en el autocompletado (`src/core/completions/command-registry.ts`), el error de alcance inválido en `init.ts` y comentarios en los archivos de la tabla. El aviso de telemetría de `src/telemetry/index.ts` también nombra `OPENSPEC_TELEMETRY`, pero SpecAgile no lo muestra (`src/cli/index.ts` no llama a la telemetría).

La suite pone las variables en su entorno: `vitest.config.ts` (`OPENSPEC_TELEMETRY`, `OPENSPEC_SKILLS_SCOPE=project`, del que dependen todos los tests que instalan skills), `test/helpers/run-cli.ts` (`OPENSPEC_TELEMETRY`, `OPEN_SPEC_INTERACTIVE`) y unos 70 archivos de test más.

## Goals / Non-Goals

**Goals:**
- Los nombres actuales y los anteriores viven en una tabla de `src/core/fork/identity.ts`, la fuente única de identidad del fork.
- Que un nombre anterior no pueda volver a leerse sin que falle un test, también cuando una sincronización con upstream agrega una variable nueva.
- Los cambios en archivos de upstream se limitan a la línea que lee o nombra la variable, más un import.

**Non-Goals:**
- Cambiar qué hace cada variable o qué valores acepta.
- Las variables que solo usa la suite (`OPENSPEC_TEST_HOME`, `OPENSPEC_TEST_BINARY`, `OPENSPEC_RELEASE_UPGRADES`) y las de `install-standalone.ts`.
- Reescribir el aviso de telemetría de `src/telemetry/index.ts`, que SpecAgile nunca muestra.

## Decisions

### 1. Una tabla de nombres en `identity.ts`

Se agrega a `src/core/fork/identity.ts`:

- El tipo `EnvSetting`: `'skillsScope' | 'concurrency' | 'noUpdateCheck' | 'telemetry' | 'noCompletions' | 'noAutoConfig' | 'noAnimation' | 'enableCliAgentOpeners' | 'interactive'`.
- `ENV_VAR_NAMES: Readonly<Record<EnvSetting, string>>`, con cada nombre `SPECAGILE_*` escrito entero.
- `FORMER_ENV_VAR_NAMES: Readonly<Record<EnvSetting, string>>`, con los nueve nombres de OpenSpec. Solo la usan los tests y la documentación: el código no los lee.

Cada lectura pasa a `process.env[ENV_VAR_NAMES.<setting>]`, y cada texto arma el nombre con la tabla (`` `defaults to env ${ENV_VAR_NAMES.concurrency} or 6` ``).

- *Alternativa: escribir `SPECAGILE_*` literal en cada archivo.* Se descarta. Va contra la fuente única de identidad (`AGENTS.md`) y deja sin una lista que el test de `test/fork/` pueda comparar.
- *Alternativa: armar los nombres desde `CLI_NAME` (`` `${CLI_NAME.toUpperCase()}_…` ``).* Se descarta. Los nombres quedan escritos enteros, como pide la config del proyecto ("explicit lookups"), y `OPEN_SPEC_INTERACTIVE` muestra que los de upstream no siguen un único patrón.

### 2. Sin respaldo ni aviso para los nombres anteriores

SpecAgile no lee los nombres anteriores, ni como respaldo ni para avisar. Es lo que hace con las carpetas globales `openspec` (`fork-global-folders`): lo que se configura para OpenSpec no cambia SpecAgile.

- *Alternativa: leer el nombre anterior cuando falta el nuevo.* Se descarta. Es justo la influencia que el change quiere quitar: un `OPENSPEC_SKILLS_SCOPE` puesto para OpenSpec seguiría cambiando `specagile init`.
- *Alternativa: avisar cuando está el nombre anterior y falta el nuevo.* Se descarta. En una máquina con las dos herramientas, el aviso saldría en cada comando para alguien que configuró OpenSpec a propósito. La migración se explica en `CHANGELOG.md` y en la página de variables de entorno.

### 3. La CLI nueva recibe los nombres nuevos

`rerunUpdateWithUpgradedCli` pasa `ENV_VAR_NAMES.noUpdateCheck = '1'` y `ENV_VAR_NAMES.telemetry = '0'`. Solo los nombres nuevos: esa ejecución es la versión que se acaba de instalar, que es más nueva que la que corre (si no, `offerCliUpgrade` devuelve `not-on-path` y `src/cli/index.ts` solo vuelve a ejecutar con `upgraded`). Por eso ya lee `SPECAGILE_*`.

### 4. Telemetría: cambia la lectura, no el aviso

`isTelemetryDisabledByEnv` (`src/telemetry/opt-out.ts`) lee `ENV_VAR_NAMES.telemetry`. La usan la búsqueda de versiones y el módulo de telemetría, así que los dos cambian juntos. El aviso de `src/telemetry/index.ts` y sus comentarios quedan como los escribió upstream: SpecAgile nunca muestra ese aviso, y `FORK.md` ya deja `src/telemetry/` como está. Los tests de `test/telemetry/` ponen `SPECAGILE_TELEMETRY` para apagar el módulo, porque es lo que lee.

### 5. Comentarios

Los comentarios que nombran una de las variables están en los mismos archivos que se editan (`completion-tip.ts`, `completions/factory.ts`, `interactive.ts`, `openers.ts`, `opt-out.ts`). Pasan al nombre nuevo, para que nadie siga una instrucción que ya no funciona. Fuera de la tabla de `identity.ts` y de `src/telemetry/index.ts`, ningún archivo de `src/` nombra una de las nueve variables anteriores.

### 6. Tests con los nombres literales

Los tests escriben `SPECAGILE_*` literal, no la tabla: fijan el nombre que escribe el usuario, así un error en la tabla no pasa desapercibido. El cambio es una sustitución de nombre en cada línea, que conflictúa con upstream solo si upstream cambia esa misma línea.

Excepciones, donde el proceso es OpenSpec:
- `test/cli-e2e/upgrade-from-releases.test.ts` ejecuta versiones publicadas de OpenSpec y SpecAgile con el mismo entorno: tiene los dos nombres (`OPENSPEC_TELEMETRY` y `SPECAGILE_TELEMETRY`).
- `scripts/capture-released-fingerprints.mjs` solo ejecuta OpenSpec: queda igual.

Para cada variable, el test que hoy cubre su efecto pasa al nombre nuevo, y se le suma un caso con el nombre anterior que no tiene efecto:
- `version-check.test.ts`: las tablas de casos (variable, valor) → búsqueda apagada pasan a `SPECAGILE_*`, y se suma una tabla con los nombres anteriores, que no la apagan.
- `test/utils/interactive.test.ts`, `test/core/completion-tip.test.ts`, `test/core/openers.test.ts`, `test/ui/welcome-screen.test.ts`, los tests de los instaladores de Bash y Zsh, y `test/core/global-skills.test.ts` (alcance, valor inválido).

### 7. Un test de `test/fork/` vigila las lecturas

`test/fork/environment-variables.test.ts`:

1. Las dos tablas tienen las mismas claves, cada nombre actual empieza con `SPECAGILE_`, y `FORMER_ENV_VAR_NAMES` tiene exactamente los nueve nombres de la proposal.
2. Ningún archivo de `src/` contiene un nombre de `FORMER_ENV_VAR_NAMES`, salvo `identity.ts` y `src/telemetry/index.ts`. Busca cada nombre de la lista, no un patrón.
3. Ningún archivo de `src/` lee una variable `OPENSPEC_*` u `OPEN_SPEC_*` del entorno (`env.X`, `env['X']`, `env["X"]`), salvo `src/commands/install-standalone.ts`. Acá sí hace falta un patrón: tiene que encontrar una variable que upstream agregue y que todavía no está en la tabla. Es el mismo tipo de guarda que `test/fork/layout.test.ts`.
4. Ni `vitest.config.ts` ni ningún archivo de `test/` contiene un nombre de `FORMER_ENV_VAR_NAMES`, salvo `upgrade-from-releases.test.ts` y este mismo test. Si no, un test nuevo de upstream con `OPEN_SPEC_INTERACTIVE=0` quedaría interactivo sin que nadie lo note.
5. Con la CLI compilada (`runCLI`): `validate --help` nombra `SPECAGILE_CONCURRENCY`; `init` con `SPECAGILE_SKILLS_SCOPE=everywhere` falla con el mensaje nuevo; y con `OPENSPEC_SKILLS_SCOPE=everywhere`, sin `SPECAGILE_SKILLS_SCOPE` y con `--scope project`, termina bien sin nombrar la variable anterior.

### 8. Documentación

- `docs-lab/reference/configuration/environment-variables.md`: los títulos pasan a `SPECAGILE_*` y la página suma las variables que no tenía (`SPECAGILE_NO_UPDATE_CHECK`, `SPECAGILE_CONCURRENCY`, `SPECAGILE_INTERACTIVE`, `SPECAGILE_NO_COMPLETIONS`, `SPECAGILE_NO_AUTO_CONFIG`, `SPECAGILE_NO_ANIMATION`). Una sección final dice que SpecAgile ignora los nombres de OpenSpec y muestra la equivalencia. El ancla `#openspec_skills_scope` pasa a `#specagile_skills_scope`, y `docs-lab/start/setup.md` enlaza la nueva.
- `docs-lab/reference/cli.md` y `docs-lab/reference/configuration/config-json.md`: los nombres nuevos.
- `docs-lab/help/upgrade-to-2.md` describe `openspec update` y queda igual. También quedan igual `docs/`, `SECURITY.md` y `README_OLD.md`, que describen OpenSpec.
- `FORK.md`, "SpecAgile identity": un párrafo de variables de entorno; `ENV_VAR_NAMES` en "Where it lives"; los archivos editados; y en "When a sync touches the identity", qué hacer con una variable nueva de upstream.
- `CHANGELOG.md`: entrada **BREAKING** con la tabla de equivalencias.

## Risks / Trade-offs

- [Un CI con `OPENSPEC_SKILLS_SCOPE=project` pasa a instalar los skills para la máquina] → Es la primera línea de la entrada de `CHANGELOG.md`. La página de variables de entorno muestra el ejemplo de CI con `SPECAGILE_SKILLS_SCOPE`.
- [Quien apagó la búsqueda de versiones con `OPENSPEC_NO_UPDATE_CHECK` (sin red o sin acceso a npm) ve a SpecAgile consultar el registro] → La consulta ya tolera no tener red: tiene un tiempo límite y un error no interrumpe `update`. `CHANGELOG.md` lo nombra.
- [Un archivo de test que quedó con el nombre anterior se vuelve interactivo o instala skills para la máquina] → El guard 4 lo detecta antes de que el test cuelgue o escriba fuera de su carpeta.
- [Upstream agrega una variable `OPENSPEC_*`] → El guard 3 falla. `FORK.md` dice cómo sumarla a la tabla.
- [Windows] → En Windows, Node lee el entorno sin distinguir mayúsculas, así que `specagile_interactive` también funciona, como cualquier variable. Los nombres nuevos y los anteriores son distintos en todos los sistemas, así que no chocan. En PowerShell se ponen con `$env:SPECAGILE_INTERACTIVE = '0'`; en `cmd`, con `set SPECAGILE_INTERACTIVE=0`.
- [Un proceso de SpecAgile sigue pasando a sus hijos las variables `OPENSPEC_*` que heredó] → No las quita: un `openspec` que se ejecute desde ahí las necesita. SpecAgile solo deja de leerlas.

## Migration Plan

1. Publicar con la entrada **BREAKING** en `CHANGELOG.md`. La versión y la publicación las decide el mantenedor.
2. Quien configuraba SpecAgile con los nombres anteriores los renombra en sus scripts, CI y perfiles de shell. Durante la transición se pueden poner los dos nombres: cada versión lee el suyo.

Vuelta atrás: una versión anterior de SpecAgile lee los nombres `OPENSPEC_*` e ignora los `SPECAGILE_*`.
