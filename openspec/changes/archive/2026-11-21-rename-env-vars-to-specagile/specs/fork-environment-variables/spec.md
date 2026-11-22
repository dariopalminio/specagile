# Spec Delta

## Purpose

Define las variables de entorno con las que se configura SpecAgile, todas con nombres `SPECAGILE_*`, y que el entorno de OpenSpec no cambie lo que hace `specagile`. Así las dos herramientas pueden convivir en una máquina o en un CI.

## ADDED Requirements

### Requirement: El alcance de los skills se elige con `SPECAGILE_SKILLS_SCOPE`
`SPECAGILE_SKILLS_SCOPE` con `global` o `project` SHALL elegir dónde instala los skills `specagile init` en un proyecto que todavía no tiene skills propios. `--scope` SHALL tener prioridad sobre la variable. Con `project`, `specagile update` SHALL no ofrecer instalar los skills para la máquina. Otro valor SHALL hacer fallar `init` con código distinto de cero y un mensaje que nombra `SPECAGILE_SKILLS_SCOPE`.

#### Scenario: Skills en el proyecto desde CI
- **GIVEN** un repositorio sin skills y `SPECAGILE_SKILLS_SCOPE=project` en el entorno
- **WHEN** se ejecuta `specagile init --tools claude`
- **THEN** los skills quedan en el proyecto y no en la carpeta del usuario

#### Scenario: `--scope` tiene prioridad
- **GIVEN** `SPECAGILE_SKILLS_SCOPE=project` en el entorno
- **WHEN** se ejecuta `specagile init --tools claude --scope global`
- **THEN** los skills se instalan para la máquina

#### Scenario: Valor inválido
- **GIVEN** `SPECAGILE_SKILLS_SCOPE=everywhere` en el entorno
- **WHEN** se ejecuta `specagile init --tools claude`
- **THEN** el comando termina con código distinto de cero y el mensaje dice `Invalid SPECAGILE_SKILLS_SCOPE "everywhere". Use global or project.`

### Requirement: `SPECAGILE_INTERACTIVE=0` desactiva las preguntas
Con `SPECAGILE_INTERACTIVE=0`, los comandos de `specagile` SHALL comportarse como con `--no-interactive`, aunque se ejecuten en una terminal: no hacen preguntas y siguen con lo que indican las opciones o terminan con un mensaje que dice qué opción falta.

#### Scenario: Terminal sin preguntas
- **GIVEN** una terminal interactiva y `SPECAGILE_INTERACTIVE=0` en el entorno
- **WHEN** se ejecuta `specagile validate` sin argumentos
- **THEN** el comando no muestra un menú para elegir qué validar

#### Scenario: Variable puesta en PowerShell
- **GIVEN** Windows, una ventana de PowerShell y `$env:SPECAGILE_INTERACTIVE = '0'`
- **WHEN** se ejecuta `specagile validate` sin argumentos
- **THEN** el comando no muestra un menú para elegir qué validar

### Requirement: `SPECAGILE_CONCURRENCY` fija las validaciones en paralelo
`specagile validate` SHALL usar como máximo de validaciones en paralelo el valor de `--concurrency`; sin esa opción, el de `SPECAGILE_CONCURRENCY` si es un entero positivo; y si no, 6. La ayuda de `--concurrency` SHALL nombrar `SPECAGILE_CONCURRENCY`.

#### Scenario: Valor del entorno
- **GIVEN** `SPECAGILE_CONCURRENCY=2` en el entorno
- **WHEN** se ejecuta `specagile validate --all` sin `--concurrency`
- **THEN** se ejecutan como máximo dos validaciones a la vez

#### Scenario: La ayuda nombra la variable
- **WHEN** se ejecuta `specagile validate --help`
- **THEN** la descripción de `--concurrency` dice `defaults to env SPECAGILE_CONCURRENCY or 6`

### Requirement: `SPECAGILE_NO_UPDATE_CHECK` apaga la búsqueda de versiones
Con `SPECAGILE_NO_UPDATE_CHECK` definida, con cualquier valor, SpecAgile SHALL no consultar el registro de paquetes por una versión nueva: ni la búsqueda en segundo plano de `specagile update` ni la que pide `specagile version --check`.

