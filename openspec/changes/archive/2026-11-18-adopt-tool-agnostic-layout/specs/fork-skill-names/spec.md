# Spec Delta

## MODIFIED Requirements

### Requirement: Los skills invocan la CLI como `specagile`
Cada `SKILL.md` generado SHALL invocar la CLI como `specagile <subcomando>`, declarar `specagile` como CLI requerida y preaprobar las llamadas a `specagile` en `allowed-tools`. Las rutas del proyecto que nombra SHALL ser las del layout de SpecAgile, como `changes/<name>/` y `specagile/config.yaml`.

#### Scenario: El skill de propose usa `specagile`
- **WHEN** se genera `sa-propose/SKILL.md`
- **THEN** el skill indica ejecutar `specagile new change`, `specagile status` y `specagile instructions`, y no indica ejecutar ningún comando `openspec`
- **AND** nombra `specagile/config.yaml` como el archivo de configuración del proyecto

#### Scenario: Llamadas preaprobadas
- **WHEN** se genera cualquier skill `sa-*`
- **THEN** su frontmatter preaprueba las llamadas a `specagile` y declara que requiere la CLI `specagile`
