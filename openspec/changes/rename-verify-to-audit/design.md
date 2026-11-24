# Design

## Context

- El workflow `verify` (id de upstream, en `ALL_WORKFLOWS` y fuera de `CORE_WORKFLOWS`) se instala hoy como `sa-verify` (`SKILL_NAME_BY_WORKFLOW.verify` en `src/core/fork/identity.ts`). Su texto sale de `getVerifyChangeSkillTemplate()` (`src/core/templates/workflows/verify-change.ts`, de upstream, que AGENTS.md no deja editar) vía `allSkillTemplates()` y `generateSkillContent`, que pasa todo el archivo por `applyForkIdentity`.
- `applyForkNames` traduce cada nombre `openspec-*` de `FORMER_SKILL_NAME_BY_WORKFLOW` (y de `TEMPLATE_ONLY_SKILL_NAME_BY_WORKFLOW`) a su `sa-*`, y `openspec <verbo>` a `specagile <verbo>` para los verbos de `CLI_WORDS` (`TRIGGER_VERBS` incluidos). Una remisión `/opsx:verify` pasa por `COMMAND_TO_SKILL_NAME` (`openspec-verify-change`) y termina en `SKILL_NAME_BY_WORKFLOW.verify`.
- Upstream 2.x ya no genera archivos de comando: `getOpsxVerifyCommandTemplate()` solo sirve para reconocer y limpiar los que escribió OpenSpec 1.x (`command-reconcile.ts`, `COMMAND_IDS`).
- SpecAgile publicó `skills/sa-verify/SKILL.md` en los tags v2.1.1 a v6.0.0 con dos textos distintos: uno en v2.1.1–v2.1.2 y otro en v3.0.0–v6.0.0. `init` y `update` instalan los skills, del proyecto y globales, con el paquete `skills` desde esos tags. Por eso un `sa-verify` instalado es copia de uno de esos textos, o de su variante para Eve (`projectSkillText`).
- La migración de nombres anteriores (`src/core/fork/former-skills.ts`) recorre una lista fija (`formerSkillNames`). Reconoce el texto generado por fingerprints (`RELEASED_GENERATED_FINGERPRINTS` de upstream, `FORMER_RELEASE_FINGERPRINTS` del fork) o comparándolo, con la identidad aplicada, con lo que genera esta versión. Quita lo reconocido con sus enlaces y conserva e informa lo demás. La detección de un proyecto configurado usa `KNOWN_SKILL_NAMES` y `FORMER_SKILL_NAMES`.
- Los skills globales (`src/core/global-skills.ts`) gestionan solo `OPENSPEC_SKILL_NAMES` (= `CURRENT_SKILL_NAMES`): `installGlobalSkills` quita los nombres presentes que ya no están en el conjunto esperado. Los `openspec-*` globales son de una instalación de OpenSpec y no se tocan.
- `split-plan-into-plan-and-tasks`, todavía activo, modifica cuatro requisitos de `fork-skill-names` que este change también modifica.

## Goals / Non-Goals

**Goals:**
- Que el texto de `sa-audit` sea el de upstream salvo el encuadre de auditoría. Las mejoras de upstream a los chequeos llegan solas, y si upstream cambia un texto reemplazado, la generación falla en vez de dejar el skill a medio traducir.
- Retirar `sa-verify` con el mismo mecanismo que los nombres `openspec-*`: lista explícita y fingerprints, sin patrones sobre nombres.
- Seguir reconociendo el `openspec-verify-change` que escribió OpenSpec 2.1.x, aunque el texto vigente del workflow ya no sea el de verify.

**Non-Goals:**
- Renombrar el id `verify`, el archivo `verify-change.ts`, su plantilla de comando o la spec de upstream `opsx-verify-skill`.
- Insumos nuevos (diff de git, `REVIEW.md`), chequeos nuevos o un comando de review.
- Sumar `verify` al perfil `core` o dejar "specagile verify" como alias.
- Editar la documentación de upstream en `docs/`, salvo `docs/architecture/`, que es del fork.

