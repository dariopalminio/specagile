# Proposal

## Why

SpecAgile guarda su configuración y sus datos globales en las mismas carpetas que OpenSpec upstream (`openspec/` bajo `%APPDATA%` y `%LOCALAPPDATA%` en Windows, `~/.config/` y `~/.local/share/` en macOS y Linux). Por eso hereda los ajustes de otra herramienta. Quien antes eligió un perfil `custom` con `openspec config`, por ejemplo con los workflows `propose`, `explore`, `apply` y `archive`, ejecuta `specagile init` y recibe solo esos skills, más `sa-sync-specs`. No recibe `sa-specify` ni `sa-plan`, que son lo central del fork, y no ve ningún aviso. Pasa lo mismo al revés: lo que `specagile config` guarda cambia lo que instala `openspec`.

Aunque cada herramienta tenga su carpeta, la migración de perfil de upstream reproduce el problema. Cuando la config global no tiene `profile`, la migración deduce uno de los skills instalados en el proyecto, y cuenta también los `openspec-*`. Con una carpeta nueva y vacía, eso pasaría en el primer `init` o `update` de cada usuario. En un proyecto con los skills core de OpenSpec, la migración guardaría `custom` sin `specify` ni `plan`.

## What Changes

- **BREAKING**: SpecAgile usa sus propias carpetas globales, con el nombre `specagile`:

  | Plataforma | Configuración (`config.json`) | Datos |
  |---|---|---|
  | Con `XDG_CONFIG_HOME` / `XDG_DATA_HOME` | `$XDG_CONFIG_HOME/specagile/` | `$XDG_DATA_HOME/specagile/` |
  | macOS y Linux | `~/.config/specagile/` | `~/.local/share/specagile/` |
  | Windows | `%APPDATA%\specagile\` | `%LOCALAPPDATA%\specagile\` |

  En la carpeta de datos quedan los stores registrados, los worksets, los esquemas globales (`schemas/`), la lista de proyectos conocidos (`projects.json`) y el lock de los skills globales.
- SpecAgile no lee, no copia y no modifica las carpetas `openspec/` de upstream. La primera vez arranca con los valores por defecto: perfil `core`, con `specify`, `plan` y `update`. `specagile config` y `specagile config path` usan la carpeta nueva.
- SpecAgile no deduce un perfil de los skills instalados. Sin `profile` en su config, rige `core`. `specagile init` y `specagile update` ya no imprimen `Migrated: custom profile with N workflows`. Un perfil `custom` solo existe si el usuario lo elige con `specagile config profile`.
- `openspec` y `specagile` instalados en la misma máquina dejan de compartir ajustes: lo que guarda una herramienta no cambia lo que instala la otra.
- La documentación que nombra la carpeta global (`FORK.md`, `docs-lab/`) pasa a la carpeta nueva. Los mensajes de la CLI ya muestran la ruta resuelta, por ejemplo `specagile config path`, y no se editan.

Sin cambios: la ubicación que se sugiere para un store nuevo (`~/openspec/<id>`), los metadatos de un store (`.openspec-store/`), los archivos internos de cada proyecto y el layout del proyecto.

Fuera de alcance:

- Migrar o importar los ajustes y los stores de `openspec`. Quien quiera conservarlos los vuelve a configurar: `specagile config profile`, `specagile store register <carpeta>`.
- Avisar que existe una config de `openspec`.
- La CLI global de OpenSpec que se usa para operar este repositorio: sigue con sus carpetas.

## Capabilities

### New Capabilities

- `fork-global-folders`: dónde guarda SpecAgile su configuración y sus datos globales, su independencia de las carpetas de OpenSpec upstream y cómo se resuelve el perfil cuando la config no lo tiene.

### Modified Capabilities

<!-- La spec global-config de upstream nombra `~/.config/openspec/` y queda como
     está para no generar conflictos al sincronizar. fork-global-folders documenta
     el reemplazo, como hizo fork-project-layout con las rutas del proyecto. -->

- `fork-project-layout`: el requisito "Los nombres internos y las ubicaciones fuera del proyecto no cambian" deja de incluir el directorio de configuración global.

## Impact

- **Código**: la fuente única del nombre de las carpetas pasa al fork (`src/core/fork/`). `src/core/global-config.ts` toma de ahí `GLOBAL_CONFIG_DIR_NAME` y `GLOBAL_DATA_DIR_NAME`, y `src/core/migration.ts` deja de proponer una migración de perfil. Son dos líneas de upstream editadas. Todo lo que ya construye sus rutas con `getGlobalConfigDir()` y `getGlobalDataDir()` (config, stores, worksets, esquemas globales, proyectos conocidos, lock de skills globales, telemetría) sigue al cambio sin editarse.
- **Tests**: unos 23 archivos de upstream fijan `'openspec'` como nombre de la carpeta global y pasan a tomarlo de un helper. Los tests de upstream sobre la migración de perfil se adaptan al fork. Se agrega un test del fork con las carpetas por plataforma, la independencia de `openspec` y el perfil por defecto.
- **Docs**: `FORK.md` (identidad y archivos de upstream editados), `docs-lab/` donde nombra la carpeta global, y `CHANGELOG.md`.
- **Usuarios**: después de actualizar SpecAgile, los ajustes globales vuelven a los valores por defecto. Los stores registrados con una versión anterior de SpecAgile, o con `openspec`, hay que registrarlos otra vez con `specagile store register`. El `skillsScope` elegido se vuelve a preguntar. Las carpetas `openspec/` quedan como estaban, y `openspec` las sigue usando.
- **Upstream**: una sync que cambie esas dos líneas o los tests adaptados puede conflictuar. `FORK.md` documenta qué revisar.
