# Design

## Context

Motivación y alcance: ver `proposal.md`. Requisitos: `specs/opsx-specify-skill/spec.md` y `specs/opsx-plan-skill/spec.md`.

Estado actual relevante:

- **Registro de workflows.** `src/core/profiles.ts` define `ALL_WORKFLOWS` (12) y `CORE_WORKFLOWS` (6). Varias tablas indexadas por id de workflow deben tener una entrada por workflow: `WORKFLOW_TO_SKILL_DIR` (`src/core/profile-sync-drift.ts`, tipado `Record<WorkflowId, string>`, así que TypeScript obliga a completarlo), `COMMAND_TO_SKILL_NAME` (`src/utils/command-references.ts`), `OPENSPEC_SKILL_NAMES` (`src/core/config.ts`), `WORKFLOW_PROMPT_META` (`src/commands/config.ts`) y la lista de plantillas en `src/core/shared/skill-generation.ts`.
- **OpenSpec 2.0 instala solo skills.** Las plantillas de comando (`getOpsx*CommandTemplate`) ya no se escriben; solo sirven para reconocer y borrar los archivos de comando que escribieron versiones 1.x (`src/core/shared/command-reconcile.ts`). `COMMAND_IDS` (`src/core/shared/tool-detection.ts`) es la lista explícita de esos 12 ids.
- **Listas legacy derivadas de `ALL_WORKFLOWS`.** `LEGACY_KILOCODE_COMMAND_FILES` (`src/core/legacy-cleanup.ts`) y el recorrido de `classifyCommandFiles` (`command-reconcile.ts`) se calculan a partir de `ALL_WORKFLOWS`. Si `ALL_WORKFLOWS` crece, pasarían a tratar como propios de OpenSpec archivos que OpenSpec nunca escribió (`.kilocode/workflows/opsx-plan.md`, `.claude/commands/opsx/plan.md`).
- **Referencias condicionales.** Las plantillas se escriben con `/opsx:<id>` y `optionalWorkflow()` (`src/core/templates/optional-workflow.ts`) elige en generación la rama según los workflows instalados. Los bloques no se anidan. `test/core/shared/profile-workflow-references.test.ts` falla si un skill generado nombra un workflow no instalado.
- **Esquema `spec-driven`.** Grafo: `proposal` → `specs`; `proposal` → `design`; `specs` + `design` → `tasks`; `apply.requires: [tasks]`. `status` es solo existencia de archivos: un artefacto glob (`specs/**/*.md`) queda `done` con un único archivo.
- **Perfil core dinámico.** El perfil `core` se resuelve siempre a `CORE_WORKFLOWS`, así que `openspec update` instala lo que falte en proyectos con perfil core; los perfiles `custom` solo reciben un aviso de workflows core que les faltan (`update.ts`, `displayMissingCoreWorkflowsNote`).

## Goals / Non-Goals

**Goals:**
- Dos workflows nuevos, solo skill, que dividan el trabajo de `propose` en dos etapas con límites claros y se puedan usar con cualquier esquema que tenga un artefacto `specs`.
- Diffs aditivos sobre archivos de upstream; el texto nuevo vive en archivos propios del fork.
- Que la limpieza legacy y la reconciliación de comandos sigan reconociendo exactamente los mismos archivos que hoy.

**Non-Goals:**
- No se modifica `propose` ni se refactoriza `propose.ts` para compartir texto.
- No se agregan plantillas de comando para `specify`/`plan`.
- No se introduce un campo de "fase" en el formato de esquema (queda para el esquema `three-step`).
- No se cambia la sugerencia "Getting started" de `openspec init`, que sigue nombrando `propose`.

## Decisions

### D1. Ids, nombres de skill y orden

