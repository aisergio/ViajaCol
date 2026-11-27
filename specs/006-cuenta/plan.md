# Implementation Plan: Cuenta de usuario

**Branch**: `006-cuenta` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-cuenta/spec.md`

## Summary

- **Identidad:** un grupo de usuarios de Amazon Cognito (plan Essentials) con su pantalla de inicio de
  sesión administrada (*managed login*, versión 2), en español o inglés según la página. Correo y
  contraseña, con verificación por código.
- **Sesión:** Better Auth 1.7 sin base de datos. La sesión vive en cookies con el prefijo `viajacol`,
  `Path=/ViajaCol`, `HttpOnly`, `Secure` y `SameSite=Lax`, y dura 7 días. La identidad estable es el
  `sub` de Cognito, guardado en la sesión como campo adicional (research D-03).
- **El `basePath`:** Next.js entrega a los Route Handlers la URL sin `/ViajaCol` (comprobado en una
  prueba técnica). Un envoltorio la completa, y Better Auth se configura con `baseURL` de solo origen y
  `basePath: '/ViajaCol/api/auth'` (research D-02).
- **Entrar y salir:** `GET /entrar?volver=…` redirige a Cognito y funciona sin JavaScript. `POST /salir`
  cierra la sesión del sitio y pasa por el cierre de sesión de Cognito.
- **Páginas públicas sin cambios:** siguen estáticas. El encabezado pregunta por la sesión desde el
  cliente, y solo si existe la cookie indicadora `viajacol.con_sesion` (sin datos), así que los
  visitantes anónimos no generan peticiones nuevas (research D-05).
- **«Mi cuenta»** (`/cuenta` y `/en/cuenta`): página dinámica y privada (`no-store`), con Server Actions
  para cambiar el nombre visible y eliminar la cuenta.
- **Perfil:** tabla DynamoDB `viajacol-users` con clave `sub`. Los casos de uso viven en
  `src/server/application/account`, detrás de puertos con adaptadores para DynamoDB y Cognito.
- **Infraestructura:** `infra/live/account.tf` crea el grupo, el dominio, la apariencia, el cliente, la
  tabla, dos parámetros cifrados en SSM y los permisos mínimos de la función. La CSP agrega el dominio
  de Cognito a `form-action`.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto. Node 22.13+ en CI y Node 26 en local.

**Primary Dependencies**:
- ya instalados: Next.js 16.4.6, React 19.3.1, next-intl 4.15.3, Zod 4.6.7, Zustand 5.1;
- nuevos: `better-auth` 1.7.28 (1.4.3 o posterior corrige GHSA-569q-mpph-wgww),
  `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-cognito-identity-provider` y
  `@aws-sdk/client-ssm`, todos en 3.1178.0.

**Storage**:
- perfil en DynamoDB `viajacol-users`, bajo demanda;
- sesión en cookies cifradas;
- secretos en SSM Parameter Store (`SecureString`), leídos al arrancar la función.

**Testing**:
- Vitest: la validación de `volver`, los casos de uso con dobles de los puertos, las Server Actions con
  sesión simulada y los ViewModels con `renderHook`;
- Playwright + axe: los recorridos sin sesión (Entrar, páginas privadas, acciones rechazadas) y el menú
  de cuenta;
- Lighthouse CI sin cambios: las páginas públicas siguen estáticas;
- después de publicar, el recorrido completo con una cuenta de prueba (T040).

**Target Platform**: navegadores modernos; servidor en Lambda arm64 (spec 003), con permisos nuevos.

**Project Type**: aplicación web en monorepo (`apps/web` + `packages/*`).

**Performance Goals**:
- páginas públicas iguales a la versión 5 (SC-003);
- «Mi cuenta» con primer byte por debajo de 1 s con la función caliente.

**Constraints**:
- sin cargo fijo: Cognito Essentials es gratis hasta 10.000 usuarios activos al mes, DynamoDB bajo
  demanda cuesta centavos con el uso de demostración y los parámetros estándar de SSM son gratis;
- la cuenta de AWS admite 10 ejecuciones simultáneas: nada de peticiones extra por cada visita anónima;
- los secretos no van en variables de entorno ni en el repositorio (constitución, sección V).

**Scale/Scope**: decenas de usuarios de demostración; 2 páginas nuevas por idioma (`entrar` y `cuenta`)
y 1 Route Handler propio.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|---|---|
| I. Server-first | Las páginas públicas siguen siendo estáticas. «Mi cuenta» es un Server Component dinámico. Solo hay `"use client"` en el menú de cuenta, el formulario del nombre y el diálogo de eliminación |
| II. MVVM con store compartido | `features/account` con `model/`, `viewmodel/` y `view/`. Los casos de uso del servidor están en `src/server/application/account`. La tabla de estado está abajo |
| III. Pruebas primero | Se escriben antes las pruebas de `volver`, de los casos de uso y de las Server Actions (sin sesión, con otra identidad, entrada inválida), y luego el código |
| IV. Accesible, bilingüe y rápido | Textos en ES y EN, con la prueba de claves de i18n. Pantalla de Cognito en el idioma de la página. Formularios con etiqueta y errores anunciados. Sin impacto en el LCP de las públicas |
| V. Seguro por defecto | Cada Server Action y Route Handler verifica la sesión y valida con Zod. El `sub` sale de la sesión. Secretos en SSM y módulos `server-only`. Cookies `HttpOnly`, `Secure` y `SameSite=Lax`. Verificación de origen de Better Auth. `volver` solo acepta rutas internas |
| Infraestructura y costo | Todo en Terraform (`infra/live/account.tf`). Costo adicional ≈ US$0 |

**Resultado:** pasa. La única pieza inusual, el envoltorio del `basePath`, está justificada en
Complexity Tracking.

### Modelo de estado de la spec

| Estado | Tipo | Dónde vive | Quién lo cambia | Cómo se rastrea |
|---|---|---|---|---|
| Sesión (quién es el usuario) | Global, de solo lectura | Cookies `HttpOnly` de Better Auth | El flujo de entrar y salir | `auth.api.getSession` en el servidor |
| Indicador de sesión | Global | Cookie `viajacol.con_sesion` (legible, sin datos) | `entrar`, `salir` y el primer 401 | DevTools → Application → Cookies |
| Nombre del encabezado | Remoto | `useAccountMenuViewModel` (`GET /api/cuenta/yo`) | El servidor | Network |
| Perfil | Servidor (fuente de verdad) | DynamoDB `viajacol-users` | Server Actions | `updatedAt` del registro |
| Campo del nombre y sus errores | Local | `useActionState` en `useProfileViewModel` | El ViewModel | React DevTools |
| Confirmación de eliminar | Local | `useState` en el ViewModel del diálogo | El ViewModel | React DevTools |

## Project Structure

### Documentation (this feature)

```text
specs/006-cuenta/
├── spec.md
├── plan.md              # este archivo
├── research.md          # decisiones D-01 a D-10
├── data-model.md        # usuario, perfil, sesión y transiciones
├── quickstart.md        # variables, Terraform y verificación
├── contracts/
│   └── rutas.md         # entrar, salir, callback, /api/cuenta/yo, «Mi cuenta» y Server Actions
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
infra/live/
├── account.tf           # Cognito (grupo, dominio, apariencia, cliente), DynamoDB, SSM y permisos
├── cdn.tf               # CSP: form-action con el dominio de Cognito
└── web.tf               # variables de entorno no secretas de la función
infra/modules/nextjs-zone/
└── main.tf              # política adicional opcional para la función (permisos de la zona)
apps/web/src/
├── app/api/auth/[...all]/route.ts       # Better Auth, con el envoltorio del basePath
├── app/api/cuenta/yo/route.ts           # nombre para el encabezado (401 sin sesión)
├── app/[locale]/entrar/route.ts         # 302 a Cognito, sin JavaScript
├── app/[locale]/salir/route.ts          # POST: cierra la sesión del sitio y de Cognito
├── app/[locale]/cuenta/{page.tsx,actions.ts}
├── features/account/{model,viewmodel,view}/
├── server/auth/         # configuración, secretos, sesión, basePath, `volver`
├── server/application/account/          # casos de uso y puertos
├── server/infrastructure/{dynamodb,cognito}/
└── proxy.ts             # redirección temprana de las páginas privadas sin cookie
scripts/deploy/smoke.sh  # entrar redirige a Cognito, cuenta pide sesión, /api/cuenta/yo da 401
```

**Structure Decision**: la cuenta es transversal: en la E3 será la zona `cuenta`, y la sesión se
comparte entre zonas por la cookie con `Path=/ViajaCol`. Por eso la lógica de sesión vive en
`src/server/auth` y no dentro de una página.

## Complexity Tracking

| Pieza | Por qué hace falta | Alternativa más simple descartada |
|---|---|---|
| Envoltorio del `basePath` en `api/auth` | Next.js entrega la URL sin `/ViajaCol` y Better Auth no encuentra sus rutas (404 comprobado) | Quitar el `basePath` del sitio: rompe la ruta pública de la spec 003 |
| Secretos leídos de SSM al arrancar | La constitución prohíbe secretos en variables de entorno | Variables de entorno: más simples, pero violan la sección V |
| Cookie indicadora `con_sesion` | Evita una petición por cada visita anónima, que contaría para el límite de tasa y la concurrencia de 10 | Leer la sesión en el layout: volvería dinámicas todas las páginas |