#### Scenario: Actualizar sin consultar versiones
- **GIVEN** `SPECAGILE_NO_UPDATE_CHECK=1` en el entorno
- **WHEN** se ejecuta `specagile update`
- **THEN** no se hace ningún pedido al registro de paquetes y no se ofrece actualizar la CLI

#### Scenario: Pedido explícito apagado
- **GIVEN** `SPECAGILE_NO_UPDATE_CHECK=1` en el entorno
- **WHEN** se ejecuta `specagile version --check --json`
- **THEN** el estado de la búsqueda es `disabled` y no se hace ningún pedido de red

### Requirement: `SPECAGILE_TELEMETRY` apaga la búsqueda en segundo plano
SpecAgile no envía telemetría. Con `SPECAGILE_TELEMETRY` definida con un valor que no sea `1`, `true`, `yes` ni `on` (sin distinguir mayúsculas), `specagile update` SHALL no hacer la búsqueda de versiones en segundo plano. `specagile version --check` SHALL seguir consultando, porque es un pedido explícito.

#### Scenario: Valor que apaga
- **GIVEN** `SPECAGILE_TELEMETRY=0` en el entorno
- **WHEN** se ejecuta `specagile update`
- **THEN** no se hace ningún pedido al registro de paquetes

#### Scenario: El pedido explícito sigue
- **GIVEN** `SPECAGILE_TELEMETRY=0` en el entorno y ninguna `SPECAGILE_NO_UPDATE_CHECK`
- **WHEN** se ejecuta `specagile version --check`
- **THEN** el comando consulta el registro e informa el resultado

### Requirement: `SPECAGILE_NO_COMPLETIONS=1` oculta la sugerencia de autocompletado
Con `SPECAGILE_NO_COMPLETIONS=1`, los comandos de `specagile` SHALL no mostrar la sugerencia de instalar el autocompletado de shell.

#### Scenario: Sin sugerencia
- **GIVEN** una terminal donde `specagile` todavía no mostró la sugerencia, sin el autocompletado instalado y con `SPECAGILE_NO_COMPLETIONS=1` en el entorno
- **WHEN** se ejecuta un comando de `specagile`, como `specagile list`
- **THEN** la salida no sugiere instalar el autocompletado

### Requirement: `SPECAGILE_NO_AUTO_CONFIG=1` deja el perfil de la shell sin tocar
Con `SPECAGILE_NO_AUTO_CONFIG=1`, `specagile completion install` SHALL instalar el script de autocompletado para Bash o Zsh sin editar el archivo de perfil de la shell (`.bashrc`, `.zshrc`), e indicar cómo activarlo a mano.

#### Scenario: Zsh sin editar el perfil
- **GIVEN** `SPECAGILE_NO_AUTO_CONFIG=1` en el entorno
- **WHEN** se ejecuta `specagile completion install zsh`
- **THEN** el script de autocompletado queda instalado, `.zshrc` no cambia y la salida indica qué agregar a mano

### Requirement: `SPECAGILE_NO_ANIMATION` apaga la animación de bienvenida
Con `SPECAGILE_NO_ANIMATION` definida, con cualquier valor (también vacía), la pantalla de bienvenida de `specagile init` SHALL mostrarse sin animación.

#### Scenario: Movimiento reducido
- **GIVEN** una terminal que admite la animación y `SPECAGILE_NO_ANIMATION=` (vacía) en el entorno
- **WHEN** se ejecuta `specagile init` y aparece la pantalla de bienvenida
- **THEN** la pantalla se muestra quieta, sin animación

### Requirement: `SPECAGILE_ENABLE_CLI_AGENT_OPENERS=1` reactiva abrir worksets en agentes de terminal
Abrir un workset en un agente de terminal, como Claude Code o Codex, está apagado por defecto: `specagile workset open <name> --tool claude` lo rechaza. Con `SPECAGILE_ENABLE_CLI_AGENT_OPENERS=1`, SpecAgile SHALL permitirlo, como a las herramientas que abren una ventana de editor.

