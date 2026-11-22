# Spec Delta

## MODIFIED Requirements

### Requirement: Layout del proyecto en la raíz
SpecAgile SHALL guardar la planificación en tres carpetas de la raíz del proyecto: las specs vivas en `specs/<capability-path>/spec.md`, los changes en `changes/<change>/` (los archivados en `changes/archive/`) y los archivos de la herramienta en `specagile/`, como la config `specagile/config.yaml` y los esquemas del proyecto en `specagile/schemas/`. Dentro de cada change, los deltas siguen en `specs/<capability-path>/spec.md` y los metadatos quedan en `.specagile.yaml`.

#### Scenario: Inicializar un proyecto nuevo
- **WHEN** el usuario ejecuta `specagile init` en un proyecto sin planificación
- **THEN** existen `specs/`, `changes/`, `changes/archive/` y `specagile/config.yaml` en la raíz del proyecto
- **AND** no existe la carpeta `openspec/`

#### Scenario: Crear un change
- **WHEN** el usuario ejecuta `specagile new change add-login` en un proyecto con el layout nuevo
- **THEN** el change queda en `changes/add-login/`, con su `.specagile.yaml`

#### Scenario: Archivar un change
- **WHEN** el usuario archiva el change `add-login`, cuyo delta agrega la capacidad `auth`
- **THEN** el change queda en `changes/archive/<fecha>-add-login/`
- **AND** la spec viva queda en `specs/auth/spec.md`

#### Scenario: Esquema propio del proyecto
- **WHEN** el usuario ejecuta `specagile schema init my-flow` en un proyecto con el layout nuevo
- **THEN** el esquema queda en `specagile/schemas/my-flow/`
- **AND** `specagile schemas` lo lista como esquema del proyecto

