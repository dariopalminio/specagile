# Spec Delta

## Purpose

Define dónde guarda SpecAgile su configuración y sus datos globales, en carpetas propias e independientes de las de OpenSpec upstream, y qué perfil de workflows rige cuando su configuración no tiene uno. Reemplaza las rutas `openspec/` que nombra la spec heredada `global-config`.

## ADDED Requirements

### Requirement: La configuración global vive en una carpeta `specagile`
SpecAgile SHALL guardar su configuración global en `config.json`, dentro de una carpeta `specagile`. La carpeta SHALL estar en `$XDG_CONFIG_HOME/specagile/` cuando esa variable está definida, en cualquier plataforma. Sin esa variable, SHALL estar en `%APPDATA%\specagile\` en Windows y en `~/.config/specagile/` en macOS y Linux. `specagile config path` SHALL mostrar esa ruta, con el separador de la plataforma.

#### Scenario: Windows
- **GIVEN** en Windows, `%APPDATA%` es `C:\Users\Ana\AppData\Roaming` y `XDG_CONFIG_HOME` no está definida
- **WHEN** el usuario ejecuta `specagile config path`
- **THEN** la salida es `C:\Users\Ana\AppData\Roaming\specagile\config.json`

#### Scenario: macOS y Linux
- **GIVEN** en macOS o Linux, `XDG_CONFIG_HOME` no está definida
- **WHEN** el usuario ejecuta `specagile config path`
- **THEN** la salida es `config.json` dentro de `.config/specagile/`, en la carpeta personal del usuario

#### Scenario: XDG_CONFIG_HOME definida
- **GIVEN** `XDG_CONFIG_HOME` es `/srv/conf`
- **WHEN** el usuario ejecuta `specagile config path`
- **THEN** la salida es `/srv/conf/specagile/config.json`

#### Scenario: Guardar un ajuste crea la carpeta
- **GIVEN** no existe la carpeta de configuración de SpecAgile
- **WHEN** el usuario ejecuta `specagile config profile core`
- **THEN** existe `config.json` en la carpeta de configuración de SpecAgile, con `"profile": "core"`

### Requirement: Los datos globales viven en una carpeta `specagile`
SpecAgile SHALL guardar sus datos globales (los stores registrados, los worksets, los esquemas globales en `schemas/` y la lista de proyectos conocidos) en una carpeta `specagile`. La carpeta SHALL estar en `$XDG_DATA_HOME/specagile/` cuando esa variable está definida, en cualquier plataforma. Sin esa variable, SHALL estar en `%LOCALAPPDATA%\specagile\` en Windows y en `~/.local/share/specagile/` en macOS y Linux.

#### Scenario: Registrar un store en Windows
- **GIVEN** en Windows, `%LOCALAPPDATA%` es `C:\Users\Ana\AppData\Local` y `XDG_DATA_HOME` no está definida
- **WHEN** el usuario ejecuta `specagile store setup team --path D:\stores\team`
- **THEN** el registro del store queda bajo `C:\Users\Ana\AppData\Local\specagile\`
- **AND** `specagile store list` lista `team`

#### Scenario: Esquema global en macOS y Linux
- **GIVEN** en macOS o Linux, `XDG_DATA_HOME` no está definida, y existe `schema.yaml` en `.local/share/specagile/schemas/my-flow/`, dentro de la carpeta personal
- **WHEN** el usuario ejecuta `specagile schemas`
- **THEN** la salida lista `my-flow` como esquema del usuario

#### Scenario: XDG_DATA_HOME definida
- **GIVEN** `XDG_DATA_HOME` es `/srv/data` y existe `/srv/data/specagile/schemas/my-flow/schema.yaml`
- **WHEN** el usuario ejecuta `specagile schemas`
- **THEN** la salida lista `my-flow` como esquema del usuario

### Requirement: SpecAgile no usa las carpetas globales de OpenSpec
SpecAgile SHALL ignorar las carpetas globales `openspec` de configuración y de datos: no las lee, no las copia, no las crea y no las modifica. Lo que guarda `openspec` SHALL no cambiar lo que instala o lista `specagile`, y lo que guarda `specagile` SHALL no cambiar lo que usa `openspec`.

#### Scenario: Un perfil custom de OpenSpec no limita los skills de SpecAgile
- **GIVEN** la config global de OpenSpec tiene `"profile": "custom"` con los workflows `propose`, `explore`, `apply` y `archive`
- **AND** SpecAgile todavía no tiene config global
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo
- **THEN** quedan instalados `sa-propose`, `sa-explore`, `sa-specify`, `sa-plan`, `sa-implement`, `sa-update-change`, `sa-sync-specs` y `sa-archive`
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

### Requirement: Sin perfil guardado rige el perfil core
Cuando la config global de SpecAgile no tiene `profile`, `specagile init` y `specagile update` SHALL usar el perfil `core` y no SHALL deducir uno de los skills instalados en el proyecto, ni de los `openspec-*` ni de los `sa-*`. Tampoco SHALL guardar un perfil en la config ni informar una migración de perfil. Un perfil `custom` SHALL existir solo si el usuario lo elige con `specagile config profile`.

#### Scenario: Proyecto con los skills core de OpenSpec
- **GIVEN** un proyecto con `.claude/skills/openspec-propose/`, `openspec-explore/`, `openspec-apply-change/` y `openspec-archive-change/`, escritos por OpenSpec
- **AND** SpecAgile no tiene config global
- **WHEN** el usuario ejecuta `specagile update` en ese proyecto
- **THEN** quedan instalados los skills del perfil `core`, entre ellos `sa-specify` y `sa-plan`
- **AND** la salida no incluye `Migrated: custom profile`
- **AND** la config global de SpecAgile no tiene `"profile": "custom"`

#### Scenario: Proyecto con parte de los skills de SpecAgile
- **GIVEN** un proyecto con `sa-propose`, `sa-explore`, `sa-implement`, `sa-sync-specs` y `sa-archive`, sin `sa-specify` ni `sa-plan`
- **AND** SpecAgile no tiene config global
- **WHEN** el usuario ejecuta `specagile init --tools claude` en ese proyecto
- **THEN** quedan instalados `sa-specify` y `sa-plan` junto a los demás skills del perfil `core`

#### Scenario: Simular un update sin perfil guardado
- **GIVEN** un proyecto con skills `openspec-*` y SpecAgile sin config global
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** el plan instala los skills del perfil `core` y no incluye escribir la config global

#### Scenario: Un perfil custom elegido se respeta
- **GIVEN** el usuario ejecutó `specagile config profile custom` y eligió `propose`, `explore`, `apply` y `archive`
- **WHEN** el usuario ejecuta `specagile init --tools claude` en un proyecto nuevo
- **THEN** quedan instalados los skills de esos workflows y `sa-sync-specs`
- **AND** no se instalan `sa-specify` ni `sa-plan`
