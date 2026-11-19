# Design

## Context

La motivación está en proposal.md (Why). Este es el estado actual que condiciona el enfoque:

- La ruta `openspec/` aparece en `src/` de tres formas:
  - constantes de upstream: `OPENSPEC_DIR_NAME` (`project-dir.ts`); `OPENSPEC_ROOT_DIR`, `OPENSPEC_SPECS_DIR`, `OPENSPEC_CHANGES_DIR`, `OPENSPEC_ARCHIVE_DIR` y `OPENSPEC_CONFIG_*` (`openspec-root.ts`); `SPECS_DIR` (`commands/spec.ts`);
  - uniones sueltas como `path.join(root, 'openspec', 'changes')`, en `root-selection.ts`, `planning-home.ts`, `item-discovery.ts`, `list.ts`, `view.ts`, `change.ts`, `instruction-loader.ts`, `change-utils.ts`, `workflow/shared.ts`, `project-config.ts`, `resolver.ts`, `references.ts` y otros;
  - textos de mensajes: `openspec/config.yaml` en la salida de `init`, en los errores de esquema y en las sugerencias de store.
- La raíz se busca subiendo hasta el primer `openspec/` (`findRepoPlanningRootSync`). Para contar como raíz tiene que calificar según `classifyOpenSpecDir`: `openspec/specs` u `openspec/changes` sin metadatos de store, o una config. Esa regla evita que `~/openspec/<id>`, la ubicación sugerida para los stores, convierta la carpeta personal en raíz.
- Las plantillas de skills de upstream (`src/core/templates/workflows/`) nombran `openspec/…` en unas 40 líneas, y AGENTS.md pide no editarlas. La identidad se aplica al generar, con `applyForkIdentity`, que hoy deja las rutas como están. En los tests, `withUpstreamIdentity` la invierte para que los tests de upstream comparen contra el texto original.
- `update` ya mueve carpetas de herramientas con plan de `--dry-run`: `migrateLegacyToolDirs` (`migration.ts`) y `UpdatePlanRecorder.moveFile` (`update-plan.ts`), que mueve un directorio entero.
- `cloud-agent.ts` reconoce como salida anterior, por texto exacto, los archivos de Copilot que escribieron upstream y versiones previas.
- `createChange` (`change-utils.ts`) completa la raíz al crear un change: specs, archive y config. Así, un `new change` sobre una raíz implícita deja una raíz sana.
- AGENTS.md pide diffs chicos contra upstream.

## Goals / Non-Goals

**Goals:**

- Un único lugar, propio del fork, con los nombres y las rutas del layout.
- Que una sync de upstream que agregue una ruta `openspec/` haga fallar un test, en vez de pasar inadvertida.
- Una migración que mueva todo o nada, que `--dry-run` planifique con la misma lógica y que en Windows aguante archivos abiertos.

**Non-Goals:**

- Renombrar símbolos de upstream: `OPENSPEC_DIR_NAME`, `inspectOpenSpecRoot`, `ResolvedOpenSpecRoot`, `classifyOpenSpecDir` y los códigos de diagnóstico `openspec_*` conservan su nombre y cambian lo que resuelven, para achicar el diff.
- Leer el layout anterior en los comandos normales. Solo se detecta, para pedir la migración.
- Migrar el `openspec/` del repo del fork (ver la proposal).

## Decisions

### 1. `src/core/fork/layout.ts` es la fuente del layout

Es un archivo propio del fork, como `identity.ts`, así que una sync nunca choca ahí. Exporta los nombres como constantes (la config del proyecto pide registrar por nombre lo que se genera) y funciones que arman las rutas con `path.join`:

