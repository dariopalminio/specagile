# Proposal

## Why

El nombre `sa-verify`, heredado de `/opsx:verify` de upstream, hace pensar en tests unitarios, QA o validar código en ejecución. El skill hace otra cosa: una auditoría estática y de solo lectura que contrasta el código con los artefactos del change (specs, tasks, design) y reporta hallazgos CRITICAL, WARNING y SUGGESTION sin corregir nada ni bloquear. En el flujo de SpecAgile, con gates de calidad y fronteras estrictas, ese paso responde una pregunta concreta antes de abrir el PR: ¿el change cumple su Definition of Done y no hay deriva (drift) entre la spec y el código? `sa-audit` nombra exactamente eso.

## What Changes

- **BREAKING**: el workflow `verify` se instala como el skill `sa-audit` en lugar de `sa-verify`: carpeta, campo `name` y remisiones (`/sa-audit`, `$sa-audit`, …). Su frase de activación pasa a ser "specagile audit". Después de `specagile update`, `/sa-verify` ya no existe.
- El id de workflow sigue siendo `verify`, como `apply` sigue instalando `sa-implement`: la configuración guardada (`"workflows": [..., "verify"]`) sigue valiendo y `specagile config profile` lo muestra como "Audit change".
- El skill habla de auditoría: su reporte es un **Audit Report** y su veredicto final dice si el change está listo para el PR ("Ready for PR", "Fix before opening the PR") en lugar de "Ready for archive".
- Los chequeos no cambian: las mismas tres dimensiones (Completeness, Correctness, Coherence), las mismas reglas (requisitos REMOVED y RENAMED, *Not applicable* y *Not verified*, `skip_specs`), las mismas severidades y los mismos insumos: los artefactos del change y el código. Sigue siendo una auditoría advisory y de solo lectura: no modifica código ni artefactos, no archiva y no condiciona el archivado.
- Migración: `specagile init` y `specagile update` tratan `sa-verify` como nombre anterior del workflow `verify`. Quitan el `sa-verify` sin editar que escribió SpecAgile (2.1.1 a 6.0.0), con sus enlaces; conservan e informan uno editado; `--dry-run` lo anticipa. La actualización de los skills globales retira `sa-verify` de las carpetas globales.
- La distribución estática `skills/` tiene `sa-audit/` en lugar de `sa-verify/`.
- Documentación (README, `docs-lab/`, `FORK.md`, diagramas de `docs/architecture/`, CHANGELOG) usa `sa-audit` y presenta la auditoría como gate manual previo al PR.

Suposiciones registradas:
- `verify` sigue fuera del perfil `core`. El flujo largo queda `sa-explore` → `sa-specify` → `sa-plan` → `sa-tasks` → `sa-implement` → (`sa-audit` opcional, antes del PR) → `sa-archive`.
- No se suman el diff de git ni `REVIEW.md` como insumos. Revisar el *cómo* del código (calidad, estilo, seguridad) queda para un eventual comando de review, fuera de este change.
- "specagile verify" no queda como frase alternativa: el nombre nuevo reemplaza al anterior sin alias.
- La plantilla de upstream `verify-change.ts` y su spec `opsx-verify-skill` no cambian. El texto de `sa-audit` se deriva de esa plantilla al generar, así que las mejoras de upstream a los chequeos llegan sin portarlas a mano.
- Este change modifica requisitos de `fork-skill-names` que también modifica `split-plan-into-plan-and-tasks`, todavía activo. Sus deltas parten del texto que deja ese change, que debe archivarse antes.

## Capabilities

### New Capabilities
- `opsx-audit-skill`: el skill `sa-audit` del workflow `verify`. Es la auditoría de solo lectura de un change antes del PR: selección del change, los mismos chequeos que la verificación de upstream, el reporte "Audit Report" y el veredicto de preparación para el PR.

### Modified Capabilities
- `fork-skill-names`: la tabla de nombres pasa a verify→`sa-audit`; la frase de activación de `verify` es "specagile audit"; la distribución estática tiene `sa-audit` y no `sa-verify`; la lista de nombres anteriores suma `sa-verify`; la migración quita o conserva `sa-verify` como a los demás nombres anteriores, también en los skills globales.

## Impact

- Plantillas: nueva `src/core/templates/workflows/audit.ts`, propia del fork, que deriva su texto de `verify-change.ts` (upstream, sin editar). Se exporta desde `src/core/templates/skill-templates.ts`, y `allSkillTemplates()` (`src/core/shared/skill-generation.ts`) la usa para `verify`.
- Identidad: `src/core/fork/identity.ts` (`SKILL_NAME_BY_WORKFLOW.verify`, una tabla de nombres anteriores de SpecAgile con `sa-verify`, `TRIGGER_VERBS` con `audit`).
- Migración: `src/core/fork/former-skills.ts` (reconoce `sa-verify` por fingerprints y sigue reconociendo `openspec-verify-change` de OpenSpec 2.1.x), una lista generada de fingerprints con su script en `scripts/fork/`, `src/core/migration.ts` (comparación en las raíces anteriores de cada herramienta) y `src/core/global-skills.ts` (retiro en el alcance global).
- Selector: `src/commands/config.ts` (`WORKFLOW_PROMPT_META.verify`).
- Distribución: `skills/sa-audit/` reemplaza `skills/sa-verify/`. El tag de la release debe apuntar a un commit con ese `skills/`.
- Tests: identidad del fork, frases de activación, generación y paridad de skills, migración de skills anteriores, skills globales, init, update y dry-run.
- Docs: `README.md`, `docs-lab/` (skills, profiles, glossary, setup, quickstart, upgrade-to-2, review-the-plan, message-map), `FORK.md`, `docs/architecture/`, `CHANGELOG.md`.
- Usuarios: quien invoque `/sa-verify` pasa a `/sa-audit` (o "specagile audit") después de `specagile update`. Un `sa-verify` editado queda en su lugar y se informa.
