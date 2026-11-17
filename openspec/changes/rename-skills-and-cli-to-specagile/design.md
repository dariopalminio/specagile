# Design

## Context

Motivación y alcance: ver `proposal.md`. Requisitos: `specs/fork-cli-name/spec.md` y `specs/fork-skill-names/spec.md`.

Estado actual relevante:

- **Dos clases de listas de nombres de skills.**
  - *Las que deciden rutas*: `OPENSPEC_SKILL_NAMES` (`src/core/config.ts`), `WORKFLOW_TO_SKILL_DIR` (`src/core/profile-sync-drift.ts`, tipado `Record<WorkflowId, string>`), el `dirName` de `allSkillTemplates()` (`src/core/shared/skill-generation.ts`) y el campo `skill` de `ONBOARDING_COMMANDS` (`src/core/onboarding-commands.ts`).
  - *Las que deciden texto*: `COMMAND_TO_SKILL_NAME` (`src/utils/command-references.ts`), que convierte `/opsx:<id>` en `/openspec-<skill>`, `$openspec-<skill>`, "the openspec-<skill> skill" o el nombre solo, según la herramienta. La usan la generación de skills y las sugerencias de `init`, `update` y la migración de raíces (`init.ts`, `update.ts`, `migration.ts`).
- **Todo texto de skill pasa por `generateSkillContent`.** `init`, `update`, la migración, la instalación compartida, la distribución `skills/` y el reconocimiento de copias propias (`everySkillRendering`, `ownSkillTexts`, `sharedSkillTexts`) generan el `SKILL.md` ahí.
- **Las plantillas nombran la CLI y los skills de forma literal.** Hay unas 280 invocaciones `openspec <subcomando>` en `src/core/templates/workflows/*.ts`. Además hay nombres literales como `` `openspec-sync-specs` `` (archive, bulk-archive), el `name:` de cada plantilla y las frases de activación de la descripción ("openspec apply", "openspec implement", …).
- **Propiedad de lo generado.** Un `SKILL.md` es de OpenSpec si es texto que escribe esta versión (`everySkillRendering`) o una release anterior (`isReleasedGeneratedContent`, con huellas hasta la 1.16.1). Si no, es del usuario. Las carpetas que el usuario conserva se registran con líneas `keep <skill>` en `.agents/skills/.openspec-target`. La instalación compartida (`installSharedSkills`) ya quita copias viejas intactas en las carpetas propias de cada herramienta y conserva las editadas.
- **El barrido de releases** (`src/core/released-output-sweep.ts`) quita archivos de releases anteriores que esta versión ya no escribe, si siguen intactos y la herramienta tiene su reemplazo. Nunca sigue enlaces. Las huellas no incluyen la 2.0.0 de upstream ni la salida del fork.
- **La CLI** se llama `openspec` en `bin/openspec.js`, en `package.json#bin`, en `.name('openspec')` de `src/cli/index.ts` y en unas 180 líneas de mensajes repartidas en `src/cli/`, `src/commands/` y `src/core/`. El autocompletado (`src/core/completions/`) registra y llama a `openspec`. El esquema integrado (`schemas/spec-driven/`) tiene 12 instrucciones `openspec <subcomando>` que la CLI le entrega al agente.

## Goals / Non-Goals

**Goals:**
- Una única fuente, propia del fork, para el nombre de la CLI, los nombres `sa-*` y los nombres anteriores.
- No editar las plantillas de skills de upstream. La identidad se aplica al generar el texto.
- La migración solo toca nombres de una lista explícita y solo quita lo que reconoce como generado.

**Non-Goals:**
- Renombrar archivos internos (`.openspec-target`, `.openspec-store/`, `.openspec-*` temporales), la carpeta `openspec/`, el directorio de configuración global o los nombres de funciones del autocompletado (`_openspec_completion`).
- Cambiar los textos ligados a la publicación en npm, que seguirían instalando OpenSpec upstream: `specagile install`, el aviso de versión nueva (`version-check.ts`), los archivos del agente en la nube de Copilot (`src/core/github-copilot/cloud-agent.ts`) y `install.md`. Dependen de que el fork tenga paquete propio.
- Reescribir "OpenSpec" como nombre de producto en la prosa, `docs/` o `CHANGELOG.md`.
- Cambiar las plantillas de comando 1.x (`getOpsx*CommandTemplate`), que ya no se escriben y solo sirven para reconocer archivos viejos.
- Un alias corto de la CLI (por ejemplo `sa`). macOS trae `/usr/sbin/sa` y en Linux lo instala el paquete `acct`, así que el resultado dependería del orden del `PATH`.