| Constante | Valor |
|---|---|
| `SPECS_DIR_NAME` | `specs` |
| `CHANGES_DIR_NAME` | `changes` |
| `ARCHIVE_DIR_NAME` | `archive` |
| `TOOL_DIR_NAME` | `specagile` |
| `CONFIG_FILE_NAMES` | `config.yaml`, `config.yml` (en ese orden de preferencia) |
| `SCHEMAS_DIR_NAME` | `schemas` |
| `FORMER_TOOL_DIR_NAME` | `openspec` (solo para detección y migración) |

Las funciones son `getSpecsDir(root)`, `getChangesDir(root)`, `getArchiveDir(root)`, `getToolDir(root)`, `getConfigFilePaths(root)` y `getProjectSchemasDir(root)`. El módulo también da las formas relativas con `/` que usan los mensajes (`specagile/config.yaml`), así como hoy los mensajes escriben `openspec/config.yaml` en todas las plataformas.

Las constantes de upstream conservan su nombre y toman el valor de este módulo (`OPENSPEC_SPECS_DIR = SPECS_DIR_NAME`, `OPENSPEC_ROOT_DIR = TOOL_DIR_NAME`, …), y `SPECS_DIR` de `commands/spec.ts` pasa a `SPECS_DIR_NAME`. Cada `path.join(x, 'openspec', …)` suelto se reemplaza por la función que corresponde.

Los usos de `OPENSPEC_DIR_NAME` se revisan uno por uno, porque hoy significa tres cosas distintas:

- la carpeta de la config: pasa a `getToolDir`;
- la marca de un proyecto: pasa a la detección de la decisión 2;
- el contenedor de la planificación en `spec-path-containment.ts`: ver la decisión 5.

Su valor queda en `TOOL_DIR_NAME`, para cubrir un uso nuevo que traiga una sync.

Alternativas descartadas:

- Cambiar solo los literales en su lugar: el diff es mínimo, pero no queda una fuente única ni manera de testear que no vuelvan.
- Renombrar los símbolos de upstream: queda más claro, pero multiplica los conflictos.

### 2. La raíz se reconoce por `specagile/`; el layout anterior solo se detecta

- `findRepoPlanningRootSync` busca `specagile/` en vez de `openspec/`. `classifyOpenSpecDir(root)` mira `specs/` y `changes/` junto a `specagile/` (sin metadatos de store, como hoy) y busca la config dentro de `specagile/`. La regla para calificar no cambia: estructura de planificación o config.
- `specs/` no sirve como marca: muchos repos lo usan para tests, y cualquier ancestro con un `specs/` pasaría a ser raíz.
- `detectFormerLayout(dir)` aplica la misma regla a `openspec/`: una config en `openspec/`, o `openspec/specs` u `openspec/changes` sin metadatos de store. Un `openspec/` que no cumple la regla no es layout anterior. Así, un `~/openspec/` con stores adentro nunca se confunde con un proyecto por migrar, y nunca se mueve.
- El walk de raíz mira primero el layout nuevo en cada carpeta. Si no califica pero el anterior sí, el walk se detiene ahí y falla con un `RootSelectionError` de código `former_layout`, un `fix` "Run specagile update" y un mensaje que nombra la carpeta. Esa es la raíz más cercana, así que no sigue subiendo: seguir podría terminar escribiendo en otra raíz.
- `--store` y `store doctor`: si falta el layout nuevo y está el anterior, `inspectOpenSpecRoot` agrega el diagnóstico `openspec_former_layout`, con la ruta del store y el `fix` de correr `specagile update` en ella. `resolveStoreRoot` ya junta esos mensajes en `unhealthy_store_root`. El mensaje de `store register` para una carpeta sin raíz sana también menciona la migración.
- `list` conserva su raíz implícita para los proyectos sin config: en `cli/index.ts`, `openspec/project.md` pasa a `specagile/project.md`.

### 3. La migración vive en `src/core/fork/layout-migration.ts`

`update` e `init` usan la misma función, `migrateFormerLayout(root, ops)`, que hace lo siguiente:

