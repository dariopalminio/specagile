# Tasks

## 1. Plantilla de `sa-audit`

- [ ] 1.1 Crear `src/core/templates/workflows/audit.ts` (propio del fork) con `AUDIT_DESCRIPTION`, `AUDIT_TEXT_REPLACEMENTS` (la tabla de design D2) y `getAuditSkillTemplate()`. La función toma `getVerifyChangeSkillTemplate()`, reemplaza `description` y aplica la tabla a `instructions`, reemplazando cada aparición, y lanza un error que nombra la entrada cuando un texto de upstream no aparece. Un comentario explica por qué `name` sigue siendo `openspec-verify-change`. Exportarla desde `src/core/templates/skill-templates.ts` sin tocar `verify-change.ts`. Se verifica con `pnpm build` sin errores y con `git diff --quiet src/core/templates/workflows/verify-change.ts`.
- [ ] 1.2 Agregar `test/core/templates/audit.test.ts` con las guardas de design D3. (a) Deshacer la tabla sobre las `instructions` de `getAuditSkillTemplate()` devuelve exactamente las de upstream, y ningún texto de auditoría aparece ya en el de upstream. (b) El skill generado no contiene "verification" (en cualquier caja), "Ready for archive", "before archiv" ni "archive-readiness", y sí contiene `## Audit Report: <change-name>`, "Ready for PR" y "Fix before opening the PR". (c) La introducción dice que la auditoría es de solo lectura y que no corre tests ni builds. (d) Una tabla con un texto ausente hace fallar la generación. Se verifica con `pnpm exec vitest run test/core/templates/audit.test.ts`.

## 2. El workflow `verify` se instala como `sa-audit`

- [ ] 2.1 En `src/core/fork/identity.ts`, `SKILL_NAME_BY_WORKFLOW.verify` pasa a `'sa-audit'` y `TRIGGER_VERBS` suma `audit` (conserva `verify`). En `allSkillTemplates()` (`src/core/shared/skill-generation.ts`), `verify` usa `getAuditSkillTemplate()`. Actualizar `test/fork/identity.test.ts` (la tabla de nombres por workflow: `verify` → `sa-audit`). Se verifica con `pnpm exec vitest run test/fork/identity.test.ts test/fork/generated-skills-identity.test.ts test/core/templates/one-text-per-skill.test.ts`.
- [ ] 2.2 En `test/core/templates/workflow-verb-triggers.test.ts`, `verify` pasa a `'audit'`, con una aserción de que la descripción de `sa-audit` nombra "specagile audit" y no "specagile verify". Se verifica con `pnpm exec vitest run test/core/templates/workflow-verb-triggers.test.ts`.
- [ ] 2.3 En `src/commands/config.ts`, `WORKFLOW_PROMPT_META.verify` pasa a `{ name: 'Audit change', description: 'Audit a change before its pull request' }`, y se actualiza `test/commands/config-profile.test.ts` (el skill `sa-audit` y la etiqueta). Se verifica con `pnpm exec vitest run test/commands/config-profile.test.ts test/commands/config.test.ts`.
- [ ] 2.4 Cambiar `sa-verify` por `sa-audit` en los tests que fijan los nombres vigentes: `test/core/init.test.ts`, `test/core/update.test.ts`, `test/core/update-dry-run.test.ts` (las rutas en `.agents/skills`, `.claude/skills` y `.kimi-code/skills`, armadas con `path.join` donde ya lo están), `test/core/shared/skill-generation.test.ts` y `test/core/shared/tool-detection.test.ts`. Se verifica con `pnpm exec vitest run` sobre esos cinco archivos.
- [ ] 2.5 En `test/core/templates/skill-templates-parity.test.ts`, sumar `getAuditSkillTemplate` a las funciones con hash y hacer que las listas que emparejan skills generados con plantillas usen `['sa-audit', getAuditSkillTemplate]`. Luego correr `pnpm build && pnpm regen:parity-hashes`. Se verifica con `pnpm exec vitest run test/core/templates/skill-templates-parity.test.ts`.
- [ ] 2.6 Correr `pnpm generate:skills`: queda `skills/sa-audit/SKILL.md` y desaparece `skills/sa-verify/`. Adaptar `test/core/templates/verify-change-delta-operations.test.ts` para que lea `skills/sa-audit/SKILL.md` y deshaga la identidad y la tabla de auditoría, con un helper en `test/helpers/fork-identity.ts`, para que siga comparando contra el texto de upstream. Se verifica con `pnpm exec vitest run test/core/templates/skillssh-parity.test.ts test/core/templates/verify-change-delta-operations.test.ts` y con que `skills/sa-verify` no exista.
- [ ] 2.7 Documentación del nombre:
  - `README.md`: el ejemplo pasa a `/sa-audit add-dark-mode`, auditando el change antes del PR, y la lista del flujo ampliado nombra `sa-audit`.
  - `docs-lab/`: `reference/skills.md` (fila y sección `sa-audit`, con su ancla), `customize/profiles.md`, `customize/project-config.md`, `reference/glossary.md` (entrada **Audit**), `start/setup.md`, `start/quickstart.md`, `guides/review-the-plan.md`, `help/upgrade-to-2.md` (`/opsx:verify` → `sa-audit`) y `message-map.md`.
  - `docs/architecture/`: `architecture-overview.md` y los dos diagramas `.mermaid`, con `sa-audit` como "auditoría opcional (antes del PR)".

  Se verifica con que `grep -rn "sa-verify" README.md docs-lab docs/architecture` no devuelva nada y con que los anclas `#sa-audit` existan en `docs-lab/reference/skills.md`.
