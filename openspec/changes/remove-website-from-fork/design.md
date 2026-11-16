# Design

## Context

Ver `proposal.md` (Why). Estado actual relevante:

- El fork todavía no divergió de upstream: `main`, `origin/main` y la rama `feat/agile-openspec-customizations` apuntan al commit de upstream `ea635dd`. Este cambio será uno de los primeros commits propios del fork.
- El remoto `upstream` existe (`git@github.com:Fission-AI/OpenSpec.git`, por SSH) pero nunca se hizo fetch: no hay refs `upstream/*` locales.
- `website/` tiene 42 archivos versionados y su propio `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml`. No es miembro del workspace raíz (`pnpm-workspace.yaml` raíz declara solo `'.'`), así que borrarlo no toca la instalación del CLI.
- Dependencias de upstream sobre el sitio (todas verificadas):
  - `test/website-preview.test.ts` importa `../website/scripts/preview.mjs` → la suite entera falla sin el sitio.
  - `test/pnpm-workspace-config.test.ts` tiene dos `it` que leen `website/package.json`, `website/pnpm-lock.yaml`, `website/pnpm-workspace.yaml` y `website/scripts/preview.mjs`.
  - `.github/workflows/ci.yml` lista `test/website-preview.test.ts` en el job `docs`; `test/ci-docs-only.test.ts` exige que cada archivo listado exista **y** que todo test que contenga `docs-lab` o `website/` esté listado.
  - `.github/workflows/security.yml`: paso "Audit documentation site" (`pnpm audit --dir website`) y job `website-lockfile`.
  - `.github/dependabot.yml`: ecosistema npm en `/website`.
- GitHub Actions está habilitado en el fork pero tiene 0 ejecuciones; hoy la CI del fork no corre, pero puede activarse.
- `vitest.config.ts` incluye `test/**/*.test.ts` y fija `HOME`/`USERPROFILE` a un directorio temporal: los tests no ven la configuración global de git del desarrollador.

## Goals / Non-Goals

**Goals:**
- Que una sincronización con upstream nunca requiera resolver a mano nada dentro de las rutas eliminadas por el fork, y que nada de esas rutas vuelva a entrar en silencio.
- Que la suite local (y la CI, si se activa) quede verde sin el sitio.
- Minimizar la cantidad de líneas de archivos de upstream que el fork edita, porque cada línea editada es superficie de conflicto futura.
- Funcionar igual en Windows (PowerShell, cmd, Git Bash), macOS y Linux.

**Non-Goals:**
- Borrar `docs/` o `docs-lab/` (este último es la fuente del sitio; queda como candidato para un cambio posterior).
- Reescribir la historia del repositorio para purgar `website/` de commits anteriores: el clon sigue trayendo la historia; el beneficio es en el árbol de trabajo, los diffs y los merges.
- Limpiar menciones textuales al sitio en archivos de upstream (comentarios en `dependabot.yml` y `test/explore-docs-claims.test.ts`, `docs-lab/`, `CHANGELOG.md`): son inofensivas y editarlas solo agregaría superficie de conflicto.
- Quitar los filtros `'!website/**'` de `ci.yml` y `binaries.yml`: no hacen daño y `test/ci-docs-only.test.ts` exige que ambas listas sean idénticas; dejarlas evita dos ediciones.
- Automatizar la sincronización en GitHub Actions (cron): queda manual y local.

## Decisions

### 1. Borrar + sincronizar con un script que poda las rutas eliminadas después del merge

El merge de upstream se hace con `--no-commit` y, antes de confirmarlo, el script quita del índice y del árbol de trabajo todo lo que caiga en la lista de rutas eliminadas. Eso resuelve en un solo paso los tres casos que rompen el enfoque ingenuo: conflictos *modify/delete* (upstream modifica, el fork borró), archivos nuevos que upstream agrega dentro de `website/` (entran sin conflicto) y renombres dentro de `website/` (conflictos *rename/delete*).

Alternativas descartadas:
- **`.gitattributes` con `website/** merge=ours`**: los merge drivers solo se invocan en merges de contenido, cuando los dos lados tienen el archivo. Un *modify/delete* es un conflicto de árbol: el driver nunca se ejecuta. Además no impide que entren archivos nuevos.
- **`git merge -X ours`**: actúa sobre hunks en conflicto de todo el repositorio (descartaría cambios legítimos de upstream en cualquier archivo) y no resuelve conflictos de árbol como *modify/delete*.
- **`git rerere`**: solo recuerda resoluciones de conflictos de contenido; no registra *modify/delete*. Sí se recomienda en `FORK.md` como complemento para los conflictos de contenido recurrentes en los 4 archivos de upstream editados.
- **`git sparse-checkout`**: oculta `website/` del árbol de trabajo pero lo sigue versionando; no reduce el repo, ni los diffs en GitHub, ni Dependabot/Security. No cumple el objetivo.
- **Rama espejo filtrada con `git filter-repo`**: reescribe la historia de upstream en cada sync y rompe la merge-base.
- **Estrategia de merge propia (`git-merge-<nombre>`)**: exige instalar un ejecutable en el `PATH` de cada clon; demasiado costo para el problema.

