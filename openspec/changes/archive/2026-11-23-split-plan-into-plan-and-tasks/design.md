# Design

## Context

`sa-plan` sale de `src/core/templates/workflows/plan.ts` (`getPlanSkillTemplate`, propio del fork). Su paso 2 parte el grafo de artefactos por id: el **conjunto de especificación** (`specs` y lo que requiere, transitivamente) y el **conjunto de planificación** (`applyRequires` y su cierre por `requires`, menos el de especificación). En `spec-driven` eso da `design` y `tasks`, y `plan.ts` los crea en orden de dependencias o propone revisarlos con confirmación.

En `schemas/spec-driven/schema.yaml`, `design` es condicional ("create only if any apply") y `tasks` requiere `specs` y `design`; `apply.requires` es `[tasks]`. Una regla del bucle de artefactos ("dependencies are enablers, not gates") ya permite escribir `tasks` cuando `design` se omitió a propósito.

Un workflow del fork se registra en: `ALL_WORKFLOWS`/`CORE_WORKFLOWS` (`src/core/profiles.ts`), `SKILL_NAME_BY_WORKFLOW` y `TRIGGER_VERBS` (`src/core/fork/identity.ts`), `allSkillTemplates()` (`src/core/shared/skill-generation.ts`), `COMMAND_TO_SKILL_NAME` (`src/utils/command-references.ts`), `WORKFLOW_PROMPT_META` (`src/commands/config.ts`) y `ONBOARDING_COMMANDS` (`src/core/onboarding-commands.ts`). `CURRENT_SKILL_NAMES`, `OPENSPEC_SKILL_NAMES`, `SKILL_NAMES` y `WORKFLOW_TO_SKILL_DIR` se derivan de `SKILL_NAME_BY_WORKFLOW`. `FORMER_SKILL_NAME_BY_WORKFLOW` está tipado como `Record<WorkflowId, string>` y lo indexan por workflow `src/core/fork/former-skills.ts` y dos bloques `SpecAgile:` de `src/core/migration.ts` (líneas ~306 y ~584).

Los skills tienen un único texto sea cual sea el perfil (`test/core/templates/one-text-per-skill.test.ts`): un skill nombra a otro solo "if that skill is installed" o traspasa con "ask me to …".

## Goals / Non-Goals

**Goals:**
- `sa-plan` escribe el diseño y nunca `tasks.md`; `sa-tasks` escribe `tasks.md` y nada más.
- La selección del artefacto de tareas es por id explícito (`tasks`), nunca por nombre de archivo.
- `sa-tasks` en `core`, con el mismo chequeo de especificación completa, la misma comparación de identidad de rutas y las mismas reglas de revisión con confirmación que hoy tiene `sa-plan`.
- Cero diff en plantillas de upstream (`src/core/templates/workflows/` salvo `plan.ts`, `specify.ts` y el nuevo `tasks.ts`, que son del fork).

**Non-Goals:**
- No cambia `sa-propose`, `sa-ff-change`, `sa-continue-change`, `sa-update-change` ni `sa-implement` (`apply-change.ts`).
- No se agrega un esquema nuevo ni se toca `schemas/spec-driven/schema.yaml`.
- `sa-verify` no entra a `core`.
- No se agrega plantilla de comando ni id a `COMMAND_IDS`.

## Decisions

### D1. Tres conjuntos por id: especificación, diseño y tareas
`plan.ts` y `tasks.ts` parten el conjunto de planificación con el id explícito `tasks`:
- **Conjunto de diseño** = conjunto de planificación menos `tasks` (spec-driven: `design`). Lo escribe `sa-plan`.
- **Conjunto de tareas** = `{tasks}` si el esquema define ese id. Lo escribe `sa-tasks`.

Si el esquema no define `tasks`, `sa-plan` conserva el comportamiento actual (escribe todo el conjunto de planificación y traspasa a implementar) y `sa-tasks` se detiene sin escribir. *Alternativa descartada*: "el último artefacto antes de apply" o "el que `apply.tracks` nombra": `tracks` es un nombre de archivo (`tasks.md`) y la regla del proyecto es buscar por id, no por patrón.

### D2. Diseño condicional: `sa-tasks` no exige `design.md`
Decisión del usuario: respetar el esquema. `sa-tasks` verifica, además de la especificación completa, que cada artefacto del conjunto de diseño exista **o** que su `instruction` lo marque condicional (se consulta con `openspec instructions <id> --json`, igual que hoy el paso 6b de `plan.ts`). Si falta uno condicional, escribe `tasks.md` y avisa que no hay diseño (sugiriendo `sa-plan` si está instalado); si falta uno no condicional, se detiene y remite a `sa-plan`. Así no hace falta registrar en el change que el diseño "se omitió a propósito". *Alternativa descartada*: `sa-plan` siempre escribe `design.md` y `sa-tasks` lo exige (estilo Spec Kit): contradice la instrucción condicional del esquema.

### D3. `tasks.ts` como plantilla propia, derivada de `plan.ts`
Nueva `src/core/templates/workflows/tasks.ts` con `getTasksSkillTemplate()` (nombre `openspec-tasks`, que `applyForkIdentity` traduce a `sa-tasks` al generar, como los demás). Copia de `plan.ts` la selección del change, el chequeo de especificación completa (pasos 1–3) y las reglas de revisión con confirmación y conservación de `[x]` (paso 5), y agrega el chequeo de D2 y la lectura de preguntas abiertas de `design.md`. Las constantes de traspaso comunes (`CHANGE_NOT_FOUND`, `SPECIFY_TO_COMPLETE`, `NO_SPECS_SCHEMA_SUGGESTION`) se mueven a un módulo del fork compartido (`src/core/templates/workflows/stage-handoffs.ts`) para no duplicar texto. *Alternativa descartada*: una fábrica parametrizada `getStageSkillTemplate(stage)`: mezcla dos textos en una función y dificulta revisar cada skill contra upstream tras un sync.

