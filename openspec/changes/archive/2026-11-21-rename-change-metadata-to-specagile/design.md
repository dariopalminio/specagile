# Design

## Context

Ver `proposal.md` (Why) y el delta de `fork-project-layout` para el comportamiento. Estado actual del código:

- **Una constante para leer y escribir.** `METADATA_FILENAME = '.openspec.yaml'` (`src/utils/change-metadata.ts:14`) la usan `writeChangeMetadata`, `readChangeMetadata`, `readUnknownChangeMetadataKeys` y `readBooleanMarker` (`skip_specs`, `retire_capabilities`). También la usan la autorización de retiro de `src/core/archive.ts` (líneas 1005 y 1678), la ruta de los issues de `src/core/validation/validator.ts`, el aviso de `src/commands/workflow/instructions.ts:510` y los marcadores de `src/utils/nested-change.ts`. El nombre solo está escrito a mano en `metadataPath` de `src/commands/workflow/new-change.ts:188`.
- **Mensajes con el literal.** `src/commands/change.ts` (595-599), `src/commands/validate.ts` (418-422), `src/commands/workflow/instructions.ts:232`, `src/core/artifact-graph/instruction-loader.ts` (135-136) y `src/core/validation/constants.ts` (39, 41, 43 y 61).
- **Texto de los skills.** Ocho plantillas de upstream nombran `.openspec.yaml`. El texto generado pasa por `applyForkIdentity` → `applyLayoutText`, que aplica `LAYOUT_TEXT_REPLACEMENTS` (`src/core/fork/layout.ts`). `test/helpers/fork-identity.ts` deshace esa misma tabla, y los hashes de `test/core/templates/skill-templates-parity.test.ts` se comparan a través de ese inverso. El texto del agente de Copilot (`src/core/github-copilot/`) no nombra `.openspec.yaml`.
- **Migración del layout.** `migrateFormerLayout` (`src/core/fork/layout-migration.ts`) corre en `init` (solo si `detectFormerLayout`) y en `update` (`migrateLayout`, una vez por ejecución). En `--dry-run` se planifica sobre el recorder con `planLayoutOps`, con la nota `layout-migration`. Mueve todo o nada, y reintenta `EPERM`, `EBUSY` y `EACCES` en Windows.
- `src/core/fork/layout.ts` solo importa módulos `node:` (lo carga el arranque de la CLI; `test/cli-e2e/startup-modules.test.ts`).
- El esquema `spec-driven` (`schemas/spec-driven/schema.yaml`, `templates/proposal.md`) ya se edita directamente en el fork.

## Goals / Non-Goals

**Goals:**

- Un solo lugar para los dos nombres y una sola función que decide qué archivo tiene un change.
- La lectura del nombre anterior se resuelve en la capa más baja, así todos los lectores la heredan sin tocarlos uno por uno.
- Una migración idempotente, que busca el nombre exacto y no falla la ejecución.
- Pocas líneas de upstream editadas, y una guarda que detecte las que traiga una sync.

**Non-Goals:**

- Renombrar los metadatos de los changes archivados.
- Que los mensajes nombren `.openspec.yaml` cuando el change todavía lo tiene.
- Un chequeo nuevo en `specagile doctor` o un aviso en cada comando que lee un change sin migrar.
- Renombrar `.openspec-store/` o `.openspec-target`, o editar las specs heredadas de upstream.

## Decisions

### 1. Los nombres y la resolución viven en `src/core/fork/layout.ts`

Se agregan:

- `CHANGE_METADATA_FILE_NAME = '.specagile.yaml'`.
- `FORMER_CHANGE_METADATA_FILE_NAME = '.openspec.yaml'`, solo para leer, detectar y migrar.
- `CHANGE_METADATA_FILE_NAMES`, los dos en orden de lectura.
- `getChangeMetadataFile(changeDir)`: con `path.join`, la ruta del primero de esa lista que existe en la carpeta del change. Si no existe ninguno, la del nombre actual, que es donde se escribe y la que nombran los errores.

Es el archivo del fork que AGENTS.md declara fuente única del layout. Una sync no conflictúa ahí, y solo usa `node:`.

Alternativas descartadas: dejar los nombres en `change-metadata.ts` (archivo de upstream: más conflictos), o en `identity.ts` (ahí están los nombres de la CLI y los skills; el archivo de metadatos es parte del layout, igual que `specagile/config.yaml`).

**La precedencia se decide por existencia, no por validez.** Un `.specagile.yaml` inválido o ilegible no cae a `.openspec.yaml`: falla como hoy falla un `.openspec.yaml` inválido. Así se respeta el contrato de "fail closed" de `readBooleanMarker`. Un archivo viejo nunca autoriza un `retire_capabilities` que el archivo vigente no declara de forma válida.

### 2. `METADATA_FILENAME` conserva su nombre y lee del layout

`METADATA_FILENAME` toma el valor de `CHANGE_METADATA_FILE_NAME`, como `OPENSPEC_DIR_NAME` ya toma el suyo del layout.

