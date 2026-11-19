# Spec Delta

## Purpose

Define con qué nombre se invoca la CLI de SpecAgile (`specagile`) y cómo ese nombre aparece en todo lo que el usuario ve de la CLI. Así el fork se distingue de OpenSpec upstream y puede instalarse junto a él.

## ADDED Requirements

### Requirement: La CLI se invoca como `specagile`
Instalar SpecAgile SHALL dejar disponible el ejecutable `specagile`, con todos los subcomandos de la CLI (`specagile init`, `specagile update`, `specagile status`, `specagile instructions`, …). SpecAgile SHALL no instalar un ejecutable llamado `openspec`.

#### Scenario: Inicializar un proyecto con `specagile init`
- **WHEN** el usuario ejecuta `specagile init` en un proyecto sin carpeta `openspec/`
- **THEN** el proyecto queda inicializado igual que lo dejaba `openspec init` antes de este cambio

#### Scenario: Consultar la versión
- **WHEN** el usuario ejecuta `specagile --version`
- **THEN** la CLI imprime la versión de SpecAgile

#### Scenario: Convivir con OpenSpec upstream
- **GIVEN** el usuario tiene OpenSpec upstream instalado globalmente como `openspec`
- **WHEN** instala SpecAgile globalmente
- **THEN** la instalación no choca con el ejecutable `openspec`, y `openspec` y `specagile` siguen ejecutando cada uno su propia CLI

#### Scenario: Ejecutar en Windows
- **WHEN** el usuario instala SpecAgile globalmente en Windows y ejecuta `specagile init` desde PowerShell o cmd
- **THEN** el comando se resuelve al ejecutable de SpecAgile e inicializa el proyecto

### Requirement: La ayuda nombra la CLI como `specagile`
La ayuda y los mensajes de uso de la CLI SHALL mostrar `specagile` como nombre del programa, también en subcomandos anidados.

#### Scenario: Ayuda general
- **WHEN** el usuario ejecuta `specagile --help`
- **THEN** la línea de uso empieza con `specagile` y ningún comando se muestra con prefijo `openspec`

#### Scenario: Ayuda de un subcomando anidado
- **WHEN** el usuario ejecuta `specagile config profile --help`
- **THEN** la línea de uso muestra `specagile config profile`

### Requirement: Los mensajes sugieren comandos `specagile`
Cada mensaje de la CLI que le sugiere al usuario ejecutar un comando (próximos pasos, avisos y correcciones de errores) SHALL escribirlo con `specagile`. Los nombres de carpetas y archivos del proyecto, como `openspec/changes/`, SHALL aparecer sin cambios.

#### Scenario: Próximo paso después de crear un change
- **WHEN** el usuario ejecuta `specagile new change add-login`
- **THEN** el mensaje de próximo paso sugiere `specagile status --change add-login` y muestra la carpeta del change bajo `openspec/changes/`

#### Scenario: Corrección sugerida en un proyecto sin inicializar
- **WHEN** el usuario ejecuta `specagile list` en una carpeta sin proyecto
- **THEN** el mensaje de error sugiere ejecutar `specagile init`

#### Scenario: Sugerencia de perfiles después de init
- **WHEN** `specagile init` termina y hay workflows que el perfil no instaló
- **THEN** el aviso indica cómo agregarlos con `specagile config profile`

### Requirement: El autocompletado de shell se registra para `specagile`
Los scripts de autocompletado que genera e instala la CLI SHALL completar el comando `specagile` en cada shell soportada: bash, zsh, fish y PowerShell.

#### Scenario: Completar subcomandos en bash
- **WHEN** el usuario ejecuta `specagile completion install bash`, abre una shell nueva y escribe `specagile sta` seguido de Tab
- **THEN** la shell completa `specagile status`

#### Scenario: Completar en PowerShell en Windows
- **WHEN** el usuario ejecuta `specagile completion install powershell` en Windows y, en una sesión nueva, escribe `specagile ini` seguido de Tab
- **THEN** PowerShell completa `specagile init`

### Requirement: Los proyectos existentes siguen funcionando con `specagile`
`specagile` SHALL leer y escribir la misma estructura de proyecto que la CLI anterior. Un proyecto creado con `openspec init` funciona con `specagile` sin migrar carpetas ni archivos del proyecto.

#### Scenario: Listar changes de un proyecto creado con `openspec`
- **GIVEN** un proyecto con `openspec/changes/add-login/` creado con `openspec init` y `openspec new change`
- **WHEN** el usuario ejecuta `specagile list`
- **THEN** la CLI lista `add-login`
