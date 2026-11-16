# Proposal

## Why

Hoy la única forma de planificar un change de una sola vez es `/opsx:propose`, que genera en el mismo paso la especificación (`proposal.md`, `specs/`) y el plan técnico (`design.md`, `tasks.md`). SpecAgile quiere un flujo en tres etapas (especificar → planificar → implementar) en el que el equipo pueda revisar y acordar *qué* se construye antes de invertir en *cómo*: hoy, para frenar entre las dos etapas, hay que usar `/opsx:new` + `/opsx:continue` artefacto por artefacto o interrumpir a mano a `propose`.

## What Changes

- Nuevo workflow **`specify`** (skill `openspec-specify`, referenciado como `/opsx:specify` en las plantillas): crea un change nuevo y genera `proposal.md` y los `specs/` delta, o edita esos mismos artefactos en un change existente. Se detiene antes de `design.md` y `tasks.md` y entrega el turno a `/opsx:plan`.
- Nuevo workflow **`plan`** (skill `openspec-plan`, referenciado como `/opsx:plan`): sobre un change ya especificado, genera `design.md` y `tasks.md`. Si ya existen, los revisa contra la proposal y las specs actuales y escribe solo tras confirmación del usuario. Si la especificación está incompleta, se detiene y remite a `/opsx:specify`. Entrega el turno a `/opsx:apply`.
- `/opsx:propose` se conserva sin cambios de comportamiento: sigue siendo el atajo de un solo paso.
- Ambos workflows pasan a formar parte del perfil **`core`**: `openspec init` los instala por defecto y `openspec update` los agrega en proyectos que usan el perfil `core`. El perfil `core` pasa de seis a ocho workflows (`propose`, `explore`, `specify`, `plan`, `apply`, `update`, `sync`, `archive`).
- Ambos aparecen en el selector de `openspec config profile`, en las sugerencias de inicio de `openspec init` y en la distribución estática de skills (`skills/`).
- La limpieza de archivos legacy y de comandos antiguos sigue reconociendo exactamente los mismos archivos que hoy: agregar `specify` y `plan` no hace que OpenSpec trate como propios archivos de usuario con esos nombres (por ejemplo `.kilocode/workflows/opsx-plan.md`).
- Documentación de usuario (`docs-lab/`) actualizada con los dos skills y el flujo de tres etapas.

Fuera de alcance (quedan para changes posteriores del fork): el esquema `three-step`, el skill `implement`, la generación de `.feature` y `archive --skip-specs`.

## Capabilities

### New Capabilities
- `opsx-specify-skill`: el workflow `/opsx:specify` — cómo crea o edita la especificación de un change (proposal y specs delta), dónde se detiene, cómo se instala y a qué workflow entrega el turno.
- `opsx-plan-skill`: el workflow `/opsx:plan` — cómo genera o revisa el plan técnico (design y tasks) de un change ya especificado, qué exige de la especificación, cómo se instala y a qué workflow entrega el turno.

### Modified Capabilities
<!-- Ninguna. `propose`, `update`, `init` y `config profile` mantienen sus contratos; la pertenencia de los nuevos workflows al perfil core se especifica en las capacidades nuevas para no editar specs de upstream (minimiza conflictos al sincronizar). -->

## Impact

- **Código** (`src/`): registro de workflows y perfiles (`src/core/profiles.ts`), mapas workflow→skill (`src/core/profile-sync-drift.ts`, `src/core/init.ts`, `src/utils/command-references.ts`, `src/core/config.ts`), metadatos del selector (`src/commands/config.ts`), sugerencias de onboarding (`src/core/onboarding-commands.ts`), plantillas nuevas en `src/core/templates/workflows/`, registro de plantillas (`src/core/templates/skill-templates.ts`, `src/core/shared/skill-generation.ts`), listas legacy (`src/core/legacy-cleanup.ts`, `src/core/shared/command-reconcile.ts`).
- **Distribución**: dos `SKILL.md` nuevos en `skills/` (regenerados con `pnpm generate:skills`).
- **Tests**: los que fijan el inventario (12 workflows / 6 core) y los de paridad de docs y skills.sh.
- **Docs**: `docs-lab/reference/skills.md`, `docs-lab/customize/profiles.md`, guías que describen el flujo.
- **Upstream**: diffs aditivos y pequeños en archivos de upstream; cada sincronización puede chocar en las listas de workflows si upstream agrega uno nuevo.
- **Usuarios existentes con perfil `core`**: al ejecutar `openspec update` reciben los dos skills nuevos. Los de perfil `custom` no ven cambios hasta que los seleccionen.