- **Lecturas.** Cada `path.join(changeDir, METADATA_FILENAME)` de una lectura pasa a `getChangeMetadataFile(changeDir)`: `readUnknownChangeMetadataKeys`, `readChangeMetadata`, `readBooleanMarker`, los dos usos de `archive.ts` y `instructions.ts:510`.
- **Escrituras.** `writeChangeMetadata` (solo para changes nuevos) sigue escribiendo `path.join(changeDir, METADATA_FILENAME)`. `new-change.ts:188` usa la misma expresión en lugar del literal.
- **Marcadores de cambios anidados.** `CHANGE_ROOT_MARKERS` (`nested-change.ts`) incluye `CHANGE_METADATA_FILE_NAMES`, así una carpeta de namespace con un change sin migrar se sigue detectando.
- **Archive.** La autorización de retiro toma la huella del contenido al empezar y la compara antes de borrar. Las dos lecturas resuelven el archivo con la misma función. Si alguien lo renombra a mano en el medio, el contenido no cambia y la huella tampoco.

### 3. Los mensajes importan el nombre desde `layout.ts`

Los literales de los cinco archivos de mensajes pasan a `${CHANGE_METADATA_FILE_NAME}`, importado de `src/core/fork/layout.ts`, no de `change-metadata.ts`. Importar `change-metadata.ts` desde `validation/constants.ts` arrastraría `yaml`, `zod` y el resolver de esquemas a módulos que hoy no los cargan, y `startup-modules.test.ts` lo detecta. Un renombre futuro cambia una sola línea.

Alternativa descartada: nombrar en cada mensaje el archivo que el change tiene de verdad. Los mensajes de `validation/constants.ts` son textos fijos: habría que convertirlos en funciones, con más líneas de upstream editadas. Además, la situación dura hasta el siguiente `specagile update`.

### 4. Los skills se traducen con una entrada más en `LAYOUT_TEXT_REPLACEMENTS`

Se agrega la entrada `[FORMER_CHANGE_METADATA_FILE_NAME, CHANGE_METADATA_FILE_NAME]`. Cumple las reglas de la tabla:

- `.specagile.yaml` no aparece en ningún texto de upstream, así que el inverso de `test/helpers/fork-identity.ts` es exacto sin editarlo.
- No es subcadena de otra entrada, y `.openspec-store/` y `.openspec-target` no contienen `.openspec.yaml`.

Consecuencias:

- **Parity.** Los hashes de parity si cambian, porque comparan a través del inverso.
- **Skills anteriores.** `former-skills.ts` compara `applyForkIdentity(contenido)`, así que un skill escrito por OpenSpec o por SpecAgile 4.0.0 se sigue reconociendo como salida propia.
- **Test de identidad.** En `test/fork/identity.test.ts`, `.openspec.yaml` sale de la lista de textos intactos y pasa a un caso que verifica la traducción.
- **Distribución.** `skills/` se regenera con `pnpm generate:skills`. El diff esperado es solo `.openspec.yaml` → `.specagile.yaml` en los ocho skills que lo nombran.

### 5. La migración va en un módulo nuevo del fork: `src/core/fork/change-metadata-migration.ts`

`migrateChangeMetadata(root, ops)` recorre las carpetas directamente bajo `getChangesDir(root)`. Usa la misma regla que `getActiveChangeIds`: deja afuera `ARCHIVE_DIR_NAME` y las carpetas ocultas. En cada change busca los nombres exactos de la lista, nunca un patrón:

| `.openspec.yaml` | `.specagile.yaml` | Acción |
|---|---|---|
| archivo | no existe | renombrar (con reintentos) → `renamed` |
| archivo | existe | no tocar → `kept` (aviso) |
| no existe | cualquiera | nada |
| el renombre falla tras los reintentos | | no tocar → `failed` (aviso con el archivo y "ciérralo y vuelve a ejecutar `specagile update`") |

- **Infraestructura.** Reutiliza `LayoutMigrationOps`, `DISK_LAYOUT_OPS` y `planLayoutOps`, y la lógica de reintento de `layout-migration.ts` (se exporta `renameWithRetry`). Así `--dry-run` planifica cada renombre en el recorder con la misma nota `layout-migration`, sin un código nuevo en `update-plan.ts`.
- **Salida.** `describeChangeMetadataMigration(result)` devuelve las líneas a imprimir: `Renamed <de> → <a>` con rutas relativas y `/`, los avisos de `kept` y `failed`, y un recordatorio de commitear los renombres.
- **No es todo o nada.** A diferencia del layout, un change a medio migrar sigue funcionando gracias a la lectura del nombre anterior. Por eso un renombre que falla se informa y la ejecución sigue, sin cambiar el código de salida.
- **Dónde corre.**
  - `update`: dentro de `migrateLayout`, después del layout (salvo que el layout quede `blocked`). Respeta la misma marca de una vez por ejecución.
  - `init`: después del bloque del layout, antes de la rama de skills globales.
  - La raíz es la carpeta sobre la que corren `update` o `init`, que puede ser la de un store. Un proyecto que apunta a un store (`store:` en la config) no tiene `changes/` propio, así que la migración no hace nada ahí.

