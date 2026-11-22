# fork-project-layout Specification

## Purpose

Define dónde guarda SpecAgile la planificación de un proyecto o un store: las specs vivas en `specs/`, los changes en `changes/` y los archivos de la herramienta en `specagile/`, todo en la raíz. Así las specs no dependen de la herramienta que las escribe. Este layout reemplaza las rutas `openspec/…` que nombran las specs heredadas de upstream.

## Requirements

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

### Requirement: La raíz se reconoce por `specagile/`
Los comandos SHALL tomar como raíz la carpeta más cercana, desde la actual hacia arriba, que tiene `specagile/` con un archivo de config, o `specagile/` junto a `specs/` o `changes/`. Una carpeta con `specs/` o `changes/` y sin `specagile/` SHALL no ser raíz. Tampoco SHALL serlo una carpeta cuyo `specagile/` no tiene config y que no tiene `specs/` ni `changes/` al lado.

#### Scenario: Comando desde una subcarpeta
- **GIVEN** un proyecto con el layout nuevo
- **WHEN** el usuario ejecuta `specagile list` desde `src/components/` del proyecto
- **THEN** la CLI lista los changes de `changes/` en la raíz del proyecto

#### Scenario: Un repo con `specs/` de tests
- **GIVEN** un repo sin `specagile/` que tiene una carpeta `specs/` con tests
- **WHEN** el usuario ejecuta `specagile list --json` en ese repo
- **THEN** la salida informa `"root": null` y no lista nada de esa carpeta `specs/`

#### Scenario: Una carpeta `specagile/` ajena en la carpeta personal
- **GIVEN** la carpeta personal del usuario tiene `specagile/`, por ejemplo un clon del repositorio, sin `config.yaml` ni `config.yml`, y no tiene `specs/` ni `changes/`
- **WHEN** el usuario ejecuta `specagile list` desde una carpeta de su carpeta personal que no es un proyecto
- **THEN** la CLI no toma la carpeta personal como raíz

### Requirement: Migración del layout anterior
Cuando la raíz tiene el layout anterior (`openspec/` con config, `specs/` o `changes/`) y no es raíz del layout nuevo, `specagile update` y `specagile init` SHALL moverlo al layout nuevo antes de cualquier otro cambio en el proyecto: `openspec/specs/` a `specs/`, `openspec/changes/` a `changes/` y cada otra entrada de `openspec/` a `specagile/`, sin cambiar el contenido de los archivos. Luego SHALL quitar el `openspec/` vacío e informar cada movimiento.

#### Scenario: Migrar un proyecto existente
- **GIVEN** un proyecto creado con `openspec init` o con SpecAgile 2.1, con `openspec/config.yaml`, `openspec/specs/auth/spec.md`, `openspec/changes/add-login/proposal.md` y `openspec/changes/archive/2026-01-10-setup/`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** existen `specagile/config.yaml`, `specs/auth/spec.md`, `changes/add-login/proposal.md` y `changes/archive/2026-01-10-setup/`, con el mismo contenido que antes
- **AND** no existe `openspec/`
- **AND** la salida informa cada carpeta y archivo que movió, con su ruta anterior y la nueva

#### Scenario: El resto de `openspec/` pasa a `specagile/`
- **GIVEN** un proyecto con el layout anterior que además tiene `openspec/schemas/my-flow/schema.yaml` y `openspec/explorations/notes.md`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** existen `specagile/schemas/my-flow/schema.yaml` y `specagile/explorations/notes.md`
- **AND** `specagile schemas` sigue listando `my-flow` como esquema del proyecto

#### Scenario: Migrar con `specagile init`
- **GIVEN** un proyecto con el layout anterior
- **WHEN** el usuario ejecuta `specagile init --tools claude`
- **THEN** el proyecto queda migrado igual que con `specagile update` y la inicialización sigue sobre el layout nuevo