- [ ] 2.8 `FORK.md`. En la tabla de "SpecAgile identity", la fila `verify` pasa a `sa-audit`. Una subsección nueva sobre `audit.ts` explica la tabla de reemplazos, las guardas y qué hacer cuando un sync cambia `verify-change.ts`. En "When a sync touches the identity" se agrega la entrada para un texto de la tabla que upstream reescribe. En "Upstream files edited for the identity" se suman `src/core/shared/skill-generation.ts` y `src/commands/config.ts`. Se verifica con `pnpm exec vitest run test/fork/fork-docs.test.ts` y con que FORK.md nombre `AUDIT_TEXT_REPLACEMENTS`.
- [ ] 2.9 `CHANGELOG.md`, en `## Unreleased` → Breaking Changes: el workflow `verify` se instala como `sa-audit` (frase "specagile audit"); el reporte es un Audit Report y el veredicto dice si el change está listo para el PR; los chequeos y los insumos no cambian; el id `verify` sigue igual y el selector lo muestra como "Audit change". Se verifica leyendo la entrada.

## 3. `sa-verify` como nombre anterior y migración del proyecto

- [ ] 3.1 En `src/core/fork/identity.ts`, agregar `FORMER_SA_SKILL_NAME_BY_WORKFLOW` (`{ verify: 'sa-verify' }`) y `FORMER_SA_SKILL_NAMES`. `formerSkillNames(workflow)` devuelve el nombre de OpenSpec y después el de SpecAgile, y `SKILL_NAME_BY_FORMER` se arma solo con los nombres de OpenSpec y los de plantilla. En `test/fork/identity.test.ts`: `formerSkillNames('verify')` es `['openspec-verify-change', 'sa-verify']`, ningún otro workflow tiene nombre anterior `sa-*`, `KNOWN_SKILL_NAMES` incluye `sa-verify` y `applyForkNames` deja `sa-verify` sin cambios. Se verifica con `pnpm exec vitest run test/fork/identity.test.ts`.
- [ ] 3.2 Crear `scripts/fork/capture-former-sa-skill-fingerprints.mjs` (design D6). Tiene la lista explícita de tags v2.1.1, v2.1.2, v3.0.0, v3.0.1, v4.0.0, v5.0.0 y v6.0.0, lee `skills/<nombre>/SKILL.md` de cada uno con `git show` para cada nombre de `FORMER_SA_SKILL_NAMES`, y escribe en `src/core/fork/former-sa-skill-fingerprints.ts` (`FORMER_SA_SKILL_FINGERPRINTS`) los fingerprints del texto publicado y de su forma `projectSkillText` por herramienta, con un encabezado que lista los tags. Correrlo con `pnpm build && node scripts/fork/capture-former-sa-skill-fingerprints.mjs`. Se verifica con que el archivo generado tenga los fingerprints de los dos textos publicados (v2.1.2 y v6.0.0) y con que una segunda ejecución no produzca diff.
- [ ] 3.3 Agregar los fixtures `test/fixtures/former-sa-skills/v2.1.2/sa-verify/SKILL.md` y `test/fixtures/former-sa-skills/v6.0.0/sa-verify/SKILL.md`, copiados con `git show <tag>:skills/sa-verify/SKILL.md`. Se verifica con que cada fixture coincida con la salida de `git show` de su tag, sin contar los finales de línea.
- [ ] 3.4 En `src/core/fork/former-skills.ts`:
  - `classifyFormerSkill` reconoce también `FORMER_SA_SKILL_FINGERPRINTS`.
  - `currentSkillTexts` suma, para `verify`, las formas compartida y por herramienta de la plantilla de upstream, según una tabla explícita `FORMER_TEMPLATE_BY_WORKFLOW = { verify: getVerifyChangeSkillTemplate }`.
  - Los mensajes dicen "former name" y "what OpenSpec or SpecAgile wrote" (design D8).
  - El comentario del encabezado ya no dice "the fourteen names".

  Se verifica con las tareas 3.5 y 3.6.
