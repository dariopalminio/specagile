# Design

## Context

Toda ruta global de la CLI sale de dos funciones de `src/core/global-config.ts`: `getGlobalConfigDir()`, que se arma con `GLOBAL_CONFIG_DIR_NAME`, y `getGlobalDataDir()`, que se arma con `GLOBAL_DATA_DIR_NAME`. Las dos constantes valen `'openspec'`. Las usan:

- Configuración: `config.json` (`global-config.ts`, `commands/config.ts`, `completion-tip.ts`, `migration.ts`, `update.ts`, `workset*.ts` y `telemetry/config.ts`).
- Datos: `stores/` (`store/foundation.ts`), los worksets (`worksets.ts`), `schemas/` (`artifact-graph/resolver.ts`), `projects.json` (`known-projects.ts`) y `global-skills.lock` (`global-skills.ts`).

Ningún archivo de `src/` arma una de esas rutas a mano: basta con cambiar las dos constantes.

La migración de perfil (`computeProfileMigration` en `src/core/migration.ts`) devuelve una migración cuando el `config.json` en disco no tiene `profile` y el proyecto tiene skills instalados. `migrateIfNeeded` (init en modo extendido, init al pasar a skills globales, update) y el plan de `update --dry-run` la llaman, y todos pasan por esa función.

Lo que falta en upstream es que la identidad del fork tenga una fuente única. Hoy esa fuente es `src/core/fork/identity.ts` (`CLI_NAME`, `PACKAGE_NAME`), y `FORK.md` dice que la carpeta global conserva el nombre de upstream.

## Goals / Non-Goals

**Goals:**
- Que el nombre de las carpetas globales tenga una sola definición en el fork y la sigan todas las rutas globales.
- Editar el mínimo de líneas de upstream: las dos constantes y una salida temprana en la migración.
- Que los tests de upstream que fijan `'openspec'` lean el nombre de un solo lugar, para que la próxima sync los rompa en un punto conocido y no en 23 archivos sueltos.

**Non-Goals:**
- Cambiar la ubicación que se sugiere para un store (`~/openspec/<id>`, `references.ts` y `commands/store.ts`): es una carpeta de trabajo del usuario, no una carpeta global de la herramienta.
- Tocar `src/telemetry/`, que el fork no llama. Su ruta "legacy" (`~/.config/<dir>/config.json`) sigue a la constante y en la práctica no se usa.
- Reescribir los comentarios de upstream que nombran `openspec/` en las rutas globales (`global-config.ts`, `resolver.ts`, `telemetry/config.ts`). Se dejan como en las demás ediciones del fork. Se corrige solo el texto que lee un usuario.
- La spec de upstream `global-config`, que queda como está (ver proposal).

## Decisions

### 1. `GLOBAL_FOLDER_NAME` en `identity.ts`, igual a `CLI_NAME`

Se agrega a `src/core/fork/identity.ts` `export const GLOBAL_FOLDER_NAME = CLI_NAME;`, con un comentario que remite a "SpecAgile identity" en `FORK.md`. En `global-config.ts`, `GLOBAL_CONFIG_DIR_NAME` y `GLOBAL_DATA_DIR_NAME` pasan a valer `GLOBAL_FOLDER_NAME`. Conservan sus nombres y sus exports, así los importadores (`core/index.ts`, `telemetry/config.ts`) no cambian.

- *Alternativa: escribir `'specagile'` en `global-config.ts`.* Se descarta porque deja la identidad en un archivo de upstream, contra la regla de `AGENTS.md`.
- *Alternativa: ponerlo en `layout.ts`.* Se descarta porque `layout.ts` es el layout **del proyecto**, y la carpeta global es identidad de la herramienta.
- `identity.ts` solo importa un tipo de `profiles.ts` y `layout.ts`, que carga solo módulos `node:`. La CLI ya lo carga al arrancar por `CLI_NAME`. Que `global-config.ts` lo importe no crea un ciclo ni suma módulos al arranque (`test/cli-e2e/startup-modules.test.ts` lo confirma).

