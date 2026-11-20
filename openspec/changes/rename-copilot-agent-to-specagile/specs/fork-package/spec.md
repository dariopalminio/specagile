# Spec Delta

## MODIFIED Requirements

### Requirement: Los archivos de Copilot en la nube instalan `specagile`
Los archivos que SpecAgile escribe para el agente en la nube de GitHub Copilot SHALL instalar el paquete `specagile` y usar la CLI `specagile`. Un archivo que escribió OpenSpec sin cambios SHALL reemplazarse por el de SpecAgile, y uno editado por el usuario SHALL conservarse.

#### Scenario: Activar Copilot en la nube
- **WHEN** el usuario ejecuta `specagile init --tools github-copilot --copilot-cloud`
- **THEN** `.github/workflows/copilot-setup-steps.yml` instala con `npm install -g specagile` y verifica con `specagile --version`, y `.github/agents/specagile.agent.md` indica usar la CLI `specagile`

#### Scenario: Proyecto con los archivos de OpenSpec
- **GIVEN** `.github/workflows/copilot-setup-steps.yml` tal como lo escribió OpenSpec
- **WHEN** el usuario ejecuta `specagile update` con Copilot en la nube activado
- **THEN** el archivo pasa a instalar `specagile`

## ADDED Requirements

### Requirement: El agente de Copilot en la nube se llama SpecAgile
SpecAgile SHALL escribir su agente de Copilot en la nube en `.github/agents/specagile.agent.md`. Copilot SHALL mostrarlo con el nombre `SpecAgile`, y su descripción SHALL nombrar la CLI de SpecAgile. La ruta SHALL resolverse con el separador de la plataforma.

#### Scenario: Activar Copilot en la nube en un proyecto nuevo
- **WHEN** el usuario ejecuta `specagile init --tools github-copilot --copilot-cloud` en un proyecto sin `.github/agents/`
- **THEN** existe `.github/agents/specagile.agent.md`, su frontmatter declara `name: SpecAgile`, su título es `# SpecAgile Agent`, y no existe `.github/agents/openspec.agent.md`

#### Scenario: Ruta en Windows
- **GIVEN** un proyecto en `C:\repos\app` en Windows
- **WHEN** el usuario ejecuta `specagile init --tools github-copilot --copilot-cloud`
- **THEN** el agente queda en `C:\repos\app\.github\agents\specagile.agent.md` y la salida de `init` lo informa

#### Scenario: La pregunta de init nombra el archivo
- **WHEN** `specagile init --tools github-copilot` pregunta en una terminal interactiva si se configuran los archivos de Copilot en la nube
- **THEN** la pregunta nombra `.github/workflows/copilot-setup-steps.yml` y `.github/agents/specagile.agent.md`

### Requirement: Un perfil propio con el identificador de SpecAgile tiene prioridad
Si el proyecto tiene `.github/agents/specagile.md`, que Copilot identifica igual que `specagile.agent.md`, SpecAgile SHALL conservarlo y no escribir su agente. Un `.github/agents/openspec.md` SHALL no afectar al agente de SpecAgile.

#### Scenario: Perfil propio `specagile.md`
- **GIVEN** un `.github/agents/specagile.md` escrito por el usuario
- **WHEN** el usuario ejecuta `specagile update` con Copilot en la nube activado
- **THEN** `.github/agents/specagile.md` no cambia y no se crea `.github/agents/specagile.agent.md`

#### Scenario: Perfil propio `openspec.md`
- **GIVEN** un `.github/agents/openspec.md` escrito por el usuario
- **WHEN** el usuario ejecuta `specagile init --tools github-copilot --copilot-cloud`
- **THEN** se crea `.github/agents/specagile.agent.md` y `.github/agents/openspec.md` no cambia

