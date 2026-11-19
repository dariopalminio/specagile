# fork-skill-names Specification

## Purpose

Define los nombres `sa-*` de los skills que instala SpecAgile, cómo el contenido generado se refiere a ellos y a la CLI `specagile`, y cómo se migra un proyecto que tiene los skills con nombres `openspec-*` de OpenSpec o de versiones anteriores del fork.

## Requirements

### Requirement: Los skills se instalan con nombres `sa-*`
SpecAgile SHALL instalar cada workflow como un skill con el nombre de esta tabla, tanto en la carpeta como en el campo `name` del `SKILL.md`: explore→`sa-explore`, propose→`sa-propose`, specify→`sa-specify`, plan→`sa-plan`, apply→`sa-implement`, verify→`sa-verify`, archive→`sa-archive`, new→`sa-new-change`, continue→`sa-continue-change`, ff→`sa-ff-change`, bulk-archive→`sa-bulk-archive-change`, onboard→`sa-onboard`, update→`sa-update-change`, sync→`sa-sync-specs`.

#### Scenario: Instalar el perfil core para Claude Code
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo con el perfil `core`
- **THEN** existen `.agents/skills/sa-propose/SKILL.md`, `.agents/skills/sa-explore/SKILL.md`, `.agents/skills/sa-specify/SKILL.md`, `.agents/skills/sa-plan/SKILL.md`, `.agents/skills/sa-implement/SKILL.md`, `.agents/skills/sa-update-change/SKILL.md`, `.agents/skills/sa-sync-specs/SKILL.md` y `.agents/skills/sa-archive/SKILL.md`, cada uno con el `name` igual al nombre de su carpeta
- **AND** `.claude/skills/` tiene una entrada con cada uno de esos nombres
- **AND** no se crea ninguna carpeta `openspec-*`

#### Scenario: Instalar en Windows sin soporte de enlaces
- **WHEN** el usuario ejecuta `specagile init --tools claude` en Windows sin permiso para crear enlaces simbólicos
- **THEN** cada skill se copia en `.claude\skills\sa-<nombre>\SKILL.md` con el mismo nombre que su carpeta en `.agents\skills\`

#### Scenario: Los ids de workflow no cambian
- **WHEN** el usuario ejecuta `specagile config profile` y elige workflows
- **THEN** el selector y la configuración guardada usan los mismos ids que antes (`propose`, `apply`, `verify`, …), y elegir `apply` instala `sa-implement`

### Requirement: Los skills invocan la CLI como `specagile`
Cada `SKILL.md` generado SHALL invocar la CLI como `specagile <subcomando>`, declarar `specagile` como CLI requerida y preaprobar las llamadas a `specagile` en `allowed-tools`. Las rutas del proyecto que nombra SHALL ser las del layout de SpecAgile, como `changes/<name>/` y `specagile/config.yaml`.

#### Scenario: El skill de propose usa `specagile`
- **WHEN** se genera `sa-propose/SKILL.md`
- **THEN** el skill indica ejecutar `specagile new change`, `specagile status` y `specagile instructions`, y no indica ejecutar ningún comando `openspec`
- **AND** nombra `specagile/config.yaml` como el archivo de configuración del proyecto

#### Scenario: Llamadas preaprobadas
- **WHEN** se genera cualquier skill `sa-*`
- **THEN** su frontmatter preaprueba las llamadas a `specagile` y declara que requiere la CLI `specagile`

### Requirement: Los skills se refieren entre sí por su nombre `sa-*`
Cuando un skill generado remite a otro workflow, SHALL nombrar el skill `sa-*` en la forma en que la herramienta invoca skills: `/sa-<nombre>` por defecto, `$sa-<nombre>` en Codex, `/skill:sa-<nombre>` en Kimi Code, "el skill sa-<nombre>" en herramientas sin invocación por barra y el nombre solo en la copia compartida de `.agents/skills/`.

#### Scenario: Propose remite a implement en Claude Code
- **WHEN** el skill `sa-propose` generado para Claude Code indica cómo seguir después de crear los artefactos
- **THEN** remite a `/sa-implement` y no nombra `openspec-apply-change`

#### Scenario: Remisión en Codex
- **WHEN** se genera para Codex un skill que remite al workflow de archivado
- **THEN** la remisión es `$sa-archive`

#### Scenario: Remisión en la copia compartida
- **WHEN** se escribe `.agents/skills/sa-archive/SKILL.md` y el skill remite al workflow de sync
- **THEN** la remisión es `sa-sync-specs`

### Requirement: Las frases de activación usan `specagile`
La descripción de cada skill SHALL nombrar la frase de activación `specagile <verbo>` de su workflow y SHALL no nombrar frases `openspec <verbo>`. Los verbos son: explore, propose, specify, plan, implement, verify, archive, new change, continue, ff, bulk-archive, onboard, update change y sync.

#### Scenario: Activar implement por frase
- **WHEN** se genera `sa-implement/SKILL.md`
- **THEN** su descripción nombra la frase "specagile implement"

#### Scenario: Distinguir el skill de update del comando `specagile update`
- **WHEN** se genera `sa-update-change/SKILL.md`
- **THEN** su descripción nombra la frase "specagile update change" y aclara que el comando de CLI `specagile update` es otra cosa

### Requirement: Sugerencias de inicio y distribución con nombres `sa-*`
Las sugerencias que muestra `specagile init` al terminar SHALL nombrar los skills `sa-*` en la forma de la herramienta elegida. La distribución estática de skills del repositorio SHALL contener solo carpetas `sa-*`.

#### Scenario: Sugerencias del perfil core
- **WHEN** `specagile init --tools claude` termina con el perfil `core`
- **THEN** las sugerencias muestran `/sa-propose`, `/sa-specify`, `/sa-plan` y `/sa-implement`

#### Scenario: Distribución estática
- **WHEN** el mantenedor regenera la distribución estática de skills
- **THEN** la carpeta `skills/` contiene una carpeta `sa-*` por workflow y ninguna `openspec-*`

### Requirement: Nombres anteriores en una lista explícita
SpecAgile SHALL reconocer como nombres anteriores solo los catorce de una lista fija, uno por workflow: `openspec-explore`, `openspec-propose`, `openspec-specify`, `openspec-plan`, `openspec-apply-change`, `openspec-verify-change`, `openspec-archive-change`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-bulk-archive-change`, `openspec-onboard`, `openspec-update-change` y `openspec-sync-specs`.

