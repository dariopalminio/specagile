# Tasks

El orden mantiene la suite en verde en cada grupo. Primero todo el código lee el layout desde un único módulo, que todavía resuelve `openspec/` (grupos 1 y 2). Después se cambia el layout en ese módulo (grupo 3), y por último se suman la detección del layout anterior, la migración y el texto de los skills (grupos 4 a 6).

## 1. Módulo de layout

- [x] 1.1 Crear `src/core/fork/layout.ts` con las constantes y funciones de la decisión 1:
  - constantes: `SPECS_DIR_NAME`, `CHANGES_DIR_NAME`, `ARCHIVE_DIR_NAME`, `TOOL_DIR_NAME`, `CONFIG_FILE_NAMES`, `SCHEMAS_DIR_NAME` y `FORMER_TOOL_DIR_NAME`;
  - funciones: `getSpecsDir`, `getChangesDir`, `getArchiveDir`, `getToolDir`, `getConfigFilePaths` y `getProjectSchemasDir`;
  - las formas relativas que usan los mensajes.

  Un único punto del módulo define el layout vigente. En este grupo todavía resuelve `openspec/…`, y el grupo 3 lo cambia. Verificar con `pnpm exec vitest run test/fork/layout.test.ts`: cada función devuelve la ruta esperada, armada con `path.join`.
- [x] 1.2 Agregar `test/helpers/layout.ts`, que reexporta para los tests las funciones de `layout.ts`, y hacer que `createOpenSpecRoot` y `writeSpec` de `test/helpers/openspec-fixtures.ts` las usen. Verificar con `pnpm exec vitest run test/core/openspec-root.test.ts test/core/root-selection.test.ts` en verde.

## 2. El código y los tests leen el layout del módulo (sin cambio de comportamiento)

- [x] 2.1 Hacer que la resolución de raíz y de config use `layout.ts`:
  - `project-dir.ts`;
  - `openspec-root.ts` (las constantes `OPENSPEC_*`);
  - `root-selection.ts` (`makeRoot` y los mensajes que nombran la config);
  - `planning-home.ts`;
  - `project-config.ts` (`resolveConfigFilePath`, `classifyOpenSpecDir`, `configPathForWarnings` y `suggestSchemas`);
  - `artifact-graph/resolver.ts` (`getProjectSchemasDir`).

  Resolver cada uso de `OPENSPEC_DIR_NAME` según lo que significa (decisión 1). Verificar con `pnpm exec vitest run test/core/root-selection.test.ts test/core/planning-home.test.ts test/core/project-config.test.ts test/core/openspec-root.test.ts test/commands/store-phantom-root.test.ts` en verde.
- [x] 2.2 Hacer lo mismo en los comandos y lectores:
  - `commands/`: `spec.ts` (`SPECS_DIR`), `change.ts`, `schema.ts`, `shared-gather.ts`, `doctor.ts`, `config.ts`, `store.ts`, `validate.ts` y `workflow/shared.ts`;
  - `core/`: `list.ts`, `view.ts`, `archive.ts`, `specs-apply.ts` (las rutas que muestra), `references.ts`, `known-projects.ts`, `relationship-health.ts`, `parsers/spec-structure.ts` y `artifact-graph/instruction-loader.ts`;
  - `utils/`: `item-discovery.ts`, `change-utils.ts`, `nested-change.ts` y `change-metadata.ts`;
  - la raíz implícita de `list` en `cli/index.ts`.

  Los mensajes arman la ruta con las formas relativas del módulo. Verificar con `pnpm exec vitest run test/commands test/utils test/core/list.test.ts test/core/view.test.ts test/core/archive.test.ts test/core/references.test.ts test/core/known-projects.test.ts` en verde.
- [x] 2.3 Hacer lo mismo en los que escriben:
  - `core/init.ts`: `createDirectoryStructure`, los `.gitkeep` y la línea `Config:` de la salida;
  - `core/update.ts`: `hasProject` y `updateProject`;
  - `core/legacy-cleanup.ts`: los `AGENTS.md` y `project.md` de la carpeta de la herramienta;
  - `core/store/operations.ts`, `core/project-skills-scope.ts` y `core/github-copilot/cloud-agent.ts` (la config donde se guarda la opción de Copilot).

  Verificar con `pnpm exec vitest run test/core/init.test.ts test/core/update.test.ts test/core/update-dry-run.test.ts test/core/legacy-cleanup.test.ts test/core/store` en verde.