## Decisions

### 1. Módulo de identidad del fork

Un archivo nuevo, `src/core/fork/identity.ts`, que no existe en upstream y por eso no choca al sincronizar, con constantes explícitas:

- `CLI_NAME = 'specagile'`.
- `SKILL_NAME_BY_WORKFLOW: Record<WorkflowId, string>`: los catorce `sa-*`.
- `FORMER_SKILL_NAME_BY_WORKFLOW: Record<WorkflowId, string>`: los catorce `openspec-*`.
- `CLI_WORDS`: las palabras que, después de `openspec `, forman una invocación de la CLI o una frase de activación. Incluye los subcomandos del programa (`init`, `update`, `status`, `instructions`, `list`, `new`, …), `--version` y los verbos de activación que no son subcomandos (`propose`, `explore`, `specify`, `plan`, `apply`, `implement`, `verify`, `continue`, `ff`, `bulk-archive`, `onboard`, `sync`). Un test compara los subcomandos de esta lista con `program.commands` de `src/cli/index.ts`, así que un subcomando nuevo de upstream hace fallar el test en vez de quedar sin traducir.
- `applyForkIdentity(text)`: aplica tres reemplazos, todos por búsqueda en tabla:
  1. cada token `openspec-<x>` que esté en `FORMER_SKILL_NAME_BY_WORKFLOW` pasa a su nombre `sa-*` (cubre `/openspec-…`, `$openspec-…`, `/skill:openspec-…`, "the openspec-… skill", el `name:` del frontmatter y los nombres literales en la prosa);
  2. cada `openspec <palabra>` con `<palabra>` en `CLI_WORDS` pasa a `specagile <palabra>`;
  3. dos textos exactos del frontmatter: `Bash(openspec:*)` → `Bash(specagile:*)` y `Requires openspec CLI.` → `Requires specagile CLI.`.

  Las rutas como `openspec/changes/` no coinciden con ninguno de los tres (van seguidas de `/`, no de `-` ni de espacio), y lo que no está en las tablas queda igual. La función es idempotente: aplicarla a texto que ya tiene la identidad del fork no lo cambia, porque ni `specagile <palabra>` ni `sa-<x>` contienen `openspec` seguido de espacio o guion.

*Alternativa descartada:* editar las 14 plantillas de upstream. Son unas 300 líneas que chocarían en cada sincronización que toque esos archivos, y una plantilla nueva de upstream llegaría sin traducir. Con la transformación, una plantilla nueva sale con la identidad del fork y los tests de abajo detectan lo que quede sin traducir.

### 2. Las listas de rutas leen el módulo; el texto se traduce al final

- `WORKFLOW_TO_SKILL_DIR = SKILL_NAME_BY_WORKFLOW`. `OPENSPEC_SKILL_NAMES` se deriva de `Object.values(SKILL_NAME_BY_WORKFLOW)`. El `dirName` de `allSkillTemplates()` y el `skill` de `ONBOARDING_COMMANDS` se buscan en la misma tabla.
- `COMMAND_TO_SKILL_NAME` **no cambia**: el texto se sigue armando con los nombres de upstream, y `generateSkillContent` le aplica `applyForkIdentity` al resultado completo (frontmatter y cuerpo). Así el texto actual es siempre `applyForkIdentity(texto con la identidad de upstream)`, que es lo que permite reconocer las copias anteriores (decisión 4).
- Las sugerencias que se arman fuera de `generateSkillContent` (`init.ts`: "Start your first change" y los comandos de inicio; `update.ts`: las de herramientas nuevas; `migration.ts`: "the openspec-propose skill") pasan por `applyForkIdentity` en el lugar donde se arman.

