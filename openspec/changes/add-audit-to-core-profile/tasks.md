# Tasks

## 1. Perfil core con `verify`

- [ ] 1.1 Agregar `'verify'` después de `'apply'` en `CORE_WORKFLOWS` (`src/core/profiles.ts`), según D1. Actualizar `test/core/profiles.test.ts` (lista exacta y `toHaveLength(10)`). Verificar con `pnpm exec vitest run test/core/profiles.test.ts`.
- [ ] 1.2 Mover `sa-audit` de las listas de skills "non-core" a las de skills instalados por el perfil `core` en `test/core/init.test.ts` (~línea 397) y `test/core/update.test.ts` (~línea 1369). Las rutas esperadas se arman con `path.join`. Verificar que ambos tests pasan y que comprueban `.agents/skills/sa-audit/SKILL.md` y la entrada `.claude/skills/sa-audit`.
- [ ] 1.3 Ajustar la nota de workflows opcionales (D4): `test/core/onboarding-commands.test.ts` espera "Note: 5 more workflows are available (new, continue, ff, bulk-archive, onboard)." para `CORE_WORKFLOWS`, y los casos de `init.test.ts` (~línea 2560) y `update.test.ts` (~línea 3873) dejan de esperar `verify` y comprueban que la nota no lo nombra. El caso "lists the missing workflows in declaration order" sigue usando `verify` con su propia lista. Verificar que los tres archivos pasan.
- [ ] 1.4 Cubrir el escenario "Perfil custom sin verify": en `test/core/update.test.ts`, un perfil `custom` con los nueve workflows de antes no instala `sa-audit`, la salida incluye "Your custom profile is missing 1 core workflow: verify" y la config global queda igual. Verificar que el test falla con `CORE_WORKFLOWS` sin `verify` y pasa con 1.1.
- [ ] 1.5 Cubrir los escenarios "Proyecto existente con perfil core" y "Simular el update…": `specagile update` en un proyecto `core` sin `sa-audit` lo agrega sin tocar los demás skills, y `update --dry-run` lo lista sin crearlo. Extender los tests de `update.test.ts` existentes antes de crear uno nuevo. Verificar que pasan.
- [ ] 1.6 Cubrir el selector y los presets (escenarios "Selector de workflows" y "Volver al perfil core") en `test/commands/config.test.ts` o `test/commands/config-profile.test.ts`: `deriveProfileFromWorkflowSelection` da `core` con los diez y `custom` con los nueve de antes; `specagile config profile core` guarda los diez; `specagile config list` muestra `verify` entre los workflows "from core profile". Verificar que pasan.
- [ ] 1.7 Cubrir el escenario "Skills para toda la máquina" en `test/core/global-skills.test.ts`: con el perfil `core`, la instalación global escribe `sa-audit` en `~/.agents/skills/` y en la carpeta global de Claude Code, con rutas de `path.join` sobre el home de test (`%USERPROFILE%` en Windows). Verificar que pasa.
- [ ] 1.8 Correr las demás suites que leen el set `core` y corregir los fixtures que asuman nueve workflows: `pnpm exec vitest run test/core/profile-sync-drift.test.ts test/core/command-reconcile.test.ts test/core/skills-2-0-hardening.test.ts test/core/warp.test.ts test/core/project-skills-vercel.test.ts test/commands/profile-handoffs.test.ts test/core/shared/profile-workflow-references.test.ts test/ui/welcome-screen.test.ts test/fork`. Verificar que las únicas fallas que quedan están en la línea base de Windows conocida.

## 2. Documentación

- [ ] 2.1 `docs-lab/customize/profiles.md` (D5): `verify` pasa a la tabla de "The core set" ("ten workflows"), la de opcionales dice "Five more", "core nine" pasa a "core ten" y la nota sobre perfiles `custom` guardados antes nombra también `verify`. Verificar con `pnpm exec vitest run test/setup-docs-claims.test.ts`, que exige cada id de `CORE_WORKFLOWS` en esa sección.
- [ ] 2.2 `docs-lab/reference/skills.md` marca `sa-audit` como `Core`. `docs-lab/start/setup.md` quita "(not included by default)" de `sa-audit` en el árbol y ajusta la frase que cuenta los opcionales. `docs-lab/start/setup.md` y `docs-lab/reference/cli.md` pasan los conteos de salida "8 skills in …" a "10 skills in …". `docs-lab/start/quickstart.md` deja de presentar la auditoría como workflow opcional del perfil. Verificar con `grep -rn "not included by default\|8 skills" docs-lab` que solo queda `sa-bulk-archive-change` como no incluido.
- [ ] 2.3 `README.md`: sacar `sa-audit` de la lista del flujo expandido (~línea 187) y nombrarla entre los skills del perfil por defecto. Verificar leyendo la sección "Now talk to your AI" que no contradice el perfil.
- [ ] 2.4 `FORK.md`: anotar en "The audit skill" que `verify` es parte de `CORE_WORKFLOWS`, y sumarlo a la frase que lista las líneas que el fork agrega a esa constante. Verificar con `pnpm exec vitest run test/fork/fork-docs.test.ts`.
- [ ] 2.5 `CHANGELOG.md`, bajo "Unreleased" y "Minor Changes": `sa-audit` viene en el perfil `core`. Explicar que `specagile update` lo instala en cada proyecto `core` (y hay que commitearlo con skills en el repo), que un perfil `custom` no cambia y cómo sumarlo o quitarlo con `specagile config profile`, y pedir actualizar SpecAgile en cada máquina antes de commitear, porque un 7.0.x con `core` lo quita.

## 3. Verificación integrada

- [ ] 3.1 `pnpm build` y luego `pnpm exec vitest run test/cli-e2e/basic.test.ts test/core/init.test.ts test/core/update.test.ts test/core/global-skills.test.ts`. Verificar que pasan, salvo las fallas de la línea base de Windows.
- [ ] 3.2 Recorrido manual en Windows, en una carpeta temporal fuera del repo: `node <repo>/bin/specagile.js init --tools claude --scope project` crea `.agents\skills\sa-audit\SKILL.md` y `.claude\skills\sa-audit` (enlace o copia), y el resumen dice "10 skills in .agents/skills/". Repetir sin `--scope` (escribe en el home real de la máquina) y comprobar `%USERPROFILE%\.agents\skills\sa-audit\` y "10 skills in ~/.agents/skills/".
- [ ] 3.3 Linux (WSL2 o CI): las mismas suites pasan completas.
- [ ] 3.4 `openspec validate add-audit-to-core-profile --strict` sigue pasando tras cualquier ajuste de las deltas.

## Workflow follow-up

- Archivar `rename-verify-to-audit` antes que este change: las deltas de `fork-skill-names` y `opsx-audit-skill` parten de su texto.
- Release minor: el mantenedor publica y crea el tag `v<versión>` sobre un commit cuyo `skills/` coincida con el paquete.
