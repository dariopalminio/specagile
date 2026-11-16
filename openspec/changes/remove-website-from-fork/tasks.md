# Tasks

## 1. Línea base y lista de rutas eliminadas

- [x] 1.1 Ejecutar `pnpm test` en Windows antes de tocar nada y guardar fuera del repo la lista de archivos de test que fallan (fallos conocidos de upstream en Windows, ver `CONTRIBUTING.md`); verificar que la lista quedó registrada para comparar en 3.6 y 5.1.
- [x] 1.2 Crear `scripts/fork/removed-paths.mjs` que exporte `FORK_REMOVED_PATHS = ['website', 'test/website-preview.test.ts']` e `isForkRemovedPath(gitPath)` (igualdad exacta o prefijo `entrada + '/'`, sin regex ni globs, comparando rutas en formato git); verificar con 1.3.
- [x] 1.3 Agregar `test/fork/removed-paths.test.ts`: coinciden la carpeta, archivos anidados y el test listado; no coinciden `website-assets/...`, `test/website-preview.helpers.ts`, `docs/...` ni `Website/...` (otra capitalización). Construir las rutas con `path.posix.join` y sin los textos literales `website/` ni `docs-lab` (ver design §6, trampa de `test/ci-docs-only.test.ts`); verificar `pnpm exec vitest run test/fork/removed-paths.test.ts` en verde.

## 2. Script de sincronización

- [x] 2.1 Crear `scripts/fork/sync-upstream.mjs` (ESM, sin dependencias) con `--remote` (default `upstream`), `--branch` (default `main`), `--no-commit` y `--help`; resolver el toplevel con `git rev-parse --show-toplevel` y ejecutar git con `spawnSync` y array de argumentos, sin shell; verificar que `node scripts/fork/sync-upstream.mjs --help` funciona igual desde PowerShell y desde Git Bash.
- [x] 2.2 Implementar las verificaciones previas (cambios sin commitear en archivos versionados, `MERGE_HEAD` existente, remoto inexistente) con mensaje accionable y código de salida 1, sin modificar el repositorio; verificar con los escenarios de "estado inseguro" de 2.5.
- [x] 2.3 Implementar `git fetch`, la detección de "nada para integrar" (`merge-base --is-ancestor`, salida 0 sin commit) y `git merge --no-ff --no-commit`, distinguiendo un merge con conflictos de uno que no empezó (sin `MERGE_HEAD` → mostrar stderr de git y salir con 1); verificar con 2.5.
- [x] 2.4 Implementar la poda y el cierre: contar entradas con `git ls-files -z --cached -- <entradas>`, ejecutar `git rm -r -f -q --ignore-unmatch -- <entradas>`, listar conflictos restantes con `git diff --name-only --diff-filter=U -z` (salida 2 con instrucciones de continuar/abortar), modo `--no-commit` (salida 0 con instrucciones), `git commit --no-edit` con verificación posterior vía `git ls-tree -r --name-only -z HEAD -- <entradas>`, aviso (sin borrar) si una carpeta listada sigue en disco usando `path.join(root, ...entrada.split('/'))`, y recordatorio de `pnpm install` + `pnpm test`; verificar con 2.5.
- [x] 2.5 Agregar `test/fork/sync-upstream.test.ts` con repos temporales (`fs.mkdtempSync(path.join(os.tmpdir(), ...))`, `git init -b main`, `user.name`/`user.email` configurados localmente porque vitest aísla `HOME`) que cubra cada escenario de la spec: modificación dentro de la carpeta eliminada, archivo nuevo, renombre dentro de la carpeta, test listado modificado, ruta de nombre parecido que sí se integra, merge limpio con commit de merge (upstream como segundo padre y cambios de `src` aplicados), nada para integrar, conflicto fuera de la lista (salida 2, sin rutas de la carpeta en la lista de pendientes, y `git merge --abort` restaura `HEAD`), las tres verificaciones previas y `--no-commit`. Sin los textos literales `website/` ni `docs-lab`; timeout por test de al menos 30 s; verificar `pnpm exec vitest run test/fork/` en verde en Windows.

