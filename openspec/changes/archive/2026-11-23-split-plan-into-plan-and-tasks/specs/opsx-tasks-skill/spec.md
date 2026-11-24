# Spec Delta

## Purpose

Define el comportamiento de `/opsx:tasks`: la etapa de tareas del flujo largo (specify → plan → tasks → implement), que genera o revisa la lista de tareas de un change ya especificado y lo deja listo para implementar.

## ADDED Requirements

### Requirement: Tasks Skill Invocation
El sistema SHALL proveer un skill `/opsx:tasks` que trabaja sobre un change activo existente, nombrado por el usuario o inferido, y nunca crea un change nuevo.

#### Scenario: Tasks con nombre de change
- **WHEN** el agente ejecuta `/opsx:tasks add-dark-mode` y ese change está activo
- **THEN** el agente genera las tareas de ese change y anuncia "Using change: add-dark-mode"

#### Scenario: Tasks sin nombre de change
- **WHEN** el agente ejecuta `/opsx:tasks` sin nombre
- **THEN** el agente infiere el change de la conversación, o lo elige automáticamente si hay un solo change activo
- **AND** si hay ambigüedad, pide al usuario que elija entre los changes activos
- **AND** anuncia qué change eligió y cómo indicar otro

#### Scenario: El change no existe
- **WHEN** el agente ejecuta `/opsx:tasks` con un nombre que no corresponde a ningún change activo
- **THEN** el agente informa que no lo encontró, lista los changes activos y sugiere `/opsx:specify` para crear uno cuando está instalado (si no, `specagile new change "<name>"`)
- **AND** no crea ningún change ni archivo

### Requirement: Tasks Requires a Complete Specification
`/opsx:tasks` SHALL generar tareas solo para un change cuya especificación está completa, con el mismo criterio que `/opsx:plan`: la proposal existe y cada capacidad que lista tiene su spec delta, sin specs delta de capacidades que no lista, o el change declara `skip_specs`. Si no, SHALL detenerse sin escribir y remitir a la etapa de especificación.

#### Scenario: Faltan specs de alguna capacidad
- **WHEN** la proposal lista una capacidad que no tiene `specs/<capability-path>/spec.md` y el change no declara `skip_specs`
- **THEN** `/opsx:tasks` no escribe nada
- **AND** nombra las capacidades sin spec y sugiere `/opsx:specify <change>` cuando está instalado