#### Scenario: Un repo que declara un store
- **GIVEN** un repo cuyo único contenido de planificación es `openspec/config.yaml` con `store: team`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** queda `specagile/config.yaml` con `store: team`
- **AND** `specagile list` en ese repo sigue usando el store `team`

#### Scenario: Migrar en Windows
- **GIVEN** en Windows, un proyecto con `openspec\specs\identity\user-auth\spec.md` y `openspec\changes\add-login\`
- **WHEN** el usuario ejecuta `specagile update` desde PowerShell o cmd
- **THEN** quedan `specs\identity\user-auth\spec.md` y `changes\add-login\`, y no queda `openspec\`

### Requirement: La migración mueve todo o nada
Si `specs/`, `changes/` o `specagile/` ya existen con contenido en la raíz, o si un movimiento falla, la migración SHALL dejar el proyecto como estaba. En ese caso el comando SHALL terminar con un código distinto de cero sin hacer otros cambios en el proyecto, e indicar qué carpeta o archivo lo impidió y cómo seguir. Una carpeta de destino vacía no la impide.

#### Scenario: Una carpeta `specs/` de tests ocupa el destino
- **GIVEN** un proyecto con el layout anterior que también tiene en la raíz una carpeta `specs/` con tests
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** no se mueve ningún archivo y `openspec/` queda como estaba
- **AND** el mensaje nombra `specs/` como la carpeta que impide la migración y pide moverla o renombrarla antes de volver a ejecutar `specagile update`
- **AND** el comando termina con un código distinto de cero

#### Scenario: Una carpeta de destino vacía
- **GIVEN** un proyecto con el layout anterior y una carpeta `changes/` vacía en la raíz
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** la migración se completa y `changes/` queda con los changes que estaban en `openspec/changes/`

#### Scenario: Un archivo bloqueado en Windows
- **GIVEN** en Windows, un archivo de `openspec\changes\` está abierto por otro proceso que impide moverlo
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** los movimientos ya hechos se deshacen y `openspec\` queda como estaba
- **AND** el mensaje nombra el archivo que no se pudo mover y pide cerrarlo y volver a ejecutar `specagile update`

### Requirement: Simular la migración
`specagile update --dry-run` SHALL informar cada movimiento que haría la migración, o qué la impediría, sin mover ni cambiar ningún archivo.

#### Scenario: Simular un proyecto con el layout anterior
- **GIVEN** un proyecto con `openspec/specs/` y `openspec/changes/`
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** la salida informa que movería `openspec/specs/` a `specs/` y `openspec/changes/` a `changes/`
- **AND** `openspec/` sigue en su lugar y no existen `specs/` ni `changes/` en la raíz

#### Scenario: Simular con el destino ocupado
- **GIVEN** un proyecto con el layout anterior y una carpeta `specs/` con contenido en la raíz
- **WHEN** el usuario ejecuta `specagile update --dry-run`
- **THEN** la salida informa que la migración no se haría y nombra `specs/` como la causa

### Requirement: Un `openspec/` junto al layout nuevo queda intacto
Cuando la raíz ya tiene el layout nuevo, SpecAgile SHALL ignorar un `openspec/` que siga en ella: no lo lee, no lo mueve ni lo borra. `specagile update` SHALL avisar que esa carpeta quedó sin usar.

#### Scenario: Los dos layouts en la misma raíz
- **GIVEN** un proyecto con `specagile/config.yaml` y `changes/add-login/`, que además tiene `openspec/changes/old-change/`
- **WHEN** el usuario ejecuta `specagile update` y después `specagile list`
- **THEN** `openspec/` queda sin cambios y la salida de update avisa que SpecAgile no la usa
- **AND** `specagile list` lista `add-login` y no `old-change`

### Requirement: Los comandos piden migrar un proyecto sin migrar
Cuando la raíz más cercana solo tiene el layout anterior, los comandos que leen o escriben la planificación (`list`, `show`, `status`, `instructions`, `new change`, `validate`, `archive`, …) SHALL fallar sin escribir nada, con un mensaje que indica ejecutar `specagile update`. Con `--json`, el error SHALL salir como diagnóstico de raíz, con esa corrección en `fix`.

#### Scenario: Crear un change sin migrar
- **GIVEN** un proyecto con el layout anterior
- **WHEN** el usuario ejecuta `specagile new change add-login`
- **THEN** el comando falla con un mensaje que indica ejecutar `specagile update`
- **AND** no se crean `changes/` ni `specagile/` y `openspec/` queda como estaba

#### Scenario: Listar con `--json` sin migrar
- **GIVEN** un proyecto con el layout anterior
- **WHEN** el agente ejecuta `specagile list --json` desde una subcarpeta del proyecto
- **THEN** la salida informa `"root": null` y un diagnóstico cuya corrección es ejecutar `specagile update`
- **AND** el comando termina con un código distinto de cero

### Requirement: Los stores usan el mismo layout
`specagile store setup` SHALL crear los stores con el layout nuevo, junto a sus metadatos `.openspec-store/`. Un store registrado con el layout anterior SHALL informarse como pendiente de migrar al usarlo con `--store` y en `specagile store doctor`, con la indicación de ejecutar `specagile update` en su carpeta. Ese `specagile update` SHALL migrarlo igual que a un proyecto.

#### Scenario: Crear un store
- **WHEN** el usuario ejecuta `specagile store setup team --path <carpeta>`
- **THEN** existen `<carpeta>/specs/`, `<carpeta>/changes/archive/`, `<carpeta>/specagile/config.yaml` y `<carpeta>/.openspec-store/store.yaml`
- **AND** no existe `<carpeta>/openspec/`

#### Scenario: Usar un store sin migrar
- **GIVEN** el store registrado `team` tiene el layout anterior
- **WHEN** el usuario ejecuta `specagile list --store team`
- **THEN** el comando falla con un mensaje que nombra la carpeta del store e indica ejecutar `specagile update` en ella

#### Scenario: Migrar un store
- **GIVEN** el store registrado `team` tiene el layout anterior
- **WHEN** el usuario ejecuta `specagile update` en la carpeta del store
- **THEN** el store queda con el layout nuevo y `.openspec-store/` sin cambios
- **AND** `specagile list --store team` lista sus changes

### Requirement: Los textos nombran el layout nuevo
Los mensajes de la CLI, los `SKILL.md` generados, la distribución `skills/` y las instrucciones del esquema `spec-driven` SHALL nombrar las rutas del layout nuevo y ninguna ruta bajo `openspec/`, salvo los mensajes que describen la migración. Cuando un texto nombra una spec viva y un spec delta, SHALL distinguirlos: la viva en la raíz (`<planningHome.root>/specs/…`) y el delta dentro del change.

#### Scenario: Salida de init
- **WHEN** `specagile init` crea la config del proyecto
- **THEN** la salida la nombra `specagile/config.yaml`

#### Scenario: El skill de propose lee la config nueva
- **WHEN** se genera `sa-propose/SKILL.md`
- **THEN** el skill indica leer `<root.path>/specagile/config.yaml` y no nombra ninguna ruta bajo `openspec/`

#### Scenario: El skill de sync nombra las specs vivas
- **WHEN** se genera `sa-sync-specs/SKILL.md`
- **THEN** el skill ubica cada spec viva en `<planningHome.root>/specs/<capability-path>/spec.md`

#### Scenario: Instrucciones de specs para una capacidad modificada
- **WHEN** el agente ejecuta `specagile instructions specs --change add-login --json`
- **THEN** la instrucción ubica la spec viva de una capacidad modificada en `<planningHome.root>/specs/<capability-path>/spec.md` y el delta en `specs/<capability-path>/spec.md` dentro del change

#### Scenario: Distribución estática
- **WHEN** el mantenedor regenera la distribución estática de skills
- **THEN** ningún archivo de `skills/` nombra una ruta bajo `openspec/`

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
