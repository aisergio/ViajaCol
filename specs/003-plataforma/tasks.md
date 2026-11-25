---
description: "Lista de tareas de la spec 003-plataforma"
---

# Tasks: Plataforma de publicación del prototipo

**Input**: Design documents from `/specs/003-plataforma/`

**Tests**:
- Antes de publicar:
  - pruebas del Worker (`node --test`);
  - pruebas de `/api/health` (Vitest y Playwright);
  - escaneo de la IaC (validate, TFLint y Checkov).
- Después de publicar: `scripts/deploy/smoke.sh`, que cubre FR-014.

## Phase 1: Setup

- [X] T001 Spec, checklist, plan, research, data-model, contracts y quickstart en `specs/003-plataforma/`
- [X] T002 Base de `infra/live`: `versions.tf`, `providers.tf`, `backend.tf` (estado `live/terraform.tfstate`), `variables.tf`, `terraform.tfvars.example` y `.build/` en `.gitignore`

## Phase 2: Foundational

- [X] T003 Módulo `infra/modules/nextjs-zone`:
  - Lambda arm64 con el Web Adapter;
  - alias `live` y Function URL con IAM y *streaming*;
  - registros de 14 días, alarmas y el marcador de posición.
- [X] T004 [P] Capa propia del Web Adapter: `scripts/infra/fetch-lwa-layer.ps1` (verificación SHA-256) + `aws_lambda_layer_version` en `infra/live/web.tf`
- [X] T005 [P] Buckets `static` y `artifacts`, privados, versionados, cifrados, con ciclo de vida y solo TLS, en `infra/live/static.tf`

## Phase 3: User Story 1 - Ver el prototipo en su dirección pública (Priority: P1) 🎯 MVP

- [X] T006 [US1] CloudFront en `infra/live/cdn.tf`:
  - OAC hacia Lambda y S3;
  - políticas `dynamic` e `images`;
  - cabeceras de seguridad con `Server-Timing`;
  - cuatro comportamientos y errores 5xx sin caché.
- [X] T007 [P] [US1] `apps/web/src/app/api/health/route.ts` con pruebas en `route.test.ts` y `e2e/salud.spec.ts`; `APP_VERSION` en `next.config.ts`
- [X] T008 [US1] Worker `infra/live/edge/worker.mjs` (canonización, secreto, hash, 413, `Location`), con 11 pruebas en `worker.test.mjs` y `infra/live/edge.tf` (script, sin `workers.dev`, rutas condicionadas)
- [ ] T009 [US1] Activar las rutas públicas y la regla de tasa (`enable_public_routes = true`) **con la aprobación del dueño**
- [ ] T010 [US1] Verificar SC-001, SC-002 (raíz del dominio antes y después, con `scripts/infra/domain-snapshot.mjs`; línea base en la [evidencia](evidencia.md)) y SC-006 (Lighthouse sobre la dirección pública)

## Phase 4: User Story 2 - Publicar sin pasos manuales (Priority: P1)

- [X] T011 [US2] `scripts/deploy/build-web.sh`, `publish-web.sh`, `smoke.sh` y `lambda/run.sh`
- [X] T012 [US2] `.github/workflows/deploy.yml`: el paquete en el PR, la publicación en `main` con `production` y la restauración manual
- [X] T013 [US2] Runner de CodeBuild en `infra/live/deploy.tf`: rol con mínimo privilegio y webhook `WORKFLOW_JOB_QUEUED` + `ACTOR_ACCOUNT_ID` anclado, condicionado a `enable_deploy_runner`
- [ ] T014 [US2] Activar el webhook (`enable_deploy_runner = true`) y cargar los secretos del entorno con `scripts/infra/sync-deploy-secrets.ps1` **con la aprobación del dueño**
- [ ] T015 [US2] Primera publicación desde `main` con la prueba de humo en verde (SC-004)

## Phase 5: User Story 3 - Volver a la versión anterior (Priority: P2)

- [X] T016 [US3] `scripts/deploy/rollback.sh` y el job «restaurar» de `deploy.yml`
- [X] T017 [US3] Restauración medida: el alias cambia en 8–9 s y todo toma unos 35 s con la invalidación (SC-005, [evidencia](evidencia.md))

## Phase 6: User Story 4 - Proteger el origen (Priority: P2)

- [X] T018 [US4] `infra/live/functions/origin-guard.js` + KeyValueStore + `random_password` con rotación (`origin_secret_version`, `origin_secret_previous`)
- [X] T019 [US4] Verificar el 403 directo (CloudFront, Function URL, S3) y el POST con hash a través de CloudFront (SC-003, FR-008, [evidencia](evidencia.md))

## Phase 7: User Story 5 - Presupuesto y alertas (Priority: P3)

- [X] T020 [US5] SNS por correo y alarmas Errors, Throttles y Url5xxCount; etiquetas `Project=ViajaCol`
- [ ] T021 [US5] Confirmar la suscripción del correo de alertas (el dueño)

## Phase 8: Polish

- [X] T022 Pruebas del Worker en `iac.yml`. Checkov 3.4.10: 0 fallas y 20 excepciones con motivo. TFLint limpio.
- [X] T023 `terraform apply` sin rutas públicas ni webhook. El primer intento falló en CodeBuild por la propagación de IAM y el segundo terminó bien.
- [X] T024 Despliegue de prueba con el paquete del PR, verificado a través de CloudFront con el secreto. Corrigió `HOSTNAME=0.0.0.0` ([evidencia](evidencia.md))
- [X] T025 ADR 0003 (Lambda Web Adapter), 0004 (borde en Cloudflare con OAC) y 0005 (runner de CodeBuild)
- [X] T026 README: sección «Despliegue» con diagrama y enlaces (la guía `docs/aprendizaje/nextjs-en-lambda.md` queda para la fase de documentos de la E2)

## Dependencies

- T001–T005 van antes de todas las historias.
- T006–T008 y T011–T013 se desarrollaron en paralelo.
- T009 y T014 requieren la aprobación del dueño.
- T015 requiere T009, T014 y la fusión de los PR #3 y #5.
- T017 requiere dos publicaciones.
- T019 y T024 pueden hacerse antes de T009, a través de CloudFront.