#### Scenario: Chequeo de completitud en Windows
- **WHEN** en Windows la proposal lista la capacidad `identity/user-auth` y el change tiene `specs\identity\user-auth\spec.md`
- **THEN** `/opsx:tasks` cuenta esa capacidad como especificada, aunque la proposal escriba la ruta con `/` y el sistema la informe con `\`
- **AND** compara las rutas con las reglas del sistema de archivos de la plataforma: sin distinguir mayúsculas en Windows, distinguiéndolas en Linux
- **AND** escribe `tasks.md` en la carpeta del change con el separador de la plataforma

#### Scenario: Change que declara skip_specs
- **WHEN** el change tiene `proposal.md` y declara `skip_specs: true`
- **THEN** `/opsx:tasks` considera la especificación completa y genera las tareas

#### Scenario: Esquema sin artefacto de specs o de tareas
- **WHEN** el esquema del change no define un artefacto con id `specs` o no define uno con id `tasks`
- **THEN** `/opsx:tasks` no escribe nada
- **AND** informa que ese esquema no separa la etapa de tareas y sugiere `/opsx:propose` cuando está instalado o, si no, `specagile instructions <artifact-id> --change "<name>"` para generar los artefactos uno a uno

### Requirement: Tasks Stage Boundary
`/opsx:tasks` SHALL crear o revisar únicamente el artefacto de tareas del change, el que el esquema identifica con el id `tasks` (en `spec-driven`, `tasks.md`). No modifica la proposal, los specs delta, el diseño ni el código.

#### Scenario: Generar las tareas de un change diseñado
- **WHEN** `/opsx:tasks` se ejecuta sobre un change `spec-driven` con proposal, specs y `design.md`, y sin `tasks.md`
- **THEN** escribe `tasks.md` basado en la proposal, los specs, el diseño y el código del proyecto
- **AND** al terminar, el change queda listo para implementar

#### Scenario: Change sin diseño
- **WHEN** `/opsx:tasks` se ejecuta sobre un change con la especificación completa y sin `design.md`
- **THEN** escribe `tasks.md` igualmente, porque el esquema marca el diseño como condicional
- **AND** informa que el change no tiene diseño técnico y, cuando `plan` está instalado, sugiere `/opsx:plan <change>` si el change lo necesita

#### Scenario: Faltan otros artefactos de planificación obligatorios
- **WHEN** el esquema requiere para implementar otro artefacto de planificación, además de las tareas, que no es condicional y no existe
- **THEN** `/opsx:tasks` no escribe nada
- **AND** nombra ese artefacto y sugiere `/opsx:plan <change>` cuando está instalado

#### Scenario: Preguntas abiertas en el diseño
- **WHEN** `design.md` tiene preguntas abiertas que cambiarían lo que se construye
- **THEN** el agente las resuelve con el usuario antes de escribir `tasks.md`

#### Scenario: El diseño o la especificación tienen un problema
- **WHEN** al generar las tareas el agente detecta una contradicción, un hueco o un requisito inviable en la proposal, los specs o el diseño
- **THEN** no edita esos artefactos
- **AND** informa el problema y sugiere resolverlo en la etapa que corresponde (con `/opsx:specify <change>` o `/opsx:plan <change>` cuando están instalados)

### Requirement: Revising Existing Tasks
Cuando el change ya tiene `tasks.md`, `/opsx:tasks` SHALL revisarlo contra la proposal, los specs y el diseño actuales, mostrar cada revisión propuesta con su motivo y escribirla solo tras confirmación del usuario.

#### Scenario: Tareas desactualizadas tras revisar el diseño
- **WHEN** `design.md` o los specs cambiaron después de escribir `tasks.md`
- **THEN** el agente muestra qué cambiaría en `tasks.md` y por qué
- **AND** escribe la revisión solo después de que el usuario la confirma

#### Scenario: Revisión rechazada
- **WHEN** el usuario rechaza la revisión propuesta
- **THEN** `tasks.md` queda sin cambios

#### Scenario: Tareas al día
- **WHEN** `tasks.md` ya es coherente con la proposal, los specs y el diseño
- **THEN** el agente informa que no hay cambios necesarios y no escribe nada

#### Scenario: Tareas ya completadas
- **WHEN** `tasks.md` tiene tareas marcadas como completadas
- **THEN** la revisión conserva esas tareas y su marca
- **AND** solo las quita o desmarca si el usuario lo confirma explícitamente en esa revisión

### Requirement: Tasks Handoff
Al terminar, `/opsx:tasks` SHALL resumir lo que escribió o revisó y detenerse, indicando cómo empezar la implementación sin iniciarla en la misma respuesta.

#### Scenario: Tareas listas
- **WHEN** `/opsx:tasks` termina
- **THEN** el resumen indica el change, si `tasks.md` se creó, se revisó o quedó igual, y que el change está listo para implementar
- **AND** invita a pedir la implementación, nombrando `/opsx:apply` solo si ese skill está instalado

#### Scenario: El pedido incluye implementar
- **WHEN** el pedido que invocó `/opsx:tasks` también pide implementar
- **THEN** el agente se detiene igual tras escribir las tareas y espera un nuevo pedido

### Requirement: Tasks Availability
El workflow `tasks` SHALL instalarse como el skill `sa-tasks`, formar parte del perfil `core` y no tener archivo de comando.

#### Scenario: Instalación con el perfil por defecto
- **WHEN** el usuario ejecuta `specagile init` con el perfil `core`
- **THEN** se instala el skill `sa-tasks`
- **AND** en Windows el archivo queda en `.agents\skills\sa-tasks\SKILL.md` y en macOS y Linux en `.agents/skills/sa-tasks/SKILL.md`, con el enlace que corresponda desde la carpeta propia de cada herramienta

#### Scenario: Proyecto existente con perfil core
- **WHEN** el usuario ejecuta `specagile update` en un proyecto configurado con el perfil `core` que aún no tiene `sa-tasks`
- **THEN** el skill `sa-tasks` se agrega al proyecto

#### Scenario: Perfil custom sin tasks
- **WHEN** el usuario guarda un perfil `custom` que no incluye `tasks`
- **THEN** `specagile update` no instala `sa-tasks`

#### Scenario: Selector de workflows
- **WHEN** el usuario abre `specagile config profile` y elige editar workflows
- **THEN** `tasks` aparece como opción con un nombre y una descripción propios, después de `plan`
- **AND** queda marcado cuando el perfil actual lo incluye

#### Scenario: Archivos del usuario con el mismo nombre
- **WHEN** el proyecto contiene un archivo propio del usuario como `.kilocode/workflows/opsx-tasks.md` o `.claude/commands/opsx/tasks.md`
- **THEN** `specagile init` y `specagile update` lo dejan en su lugar y no lo reportan como un archivo antiguo
