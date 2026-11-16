# Spec Delta

## Purpose

Permite que el fork se mantenga sincronizado con OpenSpec upstream sin volver a incorporar las rutas que el fork eliminó a propósito (como el sitio de documentación), resolviendo esas rutas de forma automática y dejando al mantenedor solo los conflictos reales.

## ADDED Requirements

### Requirement: Lista explícita de rutas eliminadas por el fork
El fork SHALL declarar en una única lista explícita las rutas que eliminó de upstream: la carpeta `website/` y el archivo `test/website-preview.test.ts`. La sincronización SHALL tratar como eliminada solo una ruta que coincida exactamente con una entrada de esa lista o que esté dentro de una carpeta listada; ninguna otra ruta se ve afectada.

#### Scenario: Una carpeta listada cubre todo su contenido
- **WHEN** upstream modifica `website/app/layout.tsx`
- **THEN** la sincronización trata ese archivo como eliminado por el fork, porque está dentro de la carpeta listada `website/`

#### Scenario: Rutas con nombre parecido no se ven afectadas
- **WHEN** upstream agrega `website-assets/logo.svg` o `test/website-preview.helpers.ts`
- **THEN** esos archivos se incorporan al fork como cualquier otro cambio de upstream, porque no coinciden con ninguna entrada de la lista

#### Scenario: Otras carpetas de documentación se conservan
- **WHEN** upstream modifica archivos en `docs/` o `docs-lab/`
- **THEN** esos cambios se incorporan al fork con normalidad

### Requirement: El fork funciona sin el sitio de documentación
La rama del fork SHALL no versionar ninguna ruta de la lista de eliminadas, y la suite de tests del fork SHALL ejecutarse sin fallos atribuibles a la ausencia del sitio.

#### Scenario: El árbol del fork no contiene el sitio
- **WHEN** el mantenedor lista los archivos versionados de la rama del fork
- **THEN** no aparece ningún archivo bajo `website/` ni `test/website-preview.test.ts`

#### Scenario: La suite de tests no depende del sitio
- **WHEN** el mantenedor ejecuta `pnpm test` en un clon del fork sin carpeta `website/`
- **THEN** ningún test falla por no encontrar archivos del sitio

### Requirement: La sincronización mantiene ausentes las rutas eliminadas
Al sincronizar con upstream, las rutas de la lista SHALL quedar ausentes del resultado sin intervención manual, cualquiera sea el cambio que upstream haya hecho sobre ellas: modificarlas, agregar archivos nuevos, renombrarlas o borrarlas.

#### Scenario: Upstream modifica un archivo eliminado por el fork
- **WHEN** upstream modificó `website/package.json` y el mantenedor sincroniza
- **THEN** la sincronización no le pide resolver ningún conflicto sobre ese archivo y `website/package.json` sigue ausente en el fork

#### Scenario: Upstream agrega un archivo nuevo dentro de una carpeta eliminada
- **WHEN** upstream agregó `website/app/new-page.tsx` y el mantenedor sincroniza
- **THEN** ese archivo no se incorpora al fork

#### Scenario: Upstream renombra un archivo dentro de una carpeta eliminada
- **WHEN** upstream renombró un archivo dentro de `website/` y el mantenedor sincroniza
- **THEN** ni el nombre anterior ni el nuevo aparecen en el fork

#### Scenario: Upstream modifica un test eliminado por el fork
- **WHEN** upstream modificó `test/website-preview.test.ts` y el mantenedor sincroniza
- **THEN** el archivo sigue ausente en el fork y no queda conflicto pendiente sobre él

#### Scenario: Sincronización en Windows
- **WHEN** el mantenedor sincroniza desde PowerShell o Git Bash en Windows y el sistema de archivos muestra rutas como `website\app\layout.tsx`
- **THEN** las rutas eliminadas se reconocen igual que en macOS y Linux y quedan ausentes del resultado

### Requirement: La sincronización sin conflictos se completa sola
Cuando no quedan conflictos fuera de las rutas eliminadas, la sincronización SHALL registrar la integración de upstream en la rama actual con un commit de merge que incluye todos los cambios de upstream fuera de las rutas eliminadas, e informar cuántas entradas de rutas eliminadas resolvió.