## Decisions

### D1. El id `verify` instala `sa-audit`

`SKILL_NAME_BY_WORKFLOW.verify` pasa a `'sa-audit'`, como `apply` instala `sa-implement`. La carpeta, el `name:`, las remisiones y los derivados (`CURRENT_SKILL_NAMES`, `OPENSPEC_SKILL_NAMES`, `WORKFLOW_TO_SKILL_DIR`) cambian solos, y la configuración guardada con `verify` sigue valiendo. `COMMAND_TO_SKILL_NAME` conserva `'verify': 'openspec-verify-change'`, como pide FORK.md, y `/opsx:verify` termina en `sa-audit` por la traducción.

*Alternativa descartada*: un id `audit`. Rompe las configuraciones guardadas, toca `COMMAND_IDS` y AGENTS.md prohíbe renombrar ids de workflow.

### D2. `audit.ts`: el texto de upstream con una tabla de reemplazos obligatorios

Un archivo nuevo del fork, `src/core/templates/workflows/audit.ts`, exporta `getAuditSkillTemplate()`. Toma `getVerifyChangeSkillTemplate()`, reemplaza `description` entera por `AUDIT_DESCRIPTION` y aplica a `instructions` la tabla `AUDIT_TEXT_REPLACEMENTS` (texto exacto de upstream → texto de auditoría). Si un texto de la tabla no aparece en el de upstream, la generación lanza un error que lo nombra; es la idea de `replaceRequired` y `AGENT_IDENTITY_REPLACEMENTS` en `cloud-agent.ts`. Cada entrada reemplaza todas sus apariciones. `name`, `license`, `compatibility` y `metadata` quedan como upstream: `name: openspec-verify-change` sale como `sa-audit` por la identidad, como en cualquier plantilla escrita con los nombres de OpenSpec. `allSkillTemplates()` usa `getAuditSkillTemplate()` para `verify`, y `skill-templates.ts` la exporta.

`AUDIT_DESCRIPTION` (sin `: `, porque va como escalar YAML sin comillas en el frontmatter, y con "OpenSpec", como exige `project-root-guard.test.ts` a toda descripción): `Audit an OpenSpec change before its pull request - check that the implementation is complete, correct, and coherent with the change artifacts, and report drift between spec and code. Read-only - it reports issues and never fixes them. Use when the user wants to know whether a change is ready for its PR. Also use when the user says "openspec audit" or "opsx verify".` La frase `opsx` sigue el id del workflow, como "opsx apply" en `sa-implement`: `workflow-verb-triggers.test.ts` exige `"opsx <id>"` en cada descripción.

| Texto de upstream | Texto de `sa-audit` |
|---|---|
| `Verify that an implementation matches the change artifacts (specs, tasks, design).` | Dos párrafos: auditar el change antes de su pull request, comprobando que la implementación coincide con los artefactos (specs, tasks, design) para saber si cumple su Definition of Done y si el código se apartó de la spec. Y: la auditoría es estática y de solo lectura; leer los artefactos, el código y sus tests, sin correr tests ni builds y sin editar código ni artefactos; reportar, porque corregir lo decide el usuario. |
| `not a verification verdict. Do not implement tasks or archive the change during verification.` | `not an audit verdict. Do not implement tasks or archive the change during the audit.` |
| `**Initialize verification report structure**` | `**Initialize the audit report structure**` |
| `Verification is advisory.` | `The audit is advisory.` |
| `the archive-readiness assessment` | `the PR-readiness assessment` |
| `**Verify Completeness**`, `**Verify Correctness**`, `**Verify Coherence**` | `**Audit Completeness**`, `**Audit Correctness**`, `**Audit Coherence**` |
| `**Generate Verification Report**` | `**Generate the Audit Report**` |
| `## Verification Report: <change-name>` | `## Audit Report: <change-name>` |
| `(Must fix before archive)` | `(Must fix before the PR)` |
| `Fix before archiving.` | `Fix before opening the PR.` |
| `Ready for archive (with noted improvements).` (dos veces) | `Ready for PR (with noted improvements).` |
| `All checks passed. Ready for archive.` | `All checks passed. Ready for PR.` |
| `**Verification Heuristics**` | `**Audit Heuristics**` |

