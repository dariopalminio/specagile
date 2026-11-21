# Tasks

## 1. Nombres y resolución en el layout

- [ ] 1.1 Agregar en `src/core/fork/layout.ts` `CHANGE_METADATA_FILE_NAME` (`.specagile.yaml`), `FORMER_CHANGE_METADATA_FILE_NAME` (`.openspec.yaml`), `CHANGE_METADATA_FILE_NAMES` (en orden de lectura) y `getChangeMetadataFile(changeDir)`, con `path.join` y solo módulos `node:`. Reexportarlos en `test/helpers/layout.ts`. Verificar con tests en `test/fork/layout.test.ts`: devuelve `.specagile.yaml` si existe, `.openspec.yaml` si es el único, `.specagile.yaml` si no hay ninguno, y la ruta sale con el separador de la plataforma (comparada con `path.join`). `test/cli-e2e/startup-modules.test.ts` sigue pasando.
- [ ] 1.2 Documentar los nombres y la función en "Project layout → Where it lives" de `FORK.md`, incluida la regla de que la precedencia se decide por existencia y no por validez. Verificar que `test/fork/fork-docs.test.ts` pasa y que la sección nombra las tres constantes y la función.

## 2. Leer y escribir los metadatos

- [ ] 2.1 Hacer que `METADATA_FILENAME` (`src/utils/change-metadata.ts`) tome su valor de `CHANGE_METADATA_FILE_NAME`, y que `readUnknownChangeMetadataKeys`, `readChangeMetadata` y `readBooleanMarker` lean de `getChangeMetadataFile`. Verificar con un test nuevo, `test/fork/change-metadata.test.ts`:
  - con solo `.openspec.yaml`, se leen el esquema, `skip_specs`, `retire_capabilities`, `initiative` y las claves `x-`;
  - con los dos archivos, rige `.specagile.yaml` (escenarios "El esquema sale de `.specagile.yaml`" y "Un marcador que solo está en `.openspec.yaml`");
  - un `.specagile.yaml` inválido no cae a `.openspec.yaml`.
- [ ] 2.2 Pasar a `getChangeMetadataFile` las dos lecturas de `src/core/archive.ts` (autorización de retiro) y la de `src/commands/workflow/instructions.ts:510`. Verificar con el escenario "`retire_capabilities` en un change sin migrar": archivar retira `specs/legacy-auth/spec.md` con el marcador en `.openspec.yaml` y también en `.specagile.yaml`.
- [ ] 2.3 Reemplazar el literal de `src/commands/workflow/new-change.ts:188` por `path.join(result.changeDir, METADATA_FILENAME)`. Verificar con un test end-to-end (`runCLI`) en `test/fork/change-metadata.test.ts`:
  - `specagile new change add-login` crea `changes/add-login/.specagile.yaml` con `schema` y `created`, sin `.openspec.yaml`;
  - con `--json`, `metadataPath` es igual a `path.join(getChangesDir(root), 'add-login', '.specagile.yaml')`;
  - con `--store team`, el archivo queda en el store.
- [ ] 2.4 Incluir `CHANGE_METADATA_FILE_NAMES` en `CHANGE_ROOT_MARKERS` de `src/utils/nested-change.ts`. Verificar con un test que detecta como change anidado una carpeta de namespace con un change que solo tiene `.openspec.yaml`, y otra con uno que solo tiene `.specagile.yaml`.
- [ ] 2.5 Adaptar los tests de upstream que fijan el nombre del archivo creado (`test/utils/change-metadata.test.ts`, `test/utils/change-utils.test.ts`, `test/fork/layout-cli.test.ts:77`, `test/commands/artifact-workflow.test.ts` y los demás que la suite marque) para que tomen el nombre de `test/helpers/layout.ts`. Los fixtures que escriben `.openspec.yaml` quedan como están. Verificar que `pnpm exec vitest run test/utils test/commands test/core/archive.test.ts test/fork` pasa, salvo los fallos conocidos de la línea base de Windows.
- [ ] 2.6 Actualizar `docs-lab/reference/configuration/change-metadata.md` con el nombre nuevo, la lectura de `.openspec.yaml`, la precedencia y el aviso para herramientas que leen las claves `x-`. Actualizar también `docs-lab/reference/configuration/index.md`, `docs-lab/reference/cli.md` (`metadataPath` de `new change --json`) y `docs-lab/README.md`. Verificar que `grep -rn "\.openspec\.yaml" docs-lab` solo muestra menciones del nombre anterior o de la migración.

## 3. Mensajes de la CLI

