# Spec Delta

## ADDED Requirements

### Requirement: Disponibilidad del skill de auditoría
El workflow `verify` SHALL instalarse como el skill `sa-audit` y formar parte del perfil `core`, así que `specagile init` y `specagile update` lo instalan por defecto. Un perfil `custom` SHALL instalarlo solo si incluye `verify`.

#### Scenario: Instalación con el perfil por defecto
- **WHEN** el usuario ejecuta `specagile init --tools claude --scope project` en un proyecto nuevo con el perfil `core`
- **THEN** se instala el skill `sa-audit` junto a los demás skills del perfil `core`
- **AND** en Windows el archivo queda en `.agents\skills\sa-audit\SKILL.md` y en macOS y Linux en `.agents/skills/sa-audit/SKILL.md`, con la entrada `sa-audit` en `.claude/skills/` (un enlace, o una copia en Windows sin permiso para crear enlaces)

#### Scenario: Skills para toda la máquina
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo con el perfil `core` y los skills se instalan con alcance global
- **THEN** existe `~/.agents/skills/sa-audit/SKILL.md` en macOS y Linux, y `%USERPROFILE%\.agents\skills\sa-audit\SKILL.md` en Windows
- **AND** el resumen de `specagile init` cuenta `sa-audit` entre los skills instalados

#### Scenario: Proyecto existente con perfil core
- **GIVEN** un proyecto configurado con el perfil `core` que todavía no tiene `sa-audit`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** se agrega el skill `sa-audit` y los demás skills quedan como estaban

#### Scenario: Simular el update de un proyecto con perfil core
- **GIVEN** un proyecto configurado con el perfil `core` que todavía no tiene `sa-audit`
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** el plan informa que se instalaría `sa-audit`
- **AND** no se crea `sa-audit`

#### Scenario: Perfil custom sin verify
- **GIVEN** el usuario guardó un perfil `custom` que no incluye `verify`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** no se instala `sa-audit`
- **AND** la salida avisa que al perfil `custom` le falta el workflow core `verify` y nombra `specagile config profile` para agregarlo
- **AND** el perfil guardado queda sin cambios

#### Scenario: Selector de workflows
- **WHEN** el usuario abre `specagile config profile` con el perfil `core`
- **THEN** "Audit change" (`verify`) aparece marcado junto a los demás workflows core
- **AND** guardar los diez workflows core guarda el perfil `core`, y desmarcar "Audit change" guarda un perfil `custom` sin `verify`

#### Scenario: Volver al perfil core
- **GIVEN** un perfil `custom` sin `verify`
- **WHEN** el usuario ejecuta `specagile config profile core` y luego `specagile update`
- **THEN** la config global tiene `"profile": "core"` y el proyecto queda con `sa-audit` instalado
