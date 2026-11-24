# Spec Delta

## MODIFIED Requirements

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