- [x] 2.4 En `test/core/` y `test/commands/`, pasar las rutas `openspec/…` armadas a mano a `test/helpers/layout.ts`, o a las formas relativas del módulo en las aserciones de salida, sin cambiar lo que comprueban. Verificar:
  - `pnpm exec vitest run test/core test/commands` en verde;
  - una búsqueda de `'openspec'` y `openspec/` en esas carpetas solo encuentra textos que no son el layout del proyecto: nombres de skills, carpetas de herramientas y la ubicación sugerida para los stores.
- [x] 2.5 Hacer lo mismo en `test/cli-e2e/`, `test/utils/`, `test/specs/` y el resto de `test/`, salvo `test/cli-e2e/upgrade-from-releases.test.ts`, que se ajusta en el grupo 5. Verificar:
  - `pnpm test` en verde en Linux o WSL2;
  - en Windows, la línea base acotada de AGENTS.md (`pnpm test -- --run test/core/schemas test/core/skills test/commands`) sin fallas nuevas.
- [x] 2.6 Agregar a `test/fork/layout.test.ts` el test de rutas de `src/` de la decisión 7, con su lista de textos permitidos y el motivo de cada uno. La lista incluye los textos que no son rutas: `format: 'openspec'`, `author: 'openspec'` y las etiquetas de dueño de `removeFile`. Verificar que pasa con el refactor completo y que falla si se agrega a mano un `path.join(root, 'openspec', 'specs')` en un archivo de `src/`.

## 3. Cambio al layout nuevo

- [x] 3.1 Pasar el layout vigente de `layout.ts` a la raíz (`specs/`, `changes/`, `specagile/`) y la marca de raíz a `specagile/`. `findRepoPlanningRootSync` y `classifyOpenSpecDir` siguen la decisión 2: la config en `specagile/`, y `specs/` y `changes/` junto a esa carpeta, sin metadatos de store. Verificar con tests nuevos en `test/core/root-selection.test.ts` para los escenarios de "La raíz se reconoce por `specagile/`", con las rutas canonicalizadas (test/AGENTS.md):
  - un comando desde una subcarpeta;
  - un repo con un `specs/` de tests (`"root": null`);
  - un `specagile/` sin config en una carpeta personal falsa.
- [x] 3.2 Aplicar en `spec-path-containment.ts` la regla de contención de enlaces de la decisión 5. Verificar con `pnpm exec vitest run test/cli-e2e/spec-symlink-into-project.test.ts` y con casos nuevos:
  - un enlace dentro del proyecto se acepta;
  - uno que sale del proyecto se rechaza;
  - un store en `<tmp>/openspec/team` toma el store como límite.
- [x] 3.3 Hacer que `init`, `new change` sobre una raíz implícita y `store setup` creen `specs/`, `changes/archive/` y `specagile/config.yaml`, con `.gitkeep` donde hoy los ponen. Verificar con tests para "Inicializar un proyecto nuevo", "Crear un change", "Archivar un change", "Esquema propio del proyecto", "Crear un store" y para la salida de `init` (`Config: specagile/config.yaml`). Las aserciones de rutas se arman con `path.join`, así que también valen en Windows.
- [x] 3.4 Ajustar las aserciones que fijan textos del layout anterior fuera del módulo, como las salidas en snapshots y las fixtures de `test/fixtures/`. Verificar con `pnpm test` en verde en Linux o WSL2 y con la línea base de Windows sin fallas nuevas.
- [x] 3.5 Documentar el layout nuevo:
  - `README.md` y `skills/README.md`;
  - en `docs-lab/`: `start/` (`setup.md`, `quickstart.md`, `installation.md`), `reference/` (`cli.md`, `glossary.md`, `skills.md`, `configuration/*.md`, `schemas/**/*.md`), `customize/` (`schemas.md`, `project-config.md`), `multi-repo/` (`stores.md`, `worksets.md`), `guides/teams.md`, `help/faq.md` y `message-map.md`;
  - en `FORK.md`, una sección "Project layout" con el módulo, las constantes, la marca de raíz y qué conserva su nombre. Reemplaza la frase de "SpecAgile identity" que dice que la carpeta `openspec/` del proyecto conserva su nombre.

  Las guías de upgrade anteriores (`help/upgrade-to-2.md`, `help/upgrade-to-2-1.md`, `help/legacy/migration.md`) se dejan como registro. Verificar:
  - `pnpm exec vitest run test/apply-docs-claims.test.ts test/explore-docs-claims.test.ts test/init-store-docs-claims.test.ts test/setup-docs-claims.test.ts test/skills-docs-claims.test.ts test/upgrade-to-2-docs-claims.test.ts test/fork/fork-docs.test.ts`;
  - una búsqueda de `openspec/` en las páginas editadas solo encuentra menciones al layout anterior.

