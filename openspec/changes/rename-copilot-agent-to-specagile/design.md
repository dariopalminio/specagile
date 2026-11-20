# Design

## Context

`src/core/github-copilot/cloud-agent.ts` es de upstream, y el fork ya lo editó en dos changes:

- `COPILOT_CLOUD_FILES` tiene las dos rutas que se escriben (`setupSteps`, `agent`). `removeCopilotCloudFiles`, `hasExistingManagedCloudFiles`, `findUnmanagedCloudFiles` y `listManagedCloudFiles` recorren `Object.values(COPILOT_CLOUD_FILES)`.
- `COPILOT_AGENT_ALTERNATE_FILE` (`.github/agents/openspec.md`) es el perfil que Copilot identifica igual que `openspec.agent.md`. `classifyCopilotAgentReconciliation` decide con él si el agente se concilia, se saltea o se quita.
- El texto actual sale del de upstream pasado por `withForkIdentity`. `getLegacyCopilotCloudFileContents` guarda la lista explícita de textos anteriores que cuentan como generados: las variantes de upstream y lo que escribió SpecAgile 2.1. `isManagedCopilotCloudFile` compara contra el texto actual y esa lista, con los finales de línea normalizados.
- `writeCopilotCloudFiles` y `removeCopilotCloudFiles` reciben `CopilotCloudFileOps`. `update --dry-run` pasa un recorder, así el plan sale del mismo código.

Quien llama: `init.ts` (decisión de opt-in con `hasExistingManagedCloudFiles`, escritura, borrado al desactivar, informe con `listManagedCloudFiles` y `findUnmanagedCloudFiles`, la pregunta interactiva) y `update.ts` (`syncCopilotCloudFiles`).

## Goals / Non-Goals

**Goals:**
- Que las rutas del agente y del perfil alternativo salgan de `identity.ts` (`CLI_NAME`, `FORMER_CLI_NAME`), sin literales `openspec`/`specagile` nuevos en `cloud-agent.ts`.
- Que la migración pase por `CopilotCloudFileOps`, para que `update --dry-run` la planifique sin código aparte.
- Reconocer el archivo anterior con la misma lista explícita de textos que ya usa el agente, sin patrones.

**Non-Goals:**
- Pasar a `PRODUCT_NAME` los otros "SpecAgile" escritos a mano (`src/ui/welcome-screen.ts`).
- Cambiar `listManagedCloudFiles` y `findUnmanagedCloudFiles`. Informan lo que SpecAgile escribe, y el archivo anterior no es eso. El archivo anterior editado se informa aparte (decisión 5).

## Decisions

### 1. Rutas armadas con la identidad

En `cloud-agent.ts`:

- ``COPILOT_CLOUD_FILES.agent = path.join('.github', 'agents', `${CLI_NAME}.agent.md`)``.
- ``COPILOT_AGENT_ALTERNATE_FILE = path.join('.github', 'agents', `${CLI_NAME}.md`)``.
- Nuevo ``FORMER_COPILOT_AGENT_FILE = path.join('.github', 'agents', `${FORMER_CLI_NAME}.agent.md`)``, exportado para los tests y los mensajes.

`FORMER_COPILOT_AGENT_FILE` no entra en `COPILOT_CLOUD_FILES`. Ese objeto es la lista de lo que se escribe, y su tipo (`CopilotCloudFile`) indexa `COPILOT_CLOUD_FILE_CONTENTS`. Las funciones que tienen que ver también el archivo anterior lo suman de forma explícita (decisión 4).

- *Alternativa: dejar las rutas como literales.* Se descarta por la regla de la fuente única de identidad (`AGENTS.md`).
- *Alternativa: un módulo del fork (`src/core/fork/`) con la migración.* Se descarta: necesita el reconocedor privado de `cloud-agent.ts`, así que habría que exportarlo o crear un ciclo de imports, y las llamadas en `cloud-agent.ts` igual hacen falta. Se prefieren bloques `SpecAgile:` en el mismo archivo, como en los dos changes anteriores.