*Alternativa descartada:* cambiar también `COMMAND_TO_SKILL_NAME` a nombres `sa-*`. Las sugerencias salen bien solas, pero el texto actual deja de ser una función del texto anterior. Para reconocer copias anteriores habría que generar con un segundo mapa de nombres o con un estado global.

### 3. Qué listas incluyen los nombres anteriores

`OPENSPEC_SKILL_NAMES` sigue significando "lo que esta versión escribe". Se agrega `KNOWN_SKILL_NAMES = [...actuales, ...anteriores]` en el módulo de identidad. Cada consumidor usa una u otra según lo que hace:

| Consumidor | Lista | Por qué |
|---|---|---|
| `tool-detection.ts` (`isListedToolPresent`, `hasSkillLinks`), `shared-skill-target.ts` (`hasOpenSpecSkillIn`, `inferPreListTool`) | conocidos | Un proyecto con solo `openspec-*` está configurado (spec: "se reconoce como configurado") |
| `readKeptSharedSkills` | conocidos | Una línea `keep openspec-*` sigue protegiendo el skill del usuario |
| `retired-tools.ts` | conocidos | Las carpetas de herramientas retiradas tienen nombres anteriores |
| `shared-skill-install.ts` (escribir, enlazar, quitar deseleccionados), `skill-content-equivalence.ts` | actuales | Solo se escribe y se compara lo que escribe esta versión |

`skill-content-equivalence.ts` compara la forma de Codex con una expresión fija `\$(openspec-[a-z0-9-]+) …`. Pasa a construir la alternativa a partir de `OPENSPEC_SKILL_NAMES`, para que coincida con `$sa-…`.

### 4. Migración de skills anteriores

Un módulo nuevo, `src/core/fork/former-skills.ts`, recorre `FORMER_SKILL_NAME_BY_WORKFLOW` (búsqueda en la lista, nunca un glob `openspec-*`) en cada lugar donde OpenSpec escribe skills para las herramientas configuradas: la carpeta compartida `.agents/skills/` y la carpeta propia de cada herramienta (`resolveToolSkillsDir`, también la global, como la de MiniMax). Para cada lugar:

- **¿Es de OpenSpec?** Un `SKILL.md` se reconoce como generado si `isReleasedGeneratedContent(texto)` (releases de upstream hasta la 1.16.1), o si `applyForkIdentity(texto)` está entre las versiones actuales del skill `sa-*` correspondiente para esa herramienta y ese lugar (`sharedSkillTexts` u `ownSkillTexts`). La segunda condición reconoce la salida de OpenSpec 2.0.0 y la del fork antes del cambio, sin huellas nuevas.
- **Enlace** en la carpeta de una herramienta: se quita si apunta a la carpeta anterior en `.agents/skills/` (un enlace que creó OpenSpec, clasificado con `classifySkillLinkSpot`). Si apunta a otro lugar, es del usuario y queda.
- **Intacto**: se quita el `SKILL.md` y se podan las carpetas vacías (`pruneEmptyParents`). Los otros archivos del usuario quedan.
- **Editado o no reconocido**: queda y se informa como conservado, una sola vez, igual que `result.kept` en la instalación compartida.
- **Registrado con `keep`**: no se toca.

Corre dentro de `init` y `update`, después de instalar los `sa-*` y antes del barrido de releases, con las mismas operaciones (`ops`) y la misma vista de archivos (`FileView`). Así `--dry-run` informa sin escribir. El barrido de releases ya no ve las rutas `openspec-*` como actuales y quitaría por su cuenta las copias 1.x intactas. Que la migración corra antes evita informar lo mismo dos veces.

*Alternativa descartada:* sumar los nombres anteriores a las rutas "actuales" y dejarle todo al barrido. El barrido no sigue enlaces, no reconoce la salida 2.0.0 (no tiene huellas) y no informa las copias editadas.

### 5. Ejecutable y mensajes de la CLI

