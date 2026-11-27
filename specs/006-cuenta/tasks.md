---
description: "Lista de tareas de la spec 006-cuenta"
---

# Tasks: Cuenta de usuario

**Input**: Design documents from `/specs/006-cuenta/`

**Tests**:
- Pruebas primero en `src/server/auth` (`volver`, configuración), en los casos de uso de
  `src/server/application/account` (con dobles de los puertos), en las Server Actions (sin sesión, con
  otra identidad, entrada inválida) y en los ViewModels (Vitest + Testing Library, cobertura ≥ 80 %).
- Vistas de la cuenta con axe en Vitest, y recorridos sin sesión en `apps/web/e2e/cuenta.spec.ts`.

## Phase 1: Setup

- [ ] T001 Dependencias: `better-auth` 1.7.28 y `@aws-sdk/client-dynamodb`, `lib-dynamodb`,
  `client-cognito-identity-provider` y `client-ssm` 3.1178.0 en `apps/web`, con versión exacta
- [ ] T002 Infraestructura en `infra/live/account.tf`: grupo de usuarios Essentials con plantillas de
  correo bilingües, dominio, apariencia de managed login, cliente web (código + PKCE, URLs de regreso de
  producción y de localhost), tabla `viajacol-users`, `random_password` y dos parámetros `SecureString`,
  y salidas. Variables de entorno de la función en `web.tf` y política adicional en el módulo
  `nextjs-zone`
- [ ] T003 CSP: `form-action 'self' https://<dominio de Cognito>` en `infra/live/cdn.tf`

## Phase 2: Foundational

- [ ] T004 [P] `src/server/auth/return-path.ts`: validación de `volver` con Zod, con pruebas primero
- [ ] T005 [P] `src/server/auth/config.ts`: lectura de la configuración (variables locales o SSM al
  arrancar), con pruebas de los dos caminos y del error claro si falta algo
- [ ] T006 `src/server/auth/auth.ts`: Better Auth sin base de datos (D-02, D-03): `baseURL` de origen,
  `basePath` completo, cookies `viajacol`, JWE de 7 días, `cognitoSub` y la cookie indicadora en el
  regreso. `src/server/auth/session.ts`: `getSessionUser()` para el servidor
- [ ] T007 `app/api/auth/[...all]/route.ts` con el envoltorio del `basePath` (`with-base-path.ts`, con
  prueba)
- [ ] T008 [P] Puertos y casos de uso en `src/server/application/account`: `ensureProfile`, `getProfile`,
  `updateDisplayName` y `deleteAccount`, con pruebas primero
- [ ] T009 [P] Adaptadores: `src/server/infrastructure/dynamodb/users-repository.ts` y
  `src/server/infrastructure/cognito/identity-admin.ts`
- [ ] T010 [P] Textos de la cuenta en `packages/i18n` (ES y EN)

## Phase 3: User Story 1 y 2 - Crear cuenta, entrar y salir (P1)

- [ ] T011 [US1] `app/[locale]/entrar/route.ts`: 302 hacia Cognito con `lang` y la cookie de estado
- [ ] T012 [US2] `app/[locale]/salir/route.ts`: mismo origen, `signOut`, borrar el indicador y 303 hacia
  el cierre de Cognito
- [ ] T013 [US2] `app/api/cuenta/yo/route.ts`: nombre del perfil o 401 (borra el indicador)
- [ ] T014 [US1] `features/account`: `useAccountMenuViewModel` (pruebas primero) y `AccountMenu` en el
  encabezado: «Entrar» sin sesión; nombre, «Mi cuenta» y «Cerrar sesión» con sesión

## Phase 4: User Story 3 - Proteger lo privado (P1)

- [ ] T015 [US3] `proxy.ts`: redirección temprana de `/cuenta` y `/en/cuenta` sin cookie de sesión
- [ ] T016 [US3] Verificación en el servidor en la página y en cada acción; pruebas de las acciones sin
  sesión y con otra identidad
- [ ] T017 [US3] `e2e/cuenta.spec.ts`: Entrar lleva a Cognito, `/cuenta` sin sesión lleva a entrar con
  `volver`, `/api/cuenta/yo` da 401, `volver` externo se ignora

## Phase 5: User Story 4 - Perfil (P2)

- [ ] T018 [US4] `app/[locale]/cuenta/page.tsx`: datos del perfil y aviso de datos, `no-store`
- [ ] T019 [US4] `actions.ts` → `actualizarNombre`; `useProfileViewModel` y `ProfileForm` con errores
  anunciados

## Phase 6: User Story 5 - Eliminar la cuenta (P3)

- [ ] T020 [US5] `eliminarCuenta` y `DeleteAccountDialog` con confirmación escrita

## Phase 7: Polish

- [ ] T021 Prueba de humo: entrar, cuenta sin sesión, `/api/cuenta/yo` y `api/auth/ok`
- [ ] T022 Variables de la configuración de autenticación para el build y las E2E de CI (valores de
  prueba, sin secretos reales)
- [ ] T023 ADR 0007 (sesión sin base de datos con Better Auth y Cognito) y guía de aprendizaje sobre la
  sesión y el `basePath`
- [ ] T024 Revisión de coherencia entre spec, plan, contratos y tareas, y PR con evidencia
- [ ] T040 Tras publicar: recorrido completo con una cuenta de prueba (quickstart §4) y SC-003

## Dependencies

- T001 va antes de todo. T002 y T003 se aplican antes de aprobar el despliegue del PR.
- T004–T007 van antes de las historias; T008–T009 antes de US3, US4 y US5.
- US1 y US2 son el MVP; US3 requiere T006; US4 requiere T008 y T009; US5 requiere US4.
- T040 requiere la fusión, el apply y la aprobación de `production`.