#### Scenario: Rutas en Windows
- **WHEN** el usuario ejecuta `specagile init` y `specagile new change add-login` en Windows
- **THEN** quedan `specs\`, `changes\add-login\` y `specagile\config.yaml`, con el separador de la plataforma
- **AND** en macOS y Linux quedan `specs/`, `changes/add-login/` y `specagile/config.yaml`

### Requirement: Los nombres internos y las ubicaciones fuera del proyecto no cambian
SpecAgile SHALL conservar los nombres de sus archivos internos y la ubicación que sugiere para un store nuevo: los metadatos de un store (`.openspec-store/`), la marca de skills compartidos (`.agents/skills/.openspec-target`) y la ubicación sugerida para un store nuevo (`~/openspec/<id>`). Las carpetas globales de configuración y de datos son las de SpecAgile (ver `fork-global-folders`), y los metadatos de cada change están en `.specagile.yaml`.

#### Scenario: Un change migrado conserva sus metadatos
- **GIVEN** un change `add-login` con `openspec/changes/add-login/.openspec.yaml` que declara `skip_specs: true`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** existe `changes/add-login/.specagile.yaml` con `skip_specs: true`
- **AND** no existen `changes/add-login/.openspec.yaml` ni `openspec/`

#### Scenario: Un store conserva sus metadatos
- **GIVEN** el store registrado `team` tiene el layout nuevo y `.openspec-store/store.yaml`
- **WHEN** el usuario ejecuta `specagile update` en la carpeta del store
- **THEN** `.openspec-store/store.yaml` queda con su nombre y su contenido

#### Scenario: Ubicación sugerida para un store
- **WHEN** el usuario ejecuta `specagile store setup team` sin `--path` en una terminal interactiva
- **THEN** la CLI sugiere `~/openspec/team` como carpeta del store

## ADDED Requirements

### Requirement: Metadatos del change en `.specagile.yaml`
`specagile new change` SHALL guardar los metadatos del change nuevo en `.specagile.yaml`, dentro de la carpeta del change, con `schema` y `created` como hasta ahora. La salida de `specagile new change --json` SHALL nombrar ese archivo en `metadataPath`. Vale igual cuando el change se crea en un store.

#### Scenario: Crear un change
- **WHEN** el usuario ejecuta `specagile new change add-login` en un proyecto con el layout nuevo
- **THEN** existe `changes/add-login/.specagile.yaml` con `schema: spec-driven` y la fecha de creación en `created`
- **AND** no existe `changes/add-login/.openspec.yaml`

#### Scenario: Crear un change desde un skill
- **WHEN** el usuario ejecuta `/sa-specify` en Claude Code con el pedido de una capacidad nueva
- **THEN** el change queda con `proposal.md`, sus specs delta y `.specagile.yaml`

#### Scenario: Ruta de los metadatos en la salida JSON
- **WHEN** el agente ejecuta `specagile new change add-login --json`
- **THEN** `metadataPath` es la ruta absoluta de `.specagile.yaml` dentro de `changes/add-login/`
- **AND** en Windows la ruta usa `\` (`…\changes\add-login\.specagile.yaml`) y en macOS y Linux usa `/` (`…/changes/add-login/.specagile.yaml`)

#### Scenario: Crear un change en un store
- **WHEN** el usuario ejecuta `specagile new change add-login --store team`
- **THEN** existe `changes/add-login/.specagile.yaml` en la carpeta del store `team`

### Requirement: Los changes con `.openspec.yaml` siguen funcionando
En un change que no tiene `.specagile.yaml`, la CLI SHALL leer los metadatos de `.openspec.yaml` con el mismo efecto: el esquema, `skip_specs`, `retire_capabilities`, `initiative` y las claves `x-`. Vale para los changes activos y archivados, de un proyecto o de un store, creados con OpenSpec o con SpecAgile 4.0.0 o anterior.

#### Scenario: Esquema de un change sin migrar
- **GIVEN** un change `add-login` con `changes/add-login/.openspec.yaml` que declara `schema: my-flow`, y `specagile/config.yaml` con `schema: spec-driven`
- **WHEN** el usuario ejecuta `specagile status --change add-login`
- **THEN** el estado usa el esquema `my-flow`

#### Scenario: `skip_specs` en un change sin migrar
- **GIVEN** un change `update-docs` sin specs delta, con `changes/update-docs/.openspec.yaml` que declara `schema: spec-driven` y `skip_specs: true`
- **WHEN** el usuario ejecuta `specagile validate update-docs`
- **THEN** la validación acepta el change sin deltas, igual que con `.specagile.yaml`

#### Scenario: `retire_capabilities` en un change sin migrar
- **GIVEN** un change `remove-legacy-auth` cuyo delta quita el último requisito de la capacidad `legacy-auth`, con `.openspec.yaml` que declara `retire_capabilities: true`
- **WHEN** el usuario archiva el change
- **THEN** la spec viva `specs/legacy-auth/spec.md` se retira igual que con `.specagile.yaml`

#### Scenario: Un change de un store sin migrar
- **GIVEN** el store registrado `team` tiene `changes/add-login/.openspec.yaml` que declara `schema: my-flow`
- **WHEN** el usuario ejecuta `specagile status --change add-login --store team`
- **THEN** el estado usa el esquema `my-flow`

### Requirement: Con los dos archivos rige `.specagile.yaml`
Si un change tiene `.specagile.yaml` y `.openspec.yaml`, la CLI SHALL tomar los metadatos solo de `.specagile.yaml`.

#### Scenario: El esquema sale de `.specagile.yaml`
- **GIVEN** un change `add-login` con `.specagile.yaml` que declara `schema: spec-driven` y `.openspec.yaml` que declara `schema: my-flow`
- **WHEN** el usuario ejecuta `specagile status --change add-login`
- **THEN** el estado usa el esquema `spec-driven`

#### Scenario: Un marcador que solo está en `.openspec.yaml`
- **GIVEN** un change `update-docs` sin specs delta, con `.specagile.yaml` que declara `schema: spec-driven` y `.openspec.yaml` que además declara `skip_specs: true`
- **WHEN** el usuario ejecuta `specagile validate update-docs`
- **THEN** la validación rechaza el change por no tener deltas y nombra `.specagile.yaml` como el lugar para declarar `skip_specs: true`

### Requirement: Migración de los metadatos de los changes activos
`specagile update` y `specagile init` SHALL renombrar `.openspec.yaml` a `.specagile.yaml` en cada change activo de la raíz (cada carpeta directamente bajo `changes/`, salvo `changes/archive/`), sin cambiar su contenido, e informar cada archivo renombrado. SHALL hacerlo después de mover el layout anterior, en la misma ejecución. Los changes archivados conservan su `.openspec.yaml`.

#### Scenario: Migrar un proyecto creado con SpecAgile 4.0.0
- **GIVEN** un proyecto con el layout nuevo y `changes/add-login/.openspec.yaml` que declara `skip_specs: true`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** existe `changes/add-login/.specagile.yaml` con el mismo contenido que tenía `.openspec.yaml`
- **AND** no existe `changes/add-login/.openspec.yaml`
- **AND** la salida informa `changes/add-login/.openspec.yaml → changes/add-login/.specagile.yaml`

#### Scenario: Migrar con `specagile init`
- **GIVEN** un proyecto con el layout nuevo y `changes/add-login/.openspec.yaml`
- **WHEN** el usuario ejecuta `specagile init --tools claude`
- **THEN** el change queda con `.specagile.yaml`, igual que con `specagile update`

#### Scenario: Los changes archivados no se renombran
- **GIVEN** un proyecto con `changes/archive/2026-01-10-setup/.openspec.yaml`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** `changes/archive/2026-01-10-setup/.openspec.yaml` queda con su nombre y su contenido

#### Scenario: Migrar un store
- **GIVEN** el store registrado `team` tiene el layout nuevo y `changes/add-login/.openspec.yaml`
- **WHEN** el usuario ejecuta `specagile update` en la carpeta del store
- **THEN** el store queda con `changes/add-login/.specagile.yaml`

#### Scenario: Migrar en Windows
- **GIVEN** en Windows, un proyecto con `changes\add-login\.openspec.yaml`
- **WHEN** el usuario ejecuta `specagile update` desde PowerShell o cmd
- **THEN** queda `changes\add-login\.specagile.yaml` y no queda `changes\add-login\.openspec.yaml`
- **AND** la salida nombra los archivos con `/`, igual que en macOS y Linux: `changes/add-login/.openspec.yaml → changes/add-login/.specagile.yaml`

### Requirement: Un change con los dos archivos los conserva
Si un change activo tiene `.specagile.yaml` y `.openspec.yaml`, `specagile update` y `specagile init` SHALL dejar los dos como están y avisar, nombrando el change, que la CLI usa `.specagile.yaml` y que `.openspec.yaml` se puede borrar después de pasar a `.specagile.yaml` lo que haga falta.

#### Scenario: Actualizar un change con los dos archivos
- **GIVEN** un change `add-login` con `changes/add-login/.specagile.yaml` y `changes/add-login/.openspec.yaml`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** los dos archivos quedan con su contenido
- **AND** la salida avisa que `changes/add-login/` usa `.specagile.yaml` y que `.openspec.yaml` se puede borrar
- **AND** el comando termina con código cero

### Requirement: Un renombre que falla no detiene la ejecución
Si `.openspec.yaml` no se puede renombrar, por ejemplo porque otro programa lo tiene abierto en Windows, `specagile update` y `specagile init` SHALL dejarlo como está, seguir con el resto de la ejecución y nombrar el archivo en la salida, con la indicación de cerrarlo y volver a ejecutar `specagile update`. La CLI SHALL seguir leyendo ese archivo.

#### Scenario: Un archivo bloqueado en Windows
- **GIVEN** en Windows, `changes\add-login\.openspec.yaml` está abierto por otro proceso que impide renombrarlo
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** el archivo queda con su nombre y la salida lo nombra, con la indicación de cerrarlo y volver a ejecutar `specagile update`
- **AND** la actualización de los skills se completa y el comando termina con código cero
- **AND** `specagile status --change add-login` sigue usando los metadatos de ese archivo

### Requirement: Simular la migración de los metadatos
`specagile update --dry-run` SHALL informar cada `.openspec.yaml` que renombraría y cada change activo que tiene los dos archivos, sin renombrar ni cambiar ningún archivo.

#### Scenario: Simular un proyecto con metadatos sin migrar
- **GIVEN** un proyecto con `changes/add-login/.openspec.yaml`
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** la salida informa que renombraría `changes/add-login/.openspec.yaml` a `changes/add-login/.specagile.yaml`
- **AND** `changes/add-login/.openspec.yaml` sigue en su lugar y no existe `changes/add-login/.specagile.yaml`

### Requirement: Los textos nombran `.specagile.yaml`
Los mensajes de la CLI, los `SKILL.md` generados, la distribución `skills/` y las instrucciones del esquema `spec-driven` SHALL nombrar el archivo de metadatos del change como `.specagile.yaml`, también cuando el change todavía tiene `.openspec.yaml`.

#### Scenario: Mensaje de validate
- **GIVEN** un change `add-login` con `skip_specs: true` en `.specagile.yaml` y un spec delta en `specs/`
- **WHEN** el usuario ejecuta `specagile validate add-login`
- **THEN** el error nombra `.specagile.yaml` como el archivo donde está `skip_specs`

#### Scenario: El skill de specify
- **WHEN** se genera `sa-specify/SKILL.md`
- **THEN** el skill nombra `.specagile.yaml` como los metadatos que crea `specagile new change` y como el archivo donde un change declara `skip_specs: true`
- **AND** no nombra `.openspec.yaml`

#### Scenario: Instrucciones del esquema
- **WHEN** el agente ejecuta `specagile instructions proposal --change add-login --json`
- **THEN** la instrucción y el template indican declarar `skip_specs: true` en `.specagile.yaml`

#### Scenario: Distribución estática
- **WHEN** el mantenedor regenera la distribución estática de skills
- **THEN** ningún archivo de `skills/` nombra `.openspec.yaml`
