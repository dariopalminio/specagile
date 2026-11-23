# Spec Delta

## Purpose

Define el skill `sa-audit`, del workflow `verify`: la auditoría estática y de solo lectura que, antes de abrir el PR, contrasta la implementación con los artefactos del change y responde si el change cumple su Definition of Done y si hay deriva entre la spec y el código.

## ADDED Requirements

### Requirement: Invocación del skill de auditoría
SpecAgile SHALL proveer el skill `sa-audit`, que audita un change activo, nombrado por el usuario o inferido, y presenta el resultado como un Audit Report.

#### Scenario: Auditar con nombre de change
- **WHEN** el usuario invoca `/sa-audit add-dark-mode` y ese change está activo
- **THEN** el agente anuncia "Using change: add-dark-mode" y cómo auditar otro (`/sa-audit <otro>`)
- **AND** presenta el Audit Report de ese change

#### Scenario: Auditar sin nombre de change
- **WHEN** el usuario invoca `/sa-audit` sin nombre
- **THEN** el agente infiere el change de la conversación, o lo elige si hay un solo change activo
- **AND** si hay ambigüedad, pide elegir entre todos los changes activos, incluidos los que no tienen tareas registradas
- **AND** anuncia qué change eligió y cómo auditar otro

### Requirement: La auditoría es estática y de solo lectura
`sa-audit` SHALL evaluar el change leyendo sus artefactos, el código y los tests existentes, sin ejecutarlos, y SHALL dejar el proyecto como lo encontró: el código, los artefactos y la configuración sin cambios, cada tarea con el estado que tenía y el change activo.

#### Scenario: Tareas incompletas
- **GIVEN** el change tiene tareas sin marcar en `tasks.md`
- **WHEN** el usuario ejecuta `/sa-audit`
- **THEN** el reporte lista cada tarea incompleta como CRITICAL con su recomendación
- **AND** `tasks.md` y el código quedan sin cambios, y el change sigue activo, sin archivar

#### Scenario: Tests como evidencia
- **WHEN** la auditoría evalúa la cobertura de un escenario
- **THEN** busca en el código los tests que lo cubren y los cita como evidencia
- **AND** termina sin haber corrido los tests ni el build del proyecto

### Requirement: La auditoría usa el estado actual del proyecto
`sa-audit` SHALL tomar como evidencia los artefactos del change y el código tal como están en el árbol de trabajo, de modo que un change se puede auditar antes de commitear, de crear una rama o de abrir un pull request.

#### Scenario: Implementación sin commitear
- **GIVEN** la implementación del change está en el árbol de trabajo y todavía no tiene commits
- **WHEN** el usuario ejecuta `/sa-audit`
- **THEN** la auditoría usa ese código como evidencia y presenta el Audit Report completo

#### Scenario: Specs delta de una capacidad anidada en Windows
- **GIVEN** en Windows el change tiene sus specs delta en `specs\identity\user-auth\spec.md` dentro de la carpeta del change
- **WHEN** el usuario ejecuta `/sa-audit`
- **THEN** la auditoría lee esas specs y evalúa sus requisitos en Spec Coverage
- **AND** para un requisito REMOVED busca su texto base en `specs\identity\user-auth\spec.md` de la raíz del proyecto, con el separador de la plataforma

### Requirement: Los chequeos son los de la verificación de upstream
`sa-audit` SHALL evaluar Completeness, Correctness y Coherence con los chequeos y reglas que define la capacidad `opsx-verify-skill`: task completion, spec coverage (incluidos los requisitos REMOVED y RENAMED), requirement implementation mapping, scenario coverage, design adherence y code pattern consistency. SHALL marcar cada chequeo como *Not applicable* o *Not verified* con las mismas reglas.

#### Scenario: Requisito agregado sin implementación
- **WHEN** un requisito ADDED o MODIFIED de las specs delta no aparece implementado en el código
- **THEN** el reporte lo informa como CRITICAL "Requirement not found: <requisito>", con una recomendación para implementarlo