1. **Precondición**: `detectFormerLayout(root)` es verdadero y la raíz no califica con el layout nuevo. Si califican los dos, no migra y devuelve un aviso: el `openspec/` queda sin usar.
2. **Plan explícito**: `openspec/specs` va a `specs`, `openspec/changes` va a `changes` y cada otra entrada de `openspec/` va a `specagile/<entrada>`. Las entradas salen de leer el directorio, sin patrones. Una entrada que no existe no se planifica.
3. **Chequeo de destinos, antes de mover nada**: `specs/`, `changes/` y `specagile/` tienen que faltar o ser directorios vacíos, sin excepción para `.gitkeep`, para que la regla sea predecible. Si no, el error nombra la carpeta y no se toca nada.
4. **Movimientos con `fs.rename`**: uno por entrada de primer nivel, registrados en un ledger. Un destino vacío se quita antes, porque en Windows `rename` sobre un directorio existente falla con `EPERM`, y queda anotado para recrearlo. `specagile/` se crea si falta.
5. **Falla a mitad de camino**: ante `EPERM`, `EBUSY` o `EACCES` en Windows, se reintenta pocas veces con una espera corta. El antivirus y el indexador suelen soltar el archivo enseguida; graceful-fs se apoya en lo mismo. Si sigue fallando, se deshacen los movimientos del ledger en orden inverso, se recrean los destinos quitados y el error nombra la ruta que no se pudo mover. Si deshacer también falla, el error lista qué quedó dónde, para terminar a mano.
6. **Cierre**: `rmdir` de `openspec/`. Si apareció un archivo nuevo, la carpeta queda y se avisa. La función devuelve la lista de movimientos para informarlos.

Se usa `rename` y no copiar y borrar porque origen y destino comparten la carpeta padre, así que cada movimiento es atómico por entrada. Además conserva fechas, permisos y enlaces (un `openspec/specs` que es un enlace se mueve como enlace, sin seguirlo) y no deja copias a medias. Como son pocas operaciones (dos, más las otras entradas), deshacerlas es simple.

Integración:

- **`update`**: la migración es el primer paso de `updateProject`, antes de `migrateLegacyToolDirs`, porque todo lo que sigue lee el layout (config, `skillsScope`, limpieza de archivos heredados). `hasProject` pasa a ser "raíz nueva o layout anterior". Si la migración está bloqueada, `update` termina con error antes de cualquier otro cambio en el proyecto.
- **`update --dry-run`**: la misma función corre sobre `UpdatePlanRecorder` y `this.view`. `moveFile` mueve un directorio entero en el plan, así que los pasos siguientes ven el árbol ya movido. Un bloqueo se registra como falla del plan (`addFailure`) y el comando no falla, como hoy.
- **`init`**: el modo extendido incluye el layout anterior. La migración corre antes del guard de punteros a store, para que el guard lea `specagile/config.yaml`. Como la migración no cambia contenido, correrla aunque después el guard rechace no deja nada inconsistente.
- **Stores**: `update` en la carpeta de un store la migra igual que a un proyecto. `.openspec-store/` está en la raíz del store, fuera de `openspec/`, y no se toca.
- **Limpieza de archivos heredados** (`openspec/AGENTS.md` y `openspec/project.md` de OpenSpec 0.x): corre después de la migración, así que lee esos archivos en `specagile/`, a través del layout.

### 4. `update` e `init` informan la migración como las demás

Cada movimiento ocupa una línea (`Moved openspec/specs/ → specs/`), con el estilo de las líneas de `migrateLegacyToolDirs`, y al final un recordatorio de commitear. El aviso de un `openspec/` que quedó sin usar sale en amarillo, una vez por ejecución.

### 5. Contención de enlaces de specs sin contenedor

Hoy `findProjectRoot` (`spec-path-containment.ts`) devuelve el padre de `openspec/` cuando la carpeta de abajo es `specs` o `changes`, sin tocar el disco. En el layout nuevo no hay contenedor, así que la regla cambia: se sube desde el specs root y se devuelve el primer ancestro `A` tal que la carpeta de abajo es `specs` o `changes` y `A/specagile/` es un directorio.