- [ ] 3.1 Reemplazar el literal `.openspec.yaml` en los mensajes de `src/commands/change.ts`, `src/commands/validate.ts`, `src/commands/workflow/instructions.ts:232`, `src/core/artifact-graph/instruction-loader.ts` y `src/core/validation/constants.ts` por `${CHANGE_METADATA_FILE_NAME}`, importado de `src/core/fork/layout.ts`. Verificar:
  - `test/cli-e2e/startup-modules.test.ts` sigue pasando;
  - el escenario "Mensaje de validate": un change con `skip_specs: true` y un spec delta recibe un error que nombra `.specagile.yaml`.
- [ ] 3.2 Adaptar los tests de upstream que fijan el texto de esos mensajes (`test/core/validation.skip-specs.test.ts`, `test/commands/validate.test.ts`, `test/core/artifact-graph/instruction-loader.test.ts`, `test/commands/workflow-instructions-skipped.test.ts` y los que la suite marque) para que tomen el nombre del helper. Verificar que pasan.
- [ ] 3.3 Agregar dos guardas en `test/fork/`. Verificar que pasan con el código actual y que cada una falla sobre una línea fabricada, como hace el caso "catches a path built by hand" de `layout.test.ts`.
  - Una falla si encuentra el literal `.openspec.yaml` en una línea de `src/` que no es comentario, fuera de `src/core/fork/layout.ts`. No revisa las plantillas, que se traducen al generar.
  - Otra limita los usos de `METADATA_FILENAME` en `src/` a una lista explícita de escrituras.
- [ ] 3.4 Documentar las guardas en "When a sync touches the layout" de `FORK.md`, y agregar los archivos de upstream editados en los grupos 2 y 3 a "Upstream files edited for the layout". Verificar que la lista coincide con `git diff --name-only` sobre `src/`.

## 4. Skills y esquema `spec-driven`

- [ ] 4.1 Agregar `[FORMER_CHANGE_METADATA_FILE_NAME, CHANGE_METADATA_FILE_NAME]` a `LAYOUT_TEXT_REPLACEMENTS` y, en `test/fork/identity.test.ts`, mover `.openspec.yaml` de la lista de textos intactos a un caso que verifica su traducción. Verificar que pasan las pruebas de idempotencia y de ida y vuelta (`withUpstreamIdentity`) de `test/fork/identity.test.ts` y `test/core/templates/skill-templates-parity.test.ts`, sin regenerar hashes.
- [ ] 4.2 Ampliar `test/fork/generated-skills-identity.test.ts`. Verificar que pasa después de 4.3:
  - ningún `SKILL.md` generado, para ningún destino, nombra `.openspec.yaml`;
  - `sa-specify` nombra `.specagile.yaml`;
  - ningún archivo de `skills/` nombra `.openspec.yaml`.
- [ ] 4.3 Regenerar la distribución con `pnpm generate:skills`. Verificar que `git diff --stat skills/` solo toca `sa-specify`, `sa-plan`, `sa-propose`, `sa-explore`, `sa-ff-change`, `sa-archive`, `sa-bulk-archive-change` y `sa-sync-specs`, y que cada línea cambiada solo reemplaza `.openspec.yaml` por `.specagile.yaml`.
- [ ] 4.4 Cambiar `.openspec.yaml` por `.specagile.yaml` en `schemas/spec-driven/schema.yaml`, `schemas/spec-driven/templates/proposal.md` y sus citas en `docs-lab/reference/schemas/spec-driven/index.md` y `docs-lab/reference/schemas/schema-yaml.md`. Verificar que `test/core/templates/schema-docs-instruction-parity.test.ts` pasa y que `instructions proposal --json` en un proyecto temporal nombra `.specagile.yaml` (escenario "Instrucciones del esquema").
- [ ] 4.5 Actualizar la identidad documentada:
  - el comentario de `src/core/fork/identity.ts` (lista de archivos internos);
  - "SpecAgile identity" de `FORK.md` (la lista de nombres que se conservan y la descripción de `applyForkIdentity`);
  - `AGENTS.md`: `skip_specs: true` en `.specagile.yaml`, y que los archivos internos que no se renombran son `.openspec-target` y `.openspec-store/`.

  Verificar que `grep -n "openspec.yaml" FORK.md AGENTS.md src/core/fork/identity.ts` solo muestra el nombre anterior en contexto de migración.

## 5. Migración en `update` e `init`

