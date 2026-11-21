# fork-project-layout Specification

## Purpose

Define dónde guarda SpecAgile la planificación de un proyecto o un store: las specs vivas en `specs/`, los changes en `changes/` y los archivos de la herramienta en `specagile/`, todo en la raíz. Así las specs no dependen de la herramienta que las escribe. Este layout reemplaza las rutas `openspec/…` que nombran las specs heredadas de upstream.

## Requirements

### Requirement: Layout del proyecto en la raíz
SpecAgile SHALL guardar la planificación en tres carpetas de la raíz del proyecto: las specs vivas en `specs/<capability-path>/spec.md`, los changes en `changes/<change>/` (los archivados en `changes/archive/`) y los archivos de la herramienta en `specagile/`, como la config `specagile/config.yaml` y los esquemas del proyecto en `specagile/schemas/`. Dentro de cada change no cambia nada: sus deltas siguen en `specs/<capability-path>/spec.md`.

#### Scenario: Inicializar un proyecto nuevo
- **WHEN** el usuario ejecuta `specagile init` en un proyecto sin planificación
- **THEN** existen `specs/`, `changes/`, `changes/archive/` y `specagile/config.yaml` en la raíz del proyecto
- **AND** no existe la carpeta `openspec/`

#### Scenario: Crear un change
- **WHEN** el usuario ejecuta `specagile new change add-login` en un proyecto con el layout nuevo
- **THEN** el change queda en `changes/add-login/`, con su `.openspec.yaml`

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
SpecAgile SHALL conservar los nombres de sus archivos internos y la ubicación que sugiere para un store nuevo: el archivo de metadatos de cada change (`.openspec.yaml`), los metadatos de un store (`.openspec-store/`), la marca de skills compartidos (`.agents/skills/.openspec-target`) y la ubicación sugerida para un store nuevo (`~/openspec/<id>`). Las carpetas globales de configuración y de datos son las de SpecAgile (ver `fork-global-folders`).

#### Scenario: Un change migrado conserva sus metadatos
- **GIVEN** un change `add-login` con `openspec/changes/add-login/.openspec.yaml` que declara `skip_specs: true`
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** existe `changes/add-login/.openspec.yaml` con `skip_specs: true`

#### Scenario: Ubicación sugerida para un store
- **WHEN** el usuario ejecuta `specagile store setup team` sin `--path` en una terminal interactiva
- **THEN** la CLI sugiere `~/openspec/team` como carpeta del store
