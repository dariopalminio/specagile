# Spec Delta

## MODIFIED Requirements

### Requirement: Los skills se instalan con nombres `sa-*`
SpecAgile SHALL instalar cada workflow como un skill con el nombre de esta tabla, tanto en la carpeta como en el campo `name` del `SKILL.md`: explore→`sa-explore`, propose→`sa-propose`, specify→`sa-specify`, plan→`sa-plan`, tasks→`sa-tasks`, apply→`sa-implement`, verify→`sa-audit`, archive→`sa-archive`, new→`sa-new-change`, continue→`sa-continue-change`, ff→`sa-ff-change`, bulk-archive→`sa-bulk-archive-change`, onboard→`sa-onboard`, update→`sa-update-change`, sync→`sa-sync-specs`.

#### Scenario: Instalar el perfil core para Claude Code
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo con el perfil `core`
- **THEN** existen `.agents/skills/sa-propose/SKILL.md`, `.agents/skills/sa-explore/SKILL.md`, `.agents/skills/sa-specify/SKILL.md`, `.agents/skills/sa-plan/SKILL.md`, `.agents/skills/sa-tasks/SKILL.md`, `.agents/skills/sa-implement/SKILL.md`, `.agents/skills/sa-update-change/SKILL.md`, `.agents/skills/sa-sync-specs/SKILL.md` y `.agents/skills/sa-archive/SKILL.md`, cada uno con el `name` igual al nombre de su carpeta
- **AND** `.claude/skills/` tiene una entrada con cada uno de esos nombres
- **AND** no se crea ninguna carpeta `openspec-*`

#### Scenario: Instalar en Windows sin soporte de enlaces
- **WHEN** el usuario ejecuta `specagile init --tools claude` en Windows sin permiso para crear enlaces simbólicos
- **THEN** cada skill se copia en `.claude\skills\sa-<nombre>\SKILL.md` con el mismo nombre que su carpeta en `.agents\skills\`

#### Scenario: Instalar el workflow verify
- **GIVEN** un proyecto configurado para Claude Code y un perfil `custom` que incluye `verify`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** existe `.agents/skills/sa-audit/SKILL.md` con `name: sa-audit` y `.claude/skills/` tiene una entrada `sa-audit`
- **AND** no se crea ninguna carpeta `sa-verify`

#### Scenario: Los ids de workflow no cambian
- **WHEN** el usuario ejecuta `specagile config profile` y elige workflows
- **THEN** el selector y la configuración guardada usan los mismos ids que antes (`propose`, `apply`, `verify`, …), y elegir `apply` instala `sa-implement`
- **AND** el selector muestra `verify` como "Audit change", y elegirlo instala `sa-audit`

### Requirement: Las frases de activación usan `specagile`
La descripción de cada skill SHALL nombrar la frase de activación `specagile <verbo>` de su workflow y SHALL no nombrar frases `openspec <verbo>`. Los verbos son: explore, propose, specify, plan, tasks, implement, audit, archive, new change, continue, ff, bulk-archive, onboard, update change y sync.

#### Scenario: Activar implement por frase
- **WHEN** se genera `sa-implement/SKILL.md`
- **THEN** su descripción nombra la frase "specagile implement"

#### Scenario: Activar tasks por frase
- **WHEN** se genera `sa-tasks/SKILL.md`
- **THEN** su descripción nombra la frase "specagile tasks"

#### Scenario: Activar audit por frase
- **WHEN** se genera `sa-audit/SKILL.md`
- **THEN** su descripción nombra la frase "specagile audit"
- **AND** no nombra la frase "specagile verify"

#### Scenario: Distinguir el skill de update del comando `specagile update`
- **WHEN** se genera `sa-update-change/SKILL.md`
- **THEN** su descripción nombra la frase "specagile update change" y aclara que el comando de CLI `specagile update` es otra cosa

### Requirement: Sugerencias de inicio y distribución con nombres `sa-*`
Las sugerencias que muestra `specagile init` al terminar SHALL nombrar los skills `sa-*` en la forma de la herramienta elegida. La distribución estática de skills del repositorio SHALL contener solo las carpetas `sa-*` de la tabla de nombres, una por workflow.

#### Scenario: Sugerencias del perfil core
- **WHEN** `specagile init --tools claude` termina con el perfil `core`
- **THEN** las sugerencias muestran `/sa-propose`, `/sa-specify`, `/sa-plan`, `/sa-tasks` y `/sa-implement`, en ese orden

#### Scenario: Distribución estática
- **WHEN** el mantenedor regenera la distribución estática de skills
- **THEN** la carpeta `skills/` contiene una carpeta `sa-*` por workflow, `sa-tasks` y `sa-audit` incluidas, y ninguna `openspec-*` ni `sa-verify`

### Requirement: Nombres anteriores en una lista explícita
SpecAgile SHALL reconocer como nombres anteriores de OpenSpec solo los catorce de una lista fija, uno por workflow: `openspec-explore`, `openspec-propose`, `openspec-specify`, `openspec-plan`, `openspec-apply-change`, `openspec-verify-change`, `openspec-archive-change`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-bulk-archive-change`, `openspec-onboard`, `openspec-update-change` y `openspec-sync-specs`. El workflow `tasks` no tiene nombre anterior.