- Ids de workflow: `specify` y `plan`. Directorios de skill: `openspec-specify` y `openspec-plan` (paralelos a `openspec-propose`; decisión del usuario).
- `ALL_WORKFLOWS`: se insertan después de `explore` → `propose, explore, specify, plan, new, continue, apply, update, ff, sync, archive, bulk-archive, verify, onboard` (14). El orden define el del selector de `config profile`.
- `CORE_WORKFLOWS`: `propose, explore, specify, plan, apply, update, sync, archive` (8). Sigue el ciclo de vida explore → specify → plan → apply.
- Frases de activación en la descripción: `"openspec specify"`/`"opsx specify"` y `"openspec plan"`/`"opsx plan"`. No colisionan con comandos de la CLI (no existen `openspec specify` ni `openspec plan`) ni son prefijo de otra frase.

*Alternativa descartada:* `openspec-specify-change`/`openspec-plan-change` (patrón de `apply-change`); el usuario prefirió los nombres cortos.

### D2. Solo plantilla de skill, sin plantilla de comando

Se agrega `SkillTemplate` para cada uno y no `CommandTemplate`. En 2.0 una plantilla de comando solo sirve para que `command-reconcile` reconozca un archivo 1.x como generado por OpenSpec y lo borre. `specify`/`plan` nunca se publicaron como comandos: agregar plantillas haría que un archivo del usuario con el mismo contenido se considerara propio de OpenSpec y se borrara. `getCommandTemplates()` sigue devolviendo 12 entradas.

*Alternativa descartada:* agregar plantillas de comando "por simetría"; amplía lo que OpenSpec se arroga sin beneficio.

### D3. Listas legacy fijadas a los ids publicados (`COMMAND_IDS`)

`COMMAND_IDS` ya es la lista explícita de los 12 workflows que tuvieron archivo de comando. Se usa en lugar de `ALL_WORKFLOWS` donde la pregunta es "¿qué escribió OpenSpec antes?":

- `src/core/legacy-cleanup.ts`: `LEGACY_KILOCODE_COMMAND_FILES` pasa a `COMMAND_IDS.map(...)`.
- `src/core/shared/command-reconcile.ts`: `classifyCommandFiles` recorre `COMMAND_IDS` y usa `COMMAND_IDS` como conjunto candidato completo.
- `test/upgrade-to-2-docs-claims.test.ts`: la tabla "comando 1.x → skill 2.0" se verifica para `COMMAND_IDS`, porque `/opsx:specify` y `/opsx:plan` no existieron en 1.x.

Se mantienen sobre `ALL_WORKFLOWS` los usos que preguntan "¿qué puede escribir esta versión?" (`released-output-sweep.ts`, `migration.ts`, `profile-sync-drift.ts`, `shared-skill-install.ts`), porque los skills nuevos sí son salida actual.

`COMMAND_IDS` queda documentado como congelado (comentario) y un test fija que no incluye `specify` ni `plan`. Se verifica que `legacy-cleanup.ts` y `command-reconcile.ts` puedan importar de `tool-detection.ts` sin ciclo (hoy ningún módulo alcanzable desde `tool-detection.ts` importa `legacy-cleanup.ts`).

*Alternativa descartada:* constante nueva `RELEASED_COMMAND_WORKFLOWS`; duplica `COMMAND_IDS` (regla del proyecto: reutilizar constantes existentes).

### D4. Texto de las plantillas en módulos propios del fork

Archivos nuevos `src/core/templates/workflows/specify.ts` (`getSpecifySkillTemplate`) y `src/core/templates/workflows/plan.ts` (`getPlanSkillTemplate`), exportados desde `skill-templates.ts`. Reutilizan `STORE_SELECTION_GUIDANCE`, `PROJECT_ROOT_GUARD` y `optionalWorkflow`. El texto de carga de contexto, selección de esquema y bucle de creación de artefactos se adapta de `propose.ts` (specify) y `continue-change.ts`/`update-change.ts` (selección de change y confirmación antes de escribir, en plan), sin modificar esos archivos.

*Alternativa descartada:* parametrizar `getOpsxProposeSkillTemplate(subset)` o extraer bloques compartidos de `propose.ts`. Evita duplicación, pero reescribe un archivo de upstream que cambia seguido y garantiza conflictos en cada sync.

### D5. Regla de partición por id explícito, válida para cualquier esquema