### 2. Nombre, título y descripción del agente

Se agrega `PRODUCT_NAME = 'SpecAgile'` a `src/core/fork/identity.ts`, con un comentario que remite a "SpecAgile identity" en `FORK.md`.

`generateCopilotAgentFile()` aplica, después de `withForkIdentity`, una lista `AGENT_IDENTITY_REPLACEMENTS` de textos exactos de upstream, cada uno con `replaceRequired`:

| Upstream | SpecAgile |
|---|---|
| `name: OpenSpec\n` | `name: SpecAgile\n` |
| `description: "Manages OpenSpec changes, specs, and workflows using the OpenSpec CLI.` | `description: "Manages SpecAgile changes, specs, and workflows using the SpecAgile CLI.` |
| `# OpenSpec Agent\n` | `# SpecAgile Agent\n` |

`replaceRequired` lanza un error si upstream cambia uno de esos textos, así una sync no deja el agente a medio traducir sin que se note. El resto del cuerpo ("managing OpenSpec workflows", `## What is OpenSpec?`) queda como lo escribió upstream, por la regla del fork sobre la prosa.

Se aplica solo al agente. `copilot-setup-steps.yml` ("Install OpenSpec CLI") no cambia.

- *Alternativa: sumar las sustituciones a `withForkIdentity`.* Se descarta. Esa función también traduce el setup y sus textos anteriores, y mezclar los dos haría menos clara la lista de textos que cuentan como generados.

### 3. Textos que cuentan como generados

`getLegacyCopilotCloudFileContents(agent)` suma el texto que escribió SpecAgile 3.0.x: `withForkIdentity(generateCopilotAgentFileBody(true))`, sin `AGENT_IDENTITY_REPLACEMENTS`. Es lo que hoy devuelve `generateCopilotAgentFile()`. 3.0.0 y 3.0.1 escriben el mismo texto, porque 3.0.1 no tocó `cloud-agent.ts`.

El mismo reconocedor (`isManagedCopilotCloudFile(COPILOT_CLOUD_FILES.agent, …)`) sirve para las dos rutas. Un texto conocido es generado esté en `openspec.agent.md` o en `specagile.agent.md`. Así no hay una segunda lista que mantener.

Un fixture congelado, `test/fixtures/copilot-cloud/specagile-3.0.1.agent.md`, guarda el texto exacto de 3.0.1. Se captura del build actual antes de cambiar el código. El test compara contra el fixture y no contra un texto armado con las mismas funciones que se están cambiando.

### 4. Migración dentro de `writeCopilotCloudFiles`

Después de conciliar `setupSteps` y el agente nuevo, `writeCopilotCloudFiles`:

1. Comprueba con `fs.stat` que `FORMER_COPILOT_AGENT_FILE` es un archivo regular. Si no existe, o si es una carpeta, no hace nada. Una carpeta en esa ruta no es de SpecAgile y no detiene la sincronización, a diferencia de las rutas que SpecAgile escribe.
2. Si su contenido es un texto generado (decisión 3), lo quita con `ops.removeFile`.
3. Si no lo es, lo deja.

El orden es: primero se escribe el agente nuevo y después se quita el anterior. Si la escritura falla, el proyecto conserva el agente anterior. El error de "Conflicting Copilot agent profiles" se lanza antes de escribir nada, como hoy.

El agente anterior generado se quita también cuando el perfil alternativo `specagile.md` impide escribir el nuevo. Es salida de SpecAgile con un identificador que SpecAgile ya no usa, y dejarlo mostraría un segundo agente.