#### Scenario: Un skill del usuario con prefijo parecido no se toca
- **GIVEN** el proyecto tiene `.agents/skills/openspec-helpers/SKILL.md`, escrito por el usuario
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** `openspec-helpers` queda intacto y no se informa, porque no está en la lista

#### Scenario: Un skill `openspec-tasks` del usuario no se toca
- **GIVEN** el proyecto tiene `.agents/skills/openspec-tasks/SKILL.md`, escrito por el usuario
- **WHEN** el usuario ejecuta `specagile update` con el perfil `core`
- **THEN** `openspec-tasks` queda intacto y no se informa
- **AND** se instala `sa-tasks` junto a él

### Requirement: La migración quita los skills anteriores intactos
Después de instalar los `sa-*`, `specagile init` y `specagile update` SHALL quitar cada skill con nombre anterior cuyo `SKILL.md` sigue siendo texto generado por OpenSpec o por SpecAgile, con los enlaces que OpenSpec o SpecAgile crearon hacia él y las carpetas que queden vacías. Los demás archivos que el usuario dejó en esa carpeta SHALL conservarse.

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

#### Scenario: `sa-verify` intacto de SpecAgile 6.0.0
- **GIVEN** `.agents/skills/sa-verify/SKILL.md` sin editar, como lo instaló SpecAgile 6.0.0, `.claude/skills/sa-verify` como enlace hacia esa carpeta y un perfil que incluye `verify`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quitan la carpeta compartida y el enlace, y quedan `.agents/skills/sa-audit/` y `.claude/skills/sa-audit`
- **AND** la salida informa que se quitó `sa-verify`

#### Scenario: `sa-verify` intacto de una versión anterior de SpecAgile
- **GIVEN** `.agents/skills/sa-verify/SKILL.md` sin editar, como lo instaló SpecAgile 2.1.2, cuyo texto difiere del que instaló 6.0.0
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quita `sa-verify` como si fuera el de 6.0.0

