# Spec Delta

## MODIFIED Requirements

### Requirement: Los skills se instalan con nombres `sa-*`
SpecAgile SHALL instalar cada workflow como un skill con el nombre de esta tabla, tanto en la carpeta como en el campo `name` del `SKILL.md`: explore→`sa-explore`, propose→`sa-propose`, specify→`sa-specify`, plan→`sa-plan`, tasks→`sa-tasks`, apply→`sa-implement`, verify→`sa-verify`, archive→`sa-archive`, new→`sa-new-change`, continue→`sa-continue-change`, ff→`sa-ff-change`, bulk-archive→`sa-bulk-archive-change`, onboard→`sa-onboard`, update→`sa-update-change`, sync→`sa-sync-specs`.

#### Scenario: Instalar el perfil core para Claude Code
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo con el perfil `core`
- **THEN** existen `.agents/skills/sa-propose/SKILL.md`, `.agents/skills/sa-explore/SKILL.md`, `.agents/skills/sa-specify/SKILL.md`, `.agents/skills/sa-plan/SKILL.md`, `.agents/skills/sa-tasks/SKILL.md`, `.agents/skills/sa-implement/SKILL.md`, `.agents/skills/sa-update-change/SKILL.md`, `.agents/skills/sa-sync-specs/SKILL.md` y `.agents/skills/sa-archive/SKILL.md`, cada uno con el `name` igual al nombre de su carpeta
- **AND** `.claude/skills/` tiene una entrada con cada uno de esos nombres
- **AND** no se crea ninguna carpeta `openspec-*`

#### Scenario: Instalar en Windows sin soporte de enlaces
- **WHEN** el usuario ejecuta `specagile init --tools claude` en Windows sin permiso para crear enlaces simbólicos
- **THEN** cada skill se copia en `.claude\skills\sa-<nombre>\SKILL.md` con el mismo nombre que su carpeta en `.agents\skills\`

#### Scenario: Los ids de workflow no cambian
- **WHEN** el usuario ejecuta `specagile config profile` y elige workflows
- **THEN** el selector y la configuración guardada usan los mismos ids que antes (`propose`, `apply`, `verify`, …), y elegir `apply` instala `sa-implement`

### Requirement: Las frases de activación usan `specagile`
La descripción de cada skill SHALL nombrar la frase de activación `specagile <verbo>` de su workflow y SHALL no nombrar frases `openspec <verbo>`. Los verbos son: explore, propose, specify, plan, tasks, implement, verify, archive, new change, continue, ff, bulk-archive, onboard, update change y sync.

#### Scenario: Activar implement por frase
- **WHEN** se genera `sa-implement/SKILL.md`
- **THEN** su descripción nombra la frase "specagile implement"

#### Scenario: Activar tasks por frase
- **WHEN** se genera `sa-tasks/SKILL.md`
- **THEN** su descripción nombra la frase "specagile tasks"

#### Scenario: Distinguir el skill de update del comando `specagile update`
- **WHEN** se genera `sa-update-change/SKILL.md`
- **THEN** su descripción nombra la frase "specagile update change" y aclara que el comando de CLI `specagile update` es otra cosa

### Requirement: Sugerencias de inicio y distribución con nombres `sa-*`
Las sugerencias que muestra `specagile init` al terminar SHALL nombrar los skills `sa-*` en la forma de la herramienta elegida. La distribución estática de skills del repositorio SHALL contener solo carpetas `sa-*`.

#### Scenario: Sugerencias del perfil core
- **WHEN** `specagile init --tools claude` termina con el perfil `core`
- **THEN** las sugerencias muestran `/sa-propose`, `/sa-specify`, `/sa-plan`, `/sa-tasks` y `/sa-implement`, en ese orden

#### Scenario: Distribución estática
- **WHEN** el mantenedor regenera la distribución estática de skills
- **THEN** la carpeta `skills/` contiene una carpeta `sa-*` por workflow, `sa-tasks` incluida, y ninguna `openspec-*`

### Requirement: Nombres anteriores en una lista explícita
SpecAgile SHALL reconocer como nombres anteriores solo los catorce de una lista fija, uno por workflow: `openspec-explore`, `openspec-propose`, `openspec-specify`, `openspec-plan`, `openspec-apply-change`, `openspec-verify-change`, `openspec-archive-change`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-bulk-archive-change`, `openspec-onboard`, `openspec-update-change` y `openspec-sync-specs`. El workflow `tasks` no tiene nombre anterior.

#### Scenario: Un skill del usuario con prefijo parecido no se toca
- **GIVEN** el proyecto tiene `.agents/skills/openspec-helpers/SKILL.md`, escrito por el usuario
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** `openspec-helpers` queda intacto y no se informa, porque no está en la lista

#### Scenario: Un skill `openspec-tasks` del usuario no se toca
- **GIVEN** el proyecto tiene `.agents/skills/openspec-tasks/SKILL.md`, escrito por el usuario
- **WHEN** el usuario ejecuta `specagile update` con el perfil `core`
- **THEN** `openspec-tasks` queda intacto y no se informa
- **AND** se instala `sa-tasks` junto a él
