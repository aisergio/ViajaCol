---
description: "Lista de tareas de la spec 002-ci-seguridad"
---

# Tasks: Validación continua y seguridad del repositorio

**Input**: Design documents from `/specs/002-ci-seguridad/`

**Tests**: la verificación es la ejecución de los flujos en el PR (deben pasar) y una prueba de
bloqueo con un check requerido en rojo.

## Phase 1: Setup

- [X] T001 Crear `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md` y `.github/ISSUE_TEMPLATE/{bug,feature,config}.yml`

## Phase 2: User Story 1 - Calidad antes de fusionar (Priority: P1) 🎯 MVP

- [X] T002 [US1] Flujo `.github/workflows/ci.yml`: job «Calidad» (formato, lint, tipos, Vitest con cobertura y resumen) en `ubuntu-24.04-arm`
- [X] T003 [US1] Job «Build y E2E» en `ci.yml`: build de producción, Chromium de Playwright, E2E + axe, reporte como artefacto
- [X] T004 [US1] `apps/web/lighthouserc.json` con aserciones (rendimiento ≥ 0,9; accesibilidad ≥ 0,95; buenas prácticas y SEO ≥ 0,9; LCP ≤ 2500 ms; CLS ≤ 0,1) y paso de Lighthouse CI en `ci.yml`

## Phase 3: User Story 2 - Seguridad en cada cambio (Priority: P1)

- [X] T005 [P] [US2] Flujo `.github/workflows/security.yml`: CodeQL (JS/TS y Actions, `security-extended`), gitleaks, dependency review (falla en severidad alta) y npm audit de producción
- [X] T006 [P] [US2] Flujo `.github/workflows/iac.yml`, `infra/.tflint.hcl` e `infra/.checkov.yaml` (fmt, validate, TFLint con reglas de AWS, Checkov con SARIF)

## Phase 4: User Story 3 - Evidencia verificable (Priority: P2)

- [X] T007 [P] [US3] Flujo `.github/workflows/scorecard.yml` (publicación de resultados y SARIF)
- [X] T008 [US3] Insignias de CI, Security y Scorecard en `README.md`

## Phase 5: User Story 4 - Dependencias al día (Priority: P3)

- [X] T009 [P] [US4] `.github/dependabot.yml` (npm agrupado, github-actions y terraform, semanal)

## Phase 6: Polish

- [X] T010 Ejecutar los flujos en el PR, corregir hallazgos y registrar los resultados
- [ ] T011 Hacer requeridas las verificaciones principales en el conjunto de reglas de `main` y comprobar el bloqueo

## Dependencies

T001 → T002–T009 (en paralelo donde se indica) → T010 → T011.
