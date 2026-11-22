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

`src/commands/install-standalone.ts` es el `openspec install` de upstream. SpecAgile no lo alcanza: su `install` solo indica npm. Lee cuatro variables del usuario (`resolveInstallTarget`: `OPENSPEC_INSTALL_DIR`, `OPENSPEC_INSTALL_NAME`; `installerBase`: `OPENSPEC_DOWNLOAD_URL`, `OPENSPEC_RELEASES_URL`, cuyos nombres también usa en los errores de `checkSource`). Después descarga el instalador de OpenSpec (`INSTALLER_BASE`, la rama `main` de `Fission-AI/OpenSpec`) y lo ejecuta con `process.env` más `OPENSPEC_INSTALL_DIR`, `OPENSPEC_INSTALL_NAME` y `OPENSPEC_VERSION`, y en Windows `OPENSPEC_INSTALLER_URL`. Ese instalador (`scripts/binary/install.sh`, `install.ps1`) lee además `OPENSPEC_DOWNLOAD_URL` y `OPENSPEC_RELEASES_URL` del entorno que hereda.

La suite usa ocho variables propias, que la CLI no lee:

| Variable | Dónde |
|---|---|
| `OPENSPEC_TEST_HOME` | `vitest.config.ts` la pone; `vitest.setup.ts` la lee |
| `OPENSPEC_TEST_BINARY` | `test/helpers/run-cli.ts`; la pone `scripts/binary/e2e.sh` |
| `OPENSPEC_RELEASE_UPGRADES`, `OPENSPEC_RELEASE_CACHE` | `test/cli-e2e/upgrade-from-releases.test.ts`; la primera la pone el job "Upgrade from releases" de `.github/workflows/ci.yml` |
| `OPENSPEC_TEST_EDITOR_EXIT`, `_LOG`, `_WRITE` | el editor falso de `test/commands/config-edit.test.ts` |
| `OPENSPEC_TEST_MODULE_LOG` | `test/helpers/record-loaded-modules.mjs` y `test/cli-e2e/startup-modules.test.ts` |

## Goals / Non-Goals

**Goals:**
- Los nombres actuales y los anteriores viven en una tabla de `src/core/fork/identity.ts`, la fuente única de identidad del fork.
- Que un nombre anterior no pueda volver a leerse sin que falle un test, también cuando una sincronización con upstream agrega una variable nueva.
- Los cambios en archivos de upstream se limitan a la línea que lee o nombra la variable, más un import.

**Non-Goals:**
- Cambiar qué hace cada variable o qué valores acepta.
- El instalador de OpenSpec y lo que lo prueba (`scripts/binary/install.sh`, `install.ps1`, los pasos de `binaries.yml` que los ejecutan, `test/binary-installer.test.ts`), ni los nombres con los que `install-standalone.ts` le habla (decisión 9).
- Reescribir el aviso de telemetría de `src/telemetry/index.ts`, que SpecAgile nunca muestra.

## Decisions

### 1. Una tabla de nombres en `identity.ts`

Se agrega a `src/core/fork/identity.ts`:

- El tipo `EnvSetting`: `'skillsScope' | 'concurrency' | 'noUpdateCheck' | 'telemetry' | 'noCompletions' | 'noAutoConfig' | 'noAnimation' | 'enableCliAgentOpeners' | 'interactive' | 'installDir' | 'installName' | 'downloadUrl' | 'releasesUrl'`.
- `ENV_VAR_NAMES: Readonly<Record<EnvSetting, string>>`, con cada nombre `SPECAGILE_*` escrito entero.
- `FORMER_ENV_VAR_NAMES: Readonly<Record<EnvSetting, string>>`, con los trece nombres de OpenSpec. El código no los lee del entorno. La usan los tests, la documentación y `install-standalone.ts`, que con ella le pasa los valores al instalador de OpenSpec (decisión 9).

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

Los comentarios que nombran una de las variables están en los mismos archivos que se editan (`completion-tip.ts`, `completions/factory.ts`, `interactive.ts`, `openers.ts`, `opt-out.ts`, `install-standalone.ts`). Pasan al nombre nuevo, para que nadie siga una instrucción que ya no funciona. Fuera de la tabla de `identity.ts` y de `src/telemetry/index.ts`, ningún archivo de `src/` nombra una de las trece variables anteriores.

### 6. Tests con los nombres literales

Los tests escriben `SPECAGILE_*` literal, no la tabla: fijan el nombre que escribe el usuario, así un error en la tabla no pasa desapercibido. El cambio es una sustitución de nombre en cada línea, que conflictúa con upstream solo si upstream cambia esa misma línea.