#### Scenario: Merge limpio con cambios en el sitio
- **WHEN** upstream modificó `src/` y `website/`, sin conflictos en `src/`, y el mantenedor sincroniza
- **THEN** la rama actual tiene un commit de merge con upstream como segundo padre, los cambios de `src/` aplicados y `website/` ausente

#### Scenario: Nada para sincronizar
- **WHEN** la rama actual ya contiene todos los commits de upstream y el mantenedor sincroniza
- **THEN** la sincronización informa que no hay nada para integrar y no crea ningún commit

### Requirement: Los conflictos reales quedan para el mantenedor
Cuando quedan conflictos en rutas que no son de la lista, la sincronización SHALL detenerse sin crear el commit, dejar el merge en curso con las rutas eliminadas ya resueltas, listar los archivos que siguen en conflicto, indicar cómo continuar o abortar, y terminar con código de salida distinto de cero.

#### Scenario: Conflicto en un archivo editado por el fork
- **WHEN** upstream y el fork modificaron las mismas líneas de `.github/workflows/ci.yml` y el mantenedor sincroniza
- **THEN** la sincronización termina con error, lista `.github/workflows/ci.yml` como pendiente, no lista ninguna ruta de `website/`, e indica que se resuelva y se haga commit o que se aborte el merge

#### Scenario: El mantenedor aborta el merge pendiente
- **WHEN** después de una sincronización detenida por conflictos el mantenedor aborta el merge
- **THEN** la rama vuelve exactamente al estado anterior a la sincronización

### Requirement: La sincronización se niega a empezar en un estado inseguro
La sincronización SHALL verificar el estado del repositorio antes de hacer cualquier cambio y, si hay cambios sin commitear en archivos versionados, un merge ya en curso o no existe el remoto de upstream, SHALL terminar con un mensaje que explique el motivo, código de salida distinto de cero y sin modificar el repositorio.

#### Scenario: Cambios sin commitear
- **WHEN** el mantenedor tiene modificaciones sin commitear en archivos versionados y sincroniza
- **THEN** la sincronización termina con error indicando que primero haga commit o stash, y la rama y el índice quedan sin cambios

#### Scenario: Merge ya en curso
- **WHEN** hay un merge sin terminar en el repositorio y el mantenedor sincroniza
- **THEN** la sincronización termina con error indicando que primero termine o aborte ese merge

#### Scenario: Remoto de upstream inexistente
- **WHEN** el repositorio no tiene configurado el remoto de upstream y el mantenedor sincroniza
- **THEN** la sincronización termina con error indicando el comando para agregar el remoto

### Requirement: Revisión del merge antes del commit
La sincronización SHALL ofrecer una opción para dejar el merge preparado sin crear el commit, con las rutas eliminadas ya resueltas, para que el mantenedor lo revise y lo confirme por su cuenta.

#### Scenario: Sincronizar en modo revisión
- **WHEN** el mantenedor sincroniza con la opción de no crear commit y no hay otros conflictos
- **THEN** el merge queda en curso con todos los cambios en el índice, `website/` ausente, y la sincronización indica cómo confirmarlo o abortarlo

### Requirement: Documentación del mantenimiento del fork
El fork SHALL incluir un documento propio que liste todas las rutas eliminadas, explique cómo sincronizar con upstream y advierta que el botón "Sync fork" de GitHub no mantiene esas rutas ausentes. La lista del documento SHALL coincidir con la lista que usa la sincronización.

#### Scenario: El mantenedor busca cómo sincronizar
- **WHEN** el mantenedor abre el documento de mantenimiento del fork
- **THEN** encuentra el comando de sincronización, la lista de rutas eliminadas y la advertencia sobre "Sync fork"

#### Scenario: Se agrega una ruta a la lista
- **WHEN** se agrega una ruta a la lista de eliminadas que usa la sincronización y el documento no la menciona
- **THEN** la suite de tests del fork falla señalando la ruta que falta en el documento