- [ ] 3.5 En `test/fork/former-skills.test.ts`, un caso por cada escenario de `fork-skill-names`:
  - `sa-verify` de 6.0.0 (fixture) con su enlace: se quita y quedan `sa-audit` y su enlace.
  - `sa-verify` de 2.1.2: se quita.
  - Copia de `sa-verify` en la carpeta de Claude Code, con rutas armadas con `path.join` (`.claude\skills\sa-verify\` en Windows): se quitan la copia y la carpeta vacía.
  - Perfil sin `verify`: se quita y no se instala `sa-audit`.
  - `sa-verify` editado: se conserva y se informa con el mensaje nuevo.
  - `openspec-verify-change` con el texto que la plantilla de upstream escribe con los nombres de OpenSpec: se quita.
  - `sa-verify-security` del usuario: no se toca ni se informa.

  En `test/core/shared/tool-detection.test.ts`, un proyecto cuyo único skill es `sa-verify` con su enlace se detecta como configurado. Se verifica con `pnpm exec vitest run test/fork/former-skills.test.ts test/core/shared/tool-detection.test.ts`.
- [ ] 3.6 En `test/core/update-dry-run.test.ts`, con `sa-verify` intacto y `verify` en el perfil, el plan informa que quitaría `sa-verify` e instalaría `sa-audit`, y nada cambia en disco. En `test/core/update.test.ts`, con el repositorio de skills simulado, `update` deja `sa-audit`, quita `sa-verify` y su salida lo informa. Se verifica con `pnpm build && pnpm exec vitest run test/core/update-dry-run.test.ts test/core/update.test.ts`.
- [ ] 3.7 `FORK.md`. En "Where it lives" van `FORMER_SA_SKILL_NAME_BY_WORKFLOW`, `FORMER_SA_SKILL_FINGERPRINTS` con su script y `FORMER_TEMPLATE_BY_WORKFLOW`. En "Migrating projects with the former skills" van `sa-verify` y el reconocimiento de `openspec-verify-change` por la plantilla de upstream. `CHANGELOG.md` suma: correr `specagile update` (o antes `--dry-run`) quita el `sa-verify` sin editar, uno editado se conserva y se informa, y conviene actualizar SpecAgile en cada máquina antes de commitear los skills. Se verifica con `pnpm exec vitest run test/fork/fork-docs.test.ts` y leyendo las entradas.

## 4. Skills globales

- [ ] 4.1 En `src/core/global-skills.ts`, `readGlobalSkills()` lista los nombres de `OPENSPEC_SKILL_NAMES` y de `FORMER_SA_SKILL_NAMES` presentes en las carpetas globales, nunca los `openspec-*` de OpenSpec (design D7). Se verifica con la tarea 4.2.
- [ ] 4.2 En `test/core/global-skills.test.ts`, con un home de prueba y rutas armadas con `path.join`:
  - Con `.agents/skills/sa-verify/SKILL.md` y `verify` en los workflows, `installGlobalSkills` instala `sa-audit` y quita `sa-verify` de `.agents/skills` y de la carpeta global de una herramienta (Claude Code).
  - `.agents/skills/openspec-verify-change/` queda intacto.
  - En dry run, `sa-verify` aparece en `removedSkills` sin quitarse.

  Se verifica con `pnpm exec vitest run test/core/global-skills.test.ts`.
- [ ] 4.3 `FORK.md` (el alcance global en la sección de migración) y `CHANGELOG.md` (`specagile update` quita `sa-verify` de los skills globales aunque esté editado, como cualquier skill global gestionado; los `openspec-*` de OpenSpec no se tocan). Se verifica leyendo las entradas.

## 5. Verificación integral

- [ ] 5.1 Correr `pnpm build && pnpm regen:parity-hashes && pnpm generate:skills` dos veces seguidas: la segunda no deja cambios en `git status`. `pnpm lint` pasa.
- [ ] 5.2 Windows (PowerShell): correr `pnpm exec vitest run test/fork test/core/templates test/core/global-skills.test.ts test/core/init.test.ts test/core/update.test.ts test/core/update-dry-run.test.ts test/core/shared test/commands/config-profile.test.ts test/commands/config.test.ts` y comparar las fallas con la línea base conocida de Windows (enlaces simbólicos con EPERM, carpetas temporales con EBUSY). No debe haber fallas nuevas.
- [ ] 5.3 Linux (WSL2 o CI): las mismas suites pasan completas.
- [ ] 5.4 Recorrido manual en Claude Code sobre un proyecto de prueba con `skills/sa-audit/` copiado en `.claude/skills/sa-audit/` y un change con una tarea incompleta y un requisito REMOVED que sigue implementado.
  - Pedir "specagile audit" activa el skill.
  - `/sa-audit <change>` presenta `## Audit Report: <change>`, los dos hallazgos CRITICAL y el veredicto "Fix before opening the PR".
  - `git status` no muestra cambios después de auditar.
  - Corregidos los hallazgos, el veredicto es "All checks passed. Ready for PR."

## Workflow follow-up

- Archivar `split-plan-into-plan-and-tasks` antes de archivar este change (design D10). En el orden inverso, su delta volvería a escribir verify→`sa-verify` en `fork-skill-names`.
- Commits separados: los artefactos de `openspec/changes/rename-verify-to-audit/` en uno y el código en otro (AGENTS.md).
- El mantenedor publica la versión mayor y crea su tag en el commit cuyo `skills/` tiene `sa-audit/`.
- Archivar este change después del merge.
