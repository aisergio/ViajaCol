# Implementation Plan: Validación continua y seguridad del repositorio

**Branch**: `002-ci-seguridad` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-ci-seguridad/spec.md`

## Summary

Cuatro flujos de GitHub Actions con acciones fijadas por SHA y permisos mínimos:

- **CI**: calidad, más build con pruebas de extremo a extremo (Playwright + axe) y Lighthouse CI.
- **Security**: CodeQL, gitleaks, dependency review y npm audit.
- **Scorecard**: OpenSSF Scorecard.
- **IaC**: Terraform fmt/validate, TFLint y Checkov.

Se completan con Dependabot, CODEOWNERS, plantillas de PR e issues, insignias en el README y el
conjunto de reglas de `main` con verificaciones requeridas.

## Technical Context

**Language/Version**: YAML de GitHub Actions; Node.js 24 LTS en CI (el mismo runtime que tendrá
Lambda); Terraform 1.17.2.

**Primary Dependencies** (versiones verificadas el 2026-11-24; SHA en cada flujo):

| Acción | Versión |
|---|---|
| actions/checkout | v7.0.1 |
| actions/setup-node | v7.1.0 |
| actions/upload-artifact | v7.0.2 |
| github/codeql-action | v4.39.5 |
| actions/dependency-review-action | v5.0.1 |
| gitleaks/gitleaks-action | v3.0.0 |
| ossf/scorecard-action | v2.6.0 |
| hashicorp/setup-terraform | v4.0.1 |
| terraform-linters/setup-tflint | v6.3.2 |
| bridgecrewio/checkov-action | v12.3146.0 (checkov 3.4.10) |

Lighthouse CI corre como `@lhci/cli` con su versión fijada.

**Testing**: los propios flujos son la prueba. La fusión se bloquea cuando alguna verificación
requerida falla.

**Target Platform**: runners alojados por GitHub: `ubuntu-24.04-arm` para la app y `ubuntu-latest`
para CodeQL, gitleaks y Checkov, que distribuyen binarios x64.

**Constraints**:
- `permissions: contents: read` por defecto; escritura solo donde hace falta (`security-events`,
  `id-token` para Scorecard).
- `persist-credentials: false` en el checkout.
- `concurrency` cancela las ejecuciones viejas de la misma rama.

**Scale/Scope**: 4 flujos, 1 configuración de Dependabot, 3 plantillas.

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| III. Pruebas primero | CI ejecuta pruebas unitarias con cobertura ≥ 80 % y E2E por historia de usuario. | ✅ |
| IV. Accesible y rápido | axe en E2E; Lighthouse CI con rendimiento ≥ 0,9, LCP ≤ 2,5 s y CLS ≤ 0,1. | ✅ |
| V. Seguro por defecto | Acciones por SHA, permisos mínimos, CodeQL, gitleaks, revisión de dependencias, Checkov. | ✅ |
| Flujo de desarrollo | Checks requeridos en `main`. | ✅ |
| Costo | Runners de GitHub gratuitos en repositorios públicos. | ✅ |

## Project Structure

```text
.github/
├── workflows/ci.yml · security.yml · scorecard.yml · iac.yml
├── dependabot.yml · CODEOWNERS · PULL_REQUEST_TEMPLATE.md
└── ISSUE_TEMPLATE/bug.yml · feature.yml · config.yml
apps/web/lighthouserc.json
infra/.tflint.hcl · infra/.checkov.yaml
```

**Structure Decision**: un flujo por propósito, para que cada verificación sea legible en el PR y
algunas sean requeridas. IaC solo se ejecuta cuando cambia `infra/`.

## Decisiones (research)

- **Lighthouse CI en ARM**: no hay Chrome oficial para Linux ARM64, así que se usa el Chromium que
  instala Playwright (`CHROME_PATH`).
- **Lighthouse 13**: ya no admite presupuestos (`budgets`); se usan aserciones por categoría y por
  métrica.
- **Trivy**: sus acciones sufrieron un secuestro de etiquetas en marzo de 2026 (CVE-2026-33634). Para
  IaC se usa Checkov fijado por SHA.
- **Excepciones de Checkov** (en `infra/.checkov.yaml`, cada una con su motivo):
  - replicación entre regiones (la prohíbe la SCP);
  - logging del bucket de estado (costo);
  - KMS propio (SSE-S3 es suficiente);
  - notificaciones de eventos (no aplican).

## Complexity Tracking

Sin violaciones.
