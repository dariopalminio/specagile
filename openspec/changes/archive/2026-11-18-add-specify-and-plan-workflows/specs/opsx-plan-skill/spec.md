# Spec Delta

## Purpose

Define el comportamiento de `/opsx:plan`: la etapa de planificación del flujo de tres pasos, que genera o revisa el plan técnico (design y tasks) de un change ya especificado y lo deja listo para implementar.

## ADDED Requirements

### Requirement: Plan Skill Invocation
El sistema SHALL proveer un skill `/opsx:plan` que trabaja sobre un change activo existente, nombrado por el usuario o inferido, y nunca crea un change nuevo.

#### Scenario: Plan con nombre de change
- **WHEN** el agente ejecuta `/opsx:plan add-user-auth` y ese change está activo
- **THEN** el agente planifica ese change y anuncia "Using change: add-user-auth"

#### Scenario: Plan sin nombre de change
- **WHEN** el agente ejecuta `/opsx:plan` sin nombre
- **THEN** el agente infiere el change de la conversación, o lo elige automáticamente si hay un solo change activo
- **AND** si hay ambigüedad, pide al usuario que elija entre los changes activos
- **AND** anuncia qué change eligió y cómo indicar otro

#### Scenario: El change no existe
- **WHEN** el agente ejecuta `/opsx:plan` con un nombre que no corresponde a ningún change activo
- **THEN** el agente informa que no lo encontró, lista los changes activos y sugiere `/opsx:specify` para crear uno cuando está instalado (si no, `openspec new change "<name>"`)
- **AND** no crea ningún change ni archivo

### Requirement: Plan Requires a Complete Specification
`/opsx:plan` SHALL planificar solo un change cuya especificación está completa: la proposal existe y cada capacidad que lista tiene su spec delta (sin specs delta de capacidades que no lista), o el change declara `skip_specs`. Si no, SHALL detenerse sin escribir y remitir a la etapa de especificación.

#### Scenario: Falta la proposal
- **WHEN** el change elegido no tiene `proposal.md`
- **THEN** `/opsx:plan` no escribe nada
- **AND** informa que falta la especificación y sugiere `/opsx:specify <change>` cuando está instalado

#### Scenario: Faltan specs de alguna capacidad
- **WHEN** la proposal lista una capacidad que no tiene `specs/<capability-path>/spec.md` y el change no declara `skip_specs`
- **THEN** `/opsx:plan` no escribe nada
- **AND** nombra las capacidades sin spec y sugiere `/opsx:specify <change>` para completarlas cuando está instalado

#### Scenario: Spec delta sin capacidad en la proposal
- **WHEN** el change tiene un spec delta en `specs/` para una capacidad que la proposal no lista
- **THEN** `/opsx:plan` no escribe nada
- **AND** nombra ese archivo como una inconsistencia de la especificación y sugiere resolverla con `/opsx:specify <change>` cuando está instalado