El resto queda como upstream, incluidas la frase de que *Not verified* no es un requisito nuevo para archivar y la de que el archivado conserva sus chequeos: eso es lo que piden los requisitos "Los hallazgos son advisory" y "Los chequeos son los de la verificación de upstream" de `opsx-audit-skill`. El verbo genérico "verify" de algunos pasos ("verify task completion only") no es encuadre y se queda.

*Alternativas descartadas*:
- Una copia a mano, como `plan.ts` y `tasks.ts`. Da control total del texto, pero las mejoras de upstream a los chequeos (por ejemplo, las reglas REMOVED y RENAMED de las últimas versiones) habría que portarlas a mano, y nada avisa si se olvida.
- Reemplazos dentro de `applyForkIdentity`, como `PRODUCT_TEXT_REPLACEMENTS`. Se aplicarían a todos los skills y al ida y vuelta de `withUpstreamIdentity`, cuando el encuadre de auditoría es de un solo skill.
- Editar `verify-change.ts`: AGENTS.md lo prohíbe, y daría conflictos en cada sync.

### D3. Guardas del texto de auditoría

- La generación falla si falta un texto de upstream (D2).
- `test/core/templates/audit.test.ts` (nuevo) comprueba tres cosas. (a) Deshacer la tabla sobre `getAuditSkillTemplate().instructions` devuelve exactamente las `instructions` de upstream. Solo cambian los textos listados, así que "los mismos chequeos" vale por construcción. Para eso ningún texto de auditoría puede aparecer ya en el de upstream, y el test también lo comprueba. (b) El `sa-audit` generado no contiene el encuadre de verify: el sustantivo "verification" (en cualquier caja), "Ready for archive", "before archiv" ni "archive-readiness". Si upstream suma una frase con ese encuadre, este test falla y la frase recibe su propia entrada. (c) La introducción dice que la auditoría es de solo lectura y no corre tests.
- `test/core/templates/verify-change-delta-operations.test.ts` sigue probando la plantilla de upstream. Por (a), sus reglas valen también para `sa-audit`.

### D4. La frase de activación es "specagile audit"

`TRIGGER_VERBS` suma `audit` y conserva `verify`, que sigue en la plantilla de upstream que la migración genera (D6). Con eso, `applyForkNames` sigue siendo la traducción que aplicó 2.1. `AUDIT_DESCRIPTION` dice "openspec audit", que sale como "specagile audit". En `test/core/templates/workflow-verb-triggers.test.ts`, `verify` pasa a `'audit'`. La CLI no tiene un subcomando `audit`, así que no hay colisión.

### D5. `sa-verify`, nombre anterior propio de SpecAgile

Una tabla nueva, `FORMER_SA_SKILL_NAME_BY_WORKFLOW: Readonly<Partial<Record<WorkflowId, string>>> = { verify: 'sa-verify' }`, y su lista `FORMER_SA_SKILL_NAMES`. `formerSkillNames(workflow)` devuelve el nombre de OpenSpec y después este (`['openspec-verify-change', 'sa-verify']`). Así lo reciben sin cambios propios `former-skills.ts`, los dos bloques `SpecAgile:` de `migration.ts` y `FORMER_SKILL_NAMES`/`KNOWN_SKILL_NAMES` (detección, `retired-tools.ts`, `shared-skill-target.ts`). `SKILL_NAME_BY_FORMER`, la traducción de `applyForkNames`, se arma solo con los nombres de OpenSpec y los de plantilla: `sa-verify` no aparece en ninguna plantilla.