## 3. Eliminar el sitio del fork

- [x] 3.1 Ejecutar `git rm -r website` y `git rm test/website-preview.test.ts`; si `website/` sigue en disco con contenido ignorado, borrarlo; verificar que `git ls-files -- website test/website-preview.test.ts` no devuelve nada y que la carpeta no existe.
- [x] 3.2 En `test/pnpm-workspace-config.test.ts` quitar solo los `it` "keeps the website as an independently locked project" y "previews the built site without a server dependency"; verificar que `pnpm exec vitest run test/pnpm-workspace-config.test.ts` pasa con los 2 tests restantes.
- [x] 3.3 En `.github/workflows/ci.yml` quitar solo la línea `test/website-preview.test.ts` del job `docs` (dejar los filtros `'!website/**'`); verificar que `pnpm exec vitest run test/ci-docs-only.test.ts` pasa.
- [x] 3.4 En `.github/workflows/security.yml` quitar el paso "Audit documentation site" y el job `website-lockfile`, cada uno con su comentario; verificar que el YAML parsea, que `git grep -n website -- .github/workflows/security.yml` no devuelve nada y que el test "includes install policy changes in Nix and security validation" sigue pasando.
- [x] 3.5 En `.github/dependabot.yml` quitar el bloque `package-ecosystem: npm` con `directory: /website` (dejar el comentario de cabecera); verificar que el YAML parsea y que `git grep -n "directory: /website" -- .github/dependabot.yml` no devuelve nada.
- [x] 3.6 Ejecutar `pnpm test` en Windows y comparar con la línea base de 1.1; verificar que no hay fallos nuevos y que ningún fallo menciona archivos del sitio.

## 4. Documentación del fork y guarda contra reintroducción

- [x] 4.1 Crear `FORK.md` en la raíz con: rutas eliminadas (las de `FORK_REMOVED_PATHS`), comando `node scripts/fork/sync-upstream.mjs` y sus opciones, códigos de salida y qué hacer ante conflictos, advertencia sobre el botón "Sync fork" de GitHub y sobre `git merge upstream/main` directo, recomendación de `git config rerere.enabled true`, cómo agregar una ruta a la lista, y nota sobre el remoto `upstream` por SSH/HTTPS; verificar que el comando documentado con `--help` se ejecuta tal como está escrito.
- [x] 4.2 Agregar `test/fork/fork-docs.test.ts`: cada entrada de `FORK_REMOVED_PATHS` aparece en `FORK.md`, y `git ls-files -z -- <entradas>` en la raíz del proyecto no devuelve nada (omitir esta parte si el proyecto no es un checkout de git); sin los textos literales `website/` ni `docs-lab`; verificar que pasa, que falla si se agrega temporalmente una entrada ficticia a la constante, y revertir esa prueba.

## 5. Verificación integral

- [x] 5.1 Ejecutar `pnpm test` completo en Windows (PowerShell) y en Linux (WSL2); verificar que los tests de `test/fork/` pasan en ambos y que no hay fallos nuevos respecto de la línea base.
- [x] 5.2 Verificación de CI en Windows: si el mantenedor habilita Actions en el fork y aprueba hacer push de la rama, confirmar que el job de la matriz `Test` para Windows y el job `docs` pasan; si no, dejar constancia de que la verificación de Windows se hizo localmente en 5.1.
- [x] 5.3 Ejecutar `openspec validate remove-website-from-fork --strict` y verificar que el change es válido.

## Workflow follow-up

- Hacer commit del cambio en `feat/agile-openspec-customizations` (por ejemplo `chore(fork): remove documentation website and add upstream sync script`) e integrarlo en `main` del fork.
- Primera sincronización real con el árbol limpio: `node scripts/fork/sync-upstream.mjs --no-commit`, revisar que el índice no contiene rutas eliminadas y confirmar con `git commit` o abortar con `git merge --abort`.
- Archivar el change una vez revisado.
