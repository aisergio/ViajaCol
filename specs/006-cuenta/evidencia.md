# Evidencia: spec 006 (cuenta de usuario)

La verificación con una cuenta real en la dirección pública (T040) se agrega después de publicar.

## Prueba técnica de Better Auth bajo `/ViajaCol` (research D-02)

| Prueba | Resultado |
|---|---|
| URL que recibe un Route Handler en `/ViajaCol/api/eco` | `http://localhost:3123/api/eco`, `basePath: ""` |
| Configuración documentada (`baseURL` con ruta, `basePath: '/api/auth'`) | 404 en todas las rutas de Better Auth |
| `baseURL` de origen + `basePath: '/ViajaCol/api/auth'` + envoltorio | `GET /ViajaCol/api/auth/ok` → `{"ok":true}` |
| Inicio con Cognito | 200 con la URL de `oauth2/authorize`: PKCE S256, `state`, `lang=es` y `redirect_uri` en `/ViajaCol/api/auth/callback/cognito` |
| Cookie de estado | `viajacol.oauth_state`, `Max-Age=600; Path=/ViajaCol; HttpOnly; SameSite=Lax` |
| `GET /ViajaCol/api/auth/get-session` sin cookies | `null` |

## Build

- Las páginas públicas siguen prerenderizadas (●). Solo son dinámicas (ƒ) `/[locale]/cuenta`,
  `/[locale]/entrar`, `/[locale]/salir`, `/api/auth/[...all]` y `/api/cuenta/yo` (FR-012).
- `/[locale]/entrar/error` y `/[locale]/cuenta/eliminada` son estáticas.

## Pruebas automáticas

| Prueba | Resultado |
|---|---|
| TypeScript y ESLint | 0 errores y 0 avisos |
| Vitest en `apps/web` | 160 pruebas, incluidas `volver`, configuración, cookies, casos de uso, adaptadores, Server Actions y ViewModels |
| Playwright + axe (`e2e/cuenta.spec.ts`) | 12 pruebas: «Entrar» con regreso, redirección a Cognito en ES y EN, salida con el mismo origen y rechazo desde otro, «Mi cuenta» sin sesión o con cookie falsa, `/api/cuenta/yo` con 401, indicador huérfano y páginas sin sesión con axe |
| Playwright completo | 79 pruebas |

## Infraestructura

- `terraform validate` del stack `live`: válido.
- El plan y el apply se corren con la sesión de AWS del responsable antes de aprobar el despliegue
  (quickstart §1).