#### Scenario: Copia de `sa-verify` intacta en Windows
- **GIVEN** en Windows, `.claude\skills\sa-verify\SKILL.md` es una copia sin editar escrita donde no se pudo crear un enlace
- **WHEN** el usuario ejecuta `specagile update` con un perfil que incluye `verify`
- **THEN** se quita esa copia y su carpeta vacía, y queda `.claude\skills\sa-audit\`

#### Scenario: `sa-verify` con un perfil sin verify
- **GIVEN** `.agents/skills/sa-verify/SKILL.md` sin editar y un perfil que no incluye `verify`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quita `sa-verify` y no se instala `sa-audit`

#### Scenario: `openspec-verify-change` de OpenSpec 2.1
- **GIVEN** `.agents/skills/openspec-verify-change/SKILL.md` sin editar, como lo instaló OpenSpec 2.1.1, y un perfil que incluye `verify`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se quita `openspec-verify-change` y queda `.agents/skills/sa-audit/`

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

#### Scenario: `sa-verify` editado
- **GIVEN** el usuario editó `.agents/skills/sa-verify/SKILL.md` y el perfil incluye `verify`
- **WHEN** ejecuta `specagile update`
- **THEN** el archivo queda sin cambios, la salida lo informa como conservado bajo su nombre anterior y además se instala `sa-audit`

### Requirement: La simulación informa la migración sin aplicarla
`specagile update --dry-run` SHALL informar qué skills con nombre anterior quitaría y cuáles conservaría, sin cambiar ningún archivo.

#### Scenario: Simular la migración
- **GIVEN** un proyecto con `.agents/skills/openspec-propose/SKILL.md` sin editar
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** la salida informa que `openspec-propose` se quitaría y el archivo sigue en su lugar

#### Scenario: Simular el retiro de `sa-verify`
- **GIVEN** un proyecto con `.agents/skills/sa-verify/SKILL.md` sin editar y un perfil que incluye `verify`
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** la salida informa que `sa-verify` se quitaría y que se instalaría `sa-audit`
- **AND** `sa-verify` sigue en su lugar y no se crea `sa-audit`

## ADDED Requirements

### Requirement: `sa-verify` es el nombre anterior de `verify` en SpecAgile
SpecAgile SHALL reconocer `sa-verify`, el nombre que el workflow `verify` tuvo de la versión 2.1.1 a la 6.0.0, como nombre anterior de ese workflow, con las mismas reglas de migración que los nombres de OpenSpec. Es el único nombre `sa-*` anterior: los demás `sa-*` de la tabla son nombres vigentes.

#### Scenario: Un skill del usuario con nombre parecido no se toca
- **GIVEN** el proyecto tiene `.agents/skills/sa-verify-security/SKILL.md`, escrito por el usuario
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** `sa-verify-security` queda intacto y no se informa, porque no es un nombre anterior

#### Scenario: Un proyecto que solo tiene `sa-verify`
- **GIVEN** un proyecto cuyos únicos skills de SpecAgile son `.agents/skills/sa-verify/`, sin editar, y su enlace `.claude/skills/sa-verify`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** la CLI detecta Claude Code como configurada, instala los skills `sa-*` del perfil y quita `sa-verify`

### Requirement: Los skills globales retiran `sa-verify`
Cuando `specagile init` o `specagile update` instalan o actualizan los skills globales, SHALL quitar `sa-verify` de las carpetas globales de skills, como quitan el skill de un workflow que el perfil ya no instala. Los skills globales con nombres `openspec-*` SHALL quedar intactos, porque son de una instalación de OpenSpec.

#### Scenario: Actualizar los skills globales de SpecAgile 6.0.0
- **GIVEN** SpecAgile 6.0.0 instaló los skills con alcance global, `~/.agents/skills/sa-verify/SKILL.md` incluido, y el perfil incluye `verify`
- **WHEN** el usuario ejecuta `specagile update` y se actualizan los skills globales
- **THEN** existe `~/.agents/skills/sa-audit/SKILL.md` y ya no existe `~/.agents/skills/sa-verify/`
- **AND** tampoco queda `sa-verify` en la carpeta global de skills de cada herramienta configurada

#### Scenario: Skills globales en Windows
- **GIVEN** en Windows existe `%USERPROFILE%\.agents\skills\sa-verify\SKILL.md`, instalado por SpecAgile 6.0.0
- **WHEN** el usuario ejecuta `specagile update` y se actualizan los skills globales
- **THEN** se quita `%USERPROFILE%\.agents\skills\sa-verify\` y queda `%USERPROFILE%\.agents\skills\sa-audit\` cuando el perfil incluye `verify`

#### Scenario: Skills globales de OpenSpec
- **GIVEN** `~/.agents/skills/openspec-verify-change/SKILL.md`, instalado por OpenSpec con alcance global
- **WHEN** el usuario ejecuta `specagile update` y se actualizan los skills globales
- **THEN** `openspec-verify-change` queda intacto