### D4. `plan.ts` acotado al conjunto de diseño
- Descripción y límite: "design.md" en lugar de "design.md and tasks.md".
- Paso 2 calcula el conjunto de diseño (D1); "Nothing to plan" pasa a "nada que diseñar → traspasa a tareas".
- Paso 5 revisa solo el conjunto de diseño; si `tasks.md` existe, avisa que puede estar desactualizado y sugiere `sa-tasks` "if that skill is installed".
- Se quita la regla de conservar `[x]` (pasa a `tasks.ts`).
- Traspaso: `TASKS_HANDOFF = 'The design is ready for review. When you’re ready, ask me to write the tasks.'` con `/opsx:tasks` "if that skill is installed", o `openspec instructions tasks --change "<name>" --json`. Si el esquema no tiene `tasks`, conserva `APPLY_HANDOFF`.

### D5. `specify.ts`: aviso de plan desactualizado por etapa
`STALE_PLAN_NOTE` nombra `/opsx:plan` para el diseño y `/opsx:tasks` para las tareas, ambos "if that skill is installed", empezando por el diseño. `PLAN_HANDOFF` no cambia ("ask me to plan it").

### D6. `tasks` sin nombre anterior
`FORMER_SKILL_NAME_BY_WORKFLOW` pasa a `Readonly<Partial<Record<WorkflowId, string>>>` sin entrada `tasks`, y `identity.ts` exporta `formerSkillNames(workflow): readonly string[]` (vacío para `tasks`). `former-skills.ts` ya recorre `Object.keys(...)`, así que no ve `tasks`; los dos bloques `SpecAgile:` de `migration.ts` usan el helper en vez de indexar. `FORMER_SKILL_NAMES` sigue con 14 entradas. *Alternativa descartada*: inventar `openspec-tasks` como nombre anterior: haría que `update` reclamara un skill del usuario con ese nombre si coincidiera con texto generado, y nunca existió en OpenSpec.

### D7. Registro y textos de UI
- `ALL_WORKFLOWS`: `tasks` tras `plan` (15). `CORE_WORKFLOWS`: `propose, explore, specify, plan, tasks, apply, update, sync, archive` (9).
- `SKILL_NAME_BY_WORKFLOW.tasks = 'sa-tasks'`; `TRIGGER_VERBS` suma `tasks`; `COMMAND_TO_SKILL_NAME.tasks = 'openspec-tasks'`.
- `WORKFLOW_PROMPT_META.plan.description`: "Create design from specs"; `tasks`: `{ name: 'Write tasks', description: 'Create tasks from specs and design' }`.
- `ONBOARDING_COMMANDS`: `{ workflow: 'tasks', command: '/opsx:tasks', description: 'Write the tasks' }` tras `plan` (≤ `DESCRIPTION_BUDGET` = 17 columnas). `plan` pasa a "Design a change".
- `allSkillTemplates()`: `{ template: getTasksSkillTemplate(), ...dir('tasks') }` tras `plan`; sin plantilla de comando.

### D8. Distribución y documentación
`pnpm build && pnpm generate:skills` agrega `skills/sa-tasks/SKILL.md` y regenera `skills/sa-plan/SKILL.md` y `skills/sa-specify/SKILL.md`. Docs: `README.md` (bloque de ejemplo de `/sa-plan` y párrafo del flujo largo), `docs-lab/reference/skills.md`, `docs-lab/customize/profiles.md` (core de 9, 15 en total), `docs-lab/start/setup.md`, `FORK.md` (fila `tasks` en "Workflows added by this fork" y en la tabla de nombres con "—" como nombre anterior) y `docs/architecture/` (`skills-flowchart.mermaid`, `architecture-overview.md`; `main-skills-flowchart.mermaid` ya muestra el flujo deseado).

## Risks / Trade-offs

- [Un `sa-plan` editado por el usuario conserva el comportamiento viejo y escribe `tasks.md`] → Igual que hoy con cualquier skill editado: `update` lo conserva y lo informa. Se documenta en el changelog.
- [Usuarios con perfil `custom` cuya lista es el `core` anterior no reciben `sa-tasks`, y su `sa-plan` nuevo ya no escribe tareas] → `sa-plan` traspasa a `openspec instructions tasks …` cuando `sa-tasks` no está instalado, y `sa-implement` sigue pudiendo pedir las tareas. Se menciona en el changelog con `specagile config profile` como remedio.
- [Duplicación de texto entre `plan.ts` y `tasks.ts`] → Las constantes comunes van a `stage-handoffs.ts` (D3), y `FORK.md` pide revisar ambos archivos cuando un sync cambie `propose.ts`, `continue-change.ts` o `update-change.ts`.
- [Hashes de paridad y fingerprints] → `skill-templates-parity.test.ts` necesita hashes nuevos para `sa-plan`, `sa-specify` y `sa-tasks`. `former-release-fingerprints.ts` no cambia: guarda texto de releases anteriores.
- [Plataforma] → `sa-tasks` hereda de `plan.ts` la comparación de identidad de rutas (separador y mayúsculas según plataforma); las rutas en código y tests se arman con `path.join`. Sin comportamiento específico de plataforma nuevo.

## Migration Plan

Sin migración de datos. Tras publicar, `specagile update` en un proyecto con perfil `core` instala `sa-tasks` y reemplaza `sa-plan`. El tag `v<versión>` debe apuntar a un commit cuyo `skills/` incluya `sa-tasks` (lo crea el mantenedor). Revertir es volver a la versión anterior y ejecutar `specagile update`.