### 6. Guardas en `test/fork/`

- **Literales.** Un test recorre `src/` (sin las plantillas, que se traducen al generar) y falla si encuentra el literal `.openspec.yaml` en una línea que no es comentario, fuera de `src/core/fork/layout.ts`. Sigue el patrón de `cli-name.test.ts`.
- **Usos de la constante.** Un test lista cada uso de `METADATA_FILENAME` en `src/` contra una lista explícita de los permitidos (las escrituras). Así una lectura nueva de upstream con `path.join(changeDir, METADATA_FILENAME)`, que ignoraría los changes sin migrar, aparece en la sync en lugar de pasar en silencio.
- **Texto generado.** `generated-skills-identity.test.ts` comprueba que ningún skill generado ni ningún archivo de `skills/` nombra `.openspec.yaml`.

### 7. Tests existentes

Los tests de upstream que escriben `.openspec.yaml` como fixture no se tocan: pasan por la lectura del nombre anterior. Los que verifican el archivo creado o el texto de un mensaje toman el nombre de `test/helpers/layout.ts`, que reexporta `CHANGE_METADATA_FILE_NAME`. Entre ellos están `test/utils/change-metadata.test.ts`, `test/utils/change-utils.test.ts`, `test/fork/layout-cli.test.ts`, `test/commands/artifact-workflow.test.ts` y las aserciones de mensajes de `skip_specs`. La lista completa sale de correr la suite. El camino principal (`.specagile.yaml`) lo cubren tests nuevos del fork.

## Comportamiento por plataforma

- **`rename` reemplaza el destino.** Tanto en Windows (MoveFileEx con REPLACE_EXISTING) como en POSIX, `fs.rename` sobre un destino existente lo reemplaza. Por eso la migración comprueba que `.specagile.yaml` no existe antes de renombrar. La ventana de carrera entre esa comprobación y el renombre se acepta: `update` no corre en paralelo sobre la misma raíz.
- **Bloqueos en Windows.** Un antivirus o el indexador puede tener el archivo abierto un instante: se reintenta `EPERM`, `EBUSY` y `EACCES` con los mismos tiempos que el layout. Si sigue bloqueado, el archivo queda y se informa.
- **Separadores.** La salida nombra las rutas relativas con `/` en todas las plataformas, como la migración del layout. `metadataPath` de `new change --json` es una ruta absoluta armada con `path.join`, con el separador de la plataforma.
- **Mayúsculas.** En sistemas de archivos que no distinguen mayúsculas (Windows y macOS por defecto), los dos nombres difieren en algo más que mayúsculas, así que no chocan.

## Risks / Trade-offs

- **Un compañero con SpecAgile 4.0.0 o anterior** no lee `.specagile.yaml`: para su CLI, esos changes no tienen metadatos (esquema por defecto, sin `skip_specs` ni `retire_capabilities`) → se avisa como cambio incompatible en `CHANGELOG.md` y se pide actualizar a todo el equipo. Esto no se puede corregir en versiones ya publicadas.
- **Herramientas que leen `.openspec.yaml`** (por ejemplo, las claves `x-`) dejan de encontrar los metadatos en los changes nuevos → se documenta en `CHANGELOG.md` y en `docs-lab/reference/configuration/change-metadata.md`.
- **Mensajes con `.specagile.yaml` en un change sin migrar** → dura hasta el siguiente `specagile update`. Las notas de la release lo piden.
- **Un `.specagile.yaml` inválido junto a un `.openspec.yaml` válido** → no hay respaldo, a propósito (decisión 1). `validate` informa el error y nombra `.specagile.yaml`.
- **Conflictos en una sync** (unas diez líneas en ocho archivos de upstream) → `FORK.md` las lista, y las guardas de la decisión 6 detectan un literal o un lector nuevo.
- **Orden de archivo con `separate-global-folders`** → los dos cambian el requisito "Los nombres internos y las ubicaciones fuera del proyecto no cambian". Hay que archivar `separate-global-folders` antes; este delta parte de su texto.

## Migration Plan

1. Archivar `separate-global-folders` con la CLI de OpenSpec upstream.
2. Implementar, regenerar `skills/`, actualizar docs y correr la suite en Windows y en Linux. Anotar el resultado en "Verification record" de `FORK.md`.
3. Release (lo hace el mantenedor): versión nueva y tag `v<versión>` sobre un commit cuyo `skills/` coincida con el paquete.
4. Cada usuario: `npm install -g specagile@latest`, `specagile update` en cada proyecto y en cada store, y commitear los renombres.

**Rollback:** una versión anterior de SpecAgile ignora `.specagile.yaml`. Para volver atrás hay que renombrar a mano `.specagile.yaml` → `.openspec.yaml` en los changes activos. Los changes creados con la versión nueva no tienen otra cosa.

## Open Questions

- **Versión de la release:** mayor o menor. Este cambio es incompatible para equipos con versiones mezcladas y para herramientas externas. La decide el mantenedor al publicar, y no cambia las specs ni las tareas.