### 2. Script Node.js ESM sin dependencias en `scripts/fork/`

`scripts/fork/sync-upstream.mjs`, invocado como `node scripts/fork/sync-upstream.mjs [--remote upstream] [--branch main] [--no-commit]`.

- Node en lugar de bash/PowerShell: un solo script para los tres sistemas y el mantenedor trabaja en Windows. Llama a git con `child_process.spawnSync('git', args)` y un array de argumentos, sin shell: no hay problemas de comillas entre PowerShell, cmd y Git Bash.
- Subcarpeta `scripts/fork/` y archivo `FORK.md` en la raíz: nombres que upstream no usa, así que nunca colisionan en un merge.
- **No** se agrega un script a `package.json`: es un archivo de upstream que cambia en cada release (versión), y una entrada en `scripts` sería superficie de conflicto innecesaria.
- Ejecuta todos los comandos con `git -C <toplevel>` (resuelto con `git rev-parse --show-toplevel`), así funciona desde cualquier subcarpeta del repo.

### 3. Lista explícita de rutas en una constante

`scripts/fork/removed-paths.mjs` exporta:

```js
export const FORK_REMOVED_PATHS = ['website', 'test/website-preview.test.ts'];
export function isForkRemovedPath(gitPath) { /* igualdad exacta o prefijo `${entry}/` */ }
```

- La constante es la única fuente de verdad: la usan el script, sus tests y el test que valida `FORK.md`.
- La coincidencia es búsqueda explícita (igualdad o "está dentro de una carpeta listada"), no regex ni globs: `website-assets/` y `test/website-preview.helpers.ts` no coinciden.
- Las entradas se escriben en formato de ruta de git (separador `/`), que es como git las reporta en **todos** los sistemas, incluido Windows. Las comparaciones se hacen siempre contra salidas de git, nunca contra rutas del sistema de archivos. Cuando el script necesita tocar el disco (aviso de restos), convierte con `path.join(root, ...entry.split('/'))`.
- Las entradas se pasan a `git rm` como pathspecs (no los archivos expandidos), así la línea de comandos no crece con la cantidad de archivos (límite de ~32K caracteres en Windows).
- Las salidas de git se leen con `-z` (separadas por NUL) para no depender de `core.quotepath` con nombres no ASCII.

### 4. Flujo del script

1. **Verificaciones previas** (sin modificar nada): estamos en un repo git; no existe `MERGE_HEAD`; `git status --porcelain --untracked-files=no` vacío; `git remote get-url <remote>` existe. Si algo falla: mensaje con la acción a tomar, código de salida 1.
2. `git fetch <remote> <branch>`.
3. Si `git merge-base --is-ancestor <remote>/<branch> HEAD` → "nada para integrar", código 0.
4. `git merge --no-ff --no-commit <remote>/<branch>`. Un código distinto de cero es esperable cuando hay conflictos; si después no existe `MERGE_HEAD`, el merge ni empezó (por ejemplo, archivos sin versionar que se sobrescribirían): se muestra el stderr de git y se sale con 1.
5. Cuenta las entradas afectadas (`git ls-files -z --cached -- <entradas>`, que incluye las entradas en conflicto) y ejecuta `git rm -r -f -q --ignore-unmatch -- <entradas>`. `git rm` es la resolución estándar de un *modify/delete* a favor del borrado.
6. Conflictos restantes con `git diff --name-only --diff-filter=U -z`. Si hay: lista los archivos, indica `git add <archivo>` + `git commit` o `git merge --abort`, código 2. El merge queda en curso con las rutas eliminadas ya resueltas.
7. Con `--no-commit`: informa que el merge quedó preparado y cómo confirmarlo o abortarlo, código 0.
8. Si no: `git commit --no-edit` (mensaje por defecto de git, hooks normales). Verificación defensiva: `git ls-tree -r --name-only -z HEAD -- <entradas>` debe estar vacío.
9. Si alguna carpeta listada sigue existiendo en disco (contenido ignorado o sin versionar, como `node_modules`), lo avisa sin borrarlo: borrar archivos que git no rastrea sería destructivo.
10. Recuerda ejecutar `pnpm install` y `pnpm test`.

Códigos de salida: `0` éxito o nada para integrar, `1` verificación previa o fallo de git, `2` conflictos pendientes.

### 5. Ediciones mínimas en archivos de upstream

Solo se tocan las líneas que de otro modo romperían tests o workflows:

| Archivo | Edición |
|---|---|
| `test/pnpm-workspace-config.test.ts` | Quitar los `it` "keeps the website as an independently locked project" y "previews the built site without a server dependency". |
| `.github/workflows/ci.yml` | Quitar la línea `test/website-preview.test.ts` del job `docs`. |
| `.github/workflows/security.yml` | Quitar el paso "Audit documentation site" (con su comentario) y el job `website-lockfile` (con su comentario). |
| `.github/dependabot.yml` | Quitar el bloque `package-ecosystem: npm` de `directory: /website`. |

`test/website-preview.test.ts` no se edita: se borra y entra en la lista, así sus futuros cambios en upstream se resuelven solos.

### 6. Tests propios del fork en `test/fork/`

- `test/fork/sync-upstream.test.ts`: tests de integración con repos git temporales (`fs.mkdtempSync(path.join(os.tmpdir(), ...))`): un repo "upstream" con `website` y `src`, un clon "fork" con el remoto `upstream` apuntando al primero y el commit que borra las rutas. Cada escenario de la spec modifica upstream y ejecuta el script con `spawnSync(process.execPath, [script], { cwd: fork })`. Como vitest aísla `HOME`, cada repo temporal configura `user.name`/`user.email` localmente y se crea con `git init -b main`.
- `test/fork/fork-docs.test.ts`: cada entrada de `FORK_REMOVED_PATHS` aparece en `FORK.md`; y `git ls-files -z -- <entradas>` en la raíz del proyecto devuelve vacío (detecta un `git merge upstream/main` directo que reintrodujo archivos). Se omite si el proyecto no es un checkout de git.
- **Trampa a evitar**: `test/ci-docs-only.test.ts` exige que todo test cuyo contenido coincida con `/docs-lab|website\//` esté en la lista del job `docs` de `ci.yml`. Los tests del fork no deben contener los textos literales `website/` ni `docs-lab`: construyen rutas con `path.posix.join('website', ...)` (formato git) o con la constante. Si no, habría que editar otra vez `ci.yml`.
- Timeout por test más alto que el global de 10 s (varias invocaciones de git por escenario; Windows es más lento creando procesos).

### 7. Documentación en `FORK.md`

Rutas eliminadas (las de la constante), comando de sincronización y sus opciones, qué hacer ante conflictos, por qué no usar "Sync fork" de GitHub (con el fork divergido, GitHub hace un merge plano del lado del servidor: los archivos nuevos de `website/` vuelven a entrar y cualquier *modify/delete* lo bloquea), recomendación de `git config rerere.enabled true`, y cómo agregar una ruta a la lista.

## Risks / Trade-offs

- [Upstream cambia líneas cercanas a las 4 ediciones] → conflicto de contenido normal; el script lo lista y sale con código 2. `rerere` reaplica resoluciones repetidas.
- [Upstream agrega un test o workflow nuevo que depende de `website/`] → entra sin conflicto y rompe la suite o la CI. Mitigación: el script recuerda ejecutar `pnpm test`; si es un archivo completo dependiente del sitio, se agrega a la lista.
- [Upstream renombra un archivo de `website/` hacia fuera de la carpeta] → conflicto *rename/delete* en una ruta no listada; se reporta al mantenedor como conflicto real. Caso raro, aceptado.
- [El mantenedor usa `git merge upstream/main` o "Sync fork" por costumbre] → pueden reentrar archivos de `website/`. Mitigación: `FORK.md` y el test de `test/fork/fork-docs.test.ts` que falla si hay rutas eliminadas versionadas.
- [Diferencias de mayúsculas en Windows/macOS] → la coincidencia es exacta contra las rutas de git (que distinguen mayúsculas en todos los sistemas). Si upstream agregara `Website/` con otra capitalización, no coincidiría; se documenta como limitación, improbable.
- [Versión de git] → se usa `merge --no-ff --no-commit`, `rm --ignore-unmatch` y salidas `-z`, disponibles en git 2.x; los tests usan `git init -b` (git ≥ 2.28).
- [La historia sigue incluyendo `website/`] → el clon no se achica en historia; se acepta (ver Non-Goals).

## Migration Plan

1. En la rama `feat/agile-openspec-customizations` (que integra a `main` del fork): borrar las rutas listadas, aplicar las 4 ediciones, agregar script, tests y `FORK.md`, y verificar `pnpm test`.
2. Primera sincronización real: hacer `git fetch upstream` (el remoto usa SSH; si no hay clave configurada, cambiarlo a `https://github.com/Fission-AI/OpenSpec.git`) y ejecutar el script.
3. **Rollback**: `git revert` del commit de eliminación devuelve `website/` en la versión del fork; quitar la entrada de `FORK_REMOVED_PATHS` para que las siguientes sincronizaciones vuelvan a traer sus cambios. Alternativa para traer la versión más reciente: `git checkout upstream/main -- website`.