## 4. Detección del layout anterior

- [x] 4.1 Agregar `detectFormerLayout` en `layout.ts` (decisión 2): un `openspec/` con config, o con `specs/` o `changes/` sin metadatos de store. Verificar con `test/fork/layout.test.ts`:
  - detecta un proyecto de 2.1 y un repo cuyo único contenido es un `openspec/config.yaml` que declara un store;
  - no detecta una carpeta personal falsa con `openspec/team/.openspec-store/`, ni una con `openspec/specs/.openspec-store/`.
- [x] 4.2 Hacer que el walk de raíz se detenga en una carpeta que solo tiene el layout anterior y falle con `former_layout`: el mensaje nombra la carpeta y el `fix` es "Run specagile update". `resolveRootForCommand` lo devuelve como diagnóstico con `--json`. Verificar con tests para:
  - "Crear un change sin migrar": no se crean `changes/` ni `specagile/`;
  - "Listar con `--json` sin migrar": desde una subcarpeta, `"root": null` y código distinto de cero;
  - "Usar un proyecto sin migrar", de `fork-cli-name`;
  - una raíz donde conviven `specagile/` y `openspec/`: gana el layout nuevo.
- [x] 4.3 Para los stores, hacer que `inspectOpenSpecRoot` agregue el diagnóstico `openspec_former_layout`, con la ruta del store y el `fix`, y que `--store`, `store doctor` y `store register` lo muestren. Verificar con un test para "Usar un store sin migrar" en `test/commands/store-root-selection.test.ts` y otro para `store doctor` en `test/commands/store.test.ts`.

## 5. Migración

- [x] 5.1 Crear `src/core/fork/layout-migration.ts` con `migrateFormerLayout(root, ops)` (decisión 3): precondición, plan explícito, chequeo de destinos, `rename` con ledger, reintentos acotados ante `EPERM`, `EBUSY` o `EACCES` en Windows, deshacer en orden inverso, cierre y lista de movimientos. Verificar con tests unitarios que inyectan `ops`, comparando el árbol con `test/helpers/fs-snapshot.ts`:
  - el plan para un proyecto de 2.1 con `schemas/` y `explorations/`;
  - un destino `specs/` con contenido: no se mueve nada;
  - un destino vacío: se migra;
  - una falla simulada en el segundo movimiento: el árbol queda idéntico;
  - una falla también al deshacer: el error lista qué quedó dónde;
  - `openspec/specs` como enlace: se mueve el enlace, no su destino. Este caso se omite donde la plataforma no deja crear enlaces.
- [x] 5.2 Integrar la migración en `update` (decisiones 3 y 4):
  - es el primer paso de `updateProject`, y `hasProject` cuenta el layout anterior;
  - si está bloqueada, termina con error antes de cualquier otro cambio;
  - si conviven los dos layouts, avisa que el `openspec/` queda sin usar;
  - informa con las líneas `Moved … → …` y un recordatorio de commitear.

  Verificar con tests en `test/core/update.test.ts` para:
  - "Migrar un proyecto existente";
  - "El resto de `openspec/` pasa a `specagile/`";
  - "Un repo que declara un store";
  - "Los dos layouts en la misma raíz";
  - "Una carpeta `specs/` de tests ocupa el destino": código distinto de cero y skills sin tocar;
  - "Una carpeta de destino vacía";
  - "Un change migrado conserva sus metadatos".
