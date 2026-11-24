# Spec Delta

## MODIFIED Requirements

### Requirement: SpecAgile no usa las carpetas globales de OpenSpec
SpecAgile SHALL ignorar las carpetas globales `openspec` de configuración y de datos: no las lee, no las copia, no las crea y no las modifica. Lo que guarda `openspec` SHALL no cambiar lo que instala o lista `specagile`, y lo que guarda `specagile` SHALL no cambiar lo que usa `openspec`.

#### Scenario: Un perfil custom de OpenSpec no limita los skills de SpecAgile
- **GIVEN** la config global de OpenSpec tiene `"profile": "custom"` con los workflows `propose`, `explore`, `apply` y `archive`
- **AND** SpecAgile todavía no tiene config global
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo
- **THEN** quedan instalados `sa-propose`, `sa-explore`, `sa-specify`, `sa-plan`, `sa-tasks`, `sa-implement`, `sa-update-change`, `sa-sync-specs` y `sa-archive`
- **AND** la config global de OpenSpec queda sin cambios

#### Scenario: Un ajuste de SpecAgile no cambia OpenSpec
- **GIVEN** existe la config global de OpenSpec
- **WHEN** el usuario ejecuta `specagile config profile custom` y elige los workflows `propose` y `explore`
- **THEN** la config global de SpecAgile tiene `"profile": "custom"` con esos workflows
- **AND** la config global de OpenSpec queda sin cambios

#### Scenario: Los stores de OpenSpec no aparecen en SpecAgile
- **GIVEN** el store `team` está registrado con `openspec store register`
- **WHEN** el usuario ejecuta `specagile store list`
- **THEN** la salida no lista `team`
- **AND** después de `specagile store register <carpeta de team>`, `specagile store list` lista `team`

#### Scenario: Primera ejecución sin carpetas de SpecAgile
- **GIVEN** existen las carpetas globales de OpenSpec y no existen las de SpecAgile
- **WHEN** el usuario ejecuta `specagile config list`
- **THEN** la salida muestra los valores por defecto de SpecAgile, con el perfil `core`
- **AND** no se crea ninguna carpeta global de SpecAgile
