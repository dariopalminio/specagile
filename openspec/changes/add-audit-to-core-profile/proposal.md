# Proposal

## Why

`sa-audit` es el paso que responde, antes de abrir el PR, si el change cumple su Definition of Done y si hay deriva entre la spec y el código. Hoy no se instala por defecto: el workflow `verify` está fuera del perfil `core`, así que quien instala SpecAgile no lo ve y tiene que descubrir que existe, elegirlo en `specagile config profile` y correr `specagile update`. Con eso, el flujo largo que el fork propone (`sa-specify` → `sa-plan` → `sa-tasks` → `sa-implement` → `sa-audit` → `sa-archive`) llega incompleto a cada proyecto nuevo.

## What Changes

- El workflow `verify` (skill `sa-audit`) pasa a formar parte del perfil `core`, que queda con diez workflows (quince en total, como hoy). `specagile init` y `specagile update` con el perfil `core` instalan `sa-audit` junto a los demás, en el proyecto o en las carpetas globales según el alcance.
- Un proyecto existente con el perfil `core` recibe `sa-audit` en su próximo `specagile update`. Con skills en el repo (`--scope project`), eso agrega `.agents/skills/sa-audit/` y su entrada en la carpeta de cada herramienta, para commitear.
- Un perfil `custom` no cambia: si no tiene `verify`, `specagile update` no instala `sa-audit` y avisa que al perfil le falta el workflow core `verify`, como ya avisa con cualquier workflow core que falta.
- `specagile config profile` muestra "Audit change" marcado con el perfil `core`, y `specagile config profile core` lo incluye. Elegir exactamente los diez workflows core se guarda como `core`; los nueve de antes, sin `verify`, se guardan como `custom`.
- Documentación (README, `docs-lab/`, `FORK.md`, CHANGELOG) presenta `sa-audit` como parte del set por defecto.

Suposiciones registradas:
- Usar la auditoría sigue siendo opcional: el skill está instalado, pero el flujo no obliga a correrlo y `sa-archive` mantiene sus propios chequeos. Los diagramas de `docs/architecture/` siguen mostrándola como paso opcional antes del PR.
- Las sugerencias de inicio de `specagile init` (`/sa-propose`, `/sa-specify`, `/sa-plan`, `/sa-tasks`, `/sa-implement`) no cambian: cubren cómo empezar un change, y la auditoría llega después.
- El id de workflow sigue siendo `verify` y el skill, `sa-audit`; los nombres y la migración de `sa-verify` no cambian.
- Los demás workflows opcionales (`new`, `continue`, `ff`, `bulk-archive`, `onboard`) siguen fuera del perfil `core`.
- Este change modifica requisitos de `fork-skill-names` y agrega uno a `opsx-audit-skill`, que también modifica o crea `rename-verify-to-audit`, todavía activo. Sus deltas parten del texto que deja ese change, que debe archivarse antes.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `opsx-audit-skill`: suma la disponibilidad del skill: el workflow `verify` se instala como `sa-audit` y forma parte del perfil `core`; un perfil `custom` sin `verify` no lo instala.
- `fork-skill-names`: la instalación del perfil `core` incluye `sa-audit`.
- `fork-global-folders`: la lista exhaustiva de skills que instala el perfil `core` cuando SpecAgile no tiene config global incluye `sa-audit`.

## Impact

- Perfil: `src/core/profiles.ts` (`CORE_WORKFLOWS` suma `verify`, después de `apply`). Lo leen `src/commands/config.ts` (`specagile config profile core`, la detección de `core` en el selector y `specagile config list`), `src/core/update.ts` (aviso de workflows core que le faltan a un perfil `custom`) y `src/core/global-skills.ts` (vía `getProfileWorkflows`).
- Sin cambios en plantillas, identidad (`src/core/fork/identity.ts`), migración ni en la distribución `skills/`, que ya tiene `sa-audit/`.
- Tests que fijan el inventario o la cantidad de workflows core (perfiles, config, init, update, skills globales, onboarding, notas de workflows opcionales, claims de la documentación).
- Docs: `README.md`, `docs-lab/customize/profiles.md`, `docs-lab/reference/skills.md`, `docs-lab/start/setup.md` (árbol de skills y conteo de la salida), `docs-lab/reference/cli.md` (conteo de la salida), `docs-lab/start/quickstart.md`, `FORK.md`, `CHANGELOG.md`.
- Usuarios existentes: con el perfil `core`, el próximo `specagile update` instala `sa-audit`. Con un perfil `custom`, nada cambia hasta que elijan `verify` o vuelvan a `core`.