`removeCopilotCloudFiles` y `hasExistingManagedCloudFiles` recorren `[...Object.values(COPILOT_CLOUD_FILES), FORMER_COPILOT_AGENT_FILE]`, y reconocen el archivo anterior con el reconocedor del agente. `removeCopilotCloudFiles` conserva su rollback: si `afterRemove` falla, vuelve a escribir también el archivo anterior.

El valor de retorno de `writeCopilotCloudFiles` (`{ setupStepsWritten, agentWritten }`) no cambia, así sus llamadas y los tests que lo fijan siguen igual.

### 5. Informar el archivo anterior editado

Nuevo export `findKeptFormerCopilotAgent(projectPath): Promise<string | null>`. Devuelve `FORMER_COPILOT_AGENT_FILE` si existe como archivo regular con un texto que no es generado. Lee el disco, como `findUnmanagedCloudFiles`, para informar lo que quedó y no lo que se planeó.

- `update.ts`, `syncCopilotCloudFiles`: después de escribir, si la función devuelve una ruta, imprime `Kept <ruta>: you edited it. SpecAgile's Copilot agent is now <agent>.` En `--dry-run` agrega la nota `kept-former-copilot-agent`, un código nuevo de `UpdatePlanNoteCode` en `src/core/update-plan.ts` marcado `// SpecAgile:` como `kept-former-skills`.
- `init.ts`: el resumen de Copilot en la nube suma la misma línea cuando corresponde.

Las rutas de los mensajes usan el separador de la plataforma (`path.join`), como el resto del resumen de Copilot.

### 6. La pregunta de `init`

El texto de la pregunta (`init.ts`) arma la ruta del agente con `COPILOT_CLOUD_FILES.agent` en forma POSIX (`.github/agents/specagile.agent.md`), en vez del literal. Así no puede volver a quedar desfasado.

## Risks / Trade-offs

- [Proyectos que usan OpenSpec y SpecAgile a la vez: `openspec update` vuelve a escribir `openspec.agent.md` y `specagile update` lo quita] → Es el mismo caso que los skills `openspec-*`, ya documentado: un proyecto usa una de las dos herramientas. Un `openspec.agent.md` editado nunca se quita.
- [Quien asignaba issues o tareas al agente "OpenSpec" en GitHub tiene que elegir "SpecAgile"] → Entrada **BREAKING** en `CHANGELOG.md`.
- [El cambio de nombre aparece en Git como borrado y alta] → Se commitea como cualquier `update`. `CHANGELOG.md` lo dice.
- [Una sync de upstream cambia el nombre, la descripción o el título del agente] → `replaceRequired` lanza un error al generar el texto y los tests de `cloud-agent` fallan. `FORK.md` dice que hay que traducir el texto nuevo y sumar el anterior a la lista de generados.
- [Una sync cambia la conciliación del perfil alternativo o los recorridos de `COPILOT_CLOUD_FILES`] → Los bloques del fork van marcados `SpecAgile:`, y los tests de migración fallan si se pierde la ruta anterior.
- [Windows: sistemas de archivos sin distinción de mayúsculas] → `fs.stat` encuentra `OpenSpec.agent.md` como si fuera `openspec.agent.md` y lo trata igual, lo que da el mismo resultado. En Linux no se encuentra y queda como está. Los nombres nuevo y anterior no chocan entre sí en ningún sistema.
- [Windows: finales de línea `CRLF` por `core.autocrlf`] → El reconocedor ya los normaliza. Un caso de test lo cubre para el archivo anterior.

## Migration Plan

1. Publicar con la entrada **BREAKING** en `CHANGELOG.md`. La versión y la publicación las decide el mantenedor.
2. En cada proyecto con Copilot en la nube, `specagile update` escribe `specagile.agent.md` y quita el `openspec.agent.md` generado. El usuario commitea el cambio.

Vuelta atrás: una versión anterior de SpecAgile no conoce `specagile.agent.md`. Vuelve a escribir `openspec.agent.md` y deja `specagile.agent.md` como un segundo agente, que hay que borrar a mano.