*Alternativa descartada*: sumar `sa-verify` a `FORMER_SKILL_NAME_BY_WORKFLOW`. Mezcla los nombres de OpenSpec, que el alcance global nunca debe tocar (D7), con los de SpecAgile, y cambia el tipo de esa tabla y lo que supone `scripts/fork/capture-former-skill-fingerprints.mjs`, que exige nombres `openspec-`.

### D6. Reconocer el texto generado de los nombres anteriores de `verify`

- **`sa-verify`**: una constante generada nueva, `FORMER_SA_SKILL_FINGERPRINTS` (`src/core/fork/former-sa-skill-fingerprints.ts`), escrita por `scripts/fork/capture-former-sa-skill-fingerprints.mjs`. El script tiene la lista explícita de tags que instalaron un nombre de `FORMER_SA_SKILL_NAMES` (v2.1.1, v2.1.2, v3.0.0, v3.0.1, v4.0.0, v5.0.0 y v6.0.0). De cada uno lee `skills/<nombre>/SKILL.md` con `git show <tag>:…` y saca el fingerprint del texto publicado y del que `projectSkillText` deja en la carpeta de cada herramienta, con `fingerprintGeneratedContent` de `dist/`. `classifyFormerSkill` consulta esa lista junto a `FORMER_RELEASE_FINGERPRINTS`. Ninguna release futura escribe `sa-verify`, así que la lista queda cerrada.
- **`openspec-verify-change`**: hoy el de OpenSpec 2.1.x se reconoce porque, traducido, es igual al texto vigente de `verify`. Con `sa-audit` dejaría de serlo y quedaría conservado. `former-skills.ts` lo compara además con lo que genera la plantilla de upstream que el fork reemplaza, en sus formas compartida y por herramienta, según una tabla explícita: `FORMER_TEMPLATE_BY_WORKFLOW = { verify: getVerifyChangeSkillTemplate }`.
- **`migration.ts`** no cambia por su cuenta. Antes de generar, mueve los nombres anteriores de una raíz anterior a la actual y `former-skills.ts` los retira. Después de generar, compara con el skill vigente, y ninguna versión de SpecAgile escribió en raíces anteriores.

*Alternativa descartada*: reconocer `sa-verify` traduciéndolo a `sa-audit` y comparándolo con la plantilla de upstream. Solo cubre las releases cuyo texto coincide con el de hoy (v3.0.0–v6.0.0, y mientras `verify-change.ts` no cambie), no v2.1.x, y un cambio futuro de upstream la rompería sin avisar.

### D7. Skills globales

`readGlobalSkills()` lista los nombres de `OPENSPEC_SKILL_NAMES` y de `FORMER_SA_SKILL_NAMES` presentes en las carpetas globales, nunca los `openspec-*` de OpenSpec. Como `sa-verify` nunca está en el conjunto esperado, `installGlobalSkills` lo pone en `removedSkills` y lo quita con `removeManagedSkills` después de instalar los skills elegidos, con el mismo chequeo de que no quede nada. El alcance global ya trata sus skills como gestionados: reescribe un `SKILL.md` cambiado y quita el skill de un workflow deseleccionado sin mirar ediciones, y `sa-verify` sigue esa regla. `globalSkillCount` en `update` y la lectura de `init` lo cuentan como skill global de SpecAgile, que lo es.

*Alternativa descartada*: correr `former-skills.ts` sobre las carpetas globales. Obligaría a distinguir ahí los `openspec-*` de OpenSpec, que deben quedar, de los nombres de SpecAgile.

### D8. Mensajes de la migración

`formatFormerSkillMigration` y `formerSkillsKeptMessage` dicen "former OpenSpec name" y "what OpenSpec wrote", que con `sa-verify` es falso. Pasan a "former name" y "what OpenSpec or SpecAgile wrote", con la misma estructura.