- [x] 5.3 En `update --dry-run`, planificar la migración sobre `UpdatePlanRecorder` y `this.view`, y registrar un bloqueo como falla del plan. Verificar:
  - `test/core/update-dry-run.test.ts` y `test/cli-e2e/update-dry-run.test.ts` para "Simular un proyecto con el layout anterior" y "Simular con el destino ocupado": ningún archivo cambia, comparado con `fs-snapshot`;
  - `test/core/update-dry-run.property.test.ts` en verde: el plan coincide con lo que hace la ejecución real.
- [x] 5.4 Integrar la migración en `init`: el modo extendido incluye el layout anterior, y la migración corre antes del guard de punteros a store. Verificar con tests en `test/core/init.test.ts` para:
  - "Migrar con `specagile init`";
  - un repo con un `openspec/config.yaml` que declara un store: después de `init` queda `specagile/config.yaml` y el guard lo lee.
- [x] 5.5 Hacer que `update`, corrido en la carpeta de un store, la migre y deje `.openspec-store/` intacto. Verificar con un test para "Migrar un store" en `test/cli-e2e/store-lifecycle.test.ts`: después de la migración, `specagile list --store team` lista sus changes.
- [x] 5.6 Ajustar `test/cli-e2e/upgrade-from-releases.test.ts`: un proyecto creado por cada release (las de OpenSpec, y `specagile@2.1.2` si está publicado) queda, después de `specagile update`, con el layout nuevo, y `specagile list` lista sus changes. Verificar con `OPENSPEC_RELEASE_UPGRADES=1 pnpm exec vitest run test/cli-e2e/upgrade-from-releases.test.ts`.
- [x] 5.7 Verificación manual en Windows 11, desde PowerShell, sobre un proyecto de prueba:
  - "Migrar en Windows", con la capacidad anidada `identity/user-auth`;
  - "Un archivo bloqueado en Windows": abrir un archivo de `openspec\changes\` en exclusiva desde otra sesión, con `[System.IO.File]::Open(<ruta>, 'Open', 'Read', 'None')`. `specagile update` tiene que deshacer lo movido, nombrar el archivo y, al cerrarlo y repetir, completar la migración.

  Registrar el resultado en la tabla "Verification record" de `FORK.md`.
- [x] 5.8 Documentar la migración:
  - una guía nueva en `docs-lab/help/`: qué se mueve, `--dry-run`, las carpetas que la bloquean, Windows, commitear, equipos con OpenSpec upstream o con versiones anteriores de SpecAgile, y cómo volver atrás. Se enlaza desde `docs-lab/README.md` y desde una nota en las guías de upgrade anteriores;
  - en `AGENTS.md`, la regla "No renombrar `openspec/`" pasa a referirse a la carpeta de este repositorio, y se agrega que en su raíz no se ejecutan `specagile update` ni `specagile init`, porque migrarían su `openspec/`.

  Verificar con los tests `test/*docs-claims*.test.ts` en verde y siguiendo la guía paso a paso en el proyecto de prueba de 5.7.

## 6. Texto de skills, esquema y mensajes

- [x] 6.1 Separar `applyForkNames`, que es la traducción de nombres de hoy, y hacer que `applyForkIdentity` aplique además `LAYOUT_TEXT_REPLACEMENTS` (decisión 6). Actualizar los comentarios de `identity.ts`. Verificar con `test/fork/identity.test.ts`:
  - cada entrada de la tabla se traduce;
  - el resultado es idempotente;
  - `.openspec.yaml`, `.openspec-target`, `.openspec-store/`, `~/openspec/<id>` y `@fission-ai/openspec` quedan intactos.
- [x] 6.2 Extender `withUpstreamIdentity` (`test/helpers/fork-identity.ts`) con la inversa de la tabla y agregar el test de ida y vuelta sobre cada plantilla de `src/core/templates/workflows/`. Verificar con `pnpm exec vitest run test/fork test/core/templates` en verde.
- [x] 6.3 En `cloud-agent.ts`, sumar a los textos que se reconocen como salida anterior los de upstream traducidos solo con `applyForkNames`, que son los que escribió SpecAgile 2.1. Verificar con tests:
  - un `.github/agents/openspec.agent.md` escrito por 2.1 se refresca con el texto nuevo;
  - uno editado por el usuario se conserva.
- [x] 6.4 Reescribir las rutas `openspec/specs/…` de `schemas/spec-driven/schema.yaml` y `schemas/spec-driven/templates/proposal.md`, distinguiendo la spec viva (`<planningHome.root>/specs/<capability-path>/spec.md`) del delta del change. Verificar:
  - un test para "Instrucciones de specs para una capacidad modificada" (`specagile instructions specs --change <c> --json`);
  - `pnpm exec vitest run test/core/artifact-graph` en verde.
- [x] 6.5 Regenerar con `pnpm build && pnpm regen:parity-hashes && pnpm generate:skills`, y agregar a `test/fork/generated-skills-identity.test.ts` la comprobación de que ningún skill generado ni archivo de `skills/` nombra `openspec/`. Verificar:
  - `pnpm exec vitest run test/fork test/core/templates test/skills-docs-claims.test.ts` en verde;
  - los escenarios "El skill de propose lee la config nueva", "El skill de sync nombra las specs vivas" y "Distribución estática".
- [x] 6.6 Actualizar `FORK.md`:
  - en "SpecAgile identity", describir `applyForkNames`, la tabla del layout y su inversa;
  - en "Upstream files edited for the identity", sumar los archivos de upstream que editó este change;
  - en "When a sync touches the identity", explicar qué hacer cuando falla el test de rutas de `src/` o el de skills generados.

  Verificar con `pnpm exec vitest run test/fork/fork-docs.test.ts` en verde.

## 7. Verificación integrada

- [x] 7.1 Correr `pnpm build`, `pnpm lint` y `pnpm test` completos en Linux (Docker `node:22-bookworm` o WSL2), todo en verde. En Windows 11, correr la línea base acotada de AGENTS.md más `test/fork`, sin fallas nuevas respecto de `main`.
- [x] 7.2 Probar la instalación empaquetada, en Windows y en Linux. Hacer `pnpm pack` e instalarlo globalmente en un prefijo temporal, con el repositorio de skills simulado de `test/helpers/skill-release.mjs`, porque el tag de la versión nueva todavía no existe. Verificar:
  - `specagile init --tools claude` en un proyecto nuevo deja `specs/`, `changes/archive/` y `specagile/config.yaml`, y skills `sa-*` sin rutas `openspec/`;
  - `specagile update` sobre un proyecto creado con `specagile@2.1.2` lo migra, y después `specagile list` lista sus changes.
- [x] 7.3 Verificar en CI de Windows. Si el CI del fork está habilitado, correr sobre la rama la matriz de `.github/workflows/ci.yml` (`windows-latest`, `windows-pwsh`) en verde. Si no, dejar registradas en la tabla "Verification record" de `FORK.md` las verificaciones de 7.1 y 7.2 con plataforma, alcance y resultado.

## Workflow follow-up

- Antes de archivar este change, archivar `rename-skills-and-cli-to-specagile` y `add-specify-and-plan-workflows`. Sus capacidades (`fork-cli-name`, `fork-skill-names` y `opsx-specify-skill`) tienen que existir como specs principales para que se apliquen los MODIFIED de este change.
- Commitear según AGENTS.md: los artefactos de `openspec/changes/adopt-tool-agnostic-layout/` van en un commit propio, separado del código.
- Archivar este change cuando se cumplan los requisitos de revisión del proyecto, y verificar el resultado.
- El release lo hace el mantenedor: elegir la versión, crear el tag `v<versión>` sobre un commit cuyo `skills/` coincida con el paquete y ejecutar `npm publish`.
- Change posterior: migrar el `openspec/` de este repositorio cuando haya un `specagile` publicado con el layout nuevo.