#### Scenario: Un skill del usuario con prefijo parecido no se toca
- **GIVEN** el proyecto tiene `.agents/skills/openspec-helpers/SKILL.md`, escrito por el usuario
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** `openspec-helpers` queda intacto y no se informa, porque no está en la lista

### Requirement: Un proyecto con skills anteriores se reconoce como configurado
`specagile init` y `specagile update` SHALL considerar configurada una herramienta cuando sus skills están instalados con nombres anteriores, igual que si estuvieran con nombres `sa-*`, e instalar para ella los `sa-*`.

#### Scenario: Actualizar un proyecto de OpenSpec
- **GIVEN** un proyecto configurado para Claude Code con `openspec init`, que solo tiene skills `openspec-*`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** la CLI detecta Claude Code como configurada e instala los skills `sa-*` del perfil

### Requirement: La migración quita los skills anteriores intactos
Después de instalar los `sa-*`, `specagile init` y `specagile update` SHALL quitar cada skill con nombre anterior cuyo `SKILL.md` sigue siendo texto generado por OpenSpec o por SpecAgile, con los enlaces que OpenSpec creó hacia él y las carpetas que queden vacías. Los demás archivos que el usuario dejó en esa carpeta SHALL conservarse.

#### Scenario: Copia compartida y enlace intactos
- **GIVEN** `.agents/skills/openspec-propose/SKILL.md` sin editar y `.claude/skills/openspec-propose` como enlace de OpenSpec hacia esa carpeta
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quitan la carpeta compartida y el enlace, y quedan `.agents/skills/sa-propose/` y `.claude/skills/sa-propose`

#### Scenario: Copias intactas en Windows
- **GIVEN** en Windows, `.claude\skills\openspec-propose\SKILL.md` es una copia sin editar escrita donde no se pudo crear un enlace
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quita esa copia y su carpeta vacía, y queda `.claude\skills\sa-propose\`

#### Scenario: Skill de un workflow que el perfil ya no instala
- **GIVEN** `.agents/skills/openspec-onboard/SKILL.md` sin editar y un perfil que no incluye `onboard`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quita `openspec-onboard` y no se instala `sa-onboard`

#### Scenario: Otros archivos del usuario en la carpeta
- **GIVEN** `.agents/skills/openspec-explore/` contiene un `SKILL.md` sin editar y un archivo `notes.md` del usuario
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quita `SKILL.md` y se conserva `notes.md`

### Requirement: La migración conserva los skills anteriores del usuario
`specagile init` y `specagile update` SHALL conservar sin cambios, e informar en su salida, cada skill con nombre anterior cuyo `SKILL.md` editó el usuario o que no reconocen como texto generado. También SHALL conservar sin cambios, sin informarlo de nuevo, uno que el proyecto ya registra como del usuario y un enlace del usuario que apunta a otro lugar.

#### Scenario: Skill anterior editado
- **GIVEN** el usuario editó `.agents/skills/openspec-apply-change/SKILL.md`
- **WHEN** ejecuta `specagile update`
- **THEN** el archivo queda sin cambios, la salida lo informa como conservado y además se instala `sa-implement`

#### Scenario: Texto de una versión más nueva de OpenSpec
- **GIVEN** `.agents/skills/openspec-propose/SKILL.md` lo escribió una versión de OpenSpec upstream posterior a la que SpecAgile reconoce
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** el archivo queda sin cambios y la salida lo informa como conservado

### Requirement: La simulación informa la migración sin aplicarla
`specagile update --dry-run` SHALL informar qué skills con nombre anterior quitaría y cuáles conservaría, sin cambiar ningún archivo.

#### Scenario: Simular la migración
- **GIVEN** un proyecto con `.agents/skills/openspec-propose/SKILL.md` sin editar
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** la salida informa que `openspec-propose` se quitaría y el archivo sigue en su lugar
