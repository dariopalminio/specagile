# Design

## Context

El perfil `core` es la constante `CORE_WORKFLOWS` de `src/core/profiles.ts` (hoy nueve ids). `getProfileWorkflows('core', …)` devuelve esa constante e ignora la lista `workflows` guardada en la config global, así que un usuario con `"profile": "core"` recibe el set nuevo aunque su config tenga guardados los nueve de antes (`specagile config profile core` los guarda). Para `custom`, devuelve la lista guardada.

Todo lo que instala o compara el perfil `core` lee `CORE_WORKFLOWS` o `getProfileWorkflows`:
- `specagile init` y `specagile update` instalan los skills del perfil, en `.agents/skills/` con su entrada en cada herramienta, o en las carpetas globales (`src/core/global-skills.ts`, vía los workflows que les pasa `init`/`update`). `update` también quita los skills de workflows que el perfil no tiene ("Removed: N skill directories (deselected workflows)").
- `src/commands/config.ts`: `specagile config profile core` (guarda `[...CORE_WORKFLOWS]`), `deriveProfileFromWorkflowSelection` (el selector guarda `core` solo si la selección es exactamente `CORE_WORKFLOWS`) y `specagile config list` (imprime `CORE_WORKFLOWS` "from core profile").
- `src/core/update.ts`, `displayMissingCoreWorkflowsNote`: con un perfil `custom`, avisa qué ids de `CORE_WORKFLOWS` le faltan, sin cambiar el perfil.
- `src/core/onboarding-commands.ts`, `formatOptionalWorkflowsNote`: lista los ids de `ALL_WORKFLOWS` que no están instalados.

La distribución `skills/` ya tiene `sa-audit/` (desde 7.0.0), y su texto no depende del perfil (`test/core/templates/one-text-per-skill.test.ts`).

## Goals / Non-Goals

**Goals:**
- `verify` en `CORE_WORKFLOWS`, sin código nuevo de instalación, detección ni migración: lo que hoy lee la constante recibe el set nuevo.
- Los perfiles `custom` quedan como el usuario los guardó.

**Non-Goals:**
- No cambia el texto de ningún skill, ni la plantilla `audit.ts`, ni `skills/`.
- No cambian `ALL_WORKFLOWS` (su orden es de upstream), `COMMAND_IDS`, la identidad del fork ni la migración de `sa-verify`.
- No cambian las sugerencias de inicio (`ONBOARDING_COMMANDS`) ni la pantalla de bienvenida.
- No se agregan otros workflows opcionales a `core`.

## Decisions

### D1. `verify` va después de `apply` en `CORE_WORKFLOWS`
`CORE_WORKFLOWS` queda `propose, explore, specify, plan, tasks, apply, verify, update, sync, archive` (diez). Es el orden del flujo largo (implementar → auditar → archivar), y es el que ve el usuario en `specagile config list`. *Alternativa descartada*: agregarlo al final. Sería un diff de una línea igual de chico, pero `config list` lo mostraría después de `archive`, fuera del orden del flujo. El orden no cambia qué se instala, porque los consumidores comparan conjuntos.

### D2. Los perfiles `custom` no se migran
Un `custom` sin `verify` sigue sin `sa-audit`. `displayMissingCoreWorkflowsNote` ya lo avisa, porque lee `CORE_WORKFLOWS`: "Your custom profile is missing 1 core workflow: verify". Es el mismo trato que recibió `tasks` en 6.0.0. *Alternativa descartada*: sumar `verify` a los perfiles `custom` guardados. El comentario de `displayMissingCoreWorkflowsNote` lo descarta a propósito ("Keep custom profiles user-owned; do not mutate them"), y un usuario que eligió un `custom` sin `verify` pudo haberlo dejado afuera adrede.

Un `custom` guardado con exactamente los diez ids nuevos (los nueve de antes más `verify`) sigue guardado como `custom`. Instala lo mismo que `core`, y el selector lo vuelve `core` si el usuario lo guarda de nuevo. No hace falta normalizarlo.

### D3. Sin entrada nueva en `ONBOARDING_COMMANDS`
Las sugerencias de inicio enseñan a empezar un change (`propose`, `specify`, `plan`, `tasks`, `apply`). La auditoría se usa al final, antes del PR. *Alternativa descartada*: `{ workflow: 'verify', description: 'Audit a change' }` después de `apply`. Entra en `DESCRIPTION_BUDGET` (14 de 17 columnas), pero suma una línea a la pantalla de bienvenida y a las sugerencias de `init` y `update`, y cambia sus tests, sin que el usuario la necesite para arrancar.

### D4. La nota de workflows opcionales se ajusta sola
`formatOptionalWorkflowsNote` ya no lista `verify` para un usuario con el perfil `core`, y su cantidad baja de seis a cinco. Lo deriva de `ALL_WORKFLOWS` y de los instalados, así que no requiere cambios de código. Solo cambian los tests que fijan el texto o la cantidad.

### D5. La documentación sigue al perfil, los diagramas no
`docs-lab/customize/profiles.md` mueve `verify` de la tabla de opcionales a la del set `core` ("ten workflows", "Five more", "core ten") y suma `verify` a la nota sobre perfiles `custom` guardados antes. `docs-lab/reference/skills.md` marca `sa-audit` como `Core`. `docs-lab/start/setup.md` quita "(not included by default)" de `sa-audit` en el árbol. Los conteos de salida (`N skills in …`) de `setup.md` y `reference/cli.md`, que hoy dicen 8, pasan a 10. El README saca `sa-audit` de la lista del flujo expandido. `FORK.md` lo anota donde lista las líneas que el fork suma a `CORE_WORKFLOWS`. Los diagramas de `docs/architecture/` no cambian: muestran la auditoría como paso opcional del flujo, y eso sigue siendo cierto aunque el skill venga instalado.

## Risks / Trade-offs

- [Un compañero con SpecAgile 7.0.x y el perfil `core` corre `specagile update` en un repo con skills en el proyecto: su `core` no tiene `verify`, así que quita `sa-audit` como skill de un workflow deseleccionado, y el próximo `update` con esta versión lo vuelve a poner] → El CHANGELOG pide actualizar SpecAgile en cada máquina antes de commitear `sa-audit`, como pidió para `sa-tasks` y `sa-audit` antes.
- [Un usuario con skills en el proyecto ve un skill nuevo para commitear tras `update`] → Es el comportamiento esperado de un workflow core nuevo. La salida lo informa y el CHANGELOG lo anuncia.
- [Usuarios que no quieren la auditoría] → La desmarcan en `specagile config profile`, que guarda un `custom`, y la próxima `update` quita `sa-audit`.
- [Orden de archivado con `rename-verify-to-audit`] → Las deltas de `fork-skill-names` y `opsx-audit-skill` parten del texto de ese change, así que hay que archivarlo antes que este. Al revés, este change crearía `opsx-audit-skill` solo con su requisito y con el Purpose en `TBD`, y su versión de "Los skills se instalan con nombres `sa-*`" quedaría pisada por la de ese change.

## Migration Plan

Release minor. Con el perfil `core`, el siguiente `specagile update` en cada proyecto instala `sa-audit` (y en las carpetas globales, si los skills son globales). Para volver atrás, se saca `verify` de `CORE_WORKFLOWS`: el `update` siguiente quita `sa-audit` de los proyectos `core` como skill deseleccionado.
