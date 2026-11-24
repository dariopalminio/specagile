# Spec Delta

## MODIFIED Requirements

### Requirement: Los skills se instalan con nombres `sa-*`
SpecAgile SHALL instalar cada workflow como un skill con el nombre de esta tabla, tanto en la carpeta como en el campo `name` del `SKILL.md`: explore→`sa-explore`, propose→`sa-propose`, specify→`sa-specify`, plan→`sa-plan`, tasks→`sa-tasks`, apply→`sa-implement`, verify→`sa-audit`, archive→`sa-archive`, new→`sa-new-change`, continue→`sa-continue-change`, ff→`sa-ff-change`, bulk-archive→`sa-bulk-archive-change`, onboard→`sa-onboard`, update→`sa-update-change`, sync→`sa-sync-specs`.

#### Scenario: Instalar el perfil core para Claude Code
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo con el perfil `core`
- **THEN** existen `.agents/skills/sa-propose/SKILL.md`, `.agents/skills/sa-explore/SKILL.md`, `.agents/skills/sa-specify/SKILL.md`, `.agents/skills/sa-plan/SKILL.md`, `.agents/skills/sa-tasks/SKILL.md`, `.agents/skills/sa-implement/SKILL.md`, `.agents/skills/sa-audit/SKILL.md`, `.agents/skills/sa-update-change/SKILL.md`, `.agents/skills/sa-sync-specs/SKILL.md` y `.agents/skills/sa-archive/SKILL.md`, cada uno con el `name` igual al nombre de su carpeta
- **AND** `.claude/skills/` tiene una entrada con cada uno de esos nombres
- **AND** no se crea ninguna carpeta `openspec-*` ni `sa-verify`

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