### D9. Selector, distribución, paridad y docs

- `WORKFLOW_PROMPT_META.verify` pasa a `{ name: 'Audit change', description: 'Audit a change before its pull request' }` en `src/commands/config.ts`, archivo de upstream que el fork ya edita.
- `pnpm build && pnpm generate:skills`: `cleanSkillSubdirectories` vacía `skills/`, así que desaparece `sa-verify/` y aparece `sa-audit/`; `skillssh-parity.test.ts` lo comprueba.
- `skill-templates-parity.test.ts`: suma `getAuditSkillTemplate` y cambia `sa-verify` por `sa-audit` en la lista de skills generados; luego `pnpm regen:parity-hashes`.
- `FORK.md`: la tabla de identidad (verify → `sa-audit`, nombres anteriores `openspec-verify-change` y `sa-verify`), "Where it lives", la sección de migración (con el alcance global), una subsección sobre `audit.ts` y su tabla, la entrada en "When a sync touches the identity" para un texto de la tabla que upstream reescribe, y los archivos de upstream editados (`skill-generation.ts`, `config.ts`, `global-skills.ts`).
- README, `docs-lab/`, los diagramas de `docs/architecture/` y `CHANGELOG.md` (Unreleased → Breaking Changes).

### D10. Orden respecto de `split-plan-into-plan-and-tasks`

Los deltas de `fork-skill-names` de este change copian el texto que deja `split-plan-into-plan-and-tasks` en los cuatro requisitos que ese change modifica. Ese change se archiva primero. En el orden inverso, su MODIFIED volvería a escribir verify→`sa-verify`.

## Risks / Trade-offs

- [Upstream reescribe un texto de la tabla] → La generación falla nombrando el texto y `test/core/templates` falla en el sync. Se actualiza la entrada; FORK.md lo explica.
- [Upstream suma una frase con el encuadre de verify] → Falla la guarda de D3 (b) y la frase recibe su entrada.
- [Falta el fingerprint de alguna variante] → `sa-verify` se conserva y se informa, nunca se borra; el usuario lo quita a mano. Es la falla segura.
- [`/sa-verify` desaparece con `specagile update`] → CHANGELOG lo marca como breaking, con el nombre y la frase nuevos; README y `docs-lab/` también.
- [Un equipo con skills commiteados y alguien en 6.0.0] → Su `specagile update` reinstala `sa-verify`, porque no conoce `sa-audit`, y el siguiente `update` con la versión nueva lo vuelve a quitar. CHANGELOG pide actualizar SpecAgile en cada máquina antes de commitear el cambio de skills, como en 5.0.0.
- [Un `sa-verify` global editado] → Se quita como cualquier skill global gestionado; CHANGELOG lo menciona.
- [La plantilla conserva `name: openspec-verify-change`] → Se lee raro en `audit.ts`, pero es la convención (plantillas con nombres de OpenSpec) y es lo que hace funcionar `/opsx:verify` y el ida y vuelta de la identidad. Un comentario en el archivo lo explica.

## Migration Plan

1. Archivar `split-plan-into-plan-and-tasks` antes que este change (D10).
2. Implementar, correr `pnpm build && pnpm regen:parity-hashes && pnpm generate:skills` y los tests.
3. Publicar una versión mayor (el número lo decide el mantenedor), con su tag en el commit cuyo `skills/` tiene `sa-audit/`.
4. Cada usuario corre `specagile update --dry-run` para ver el cambio y después `specagile update` en cada proyecto. Los skills globales se actualizan en la misma ejecución.

**Rollback**: reinstalar 6.0.0 y correr `specagile update`. 6.0.0 vuelve a instalar `sa-verify`; `sa-audit` le es desconocido y queda como una carpeta para borrar a mano.

## Open Questions

- El número de la versión (por los precedentes del fork, 7.0.0). Lo decide el mantenedor al publicar y no cambia specs ni tareas.