#### Scenario: Apagado por defecto
- **GIVEN** un workset guardado, Claude Code instalado y ninguna `SPECAGILE_ENABLE_CLI_AGENT_OPENERS`
- **WHEN** se ejecuta `specagile workset open <name> --tool claude`
- **THEN** el comando termina con código distinto de cero y dice que abrir un workset en Claude Code está desactivado

#### Scenario: Agentes de terminal reactivados
- **GIVEN** un workset guardado, Claude Code instalado y `SPECAGILE_ENABLE_CLI_AGENT_OPENERS=1` en el entorno
- **WHEN** se ejecuta `specagile workset open <name> --tool claude`
- **THEN** el comando no lo rechaza por estar desactivado y abre el workset en Claude Code

### Requirement: SpecAgile ignora las variables de entorno de OpenSpec
SpecAgile SHALL ignorar `OPENSPEC_SKILLS_SCOPE`, `OPENSPEC_CONCURRENCY`, `OPENSPEC_NO_UPDATE_CHECK`, `OPENSPEC_TELEMETRY`, `OPENSPEC_NO_COMPLETIONS`, `OPENSPEC_NO_AUTO_CONFIG`, `OPENSPEC_NO_ANIMATION`, `OPENSPEC_ENABLE_CLI_AGENT_OPENERS` y `OPEN_SPEC_INTERACTIVE`: con o sin ellas, `specagile` hace lo mismo y no avisa nada. `CI`, `DO_NOT_TRACK`, `NO_COLOR`, `XDG_CONFIG_HOME` y `XDG_DATA_HOME` SHALL seguir aplicando.

#### Scenario: Alcance puesto para OpenSpec
- **GIVEN** un repositorio sin skills, `OPENSPEC_SKILLS_SCOPE=everywhere` en el entorno y ninguna `SPECAGILE_SKILLS_SCOPE`
- **WHEN** se ejecuta `specagile init --tools claude --scope project`
- **THEN** el comando termina bien y su salida no nombra `OPENSPEC_SKILLS_SCOPE`

#### Scenario: Preguntas de OpenSpec apagadas
- **GIVEN** una terminal interactiva y `OPEN_SPEC_INTERACTIVE=0` en el entorno
- **WHEN** se ejecuta `specagile validate` sin argumentos
- **THEN** el comando muestra el menú para elegir qué validar, como sin la variable

#### Scenario: Búsqueda de versiones apagada para OpenSpec
- **GIVEN** `OPENSPEC_NO_UPDATE_CHECK=1` en el entorno, ninguna variable `SPECAGILE_*`, fuera de CI y sin `DO_NOT_TRACK`
- **WHEN** se ejecuta `specagile version --check --json`
- **THEN** el comando consulta el registro y el estado no es `disabled`

#### Scenario: Las variables genéricas siguen aplicando
- **GIVEN** `DO_NOT_TRACK=1` en el entorno
- **WHEN** se ejecuta `specagile update`
- **THEN** no se hace la búsqueda de versiones en segundo plano

### Requirement: Los textos de la CLI nombran las variables `SPECAGILE_*`
La ayuda, los mensajes y las descripciones del autocompletado de `specagile` SHALL nombrar las variables con sus nombres `SPECAGILE_*` y SHALL no nombrar ninguno de los nueve nombres de OpenSpec.

#### Scenario: Descripción del autocompletado
- **WHEN** se genera el autocompletado con `specagile completion generate zsh`
- **THEN** la descripción de `--concurrency` de `validate` nombra `SPECAGILE_CONCURRENCY` y el script no contiene `OPENSPEC_CONCURRENCY`

### Requirement: Tras actualizar la CLI, la nueva ejecución no la ofrece otra vez
Cuando `specagile update` actualiza la CLI y vuelve a ejecutar `update` con la versión instalada, esa segunda ejecución SHALL no buscar versiones ni ofrecer actualizar de nuevo.

#### Scenario: Actualizar y seguir
- **GIVEN** una versión más nueva de SpecAgile publicada, y el usuario acepta actualizar cuando `specagile update` lo ofrece
- **WHEN** la actualización termina y `update` se ejecuta con la versión nueva
- **THEN** esa ejecución actualiza los archivos del proyecto sin volver a ofrecer la actualización
