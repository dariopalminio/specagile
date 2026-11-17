# Proposal

## Why

SpecAgile hoy instala skills con los nombres de upstream (`openspec-propose`, `openspec-apply-change`, …) y se ejecuta como `openspec`. No se distingue de OpenSpec en el agente ni en la terminal, y choca con una instalación global de upstream: los dos ejecutables se llaman `openspec` y los dos escriben skills con los mismos nombres. Como parte de la identidad propia del fork, la CLI tiene que llamarse como el producto (`specagile`), y los skills, que el usuario escribe seguido, tienen que llevar un prefijo corto propio (`sa-`).

## What Changes

- **BREAKING** — El ejecutable de la CLI pasa de `openspec` a **`specagile`** (`specagile init`, `specagile update`, `specagile status`, …). El fork deja de instalar un ejecutable `openspec`. La ayuda, los mensajes, las sugerencias ("ejecutá `specagile update`") y el autocompletado de shell usan `specagile`.
- **BREAKING** — Los skills que instala el fork se renombran con prefijo `sa-`:

  | Antes | Después |
  |---|---|
  | `openspec-explore` | `sa-explore` |
  | `openspec-propose` | `sa-propose` |
  | `openspec-specify` | `sa-specify` |
  | `openspec-plan` | `sa-plan` |
  | `openspec-apply-change` | `sa-implement` |
  | `openspec-verify-change` | `sa-verify` |
  | `openspec-archive-change` | `sa-archive` |
  | `openspec-new-change` | `sa-new-change` |
  | `openspec-continue-change` | `sa-continue-change` |
  | `openspec-ff-change` | `sa-ff-change` |
  | `openspec-bulk-archive-change` | `sa-bulk-archive-change` |
  | `openspec-onboard` | `sa-onboard` |
  | `openspec-update-change` | `sa-update-change` |
  | `openspec-sync-specs` | `sa-sync-specs` |

  Los dos últimos no estaban en el pedido original. Se renombran para que ningún skill del fork quede con prefijo `openspec-`.
- El contenido de los skills generados usa la nueva identidad: invocan la CLI como `specagile …`, se refieren a otros skills por su nombre `sa-*` (en la forma de cada herramienta: `/sa-implement`, `$sa-implement` en Codex, "el skill sa-implement" en herramientas sin barra), declaran `specagile` como CLI requerida y preaprobada, y sus frases de activación son `specagile <verbo>` (por ejemplo "specagile implement").
- **Migración** — En un proyecto que ya tiene skills `openspec-*` (de OpenSpec upstream o de una versión anterior del fork), `specagile init` y `specagile update` lo reconocen como configurado, escriben los `sa-*` y quitan las copias `openspec-*` que siguen intactas (y los enlaces que OpenSpec creó hacia ellas). Una copia editada por el usuario, o registrada como suya, se conserva y se informa.
- Las sugerencias de inicio de `specagile init` (`/sa-propose`, `/sa-specify`, `/sa-plan`, …), la distribución estática `skills/` y la documentación de usuario (`README.md`, `docs-lab/`) muestran los nombres nuevos.

Sin cambios: los ids de workflow que se guardan en la configuración global y se eligen en `specagile config profile` (`propose`, `apply`, `verify`, …), la carpeta `openspec/` del proyecto, los archivos internos (`.agents/skills/.openspec-target`, `.openspec-store/`), el directorio de configuración global, el nombre del paquete npm y el nombre "OpenSpec" en la prosa.

Fuera de alcance, para changes posteriores: el nombre del paquete y su publicación, `specagile install` (sigue descargando el binario autónomo de upstream), la carpeta `docs/` heredada de upstream y el rebranding del nombre del producto en los textos.

## Capabilities

### New Capabilities
- `fork-cli-name`: el nombre con que se invoca la CLI del fork (`specagile`): ejecutable, ayuda, mensajes y sugerencias, y autocompletado de shell.
- `fork-skill-names`: los nombres `sa-*` de los skills que instala el fork. Cubre cómo se nombran y se refieren entre sí en el contenido generado y cómo se migran los proyectos que tienen los skills `openspec-*`.

### Modified Capabilities
<!-- Ninguna. Los nombres `openspec-*` y `openspec <comando>` que aparecen en las specs de upstream (cli-init, cli-update, legacy-cleanup, …) quedan como están para no generar conflictos al sincronizar. Las dos capacidades nuevas del fork documentan el reemplazo. Las specs de opsx-specify-skill y opsx-plan-skill todavía no están archivadas en openspec/specs/, así que no admiten un delta. -->

## Impact

- **Código** (`src/`, `bin/`): un módulo nuevo del fork con la identidad (nombre de la CLI, nombres `sa-*`, nombres anteriores, subcomandos de la CLI y la transformación del texto de los skills). Las listas de upstream que nombran skills pasan a leerlo: `OPENSPEC_SKILL_NAMES`, `WORKFLOW_TO_SKILL_DIR`, `COMMAND_TO_SKILL_NAME`, `ONBOARDING_COMMANDS` y `allSkillTemplates()`. Cambian también la generación de skills (`skill-generation.ts`, `allowed-tools.ts`), la detección de herramientas y la instalación compartida (`tool-detection.ts`, `shared-skill-install.ts`, `shared-skill-target.ts`), `init`/`update`, el nombre del programa y los mensajes de usuario en `src/cli/` y `src/commands/`, el autocompletado (`src/core/completions/`), y `bin/openspec.js` → `bin/specagile.js` con su entrada en `package.json`.
- **Plantillas de skills de upstream**: no se editan. La identidad se aplica al generar el texto, así que una sincronización no choca con ellas.
- **Distribución**: `skills/` se regenera con carpetas `sa-*`.
- **Tests**: los que fijan nombres de skills, rutas generadas y textos de la CLI (alrededor de 40 archivos), más tests nuevos de la identidad y de la migración.
- **Docs**: `README.md` y las páginas de `docs-lab/` que nombran skills o comandos de la CLI (las comprueban `test/*docs-claims*.test.ts`).
- **Upstream**: cada sincronización puede chocar en las listas de nombres de skills y en los mensajes de usuario editados. `FORK.md` documenta qué revisar.
- **Usuarios**: hay que invocar la CLI como `specagile` y los skills como `sa-*`. Si un proyecto también usa OpenSpec upstream, `openspec update` vuelve a escribir los `openspec-*`. SpecAgile solo quita las copias que reconoce como texto de OpenSpec y conserva el resto.
