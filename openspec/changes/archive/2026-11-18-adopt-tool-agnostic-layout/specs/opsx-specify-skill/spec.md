# Spec Delta

## MODIFIED Requirements

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
