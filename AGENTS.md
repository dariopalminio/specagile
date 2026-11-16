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
- No ejecutar `openspec init` en la raíz del fork (no es un proyecto de usuario).

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

- Cambios funcionales: esquema `three-step`, skills `specify`/`plan`/`implement`,
  generación de `.feature` en `implement`, `archive --skip-specs`.
- Cambios de identidad (rebranding a `specagile`): solo en `package.json`, `bin/`,
  README y strings de usuario. No renombrar `src/` ni `openspec/`.
  