### Requirement: El agente anterior se migra a `specagile.agent.md`
Con Copilot en la nube activado, `specagile update` y `specagile init` SHALL quitar un `.github/agents/openspec.agent.md` cuyo contenido sea exactamente un texto que escribió OpenSpec o SpecAgile hasta la 3.0.1, comparado contra una lista explícita de esos textos e ignorando los finales de línea. Uno con otro contenido SHALL conservarse, y la salida SHALL informarlo junto con la ruta del agente nuevo.

#### Scenario: Agente anterior sin cambios
- **GIVEN** `.github/agents/openspec.agent.md` tal como lo escribió SpecAgile 3.0.1
- **WHEN** el usuario ejecuta `specagile update` con Copilot en la nube activado
- **THEN** ya no existe `.github/agents/openspec.agent.md` y existe `.github/agents/specagile.agent.md` con el agente de SpecAgile

#### Scenario: Agente escrito por OpenSpec
- **GIVEN** `.github/agents/openspec.agent.md` tal como lo escribió `openspec init --copilot-cloud`
- **WHEN** el usuario ejecuta `specagile update` con Copilot en la nube activado
- **THEN** ya no existe `.github/agents/openspec.agent.md` y existe `.github/agents/specagile.agent.md`

#### Scenario: Agente anterior con finales de línea de Windows
- **GIVEN** `.github/agents/openspec.agent.md` con el texto que escribió SpecAgile 3.0.1 y finales de línea `CRLF`, como lo deja Git con `core.autocrlf=true`
- **WHEN** el usuario ejecuta `specagile update` con Copilot en la nube activado
- **THEN** el archivo se reconoce como generado y se migra a `.github/agents/specagile.agent.md`

#### Scenario: Agente anterior editado
- **GIVEN** `.github/agents/openspec.agent.md` con el texto de SpecAgile 3.0.1 más una nota del usuario
- **WHEN** el usuario ejecuta `specagile update` con Copilot en la nube activado
- **THEN** `.github/agents/openspec.agent.md` no cambia, se crea `.github/agents/specagile.agent.md` y la salida informa que se conservó `openspec.agent.md` por estar editado

#### Scenario: Simular la migración
- **GIVEN** `.github/agents/openspec.agent.md` tal como lo escribió SpecAgile 3.0.1
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** la salida lista el borrado de `.github/agents/openspec.agent.md` y el alta de `.github/agents/specagile.agent.md`, y ningún archivo cambia

### Requirement: El agente anterior generado cuenta como archivo de Copilot en la nube
Un `.github/agents/openspec.agent.md` generado SHALL contar como archivo de Copilot en la nube de SpecAgile: un proyecto que solo tiene ese archivo y no guardó la opción SHALL mantener los archivos al actualizar. Al desactivarlos o dejar de usar Copilot, SpecAgile SHALL quitarlo y conservar uno editado.

#### Scenario: Proyecto anterior sin la opción guardada
- **GIVEN** un proyecto con GitHub Copilot, sin `githubCopilot.cloudAgent` en la config y con `.github/agents/openspec.agent.md` tal como lo escribió SpecAgile 3.0.1
- **WHEN** el usuario ejecuta `specagile update` sin terminal interactiva
- **THEN** existen `.github/agents/specagile.agent.md` y `.github/workflows/copilot-setup-steps.yml`, y ya no existe `.github/agents/openspec.agent.md`

#### Scenario: Desactivar Copilot en la nube
- **GIVEN** `.github/agents/openspec.agent.md` tal como lo escribió SpecAgile 3.0.1
- **WHEN** el usuario ejecuta `specagile init --tools github-copilot --no-copilot-cloud`
- **THEN** ya no existe `.github/agents/openspec.agent.md` y no se crea `.github/agents/specagile.agent.md`

#### Scenario: Dejar de usar Copilot con el agente anterior editado
- **GIVEN** `.github/agents/openspec.agent.md` con el texto de SpecAgile 3.0.1 más una nota del usuario
- **WHEN** el usuario ejecuta `specagile update` en un proyecto que ya no tiene GitHub Copilot configurado
- **THEN** `.github/agents/openspec.agent.md` no cambia