- `bin/openspec.js` → `bin/specagile.js`. `package.json#bin` pasa a `{ "specagile": "./bin/specagile.js" }` y `dev:cli` a `node bin/specagile.js`. npm crea en Windows los lanzadores `specagile.cmd` y `specagile.ps1` a partir de la entrada `bin`.
- `src/cli/index.ts`: `.name(CLI_NAME)`, y el armado del nombre de comando para telemetría (`getCommandPath`) compara contra `CLI_NAME`.
- Mensajes: se edita el literal `openspec <subcomando>` → `specagile <subcomando>` en los ~180 mensajes de usuario de `src/` (fuera de `templates/workflows/`, que traduce la decisión 1). Los comentarios no se tocan. Un test de guarda recorre `src/**/*.ts` sin los comentarios ni las plantillas, busca `openspec <palabra>` con las palabras de `CLI_WORDS` y falla si encuentra alguno fuera de una lista explícita de excepciones (los textos de publicación de los Non-Goals).
- Esquema integrado: se editan los 12 literales de `schemas/spec-driven/schema.yaml` y `templates/proposal.md`. Pocas líneas, y la CLI se los entrega al agente sin pasar por `generateSkillContent`.
- Autocompletado: los generadores y los instaladores registran y llaman a `CLI_NAME` (`complete -F _openspec_completion specagile`, `specagile __complete …`) y escriben su archivo con nombre `specagile`, para no pisar el de un OpenSpec upstream instalado al lado. Las funciones internas conservan su nombre.

### 6. Frases de activación

`applyForkIdentity` convierte "openspec apply" en "specagile apply", "openspec implement" en "specagile implement", y lo mismo con los demás verbos de `CLI_WORDS`. Las frases "opsx …" quedan igual. `test/core/templates/workflow-verb-triggers.test.ts` pasa a exigir la frase `specagile <verbo>` (con `implement` para `apply`) y que ninguna descripción nombre `openspec <verbo>`.

## Risks / Trade-offs

- **Upstream agrega un subcomando o reescribe una plantilla con una forma nueva** (por ejemplo, `openspec` sin subcomando delante de algo que no está en `CLI_WORDS`) → El test que compara `CLI_WORDS` con `program.commands` y un test que genera todos los skills y exige que ninguno contenga `openspec <palabra de CLI>` ni un nombre `openspec-*` fallan en la sincronización. Se documenta en `FORK.md`.
- **Copias anteriores de versiones con otras plantillas** → La migración reconoce el texto de releases de upstream hasta la 1.16.1 y el que generan las plantillas actuales con la identidad de upstream. Lo que escribieron otras versiones del fork o de upstream 2.0.x se conserva y se informa, nunca se borra. Es el fallo seguro.
- **Proyectos que usan OpenSpec upstream y SpecAgile a la vez** → Cada `openspec update` vuelve a escribir `openspec-*`, y `specagile update` solo quita las copias que reconoce. El agente puede ver dos versiones de cada workflow. Se documenta en el README: un proyecto usa una de las dos herramientas.
- **Conflictos al sincronizar** → Las listas de nombres (una línea cada una tras la decisión 2) y los ~180 mensajes editados pueden chocar cuando upstream cambia esas mismas líneas. `FORK.md` lista los archivos y explica cómo resolverlos: conservar el texto de upstream y volver a cambiar `openspec` por `specagile`. El test de guarda señala lo que haya quedado sin cambiar.
- **Mensajes que siguen diciendo `openspec`** por los Non-Goals de publicación (por ejemplo `npm install -g @fission-ai/openspec`) → Quedan en la lista de excepciones del test de guarda, a la vista, para un change de empaquetado.
- **Windows**: los enlaces de skills pueden ser junctions o copias. La migración reutiliza `classifySkillLinkSpot` y `classifySkillFile`, que ya cubren los dos casos. Las rutas se arman con `path.join` y se comparan en forma POSIX solo para mostrarlas.

## Migration Plan

1. Publicar o enlazar el fork (`pnpm build && pnpm link --global`): queda disponible `specagile`. Si antes se había enlazado el fork como `openspec`, deshacer ese enlace.
2. En cada proyecto, `specagile update` instala `sa-*` y quita los `openspec-*` intactos. Lo conservado se informa en la salida.
3. Vuelta atrás: reinstalar la versión anterior del fork (o OpenSpec upstream) y ejecutar `openspec update`. Esa versión vuelve a escribir los `openspec-*` y no conoce los `sa-*`, que hay que borrar a mano.