- [ ] 5.1 Exportar `renameWithRetry` de `src/core/fork/layout-migration.ts` y crear `src/core/fork/change-metadata-migration.ts`, con `migrateChangeMetadata(root, ops)` y `describeChangeMetadataMigration(result)` según la tabla del design. Verificar con tests unitarios con ops inyectadas:
  - renombra `.openspec.yaml` cuando falta `.specagile.yaml`;
  - deja los dos cuando existen ambos;
  - ignora `changes/archive/` y las carpetas ocultas;
  - reintenta `EBUSY` y, si persiste, lo informa en `failed` sin lanzar;
  - con `planLayoutOps` no toca el disco;
  - una segunda ejecución no hace nada;
  - las rutas informadas usan `/`.
- [ ] 5.2 Llamar a la migración desde `migrateLayout` de `src/core/update.ts`, después del layout y salvo que el layout quede `blocked`, con notas `layout-migration` en `--dry-run`. Verificar con tests end-to-end los escenarios del requisito "Migración de los metadatos de los changes activos" y de "Simular la migración de los metadatos":
  - un proyecto 4.0.0;
  - el layout anterior y los metadatos en una sola ejecución (escenario "Un change migrado conserva sus metadatos");
  - los archivados intactos;
  - un store migrado con `update` en su carpeta;
  - los dos archivos con aviso y código cero;
  - un archivo bloqueado (simulado con ops), sin error y con el aviso;
  - `--dry-run` sin cambios en el disco.
- [ ] 5.3 Llamar a la migración en `src/core/init.ts`, después del bloque del layout y antes de la rama de skills globales. Verificar con el escenario "Migrar con `specagile init`": `init --tools claude` deja `changes/add-login/.specagile.yaml`.
- [ ] 5.4 Adaptar los tests que esperaban `.openspec.yaml` después de `update` o `init` de punta a punta. Los tests unitarios de `migrateFormerLayout` siguen esperando `.openspec.yaml`, porque mover el layout no renombra. Verificar que `pnpm exec vitest run test/fork test/core/update.test.ts test/core/init.test.ts` pasa, salvo la línea base conocida.
- [ ] 5.5 Documentar la migración:
  - "Project layout → Migration" de `FORK.md`: qué renombra, qué deja y por qué no es todo o nada;
  - `docs-lab/help/move-to-the-specagile-layout.md`;
  - una entrada en "Unreleased → Breaking Changes" de `CHANGELOG.md`, con el nombre nuevo, `specagile update` para migrar, commitear los renombres, compañeros con 4.0.0 o anterior y herramientas que leen `.openspec.yaml`.

  Verificar leyendo las secciones y que `test/fork/fork-docs.test.ts` pasa.

## 6. Verificación integral

- [ ] 6.1 Ejecutar `pnpm build` y `pnpm lint`. Verificar que terminan sin errores.
- [ ] 6.2 Correr en Windows (PowerShell) `pnpm exec vitest run test/fork test/utils test/commands test/core` y después la suite completa. Verificar que los únicos fallos son los de la línea base conocida, y anotarlo en "Verification record" de `FORK.md`.
- [ ] 6.3 Correr la suite completa en Linux (Docker `node:22-bookworm`, checkout con LF). Verificar que no hay fallos y anotarlo en "Verification record" de `FORK.md`.
- [ ] 6.4 Verificar que la CI del PR pasa en la matriz completa: `ubuntu-latest`, `macos-latest` y `windows-latest` con PowerShell (`windows-pwsh`).
- [ ] 6.5 Prueba manual en una carpeta temporal **fuera del repo**, con `node bin/specagile.js` y en PowerShell. Verificar que la salida coincide con los escenarios del spec:
  - `init --tools claude`;
  - `new change add-login` crea `.specagile.yaml`;
  - un change escrito a mano con `.openspec.yaml` y `skip_specs: true` pasa `validate`;
  - `update --dry-run` informa el renombre;
  - `update` lo hace.
- [ ] 6.6 Ejecutar `openspec validate rename-change-metadata-to-specagile --strict` con la CLI de OpenSpec upstream. Verificar que pasa.

## Workflow follow-up

- Archivar `separate-global-folders` antes que este change: los dos modifican el requisito "Los nombres internos y las ubicaciones fuera del proyecto no cambian" de `fork-project-layout`, y este delta parte del texto que deja aquel.
- Commitear la spec (`openspec/changes/rename-change-metadata-to-specagile/`) separada de la implementación, como pide `AGENTS.md`.
- Release, a cargo del mantenedor: elegir la versión (ver Open Questions del design), crear el tag `v<versión>` sobre un commit cuyo `skills/` coincida con el paquete y ejecutar `npm publish`. Un agente no publica.
- Después de archivar, verificar `openspec/specs/fork-project-layout/spec.md` con `openspec validate --specs --strict`.
