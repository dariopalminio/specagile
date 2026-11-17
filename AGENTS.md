# AGENTS.md

Guía para agentes (Claude Code, Codex, OpenCode) que trabajen en **SpecAgile**,
el fork de [OpenSpec](https://github.com/Fission-AI/OpenSpec) con flujo de tres
comandos (`specify` → `plan` → `implement`) y specs vivas en `.feature`.

## Entorno

- Node >=22.12.0, `pnpm@10.34.5` (fijado en `packageManager`; usar Corepack).
- Windows 11: la suite upstream tiene fallos conocidos (rutas, shell Unix,
  permisos). Para línea base verde, usar WSL2 o filtrar por área:
  `pnpm test -- --run test/core/schemas test/core/skills test/commands`.

## Comandos

- Instalar: `pnpm install --frozen-lockfile`
- Compilar: `pnpm build`
- Test (acotado): `pnpm test -- --run <ruta>`
- CLI del fork: `node bin/specagile.js <comando>` (o `specagile` tras `pnpm link --global`).
- No ejecutar `specagile init` (ni `openspec init`) en la raíz del fork (no es un
  proyecto de usuario).

## Sincronización con upstream

- Remoto `upstream` en **HTTPS**, no SSH: `https://github.com/Fission-AI/OpenSpec.git`.
- Sincronizar con `node scripts/fork/sync-upstream.mjs` (ver `FORK.md`), **nunca**
  con el botón "Sync fork" de GitHub ni con `git merge upstream/main` a pelo:
  reintroducen `website/`.
- Usar la CLI global de OpenSpec como herramienta estable; el fork es el objeto
  que se modifica (evitar el bootstrap circular).

## Rutas eliminadas a propósito (no restaurar, no "arreglar")

- `website/` — sitio de documentación, fuera de alcance del fork.
- `test/website-preview.test.ts` — test del sitio, huérfano tras eliminarlo.

La lista canónica vive en `scripts/fork/removed-paths.mjs` (`FORK_REMOVED_PATHS`).
Si se añade una ruta, actualizar también la tabla de `FORK.md`:
`test/fork/fork-docs.test.ts` falla si no coinciden.

## Convención de commits

- Separar artefactos de OpenSpec (`openspec/changes/…`) del código (`src/`, `bin/`):
  un commit para la spec, otro para la implementación.
- Commits atómicos y con mensaje en imperativo. Preferir diffs pequeños para
  minimizar conflictos con upstream.

## Alcance del fork

Upstream 2.0.0 no trae `specify` ni `plan`. Estado del fork:

- Implementado: skills `sa-specify` y `sa-plan` (solo skills, perfil `core`; ver
  "Workflows added by this fork" en `FORK.md`). Separan la especificación del
  plan con el grafo de artefactos de `spec-driven` (el id `specs` y sus
  `requires`). No hay un esquema `three-step`.
- Sin código todavía: un template `implement` propio y la generación de
  `.feature`. Hoy el flujo es `specify` → `plan` → `apply`; el workflow `apply`
  usa el template de upstream (`apply-change.ts`), se instala como
  `sa-implement` y se activa con "specagile implement".
- Si se agrega `implement`, va en un template propio del fork, como `specify` y
  `plan`. No renombrar `apply-change.ts` (es de upstream) ni sumar ids a
  `COMMAND_IDS`.
- Ya los trae upstream, no son cambios del fork: `archive --skip-specs` y
  `skip_specs: true` en `.openspec.yaml`.
- Identidad SpecAgile (CLI `specagile`, skills `sa-*`): la fuente única es
  `src/core/fork/identity.ts`; ver "SpecAgile identity" en `FORK.md`. No editar
  las plantillas de upstream (`src/core/templates/workflows/`): la identidad se
  aplica al generar. Los mensajes de usuario dicen `specagile <comando>` y
  `test/fork/cli-name.test.ts` falla si queda un `openspec <comando>`. No renombrar
  `src/`, `openspec/`, los ids de workflow ni los archivos internos
  (`.openspec-target`).
  