- `<raíz>/specs`, `<raíz>/changes/<c>/specs` y `…/archive/<c>/specs` dan `<raíz>`.
- Un store en `~/openspec/team` da el store, no `~`.

La regla consulta el disco sobre las carpetas, nunca sobre el enlace del spec, así que la función sigue sin resolver enlaces. Sin `specagile/` devuelve null y la contención queda en el specs root, como hoy.

### 6. El texto de los skills se traduce al generar, con una tabla explícita

La traducción de nombres de hoy pasa a llamarse `applyForkNames`, y `applyForkIdentity` aplica `applyForkNames` y después la tabla `LAYOUT_TEXT_REPLACEMENTS` de `layout.ts`. Así, cada lugar que ya llama a `applyForkIdentity` recibe también el layout:

- `generateSkillContent`;
- los archivos de Copilot en la nube;
- las sugerencias de `init`, `update` y de la migración;
- las comparaciones de `former-skills.ts` y `migration.ts`, que comparan un skill anterior traducido con el texto actual, que ahora también tiene el layout.

`cloud-agent.ts` reconoce como salida anterior también los textos de upstream traducidos solo con `applyForkNames`, que son los que escribió SpecAgile 2.1. Sin eso, un archivo de Copilot de 2.1 parecería editado por el usuario y no se refrescaría.

La tabla es de textos completos, sin regex, ordenada del más largo al más corto. Por un lado, las rutas con su contexto, por ejemplo:

- `<planningHome.root>/openspec/specs/` → `<planningHome.root>/specs/`
- `<root.path>/openspec/config.yaml` → `<root.path>/specagile/config.yaml`
- ``under `openspec/changes/` by hand`` → ``under `changes/` by hand``

Por otro, las cinco frases que nombran `openspec/` solo:

| Upstream | SpecAgile |
|---|---|
| ``documentation outside `openspec/` `` | ``documentation outside `specs/`, `changes/` and `specagile/` `` |
| ``there is no `openspec/` directory here`` | ``there is no `specagile/` directory here`` |
| ``do not hand-create `openspec/` files`` | ``do not hand-create `specagile/`, `specs/` or `changes/` files`` |
| ``the nearest local `openspec/` root`` | ``the nearest local `specagile/` root`` |
| ``Matches in `openspec/` artifacts or docs`` | ``Matches in `specs/`, `changes/` or `specagile/` artifacts or docs`` |

Cada entrada lleva el contexto suficiente para que su traducción no aparezca en el texto de upstream. Eso hace la tabla invertible: `withUpstreamIdentity` la deshace exactamente, y los tests de upstream que fijan la redacción de una plantilla siguen como están. Una traducción suelta de `openspec/specs/` a `specs/` no se podría invertir, porque el texto de upstream ya usa `specs/` para el delta del change, y además mezclaría la spec viva con el delta.

Tests de esta decisión:

- (a) ida y vuelta sobre cada plantilla: `withUpstreamIdentity(applyForkIdentity(t)) === t`;
- (b) ningún skill generado ni archivo de `skills/` contiene `openspec/`;
- (c) los nombres internos (`.openspec.yaml`, `.openspec-target`, `.openspec-store/`) salen intactos.

### 7. El esquema y los mensajes se editan directamente

`schemas/spec-driven/schema.yaml` y `templates/proposal.md` ya son archivos de upstream editados para la identidad. La redacción nueva distingue la spec viva (`<planningHome.root>/specs/<capability-path>/spec.md`) del delta (el `specs/<capability-path>/spec.md` del change). Los mensajes de `src/` se editan en su lugar y arman la ruta con las constantes de `layout.ts`.