Excepciones, donde el proceso es OpenSpec:
- `test/cli-e2e/upgrade-from-releases.test.ts` ejecuta versiones publicadas de OpenSpec y SpecAgile con el mismo entorno: tiene los dos nombres (`OPENSPEC_TELEMETRY` y `SPECAGILE_TELEMETRY`).
- `scripts/capture-released-fingerprints.mjs` solo ejecuta OpenSpec: queda igual.
- `test/binary-installer.test.ts` y los pasos de `binaries.yml` que ejecutan `install.sh`/`install.ps1` prueban el instalador de OpenSpec: quedan igual.

Para cada variable, el test que hoy cubre su efecto pasa al nombre nuevo, y se le suma un caso con el nombre anterior que no tiene efecto:
- `version-check.test.ts`: las tablas de casos (variable, valor) → búsqueda apagada pasan a `SPECAGILE_*`, y se suma una tabla con los nombres anteriores, que no la apagan.
- `test/utils/interactive.test.ts`, `test/core/completion-tip.test.ts`, `test/core/openers.test.ts`, `test/ui/welcome-screen.test.ts`, los tests de los instaladores de Bash y Zsh, y `test/core/global-skills.test.ts` (alcance, valor inválido).

### 7. Un test de `test/fork/` vigila las lecturas

`test/fork/environment-variables.test.ts`:

1. Las dos tablas tienen las mismas claves, cada nombre actual empieza con `SPECAGILE_`, y `FORMER_ENV_VAR_NAMES` tiene exactamente los trece nombres de la proposal.
2. Ningún archivo de `src/` contiene un nombre de `FORMER_ENV_VAR_NAMES`, salvo `identity.ts` y `src/telemetry/index.ts`. Busca cada nombre de la lista, no un patrón. `install-standalone.ts` no es excepción: nombra al instalador con la tabla.
3. Ningún archivo de `src/` lee una variable `OPENSPEC_*` u `OPEN_SPEC_*` del entorno (`env.X`, `env['X']`, `env["X"]`). Acá sí hace falta un patrón: tiene que encontrar una variable que upstream agregue y que todavía no está en la tabla. Es el mismo tipo de guarda que `test/fork/layout.test.ts`. Las claves de un objeto de entorno (`{ OPENSPEC_VERSION: … }`) y el `$env:OPENSPEC_INSTALLER_URL` del comando de PowerShell no son lecturas de la CLI: son el protocolo del instalador de OpenSpec.
4. Ni `vitest.config.ts`, ni `vitest.setup.ts`, ni ningún archivo de `test/` contiene un nombre de `FORMER_ENV_VAR_NAMES` o de los ocho de la suite (decisión 10, fijados en el propio test). Excepciones por archivo y nombre: `upgrade-from-releases.test.ts` con `OPENSPEC_TELEMETRY`, `binary-installer.test.ts` con los cuatro del instalador, y este mismo test. Si no, un test nuevo de upstream con `OPEN_SPEC_INTERACTIVE=0` quedaría interactivo sin que nadie lo note.
5. Con la CLI compilada (`runCLI`): `validate --help` nombra `SPECAGILE_CONCURRENCY`; `init` con `SPECAGILE_SKILLS_SCOPE=everywhere` falla con el mensaje nuevo; y con `OPENSPEC_SKILLS_SCOPE=everywhere`, sin `SPECAGILE_SKILLS_SCOPE` y con `--scope project`, termina bien sin nombrar la variable anterior.

### 8. Documentación

- `docs-lab/reference/configuration/environment-variables.md`: los títulos pasan a `SPECAGILE_*` y la página suma las variables que no tenía (`SPECAGILE_NO_UPDATE_CHECK`, `SPECAGILE_CONCURRENCY`, `SPECAGILE_INTERACTIVE`, `SPECAGILE_NO_COMPLETIONS`, `SPECAGILE_NO_AUTO_CONFIG`, `SPECAGILE_NO_ANIMATION`). Una sección final dice que SpecAgile ignora los nombres de OpenSpec y muestra la equivalencia. El ancla `#openspec_skills_scope` pasa a `#specagile_skills_scope`, y `docs-lab/start/setup.md` enlaza la nueva.
- `docs-lab/reference/cli.md` y `docs-lab/reference/configuration/config-json.md`: los nombres nuevos.
- `docs-lab/help/upgrade-to-2.md` describe `openspec update` y queda igual. También quedan igual `docs/`, `SECURITY.md` y `README_OLD.md`, que describen OpenSpec.
- `FORK.md`, "SpecAgile identity": un párrafo de variables de entorno; `ENV_VAR_NAMES` en "Where it lives"; los archivos editados; y en "When a sync touches the identity", qué hacer con una variable nueva de upstream. El ítem "No standalone install" suma que `install-standalone.ts` lee `SPECAGILE_*` y le habla al instalador de OpenSpec con sus nombres. La mención de `upgrade-from-releases.test.ts` en "Migrating projects with the former skills" pasa a `SPECAGILE_RELEASE_UPGRADES=1`. Las filas anteriores de "Verification record" quedan con el nombre con que se corrieron.
- `CHANGELOG.md`: entrada **BREAKING** con la tabla de equivalencias. No nombra las variables del instalador ni las de la suite, que no cambian nada para el usuario.

