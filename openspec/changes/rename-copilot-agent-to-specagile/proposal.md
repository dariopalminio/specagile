# Proposal

## Why

SpecAgile escribe el agente de GitHub Copilot en la nube en `.github/agents/openspec.agent.md`, con `name: OpenSpec` y el título `# OpenSpec Agent`. El archivo ya instala `specagile` y usa su CLI, pero Copilot lo muestra como el agente "OpenSpec", con el identificador `openspec`. Es el último nombre de OpenSpec que ve quien usa SpecAgile con Copilot, después de que el fork renombró la CLI (`specagile`), los skills (`sa-*`), el layout y las carpetas globales.

Además, SpecAgile y OpenSpec escriben hoy el mismo archivo. Cada herramienta reconoce como propio el texto de la otra y lo reemplaza, así que nunca queda claro de quién es el agente. La decisión 11 de `2026-11-18-rename-skills-and-cli-to-specagile` dejó el nombre sin cambiar. Este change la revierte.

## What Changes

- **BREAKING**: el agente de Copilot en la nube pasa a `.github/agents/specagile.agent.md`. Copilot lo muestra como **SpecAgile** (`name: SpecAgile`, título `# SpecAgile Agent`) y la descripción nombra la CLI de SpecAgile. El resto del texto del agente no cambia.
- El perfil alternativo que el usuario puede tener con el mismo identificador de Copilot pasa de `.github/agents/openspec.md` a `.github/agents/specagile.md`. Si existe, SpecAgile no escribe su agente, como hasta ahora. Un `openspec.md` ya no afecta a SpecAgile.
- `specagile update` y `specagile init` migran el archivo anterior. Un `.github/agents/openspec.agent.md` tal como lo escribió OpenSpec, o SpecAgile hasta la 3.0.1, se quita y se escribe `specagile.agent.md`. Si el usuario lo editó, se conserva y la salida lo informa. `update --dry-run` lista la migración sin hacerla.
- Un proyecto que solo tiene el `openspec.agent.md` generado cuenta como que ya tiene los archivos de Copilot en la nube, igual que hoy. `update` los mantiene sin preguntar.
- Desactivar los archivos de Copilot en la nube (`--no-copilot-cloud`, `githubCopilot.cloudAgent: false`) o dejar de usar Copilot también quita el `openspec.agent.md` generado. Uno editado se conserva.
- La pregunta de `init` sobre Copilot en la nube nombra `.github/agents/specagile.agent.md`.

Sin cambios: `.github/workflows/copilot-setup-steps.yml` (nombre y contenido), la opción `githubCopilot.cloudAgent` y el texto del agente fuera del nombre, el título y la descripción.

Fuera de alcance:

- Reescribir "OpenSpec" en el cuerpo del agente (`## What is OpenSpec?`, "managing OpenSpec workflows"). Lo cubre la regla del fork sobre la prosa.
- El mensaje de `update` que dice "add the OpenSpec install step by hand so the Copilot cloud agent can run openspec" cuando el usuario editó el archivo. Es otro texto, con su propia corrección.
- Proyectos que usan OpenSpec y SpecAgile a la vez: `specagile update` quita el `openspec.agent.md` intacto que escribe `openspec update`, como hace con los skills `openspec-*`. Un proyecto usa una de las dos herramientas.

## Capabilities

### New Capabilities

<!-- Ninguna. -->

### Modified Capabilities

- `fork-package`: el requisito "Los archivos de Copilot en la nube instalan `specagile`" nombra el agente `specagile.agent.md`, el nombre con el que Copilot lo muestra y la migración del `openspec.agent.md` anterior.

## Impact

- **Código**: `src/core/github-copilot/cloud-agent.ts` (archivo de upstream ya editado por el fork). Cambian la ruta del agente y la del perfil alternativo, que se arman con `CLI_NAME`, y el nombre, el título y la descripción, que se traducen al escribir. Se suma la ruta anterior, armada con `FORMER_CLI_NAME`, a la conciliación, al borrado y a la detección de archivos generados. `src/core/init.ts` cambia el texto de la pregunta y agrega el aviso del archivo anterior conservado. `src/core/update.ts` agrega el mismo aviso.
- **Tests**: `test/core/github-copilot-cloud-agent.test.ts` (ruta, perfil alternativo y migración) y los que fijan `.github/agents/openspec.agent.md`: `test/core/update.test.ts`, `init.test.ts`, `global-skills.test.ts`, `update-dry-run.test.ts` y `test/commands/declared-store-fallback.test.ts`.
- **Docs**: `FORK.md` ("SpecAgile identity", archivos de upstream editados), `docs-lab/reference/supported-tools.md` (la sección de GitHub Copilot, a la que remite `--copilot-cloud` en `docs-lab/reference/cli.md`, no nombra los archivos en la nube y pasa a hacerlo) y `CHANGELOG.md`. `docs/supported-tools.md` es de upstream y queda como está.
- **Usuarios**: en un repo con Copilot en la nube, el primer `specagile update` cambia de nombre el agente: Git registra el borrado de `openspec.agent.md` y el alta de `specagile.agent.md`, que hay que commitear. En Copilot, el agente se elige como "SpecAgile".
- **Upstream**: `cloud-agent.ts` suma líneas del fork. Una sync que toque la conciliación del perfil alternativo o la lista de archivos puede conflictuar. `FORK.md` dice qué revisar.