`test/fork/layout.test.ts` recorre `src/**/*.ts` y falla ante un literal con `openspec/` o un segmento `'openspec'` en una ruta. Igual que `cli-name.test.ts`, tiene una lista explícita de archivos y textos permitidos, cada uno con su motivo:

- `src/core/fork/layout.ts` y `src/core/fork/layout-migration.ts`, que nombran el layout anterior;
- la ubicación sugerida para los stores, `~/openspec/<id>` (`store.ts`, `store/operations.ts`, `references.ts`);
- carpetas de herramientas que no son parte del layout (`.cospec/openspec/commands`, `.claude/commands/openspec` y otras de `legacy-cleanup.ts`);
- el directorio global (`global-config.ts`, `telemetry/config.ts`) y los nombres de ejecutable (`executable-path.ts`, `install-standalone.ts`);
- los textos de upstream que `cloud-agent.ts` traduce al escribir.

### 8. Tests existentes: las fixtures pasan por el helper

`test/helpers/openspec-fixtures.ts` arma el layout nuevo, y se agregan helpers que reexportan las funciones de `layout.ts`. Las rutas sueltas de los tests pasan a esos helpers o a `path.join(root, 'specs', …)`. El cambio se hace por área, junto con el código de esa área. Los tests que arman el layout anterior a propósito (migración, limpieza de archivos heredados, upgrades desde releases) usan un helper con nombre propio, `createFormerLayout`, para que se distingan.

## Risks / Trade-offs

- [Muchas líneas de upstream editadas: una sync que las toque choca, y una que agregue una ruta `openspec/` la reintroduce] → Funciones centralizadas, el test de rutas de `src/`, el test de skills generados y una sección de FORK.md con los archivos editados y qué hacer en cada caso.
- [Un `specs/` o un `changes/` propio del repo bloquea la migración] → El mensaje nombra la carpeta y qué hacer, y la guía de docs-lab lo explica. No se mezclan contenidos: mover las specs a un `specs/` con tests confundiría specs vivas con tests.
- [En Windows, `rename` falla con `EPERM` o `EBUSY` por archivos abiertos o por el antivirus] → Reintentos cortos, deshacer lo movido y un mensaje que nombra el archivo. Un test simula la falla de un movimiento a mitad de camino y verifica que el árbol queda como estaba.
- [Un `~/openspec/` con stores se toma por un proyecto por migrar] → `detectFormerLayout` exige una config o `specs/`/`changes/` sin metadatos de store. Hay un test con una carpeta personal falsa.
- [Un equipo mezcla OpenSpec upstream y SpecAgile, o dos versiones de SpecAgile, en el mismo repo o store] → Después de migrar, `openspec` y un SpecAgile anterior no encuentran la raíz. Se documenta que el equipo tiene que actualizar SpecAgile antes de que alguien migre y commitee.
- [Correr `specagile update` en la raíz del fork migraría el `openspec/` del repo] → AGENTS.md lo prohíbe, igual que `init`.
- [Un proyecto migrado conserva skills instalados con el texto anterior] → `update` migra y regenera los skills del proyecto en la misma ejecución. Los skills globales se regeneran con la versión nueva.
- [Texto nuevo de upstream con una frase que la tabla no cubre] → El test (b) de la decisión 6 falla y nombra el skill.

## Migration Plan

1. Publicar un release con la versión que decida el mantenedor (el cambio es **BREAKING**), con la guía de migración en docs-lab.
2. En cada proyecto o store: actualizar SpecAgile, correr `specagile update --dry-run`, después `specagile update` y commitear el movimiento. Git lo registra como renombres.
3. Para volver atrás: antes del commit, restaurar el árbol con git. Después del commit, devolver `specs/`, `changes/` y el contenido de `specagile/` a `openspec/` e instalar la versión anterior de SpecAgile.
4. Este repositorio sigue con `openspec/`. Su migración queda para un change posterior (ver la proposal).

## Open Questions

- El número de versión del release (major o minor). Lo decide el mantenedor al publicar, y no cambia el plan.
