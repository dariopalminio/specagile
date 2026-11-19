# Spec Delta

## Purpose

Define cómo se distribuye SpecAgile: el paquete npm `specagile` con el que se instala y actualiza, la ausencia de instalación standalone y de telemetría, y a dónde apuntan sus enlaces, comentarios y archivos de GitHub Copilot.

## ADDED Requirements

### Requirement: SpecAgile se instala como el paquete npm `specagile`
SpecAgile SHALL publicarse como el paquete npm `specagile`. Instalarlo globalmente SHALL dejar disponible solo el ejecutable `specagile`.

#### Scenario: Instalar con npm
- **WHEN** el usuario ejecuta `npm install -g specagile`
- **THEN** queda disponible `specagile`, `specagile --version` imprime la versión de SpecAgile y no se agrega un ejecutable `openspec`

#### Scenario: Convivir con OpenSpec instalado con npm
- **GIVEN** el usuario instaló OpenSpec con `npm install -g @fission-ai/openspec`
- **WHEN** ejecuta `npm install -g specagile`
- **THEN** siguen disponibles `openspec` y `specagile`, y cada uno ejecuta su propia CLI

### Requirement: Las actualizaciones apuntan al paquete `specagile`
Cuando hay una versión más nueva de SpecAgile, los avisos y la actualización que ofrece la CLI SHALL nombrar el paquete `specagile` con el gestor de paquetes que lo instaló.

#### Scenario: Aviso de versión nueva para una instalación con npm
- **GIVEN** SpecAgile instalado con `npm install -g specagile` y una versión más nueva publicada
- **WHEN** el usuario ejecuta `specagile update`
- **THEN** el aviso sugiere `npm install -g specagile@latest` y, después de actualizar, volver a ejecutar `specagile update`

#### Scenario: Aviso con otro gestor de paquetes
- **GIVEN** SpecAgile instalado con `pnpm add -g specagile`
- **WHEN** hay una versión más nueva y el usuario ejecuta `specagile update`
- **THEN** el aviso sugiere `pnpm add -g specagile@latest`

### Requirement: SpecAgile no ofrece instalación standalone
SpecAgile SHALL no descargar ni sugerir el binario standalone de OpenSpec. Pedir la instalación standalone SHALL explicar cómo instalar SpecAgile con npm.

#### Scenario: Pedir la instalación standalone
- **WHEN** el usuario ejecuta `specagile install`
- **THEN** la CLI explica que SpecAgile se instala con npm, muestra `npm install -g specagile@latest`, no descarga nada y termina con error

#### Scenario: Después de actualizar un proyecto
- **WHEN** el usuario ejecuta `specagile update` desde una instalación con npm
- **THEN** la salida no sugiere cambiar a una instalación standalone

### Requirement: SpecAgile no envía telemetría
SpecAgile SHALL no enviar datos de uso a ningún servicio y SHALL no mostrar un aviso de telemetría, cualquiera sea la configuración `telemetry.enabled`.

#### Scenario: Primer uso
- **WHEN** el usuario ejecuta por primera vez cualquier comando de `specagile`
- **THEN** no aparece un aviso de telemetría y la CLI no hace pedidos de red para registrar el uso

### Requirement: Los enlaces y los comentarios van al repositorio de SpecAgile
Los enlaces que muestra la CLI y los comentarios que envía `specagile feedback` SHALL apuntar al repositorio de SpecAgile, `https://github.com/dariopalminio/specagile`.

#### Scenario: Enviar un comentario
- **WHEN** el usuario ejecuta `specagile feedback "título"`
- **THEN** el issue se crea (o el enlace para crearlo se arma) en `github.com/dariopalminio/specagile`

#### Scenario: Enlaces al terminar init
- **WHEN** `specagile init` termina
- **THEN** los enlaces "Learn more" y "Feedback" apuntan a `github.com/dariopalminio/specagile`

### Requirement: Los archivos de Copilot en la nube instalan `specagile`
Los archivos que SpecAgile escribe para el agente en la nube de GitHub Copilot SHALL instalar el paquete `specagile` y usar la CLI `specagile`. Un archivo que escribió OpenSpec sin cambios SHALL reemplazarse por el de SpecAgile, y uno editado por el usuario SHALL conservarse.

#### Scenario: Activar Copilot en la nube
- **WHEN** el usuario ejecuta `specagile init --tools github-copilot --copilot-cloud`
- **THEN** `.github/workflows/copilot-setup-steps.yml` instala con `npm install -g specagile` y verifica con `specagile --version`, y `.github/agents/openspec.agent.md` indica usar la CLI `specagile`

#### Scenario: Proyecto con los archivos de OpenSpec
- **GIVEN** `.github/workflows/copilot-setup-steps.yml` tal como lo escribió OpenSpec
- **WHEN** el usuario ejecuta `specagile update` con Copilot en la nube activado
- **THEN** el archivo pasa a instalar `specagile`