### 9. El instalador standalone: SpecAgile lee sus nombres, el instalador recibe los suyos

`install-standalone.ts` separa dos cosas:

- **Lo que lee del usuario**: `resolveInstallTarget` e `installerBase` leen `ENV_VAR_NAMES.installDir`, `installName`, `downloadUrl` y `releasesUrl`, y `checkSource` recibe esos nombres como etiqueta, así un error dice `SPECAGILE_DOWNLOAD_URL must use https…`.
- **Lo que le pasa al instalador**: el instalador es el de OpenSpec y lee `OPENSPEC_*`. Una función nueva y exportada, `installerEnv(env, target, version)`, arma su entorno: `env` sin los cuatro nombres de `FORMER_ENV_VAR_NAMES` heredados, más `FORMER_ENV_VAR_NAMES.installDir`/`installName` con el destino resuelto, `FORMER_ENV_VAR_NAMES.downloadUrl`/`releasesUrl` con los valores de `SPECAGILE_*` cuando están, y `OPENSPEC_VERSION` como hoy. Así un `OPENSPEC_RELEASES_URL` puesto para OpenSpec no cambia de dónde instalaría SpecAgile, y un `SPECAGILE_DOWNLOAD_URL` llega al instalador. `installStandalone` usa esa función en lugar del objeto que arma hoy.

`OPENSPEC_INSTALLER_URL` (el comando de PowerShell) y `OPENSPEC_VERSION` quedan: no son variables del usuario, son el protocolo del instalador.

- *Alternativa: renombrar también dentro de `install.sh` e `install.ps1`.* La descartó el usuario. El instalador del repo dejaría de coincidir con el que descarga `INSTALLER_BASE` (el de OpenSpec), seguiría leyendo otros `OPENSPEC_*` y `binaries.yml` tendría más conflictos con upstream.
- *Alternativa: pasar `SPECAGILE_*` al instalador.* Se descarta: el instalador de OpenSpec no los lee, así que perdería el destino y el espejo.

`scripts/binary/install-check.sh` ejecuta `specagile install` y pasa a `SPECAGILE_INSTALL_DIR`/`SPECAGILE_INSTALL_NAME`. Las dos líneas de `binaries.yml` que lo ejecutan le pasan `SPECAGILE_DOWNLOAD_URL`, porque configuran lo que lee SpecAgile.

### 10. Variables de la suite

Pasan a `SPECAGILE_TEST_HOME`, `SPECAGILE_TEST_BINARY`, `SPECAGILE_RELEASE_UPGRADES`, `SPECAGILE_RELEASE_CACHE`, `SPECAGILE_TEST_EDITOR_EXIT`, `SPECAGILE_TEST_EDITOR_LOG`, `SPECAGILE_TEST_EDITOR_WRITE` y `SPECAGILE_TEST_MODULE_LOG`. Se escriben literales donde se ponen y donde se leen (`vitest.config.ts`, `vitest.setup.ts`, `test/helpers/`, los tests, `scripts/binary/e2e.sh`, `.github/workflows/ci.yml`). No van a `identity.ts`, que es la identidad de la CLI: `src/` no las lee. El test de `test/fork/` fija los ocho nombres anteriores para el guard 4.

Cada una cambia en el mismo paso en que se pone y en que se lee. Si cambia solo un lado, el test se saltea o pierde su carpeta aislada sin fallar.

## Risks / Trade-offs

- [El job "Upgrade from releases" de CI pone el nombre anterior y las pruebas de versiones publicadas se saltean sin fallar] → `ci.yml` cambia en el mismo paso que el test. En el pull request se revisa que el job ejecute sus casos en vez de saltearlos.
- [Un mantenedor con `OPENSPEC_RELEASE_UPGRADES=1` en su shell deja de correr esas pruebas sin aviso] → `FORK.md` nombra la variable nueva donde explica cómo correrlas.
- [Una sincronización trae cambios en los pasos de `binaries.yml` o en `ci.yml`] → Solo cambian las dos líneas de `install-check.sh` y la del job de versiones publicadas. Los pasos del instalador de OpenSpec quedan como en upstream.
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