#### Scenario: Requisito eliminado que sigue implementado
- **WHEN** el comportamiento de un requisito REMOVED, leído en su texto base de la spec principal, sigue presente en el código
- **THEN** el reporte lo informa como CRITICAL "Removed requirement still implemented: <requisito>", con el archivo y las líneas a quitar

#### Scenario: Change que declara skip_specs
- **WHEN** el change declara `skip_specs: true`
- **THEN** los chequeos que dependen de las specs se informan como *Not applicable*, sin contarlos como omitidos ni como fallidos

#### Scenario: Change sin design.md
- **WHEN** el change tiene specs delta y tareas pero no `design.md`
- **THEN** Design Adherence se informa como *Not verified*, con el motivo
- **AND** Code Pattern Consistency se evalúa igual

### Requirement: Audit Report
`sa-audit` SHALL presentar su resultado como un Audit Report: el encabezado `## Audit Report: <change>`, una tabla resumen con una fila por dimensión y los hallazgos agrupados por prioridad, cada uno con una recomendación concreta y, cuando corresponde, la referencia `archivo:línea`.

#### Scenario: Resumen del reporte
- **WHEN** termina la auditoría
- **THEN** el reporte empieza con `## Audit Report: <change>` y una tabla con las filas Completeness, Correctness y Coherence
- **AND** cada chequeo omitido figura como `Not verified (<motivo>)` en la fila de su dimensión, nunca como aprobado

#### Scenario: Hallazgos por prioridad
- **WHEN** la auditoría encuentra hallazgos
- **THEN** los lista en este orden: CRITICAL (a corregir antes del PR), WARNING (conviene corregir) y SUGGESTION (mejoras menores)
- **AND** cada hallazgo trae una recomendación concreta, sin sugerencias vagas como "consider reviewing"

### Requirement: Veredicto de preparación para el PR
El Audit Report SHALL cerrar con un veredicto que responde si el change está listo para su pull request. Lo declara listo solo cuando todos los chequeos aplicables corrieron y no hay hallazgos CRITICAL, e incluye la cantidad de advertencias y de sugerencias cuando no es cero.

#### Scenario: Todo en orden
- **WHEN** todos los chequeos aplicables corrieron y no hay hallazgos
- **THEN** el veredicto es "All checks passed. Ready for PR."

#### Scenario: Hallazgos críticos
- **WHEN** hay hallazgos CRITICAL
- **THEN** el veredicto es "X critical issue(s) found. Fix before opening the PR."
- **AND** no sugiere abrir el PR ni archivar el change
- **AND** nombra cada chequeo omitido y su motivo, si los hay

#### Scenario: Solo advertencias
- **WHEN** todos los chequeos aplicables corrieron, no hay hallazgos CRITICAL y hay advertencias
- **THEN** el veredicto es "No critical issues. Y warning(s) to consider. Ready for PR (with noted improvements)."

#### Scenario: Solo sugerencias
- **WHEN** todos los chequeos aplicables corrieron y solo hay sugerencias
- **THEN** el veredicto es "No critical issues or warnings. Z suggestion(s) to consider. Ready for PR (with noted improvements)."

#### Scenario: Chequeos sin verificar
- **WHEN** algún chequeo aplicable quedó sin verificar y no hay hallazgos CRITICAL
- **THEN** el veredicto dice "No critical issues found in the checks that ran." y nombra cada chequeo sin verificar con su motivo
- **AND** no declara el change listo para el PR

### Requirement: Los hallazgos son advisory
Los hallazgos del Audit Report SHALL informar sin imponer: el usuario decide qué corregir, y archivar un change conserva sus propios chequeos y confirmaciones, haya o no una auditoría y tenga o no hallazgos.

#### Scenario: Archivar con hallazgos pendientes
- **GIVEN** el último Audit Report del change tiene hallazgos CRITICAL
- **WHEN** el usuario archiva el change
- **THEN** el archivado aplica sus chequeos y confirmaciones habituales, igual que en un change que nunca se auditó

#### Scenario: Artefactos opcionales ausentes
- **WHEN** el change no tiene un artefacto opcional o el esquema no registra tareas
- **THEN** la auditoría informa los chequeos afectados como *Not applicable* y no pide crear ese artefacto para obtener un reporte limpio