Las plantillas no enumeran `proposal/specs/design/tasks`; describen la partición a partir de `openspec status --json`:

- **Conjunto de especificación** = el artefacto con id `specs` más todos sus `requires`, transitivamente (`spec-driven`: `proposal`, `specs`).
- **Conjunto de planificación** = el cierre de `applyRequires` siguiendo `requires`, menos el conjunto de especificación (`spec-driven`: `design`, `tasks`).
- Si el esquema no tiene un artefacto `specs`, ambos skills se detienen sin escribir (ver specs, "Esquema sin artefacto de specs").
- Si el esquema no declara `apply`, el CLI toma todos sus artefactos como `applyRequires` (`src/core/artifact-graph/instruction-loader.ts:480`), así que un esquema sin `tasks` igual tiene conjunto de planificación: el resto de sus artefactos. Los artefactos fuera del cierre de `applyRequires` no los toca ningún skill, igual que en `propose`.
- Si el conjunto de planificación queda vacío (por ejemplo `apply.requires: [specs]`), `plan` no escribe y traspasa a apply.

Es una búsqueda explícita por id (regla del proyecto: nada de detección por patrones) y funciona con esquemas personalizados que agreguen artefactos intermedios.

*Alternativas descartadas:* ids fijos en el texto (se rompe con esquemas propios); campo `phase` por artefacto en `schema.yaml` (cambia el formato de esquema y diverge de upstream; se evalúa en el change del esquema `three-step`).

### D6. "Especificación completa" en `plan`

Como `status` es solo existencia, `plan` no confía en que `specs` esté `done`. La plantilla le pide al agente:

1. `proposal` en `done`.
2. `specs` en `skipped`, **o** un `specs/<capability-path>/spec.md` por cada capacidad listada en la sección Capabilities de la proposal, con cada ruta resuelta contra `changeRoot` y verificada dentro de `changeRoot` tras resolver symlinks (mismo criterio que `PARTIAL_ARTIFACT_CHECK` de `continue-change.ts`, reescrito en el módulo nuevo porque esa constante no se exporta).
3. Ningún archivo de `artifactPaths.specs.existingOutputPaths` corresponde a una capacidad que la proposal no lista (spec huérfano).
4. Si algo falla, detenerse sin escribir y remitir a `/opsx:specify` (condicional, D8).

