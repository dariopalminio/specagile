# opsx-specify-skill Specification

## Purpose

Define el comportamiento de `/opsx:specify`: la etapa de especificación del flujo de tres pasos, que crea o edita la proposal y los specs delta de un change y se detiene antes del plan técnico.

## Requirements

### Requirement: Specify Skill Invocation
El sistema SHALL proveer un skill `/opsx:specify` que recibe un nombre de change en kebab-case o una descripción de lo que se quiere construir, y genera la especificación de ese change.

#### Scenario: Specify con una descripción
- **WHEN** el agente ejecuta `/opsx:specify "agregar autenticación de usuarios"`
- **AND** no existe un change activo con el nombre derivado
- **THEN** el agente deriva un nombre en kebab-case (por ejemplo `add-user-auth`) y crea el change con el esquema configurado por defecto
- **AND** escribe `proposal.md` y luego un `specs/<capability-path>/spec.md` por cada capacidad que lista la proposal

#### Scenario: El nombre derivado ya existe
- **WHEN** el agente ejecuta `/opsx:specify` con una descripción cuyo nombre derivado coincide con un change activo
- **THEN** el agente no escribe nada todavía
- **AND** pregunta si se quiere continuar la especificación de ese change o crear uno nuevo, proponiendo un nombre alternativo
- **AND** no modifica ningún artefacto del change existente hasta tener la respuesta

#### Scenario: Specify sin argumentos
- **WHEN** el agente ejecuta `/opsx:specify` sin nombre ni descripción
- **THEN** el agente pregunta, de forma abierta, qué change se quiere especificar
- **AND** no crea ningún change ni archivo hasta tener la respuesta

#### Scenario: Ambigüedad material en el pedido
- **WHEN** el pedido deja abierta una decisión que cambia el alcance, el comportamiento observable, la compatibilidad o los criterios de aceptación
- **THEN** el agente pregunta antes de crear el change
- **AND** registra en la proposal las suposiciones que tomó sobre detalles menores

### Requirement: Specification Stage Boundary
`/opsx:specify` SHALL crear o editar únicamente los artefactos de especificación del change: la proposal y los specs delta. El change queda listo para planificar, sin plan técnico.

#### Scenario: El plan técnico no se genera
- **WHEN** `/opsx:specify` termina sobre un change del esquema `spec-driven`
- **THEN** existen `proposal.md` y los specs delta del change
- **AND** no se crea `design.md` ni `tasks.md`
- **AND** no se edita código del proyecto ni specs principales en `specs/`, en la raíz del proyecto

#### Scenario: Change que declara skip_specs
- **WHEN** el change declara `skip_specs: true` en su `.openspec.yaml`
- **THEN** `/opsx:specify` escribe solo `proposal.md`
- **AND** informa que los specs se omiten por esa declaración, sin crear ningún archivo en `specs/`

#### Scenario: Esquema sin artefacto de specs
- **WHEN** el esquema del change no define un artefacto con id `specs`
- **THEN** `/opsx:specify` no escribe nada
- **AND** informa que ese esquema no separa especificación de plan y sugiere `/opsx:propose` cuando está instalado o, si no, `openspec instructions <artifact-id> --change "<name>"` para generar los artefactos uno a uno

#### Scenario: Rutas de specs en Windows
- **WHEN** `/opsx:specify` escribe un spec delta para la capacidad `identity/user-auth` en Windows
- **THEN** el archivo queda en `specs\identity\user-auth\spec.md` dentro de la carpeta del change, con el separador de la plataforma
- **AND** en macOS y Linux queda en `specs/identity/user-auth/spec.md`

### Requirement: Editing an Existing Specification
Cuando el pedido nombra un change activo, `/opsx:specify` SHALL continuar o revisar su especificación: crea los artefactos de especificación que falten y revisa los existentes según el pedido, mostrando cada revisión y escribiéndola solo tras confirmación del usuario.

#### Scenario: Completar una especificación a medias
- **WHEN** el change tiene `proposal.md` pero le falta el spec de alguna capacidad que la proposal lista
- **THEN** `/opsx:specify` escribe solo los specs que faltan
- **AND** no reescribe los specs que ya existen salvo que el usuario lo pida

#### Scenario: Especificación completa sin cambios pedidos
- **WHEN** el agente ejecuta `/opsx:specify <change>` sobre un change que ya tiene `proposal.md` y el spec de cada capacidad que lista, y el pedido no indica ningún cambio
- **THEN** el agente no escribe nada
- **AND** informa que la especificación está completa, resume las capacidades que cubre y pregunta qué se quiere revisar
- **AND** si el change aún no tiene plan técnico y `plan` está instalado, sugiere `/opsx:plan`

