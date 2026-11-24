# Proposal

## Why

Hoy `sa-plan` hace dos cosas: escribe el diseño técnico (`design.md`) y la lista de tareas (`tasks.md`). Separarlas da a cada skill una sola responsabilidad y permite revisar el diseño antes de que exista el plan de trabajo. Además alinea el flujo largo de SpecAgile con el de Spec Kit (`specify` → `plan` → `tasks` → `implement`), de modo que quien compara ambas herramientas encuentra una forma de trabajo equivalente.

## What Changes

- **BREAKING (comportamiento)**: `sa-plan` pasa a escribir o revisar solo los artefactos de planificación que no son la lista de tareas (en `spec-driven`, `design.md`). Ya no crea ni revisa `tasks.md`; al terminar remite a la etapa de tareas.
- Nuevo skill `sa-tasks` (workflow `tasks`): sobre un change con la especificación completa, crea o revisa `tasks.md` a partir de la proposal, los specs delta y el diseño, y deja el change listo para implementar.
  - Respeta el esquema: `design.md` es condicional en `spec-driven`, así que `sa-plan` puede omitirlo y `sa-tasks` escribe `tasks.md` aunque no exista diseño, avisando que no lo hay y sugiriendo `sa-plan` si el change lo necesita.
  - Si `tasks.md` ya existe, propone cada revisión con su motivo y la escribe solo tras confirmación, conservando las tareas completadas.
- `sa-tasks` forma parte del perfil `core` (pasa de 8 a 9 skills; 15 workflows en total), aparece en el selector de `specagile config profile` y en las sugerencias de inicio entre `sa-plan` y `sa-implement`.
- `sa-specify` distingue, al avisar que el plan quedó desactualizado, entre el diseño (revisarlo con `sa-plan`) y las tareas (revisarlas con `sa-tasks`). `sa-plan` avisa lo mismo sobre `tasks.md` cuando revisa un diseño que ya tiene tareas.
- El flujo largo queda: `sa-explore` → `sa-specify` → `sa-plan` → `sa-tasks` → `sa-implement` → (`sa-verify` opcional) → `sa-archive`. El flujo corto (`sa-propose` → `sa-implement` → `sa-archive`) no cambia: `sa-propose` sigue generando todos los artefactos en un paso.
- Documentación (README, `docs-lab`, `FORK.md`, diagramas de arquitectura) actualizada al flujo de cuatro etapas.

Suposiciones registradas:
- `sa-verify` sigue fuera del perfil `core`; el diagrama lo muestra como verificación opcional.
- `sa-propose`, `sa-ff-change`, `sa-continue-change` y `sa-update-change` no cambian.
- `tasks` es un workflow del fork sin nombre anterior `openspec-*`: la lista de nombres anteriores sigue con catorce entradas.

## Capabilities

### New Capabilities
- `opsx-tasks-skill`: el skill `sa-tasks`, etapa que crea o revisa la lista de tareas de un change especificado (y, si corresponde, diseñado) y lo deja listo para implementar.

### Modified Capabilities
- `opsx-plan-skill`: `sa-plan` deja de crear y revisar `tasks.md`; escribe solo los artefactos de planificación previos a las tareas y remite a la etapa de tareas.
- `opsx-specify-skill`: el aviso de plan desactualizado y la sugerencia de siguiente paso distinguen diseño (`sa-plan`) y tareas (`sa-tasks`).
- `fork-skill-names`: la tabla de nombres suma `tasks`→`sa-tasks`, la frase de activación `specagile tasks`, y las sugerencias y skills del perfil `core` incluyen `sa-tasks`.
- `fork-global-folders`: la lista exhaustiva de skills que instala el perfil `core` incluye `sa-tasks`.

## Impact

- Plantillas: `src/core/templates/workflows/plan.ts` (acotado al diseño) y una nueva `src/core/templates/workflows/tasks.ts`, exportada desde `src/core/templates/skill-templates.ts`. `specify.ts` ajusta su aviso de plan desactualizado.
- Registro del workflow: `src/core/profiles.ts` (`ALL_WORKFLOWS`, `CORE_WORKFLOWS`), `src/core/fork/identity.ts` (`SKILL_NAME_BY_WORKFLOW`, `TRIGGER_VERBS`; sin entrada en los nombres anteriores), `src/core/shared/skill-generation.ts`, `src/utils/command-references.ts`, `src/commands/config.ts` (`WORKFLOW_PROMPT_META`), `src/core/onboarding-commands.ts`. `COMMAND_IDS` no cambia (sin plantilla de comando).
- Distribución estática: nueva carpeta `skills/sa-tasks/` y `skills/sa-plan/SKILL.md` regenerado; el tag de release debe apuntar a un commit con ese `skills/`.
- Tests que fijan el inventario de workflows y los textos de skills (perfiles, generación, paridad de hashes, onboarding, identidad del fork, init/update).
- Docs: `README.md`, `docs-lab/reference/skills.md`, `docs-lab/customize/profiles.md`, `docs-lab/start/setup.md`, `FORK.md` ("Workflows added by this fork"), `docs/architecture/`.
- Usuarios existentes: tras `specagile update` con el perfil `core` reciben `sa-tasks` y el `sa-plan` nuevo; un `sa-plan` que el usuario editó se conserva como hoy.