### 2. Ignorar las carpetas de OpenSpec, sin migración ni aviso

No se agrega lectura de `openspec/`: alcanza con no nombrarla. Es lo que eligió el mantenedor: es predecible y no puede reintroducir el perfil `custom` heredado. Lo que se pierde (stores registrados, `skillsScope`, `defaultStore`, `openers`) se documenta en `CHANGELOG.md` con el comando para recuperar cada cosa.

- *Alternativa: copiar una vez los campos neutrales.* Se descarta. Necesita una lista de campos que mantener frente a upstream, y además importaría el `defaultStore` y los stores de la otra herramienta, justo el acoplamiento que se quiere cortar.

### 3. La migración de perfil no corre en el fork

`computeProfileMigration` devuelve `null` al empezar, con un comentario que explica por qué y remite a `FORK.md`. El resto de la función queda como lo escribió upstream, así una sync no conflictúa con el cuerpo. Como todas las llamadas pasan por ella, `migrateIfNeeded`, la rama de `init` que pasa a skills globales y el plan de `update --dry-run` dejan de guardar perfil sin tocarse. Sin `profile` en disco, `getGlobalConfig()` ya devuelve `core` por defecto (`DEFAULT_CONFIG`).

- *Alternativa: deducir `core` cuando lo instalado es un subconjunto de `CORE_WORKFLOWS`.* Se descarta. Requiere mantener la lógica de comparación (nombres `openspec-*`, workflows extra) y una config recién creada no tiene historia previa a los perfiles que migrar.
- *Alternativa: borrar la función y sus llamadas.* Se descarta porque son más líneas de upstream editadas y más superficie de conflicto.
- `applyProfileMigration`, `ProfileMigration` y el mensaje `Migrated: custom profile…` quedan sin llamadas. Se conservan porque son código de upstream y sus tests los ejercitan directamente.

### 4. Tests: un helper para el nombre y un test del fork

- `test/helpers/global-folders.ts` reexporta el nombre (`GLOBAL_FOLDER_NAME`) y ofrece `globalConfigFile(base)` y `globalDataDir(base)` para los tests que arman `path.join(tmp, 'openspec', 'config.json')` con `XDG_CONFIG_HOME` o `XDG_DATA_HOME` apuntando a una carpeta temporal. Los ~23 archivos que hoy fijan `'openspec'` como carpeta global pasan a usarlo (lista en tasks). Las rutas `'openspec'` que son otra cosa (el layout anterior, `~/openspec/<id>`, nombres de paquete) no se tocan.
- `test/core/global-config.test.ts` espera `'specagile'` en lugar de `'openspec'` en las rutas por plataforma.
- Los tests de upstream que esperan una migración de perfil (`test/core/migration.test.ts`, el caso de `update.test.ts` y el de `skills-2-0-hardening.test.ts`) pasan a esperar que no haya migración. Si un caso ejercita `applyProfileMigration` directamente, se conserva.
- Nuevo `test/fork/global-folders.test.ts`:
  - `GLOBAL_CONFIG_DIR_NAME` y `GLOBAL_DATA_DIR_NAME` valen `GLOBAL_FOLDER_NAME`.
  - Las rutas por plataforma, con `path.win32` y `path.posix` según el caso, sin barras fijas.
  - Con un `openspec/config.json` `custom` junto a una carpeta `specagile` vacía, `getGlobalConfig()` devuelve `core` y el archivo de OpenSpec no cambia (mismo contenido y misma fecha de modificación).
  - `computeProfileMigration` devuelve `null` en un proyecto con skills `openspec-*`.
  - E2E con `test/helpers/run-cli.ts` y el repositorio falso de `test/helpers/skill-release.mjs`: `specagile init --tools claude` con la config `custom` de OpenSpec instala `sa-specify` y `sa-plan`.