#### Scenario: Revisar la proposal o un spec existente
- **WHEN** el usuario pide cambiar el alcance o un requisito de un change ya especificado
- **THEN** el agente muestra qué va a cambiar en `proposal.md` o en el spec afectado y por qué
- **AND** escribe la revisión solo después de que el usuario la confirma
- **AND** si el usuario la rechaza, el archivo queda sin cambios

#### Scenario: Capacidad quitada o renombrada en la proposal
- **WHEN** una revisión de `proposal.md` quita o renombra una capacidad que ya tiene spec delta
- **THEN** la misma revisión propone borrar ese spec delta (si se quitó) o moverlo a la ruta nueva (si se renombró)
- **AND** lo aplica solo con la confirmación del usuario, de modo que no quede un spec delta sin capacidad en la proposal

#### Scenario: El change ya tiene plan técnico
- **WHEN** `/opsx:specify` revisa la especificación de un change que ya tiene `design.md` o `tasks.md`
- **THEN** no modifica esos archivos
- **AND** avisa que el plan técnico puede haber quedado desactualizado
- **AND** sugiere revisar el diseño con `/opsx:plan` cuando `plan` está instalado y las tareas con `/opsx:tasks` cuando `tasks` está instalado, empezando por el diseño si el change tiene ambos

### Requirement: Specify Handoff
Al terminar, `/opsx:specify` SHALL resumir los artefactos escritos y detenerse, indicando cómo continuar con la etapa de planificación sin iniciarla en la misma respuesta.

#### Scenario: Plan instalado
- **WHEN** `/opsx:specify` termina y el workflow `plan` está instalado
- **THEN** el resumen indica el change, su ubicación y los artefactos creados o revisados
- **AND** invita a revisar la especificación y luego usar `/opsx:plan`, escrito como lo invoca la herramienta del usuario (por ejemplo `/openspec-plan` en Claude Code o `$openspec-plan` en Codex)

#### Scenario: Plan no instalado
- **WHEN** `/opsx:specify` termina y el perfil del usuario no incluye `plan`
- **THEN** el skill generado no menciona `/opsx:plan`
- **AND** indica cómo generar el siguiente artefacto con un comando que sí existe: `openspec instructions <artifact-id> --change "<name>"`

#### Scenario: Solo se nombran workflows instalados
- **WHEN** el perfil del usuario no incluye un workflow que `/opsx:specify` sugeriría (por ejemplo `propose` o `plan`)
- **THEN** el skill generado no nombra ese workflow
- **AND** ofrece en su lugar el comando de la CLI equivalente, o omite la sugerencia

#### Scenario: El pedido incluye implementar
- **WHEN** el pedido que invocó `/opsx:specify` también pide planificar o implementar
- **THEN** el agente se detiene igual tras la especificación y espera un nuevo pedido

### Requirement: Specify Availability
El workflow `specify` SHALL instalarse como el skill `openspec-specify` y formar parte del perfil `core`, junto a `propose`, que se mantiene disponible como atajo de un solo paso.

#### Scenario: Instalación con el perfil por defecto
- **WHEN** el usuario ejecuta `openspec init` con el perfil `core`
- **THEN** se instala el skill `openspec-specify` junto a `openspec-propose` y el resto del perfil core
- **AND** en Windows el archivo queda en `.agents\skills\openspec-specify\SKILL.md` y en macOS y Linux en `.agents/skills/openspec-specify/SKILL.md`, con el enlace que corresponda desde la carpeta propia de cada herramienta

#### Scenario: Proyecto existente con perfil core
- **WHEN** el usuario ejecuta `openspec update` en un proyecto configurado con el perfil `core` que aún no tiene `openspec-specify`
- **THEN** el skill `openspec-specify` se agrega al proyecto

#### Scenario: Perfil custom sin specify
- **WHEN** el usuario guarda un perfil `custom` que no incluye `specify`
- **THEN** `openspec update` no instala `openspec-specify`
- **AND** ningún otro skill generado remite a `/opsx:specify`

#### Scenario: Selector de workflows
- **WHEN** el usuario abre `openspec config profile` y elige editar workflows
- **THEN** `specify` aparece como opción con un nombre y una descripción propios
- **AND** queda marcado cuando el perfil actual lo incluye

#### Scenario: Archivos del usuario con el mismo nombre
- **WHEN** el proyecto contiene un archivo propio del usuario como `.kilocode/workflows/opsx-specify.md` o `.claude/commands/opsx/specify.md`
- **THEN** `openspec init` y `openspec update` lo dejan en su lugar y no lo reportan como un archivo antiguo de OpenSpec
