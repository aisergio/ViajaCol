# Evidencia: spec 002 (validación continua y seguridad)

Registro de T010 y T011, del 2026-11-25.

## T010: ejecución de los flujos en el PR #3

| Ejecución | Resultado |
|---|---|
| Primera, sobre `6420362` | Falló el job «Terraform (fmt, validate, TFLint, Checkov)» |
| Segunda, sobre `ac7fbbc` | Todos los checks en verde |

**Hallazgo de la primera ejecución:** el SHA fijado de `bridgecrewio/checkov-action` correspondía a
v12.1347.0 (2022, checkov 2.0.930). Esa versión no acepta varios formatos de salida ni
`output_file_path`, así que Checkov no corrió y el SARIF no existía.

**Corrección:** se actualizó a v12.3146.0 (checkov 3.4.10). En local, con la misma imagen, pasa 26 de
26 sobre `infra/`.

**Checks en verde de la segunda ejecución:**
- Calidad (lint, tipos, pruebas)
- Build y E2E (Playwright + axe)
- CodeQL (javascript-typescript y actions)
- Secretos (gitleaks)
- Dependencias (npm audit)
- Revisión de dependencias
- Terraform (fmt, validate, TFLint, Checkov)

**Ejecuciones de la segunda ronda:**
- [CI](https://github.com/aisergio/ViajaCol/actions/runs/45550255736)
- [Security](https://github.com/aisergio/ViajaCol/actions/runs/45550255699)
- [IaC](https://github.com/aisergio/ViajaCol/actions/runs/45550255723)

## T011: verificaciones requeridas y prueba de bloqueo

**Regla agregada al conjunto `main-protection`:** `required_status_checks`, con la integración de
GitHub Actions (`integration_id` 15368). Es obligatorio:
- Calidad (lint, tipos, pruebas)
- Build y E2E (Playwright + axe)
- CodeQL (javascript-typescript)
- CodeQL (actions)
- Secretos (gitleaks)
- Dependencias (npm audit)
- Revisión de dependencias

**Fuera a propósito:** «Terraform (fmt, validate, TFLint, Checkov)». Su flujo solo corre cuando
cambia `infra/`; si fuera requerido, dejaría bloqueado cualquier PR sin cambios de infraestructura.

**Prueba de bloqueo:** el [PR #4](https://github.com/aisergio/ViajaCol/pull/4), en borrador, introducía
a propósito un error de tipos en `apps/web/src/i18n/locale.ts`.
- «Calidad» y «Build y E2E» fallaron.
- GitHub marcó el PR como **BLOCKED** (`mergeStateStatus`).
- El PR se cerró sin fusionar y se borró la rama.
