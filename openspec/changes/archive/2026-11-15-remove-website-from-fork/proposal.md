# Proposal

## Why

Este repositorio es un fork de OpenSpec que no publica el sitio de documentación de upstream, pero arrastra la carpeta `website/` (42 archivos, con su propio `package.json`, `pnpm-lock.yaml` y jobs de CI). Esa carpeta solo agrega ruido en los diffs, peso al clonar, builds/audits innecesarios y superficie de conflictos en cada sincronización con upstream.

Borrarla con un simple `git rm -r website/` no alcanza: en el siguiente `git merge upstream/main`, cada archivo de `website/` que upstream modifique produce un conflicto *modify/delete* que hay que resolver a mano, y cada archivo nuevo que upstream agregue en `website/` vuelve a entrar al fork sin conflicto y sin aviso. Este cambio borra la carpeta **y** deja un procedimiento de sincronización que mantiene la eliminación de forma automática.

## What Changes

- Se elimina la carpeta `website/` del fork (todos los archivos versionados).
- Se elimina `test/website-preview.test.ts`, que importa `website/scripts/preview.mjs` y no puede ejecutarse sin el sitio.
- Ediciones mínimas en archivos de upstream que dependen del sitio, para que la suite local y la CI sigan en verde:
  - `test/pnpm-workspace-config.test.ts`: se quitan los dos tests que leen `website/package.json` y `website/pnpm-lock.yaml`; se conservan los tests del workspace raíz.
  - `.github/workflows/ci.yml`: se quita `test/website-preview.test.ts` de la lista del job `docs` (la valida `test/ci-docs-only.test.ts`).
  - `.github/workflows/security.yml`: se quitan el paso "Audit documentation site" y el job `website-lockfile`.
  - `.github/dependabot.yml`: se quita el ecosistema npm de `/website`.
- Nuevo script de sincronización propio del fork que hace el merge de upstream y resuelve automáticamente todo lo que caiga en las rutas eliminadas por el fork (conflictos *modify/delete*, archivos nuevos y renombres), dejando para el mantenedor solo los conflictos reales fuera de esas rutas.
- Nueva documentación propia del fork (`FORK.md`) con la lista de rutas eliminadas, cómo sincronizar con upstream y por qué no usar el botón "Sync fork" de GitHub.

## Capabilities

### New Capabilities
- `fork-upstream-sync`: cómo el fork se sincroniza con upstream manteniendo ausentes las rutas que el fork eliminó de forma deliberada, qué resuelve automáticamente la sincronización y qué deja al mantenedor.

### Modified Capabilities
<!-- Ninguna: no cambia el comportamiento del CLI de OpenSpec ni de ninguna capacidad existente. -->

## Impact

- **Archivos eliminados**: `website/**` (42 archivos), `test/website-preview.test.ts`.
- **Archivos de upstream editados** (superficie de conflicto residual, baja): `test/pnpm-workspace-config.test.ts`, `.github/workflows/ci.yml`, `.github/workflows/security.yml`, `.github/dependabot.yml`.
- **Archivos nuevos propios del fork** (sin superficie de conflicto): script de sincronización en `scripts/fork/`, su test en `test/fork/`, y `FORK.md`.
- **Sin impacto** en el CLI publicado, sus dependencias, `pnpm-workspace.yaml` raíz (el sitio nunca fue miembro del workspace) ni en `docs/` y `docs-lab/`, que se conservan.
- **Flujo del mantenedor**: la sincronización con upstream pasa a hacerse con el script del fork en lugar de `git merge upstream/main` directo o el botón "Sync fork" de GitHub.