- Guarda contra regresiones: el test del fork busca en `src/` los literales `'openspec'` unidos a `APPDATA`, `LOCALAPPDATA`, `.config`, `.local/share` o `XDG_*_HOME`, con una lista explícita de excepciones (el instalador standalone que no se usa y los comentarios). Así una sync que agregue una ruta global a mano falla con el nombre del archivo.

### 5. Documentación

- `FORK.md`, "SpecAgile identity": la frase "the global config directory … keep upstream's names" pasa a decir que las carpetas globales son `specagile` (`GLOBAL_FOLDER_NAME`), con la tabla de plataformas y la nota de que no se lee `openspec/` ni se migra el perfil. Se suman `global-config.ts` y `migration.ts` a "Upstream files edited for the identity" y un ítem a "When a sync touches the identity": una ruta global nueva usa `getGlobalConfigDir()`/`getGlobalDataDir()`, y una migración de perfil nueva de upstream se revisa contra la decisión 3.
- `docs-lab/` (`reference/cli.md`, `reference/configuration/{index,config-json,stores}.md`, `reference/schemas/schema-yaml.md`, `customize/schemas.md`, `start/installation.md`): las rutas globales pasan a `specagile`. `docs/` es de upstream y queda como está, como en el change del layout.
- `CHANGELOG.md`: entrada **BREAKING** con qué se reinicia y cómo recuperarlo.

## Risks / Trade-offs

- [Los usuarios de SpecAgile ≤ 3.0.1 pierden sus stores registrados y sus ajustes al actualizar] → Entrada en `CHANGELOG.md` con `specagile store register <carpeta>` y `specagile config profile`. Las carpetas `openspec/` siguen ahí, así que nada se pierde en disco.
- [Con `profile` sin guardar, `update` en un proyecto con workflows fuera de `core` (por ejemplo `verify`) se comporta como con `core`, y puede quitar o señalar esos skills como extra] → Es el comportamiento de upstream con `core`, y `update` lo informa. El usuario los recupera con `specagile config profile`. Queda cubierto por un caso de test, para que el resultado sea explícito.
- [Una sync de upstream cambia `computeProfileMigration` o agrega otra deducción de perfil] → La salida temprana está en la primera línea, con un comentario. El test del fork falla si vuelve a deducirse un perfil, y `FORK.md` dice qué revisar.
- [`test/cli-e2e/upgrade-from-releases.test.ts` (solo con `OPENSPEC_RELEASE_UPGRADES=1`) instala releases de OpenSpec que escriben en `openspec/` y después corre `specagile`, y puede depender de que compartan config] → Se revisa y se ajusta su expectativa. Ahora SpecAgile no ve lo que escribió la release anterior en la config global, pero sí sus archivos en el proyecto.
- [Windows sin `%APPDATA%` o `%LOCALAPPDATA%`] → Se conservan los fallbacks de upstream (`AppData\Roaming` y `AppData\Local` bajo la carpeta personal), con el nombre nuevo. Lo cubre el test por plataforma.
- [Este repositorio se opera con la CLI global de OpenSpec] → Esa CLI sigue usando `openspec/` y no la afecta. Probar `specagile` en local escribe en `specagile/`, no en la config de OpenSpec del mantenedor.

## Migration Plan

1. Publicar la versión siguiente con la entrada BREAKING en `CHANGELOG.md`. La versión y la publicación las decide el mantenedor.
2. El usuario actualiza y ejecuta `specagile init` o `specagile update` como siempre. Rige `core`, con `sa-specify` y `sa-plan`.
3. Si tenía stores o ajustes, los vuelve a registrar y configurar.

Rollback: volver las dos constantes a `'openspec'` y quitar la salida temprana. Las carpetas `specagile/` que se hayan creado se pueden borrar sin efecto sobre OpenSpec.