#### Scenario: Chequeo de completitud en Windows
- **WHEN** en Windows la proposal lista la capacidad `identity/user-auth` y el change tiene `specs\identity\user-auth\spec.md`
- **THEN** `/opsx:plan` cuenta esa capacidad como especificada, aunque la proposal escriba la ruta con `/` y el sistema la informe con `\`
- **AND** compara las rutas con las reglas del sistema de archivos de la plataforma: sin distinguir mayúsculas en Windows, distinguiéndolas en Linux
- **AND** escribe `design.md` y `tasks.md` en la carpeta del change con el separador de la plataforma

#### Scenario: Change que declara skip_specs
- **WHEN** el change tiene `proposal.md` y declara `skip_specs: true`
- **THEN** `/opsx:plan` considera la especificación completa y genera el plan técnico

#### Scenario: Esquema sin artefacto de specs
- **WHEN** el esquema del change no define un artefacto con id `specs`
- **THEN** `/opsx:plan` no escribe nada
- **AND** informa que ese esquema no separa especificación de plan y sugiere `/opsx:propose` cuando está instalado o, si no, `openspec instructions <artifact-id> --change "<name>"` para generar los artefactos uno a uno

### Requirement: Planning Stage Boundary
`/opsx:plan` SHALL crear o revisar únicamente los artefactos de planificación: los que el change necesita para implementar y no forman parte de la especificación (en `spec-driven`, `design.md` y `tasks.md`). No modifica la proposal, los specs delta ni el código.

#### Scenario: Generar el plan de un change especificado
- **WHEN** `/opsx:plan` se ejecuta sobre un change `spec-driven` con proposal y specs completos y sin plan técnico
- **THEN** escribe `design.md` y luego `tasks.md`, basados en la proposal, los specs y el código del proyecto
- **AND** al terminar, el change queda listo para implementar

#### Scenario: Esquema con otros artefactos de planificación
- **WHEN** el esquema del change no tiene `design` ni `tasks`, o requiere para implementar otros artefactos que no son parte de la especificación
- **THEN** `/opsx:plan` crea esos artefactos en orden de dependencias, siguiendo las instrucciones del esquema para cada uno
- **AND** no crea artefactos del esquema que no se requieren para implementar

#### Scenario: Nada que planificar
- **WHEN** todos los artefactos que el esquema requiere para implementar son parte de la especificación
- **THEN** `/opsx:plan` no escribe nada
- **AND** informa que el change ya está listo para implementar y traspasa a la implementación como en un plan terminado

#### Scenario: Diseño opcional según el esquema
- **WHEN** las instrucciones del esquema marcan `design.md` como condicional y el change no lo amerita
- **THEN** `/opsx:plan` omite `design.md`, informa por qué y escribe igualmente `tasks.md`

#### Scenario: La especificación tiene un problema
- **WHEN** al planificar el agente detecta una contradicción, un hueco o un requisito inviable en la proposal o los specs
- **THEN** no edita esos artefactos
- **AND** informa el problema y sugiere resolverlo en la especificación antes de continuar (con `/opsx:specify <change>` cuando está instalado)

### Requirement: Revising an Existing Plan
Cuando el change ya tiene `design.md` o `tasks.md`, `/opsx:plan` SHALL revisarlos contra la proposal y los specs actuales, mostrar cada revisión propuesta con su motivo y escribirla solo tras confirmación del usuario. Los artefactos de plan que falten se crean sin pedir confirmación.

#### Scenario: Plan desactualizado tras re-especificar
- **WHEN** los specs cambiaron después de escribir `design.md` y `tasks.md`
- **THEN** el agente muestra qué cambiaría en cada archivo y por qué
- **AND** escribe cada revisión solo después de que el usuario la confirma

#### Scenario: Revisión rechazada
- **WHEN** el usuario rechaza una revisión propuesta
- **THEN** el archivo afectado queda sin cambios

#### Scenario: Plan al día
- **WHEN** `design.md` y `tasks.md` ya son coherentes con la proposal y los specs
- **THEN** el agente informa que no hay cambios necesarios y no escribe nada

#### Scenario: Tareas ya completadas
- **WHEN** `tasks.md` tiene tareas marcadas como completadas
- **THEN** la revisión conserva esas tareas y su marca
- **AND** solo las quita o desmarca si el usuario lo confirma explícitamente en esa revisión

#### Scenario: Falta solo uno de los artefactos de plan
- **WHEN** el change tiene `design.md` pero no `tasks.md`
- **THEN** el agente crea `tasks.md` sin pedir confirmación
- **AND** propone las revisiones de `design.md` que hagan falta, sujetas a confirmación

### Requirement: Plan Handoff
Al terminar, `/opsx:plan` SHALL resumir los artefactos escritos o revisados y detenerse, indicando cómo empezar la implementación sin iniciarla en la misma respuesta.

#### Scenario: Apply instalado
- **WHEN** `/opsx:plan` termina y el workflow `apply` está instalado
- **THEN** el resumen indica el change, los artefactos creados, revisados u omitidos y que el change está listo para implementar
- **AND** invita a usar `/opsx:apply`, escrito como lo invoca la herramienta del usuario

#### Scenario: Apply no instalado
- **WHEN** `/opsx:plan` termina y el perfil del usuario no incluye `apply`
- **THEN** el skill generado no menciona `/opsx:apply`
- **AND** indica `openspec instructions apply --change "<name>" --json` para obtener las tareas

#### Scenario: Solo se nombran workflows instalados
- **WHEN** el perfil del usuario no incluye un workflow que `/opsx:plan` sugeriría (por ejemplo `specify`, `propose` o `apply`)
- **THEN** el skill generado no nombra ese workflow
- **AND** ofrece en su lugar el comando de la CLI equivalente, o omite la sugerencia

#### Scenario: El pedido incluye implementar
- **WHEN** el pedido que invocó `/opsx:plan` también pide implementar
- **THEN** el agente se detiene igual tras el plan y espera un nuevo pedido

### Requirement: Plan Availability
El workflow `plan` SHALL instalarse como el skill `openspec-plan` y formar parte del perfil `core`.

#### Scenario: Instalación con el perfil por defecto
- **WHEN** el usuario ejecuta `openspec init` con el perfil `core`
- **THEN** se instala el skill `openspec-plan`
- **AND** en Windows el archivo queda en `.agents\skills\openspec-plan\SKILL.md` y en macOS y Linux en `.agents/skills/openspec-plan/SKILL.md`, con el enlace que corresponda desde la carpeta propia de cada herramienta

#### Scenario: Proyecto existente con perfil core
- **WHEN** el usuario ejecuta `openspec update` en un proyecto configurado con el perfil `core` que aún no tiene `openspec-plan`
- **THEN** el skill `openspec-plan` se agrega al proyecto

#### Scenario: Perfil custom sin plan
- **WHEN** el usuario guarda un perfil `custom` que no incluye `plan`
- **THEN** `openspec update` no instala `openspec-plan`
- **AND** ningún otro skill generado remite a `/opsx:plan`

#### Scenario: Selector de workflows
- **WHEN** el usuario abre `openspec config profile` y elige editar workflows
- **THEN** `plan` aparece como opción con un nombre y una descripción propios
- **AND** queda marcado cuando el perfil actual lo incluye

#### Scenario: Archivos del usuario con el mismo nombre
- **WHEN** el proyecto contiene un archivo propio del usuario como `.kilocode/workflows/opsx-plan.md` o `.claude/commands/opsx/plan.md`
- **THEN** `openspec init` y `openspec update` lo dejan en su lugar y no lo reportan como un archivo antiguo de OpenSpec
