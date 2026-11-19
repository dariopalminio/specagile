# Proposal

## Why

SpecAgile guarda las specs vivas y los changes en curso dentro de `openspec/`, la carpeta de la herramienta. Eso ata la documentación del producto a la herramienta que la escribe: cambiar de herramienta obliga a mover las specs, y quien abre el repo encuentra la fuente de verdad del sistema bajo el nombre de un tercero. OpenSpec se declara tool-agnostic, pero su layout por defecto no lo es. Con la identidad propia ya resuelta (CLI `specagile`, skills `sa-*`), falta que el layout tampoco dependa de `openspec/`.

## What Changes

- **BREAKING** — Nuevo layout del proyecto, en la raíz:

  ```
  specs/                    specs vivas, la fuente de verdad
  └── <capability-path>/spec.md
  changes/                  trabajo en curso
  ├── <change>/             proposal.md, design.md, tasks.md, .openspec.yaml
  │   └── specs/<capability-path>/spec.md   el delta
  └── archive/              changes archivados
  specagile/                archivos de la herramienta: config.yaml, schemas/ y
                            todo lo que antes vivía en openspec/ fuera de specs/ y changes/
  ```

  `specagile init` crea este layout. En un proyecto con el layout nuevo, ningún comando de SpecAgile crea, lee ni escribe `openspec/`.
- Una carpeta es raíz de SpecAgile cuando tiene `specagile/` con su config, o `specagile/` junto a `specs/` o `changes/`. Un `specs/` o un `changes/` sin `specagile/` no la convierte en raíz: muchos repos ya tienen un `specs/` de tests.
- **Migración** — `specagile update`, y también `specagile init` sobre un proyecto ya configurado, migran el layout anterior: `openspec/specs/` pasa a `specs/`, `openspec/changes/` (con `archive/`) a `changes/` y el resto de `openspec/` a `specagile/`. Después se quita el `openspec/` que quedó vacío. La CLI informa cada movimiento, y `update --dry-run` los muestra sin mover nada. Si `specs/`, `changes/` o `specagile/` ya existen con contenido en la raíz, no se mueve nada y el mensaje dice qué carpeta lo impide. La migración vale también para los stores registrados.
- Los demás comandos (`list`, `status`, `new change`, `instructions`, `validate`, `archive`, …) no usan el layout anterior ni crean el nuevo al lado. En un proyecto sin migrar fallan con un error que indica ejecutar `specagile update`.
- Los mensajes de la CLI, el texto de los skills `sa-*`, las instrucciones del esquema `spec-driven` (`schema.yaml` y su plantilla de proposal) y la documentación del fork nombran las rutas nuevas (`specs/`, `changes/`, `specagile/config.yaml`).
- `specagile store setup` crea los stores con el mismo layout.

Sin cambios: el archivo de metadatos de cada change (`.openspec.yaml`), los archivos internos (`.openspec-store/`, `.agents/skills/.openspec-target`), el directorio de configuración global, la ubicación sugerida para los stores (`~/openspec/<id>`), los ids de workflow y el formato de specs y deltas.

Fuera de alcance, para changes posteriores:

- Migrar el `openspec/` de este repositorio. El repo se sigue operando con la CLI global de OpenSpec upstream, y cada sync de upstream escribe ahí. Se migra cuando haya un `specagile` publicado con el layout nuevo.
- La carpeta `docs/` heredada de upstream.
- La versión del paquete y su publicación, que decide el mantenedor.
- Un layout configurable por proyecto.

## Capabilities

### New Capabilities

- `fork-project-layout`: dónde guarda SpecAgile las specs, los changes y sus propios archivos en un proyecto o un store, cómo reconoce una raíz, cómo migra el layout `openspec/` anterior y cómo nombran esas rutas los mensajes, los skills y las instrucciones.

### Modified Capabilities

<!-- Estas tres capacidades viven en changes que todavía no están archivados
     (rename-skills-and-cli-to-specagile, add-specify-and-plan-workflows). Hay que
     archivarlos antes que este: el archivo de un MODIFIED necesita la spec
     principal. Las specs de upstream que nombran rutas openspec/ (openspec-conventions,
     cli-init, cli-update, config-loading, schema-resolution, legacy-cleanup, …)
     quedan como están para no generar conflictos al sincronizar; fork-project-layout
     documenta el reemplazo, como hizo el change de identidad. -->

- `fork-cli-name`: "La CLI se invoca como `specagile`" (init ya no deja el layout de `openspec init`), "Los mensajes sugieren comandos `specagile`" (las rutas del proyecto que muestran los mensajes son las del layout nuevo) y "Los proyectos existentes siguen funcionando con `specagile`" (ahora se migran con `specagile update`).
- `fork-skill-names`: "Los skills invocan la CLI como `specagile`" (las rutas del proyecto que nombran los skills son las del layout nuevo).
- `opsx-specify-skill`: "Specification Stage Boundary" (las specs principales viven en `specs/`).

## Impact

- **Código**: un módulo nuevo del fork con el layout: nombres de carpetas, rutas, detección del layout anterior y traducción del texto de los skills. Las rutas `openspec/` fijas de `src/` (unos 60 archivos) pasan a leerlo. Entre ellas: la resolución de raíz (`root-selection.ts`, `planning-home.ts`, `openspec-root.ts`, `project-config.ts`), los comandos (`spec`, `change`, `list`, `view`, `archive`, `validate`, `schema`, `doctor`, `config`, `store`), `init`, `update` (migración y plan de `--dry-run`), `legacy-cleanup.ts`, `known-projects.ts`, `references.ts` y la contención de enlaces de specs (`spec-path-containment.ts`).
- **Plantillas de skills de upstream**: no se editan. El layout se aplica al generar el texto, igual que la identidad.
- **Esquema**: `schemas/spec-driven/schema.yaml` y `schemas/spec-driven/templates/proposal.md`.
- **Distribución**: `skills/` se regenera.
- **Tests**: unos 200 archivos con fixtures en `openspec/…`, entre el helper `test/helpers/openspec-fixtures.ts` y rutas sueltas. Se agregan tests del layout y de la migración, y uno que falla si `src/` o un skill generado vuelven a nombrar una ruta `openspec/`.
- **Docs**: `README.md`, `docs-lab/` (unas 25 páginas), `skills/README.md`, `FORK.md` (sección nueva y archivos de upstream editados) y `AGENTS.md`. La regla "no renombrar `openspec/`" pasa a referirse solo al repo del fork, y se agrega que no hay que ejecutar `specagile update` en su raíz.
- **Upstream**: el cambio edita muchas líneas de upstream. Una sync que agregue una ruta `openspec/…` choca con esas líneas o la reintroduce. El test de rutas lo detecta, y `FORK.md` documenta qué revisar.
- **Usuarios**: después de actualizar SpecAgile hay que correr `specagile update` en cada proyecto y store, y commitear el movimiento. Un equipo que también usa OpenSpec upstream en el mismo repo deja de compartir la planificación: `openspec` no encuentra la raíz migrada.
