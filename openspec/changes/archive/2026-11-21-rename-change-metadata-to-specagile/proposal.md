# Proposal

## Why

Cada change que se crea con SpecAgile, con `specagile new change` o desde los skills `sa-specify`, `sa-propose` o `sa-new-change`, guarda sus metadatos en `.openspec.yaml`. Es el único archivo del proyecto que todavía lleva el nombre de OpenSpec: el fork ya tiene su propio layout (`specs/`, `changes/`, `specagile/`), su CLI, sus skills y sus carpetas globales. El usuario lo ve en cada change nuevo, junto a `proposal.md` y los specs delta.

Renombrar solo el archivo dejaría sin metadatos a los changes que ya existen, sin avisar. El esquema volvería al de `specagile/config.yaml` o a `spec-driven`. `validate` rechazaría un change que declara `skip_specs: true`, y `archive` abortaría el retiro de una capacidad que autoriza `retire_capabilities: true`. Por eso el cambio de nombre incluye leer el nombre anterior y migrar los changes activos.

## What Changes

- **BREAKING**: `specagile new change` crea los metadatos del change en `.specagile.yaml`, con el mismo contenido que antes (`schema`, `created` y las claves opcionales). La salida de `specagile new change --json` nombra ese archivo en `metadataPath`.
- La CLI sigue leyendo `.openspec.yaml` en un change que no tiene `.specagile.yaml`: el esquema, `skip_specs`, `retire_capabilities`, `initiative` y las claves `x-` siguen funcionando en los changes creados con SpecAgile 4.0.0 o anterior, con OpenSpec, y en los archivados. Si un change tiene los dos archivos, rige `.specagile.yaml`.
- `specagile update` y `specagile init` renombran `.openspec.yaml` a `.specagile.yaml` en cada change activo de la raíz (`changes/<change>/`), sin cambiar su contenido, e informan cada archivo renombrado. Lo hacen después de mover el layout anterior, en la misma ejecución. `specagile update --dry-run` informa los renombres sin hacerlos.
- Un change que tiene los dos archivos los conserva, y `update` e `init` avisan cuál se usa. Un archivo que no se puede renombrar (por ejemplo, abierto por otro programa en Windows) queda como está, se sigue leyendo, y la salida lo nombra.
- Los mensajes de la CLI, los `SKILL.md` generados, la distribución `skills/` y las instrucciones del esquema `spec-driven` nombran `.specagile.yaml`.
- Esto revierte la decisión documentada de conservar `.openspec.yaml` (`FORK.md`, `src/core/fork/identity.ts` y `test/fork/identity.test.ts`).

Sin cambios: los metadatos de un store (`.openspec-store/`), la marca de skills compartidos (`.agents/skills/.openspec-target`) y la ubicación que se sugiere para un store nuevo (`~/openspec/<id>`).

Suposiciones y fuera de alcance:

- Los changes archivados conservan su `.openspec.yaml`: son historia, renombrarlos llenaría el diff de renombres y la CLI los sigue leyendo.
- Los mensajes nombran `.specagile.yaml` también para un change que todavía no se migró; el siguiente `specagile update` lo renombra.
- Las specs heredadas de upstream (`change-creation`, `schema-resolution`, `opsx-archive-skill`, `specs-sync-skill`) y `opsx-specify-skill` siguen nombrando `.openspec.yaml`, como siguen nombrando `openspec/…`. `fork-project-layout` documenta el reemplazo, como ya hace con el layout.
- La carpeta `openspec/` de este repositorio se opera con la CLI de OpenSpec upstream y conserva sus `.openspec.yaml`.

## Capabilities

### New Capabilities

<!-- Ninguna: el archivo de metadatos es parte del layout de cada change. -->

### Modified Capabilities

- `fork-project-layout`: el change se crea con `.specagile.yaml`; los changes con `.openspec.yaml` siguen funcionando y `update`/`init` migran los activos; los textos nombran `.specagile.yaml`; el requisito "Los nombres internos y las ubicaciones fuera del proyecto no cambian" deja de incluir el archivo de metadatos de cada change.

## Impact

- **Código**: los dos nombres del archivo pasan a `src/core/fork/layout.ts`, la fuente única del layout. Se editan archivos de upstream: `src/utils/change-metadata.ts` (la constante `METADATA_FILENAME` y las lecturas), `src/core/archive.ts`, `src/commands/workflow/instructions.ts`, `src/commands/workflow/new-change.ts` y `src/utils/nested-change.ts`. También los mensajes de `src/commands/change.ts`, `src/commands/validate.ts`, `src/core/artifact-graph/instruction-loader.ts` y `src/core/validation/constants.ts`, y el arranque de la migración en `src/core/init.ts` y `src/core/update.ts`. La migración va en un módulo nuevo del fork.
- **Skills**: ocho skills generados cambian el nombre del archivo (`sa-specify`, `sa-plan`, `sa-propose`, `sa-explore`, `sa-ff-change`, `sa-archive`, `sa-bulk-archive-change` y `sa-sync-specs`). Se regenera `skills/`; la release necesita su tag (lo crea el mantenedor).
- **Esquema y docs**: `schemas/spec-driven/schema.yaml`, `schemas/spec-driven/templates/proposal.md` y su cita en `docs-lab/`, más `FORK.md`, `AGENTS.md`, las páginas de `docs-lab/` que nombran el archivo y `CHANGELOG.md`.
- **Tests**: los tests de upstream que escriben `.openspec.yaml` como fixture siguen pasando por la lectura del nombre anterior. Se adaptan los que fijan el nombre del archivo creado o el texto de un mensaje. Se agregan tests del fork para la creación, la lectura, la migración y una guarda contra `.openspec.yaml` en `src/`.
- **Usuarios**: después de actualizar, `specagile update` renombra los metadatos de los changes activos, y conviene commitear esos renombres. Un compañero de equipo con SpecAgile 4.0.0 o anterior no lee `.specagile.yaml`: para su CLI esos changes no tienen metadatos. Una herramienta o script que lee `.openspec.yaml` (por ejemplo, las claves `x-`) tiene que leer `.specagile.yaml`.
- **Upstream**: hay más líneas de upstream editadas que pueden conflictuar en una sync. La guarda en `test/fork/` detecta un mensaje nuevo de upstream que nombre `.openspec.yaml`.
- **Orden de archivo**: `separate-global-folders` (completo, sin archivar) modifica el mismo requisito de `fork-project-layout`. Hay que archivarlo antes que este change, o este delta quedaría pisado.
