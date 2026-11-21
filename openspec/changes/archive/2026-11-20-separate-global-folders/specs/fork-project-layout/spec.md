# Spec Delta

## MODIFIED Requirements

### Requirement: Los nombres internos y las ubicaciones fuera del proyecto no cambian
SpecAgile SHALL conservar los nombres de sus archivos internos y la ubicación que sugiere para un store nuevo: el archivo de metadatos de cada change (`.openspec.yaml`), los metadatos de un store (`.openspec-store/`), la marca de skills compartidos (`.agents/skills/.openspec-target`) y la ubicación sugerida para un store nuevo (`~/openspec/<id>`). Las carpetas globales de configuración y de datos son las de SpecAgile (ver `fork-global-folders`).

#### Scenario: Un change migrado conserva sus metadatos
- **GIVEN** un change `add-login` con `openspec/changes/add-login/.openspec.yaml` que declara `skip_specs: true`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** existe `changes/add-login/.openspec.yaml` con `skip_specs: true`

#### Scenario: Ubicación sugerida para un store
- **WHEN** el usuario ejecuta `specagile store setup team` sin `--path` en una terminal interactiva
- **THEN** la CLI sugiere `~/openspec/team` como carpeta del store