**Comparación de rutas.** La proposal escribe las capacidades con `/` y `status --json` devuelve rutas absolutas con el separador de la plataforma (en Windows, `\`). La plantilla le pide al agente comparar la *identidad* de la ruta resuelta contra `changeRoot`, no el texto: en Windows `\` y `/` son equivalentes y no se distinguen mayúsculas; en Linux sí se distinguen. Es la misma regla que ya usa `continue-change.ts` ("resolve each expected path against `changeRoot` before comparing path identity"), ahora explícita para el caso de Windows.

### D6b. Colisiones y casos sin trabajo en `specify`

- **Nombre derivado que ya existe**: mismo guardrail que `propose`. Antes de `openspec new change`, si el nombre derivado de una descripción coincide con un change activo, se pregunta si continuar ese change (modo edición) o crear otro con un nombre alternativo. Nombrar un change existente de forma explícita entra directo en modo edición.
- **Especificación completa sin pedido de cambios**: no se escribe nada. Se resume el estado y se pregunta qué revisar. Se descarta hacer una revisión de coherencia automática: ese es el trabajo de `/opsx:update`, y duplicarlo haría que `specify` escriba sin que se le pida.
- **Capacidad quitada o renombrada**: la revisión de la proposal incluye borrar o mover el spec delta afectado, con la misma confirmación. Si no, el spec huérfano llegaría al archivo y `plan` se negaría a planificar (D6, punto 3).

### D7. Re-planificación con confirmación

Cuando ya existen artefactos del conjunto de planificación, `plan` sigue el patrón de `update-change`: lee proposal, specs y los artefactos de plan desde disco, propone cada revisión con su motivo y escribe solo tras confirmación; los que faltan se crean sin preguntar. En `tasks.md` conserva las casillas `[x]` salvo confirmación explícita de quitarlas. `specify`, al revisar artefactos existentes, usa la misma regla de confirmar antes de escribir y nunca toca el conjunto de planificación.

### D8. Traspasos y referencias condicionales

Todas las menciones a otros workflows usan `optionalWorkflow()` con un bloque por workflow (sin anidar), con la CLI como alternativa:

| Skill | Workflow nombrado | Rama sin instalar |
|---|---|---|
| specify | `plan` (traspaso y aviso de plan desactualizado) | `openspec instructions <artifact-id> --change "<name>"` / se omite el aviso |
| specify, plan | `propose` (esquema sin `specs`) | `openspec instructions <artifact-id> --change "<name>"` |
| plan | `specify` (especificación incompleta, change inexistente) | se nombra la etapa sin workflow / `openspec new change "<name>"` |
| plan | `apply` (traspaso) | `openspec instructions apply --change "<name>" --json` |

Con `k` workflows condicionales por skill, `everySkillRendering` genera 2^k variantes (k ≤ 3 aquí).

### D9. Superficies de descubrimiento

- `WORKFLOW_PROMPT_META`: `specify` → "Specify change" / "Create or edit proposal and specs"; `plan` → "Plan change" / "Create design and tasks from specs".
- `ONBOARDING_COMMANDS` (`src/core/onboarding-commands.ts`): se agregan después de `propose`, con descripciones dentro de `DESCRIPTION_BUDGET` (17): "Specify a change" (16) y "Plan a change" (13).
- `skills/` (skills.sh): se regenera con `pnpm build && pnpm generate:skills`; `skillssh-parity.test.ts` lo verifica.
- Docs en `docs-lab/` (sin `/opsx:` fuera de páginas 1.x, que exige `upgrade-to-2-docs-claims.test.ts`): `reference/skills.md` (dos entradas Core), `customize/profiles.md` (ocho core, catorce en total), `start/setup.md` (sección core, que verifica `setup-docs-claims.test.ts`).
- `FORK.md`: nueva sección con los workflows propios del fork y la nota de que `specify.ts`/`plan.ts` derivan de `propose.ts`/`continue-change.ts`/`update-change.ts` y deben revisarse cuando un sync cambie esos archivos.

## Risks / Trade-offs

- **Conflictos al sincronizar en las listas de workflows** (`profiles.ts`, mapas, tests de inventario) cuando upstream agregue o reordene workflows → inserciones de una línea en posiciones estables; `git rerere` (ya recomendado en `FORK.md`).
- **Deriva del texto** respecto de mejoras de upstream en `propose.ts`/`continue-change.ts` → nota en `FORK.md` (D9) y revisión manual en cada sync que toque esos archivos.
- **El agente confunde `propose` con `specify`** por sus descripciones parecidas → descripciones que nombran explícitamente qué artefactos genera cada uno y dónde se detiene; frases de activación distintas.
- **Usuarios con perfil core reciben dos skills nuevos en `openspec update`** → comportamiento buscado; queda en las notas de versión del fork.
- **Regenerar `released-generated-fingerprints`**: no hace falta; los skills nuevos nunca se publicaron, así que no hay huellas antiguas que reconocer.
- **Windows**: los skills nuevos usan el mecanismo existente de `.agents/skills/` con enlaces (o copia donde no se puede enlazar); no se agrega lógica de rutas propia. Los tests que comparan rutas usan `path.join`. Se verifica la suite acotada en Windows y en WSL2/Linux.

## Migration Plan

- Sin migración de datos. Proyectos con perfil core reciben `openspec-specify` y `openspec-plan` al ejecutar `openspec update`; perfiles custom no cambian.
- Rollback: revertir los commits de implementación. Un proyecto que ya recibió los skills los conserva; una CLI sin este cambio no los reconoce como propios (no están en `OPENSPEC_SKILL_NAMES`), así que no los borra ni los actualiza, y el usuario puede eliminarlos a mano.
