# Contratos: rutas de la cuenta

Todas las rutas cuelgan de `https://aisergio.dev/ViajaCol`. Las respuestas con datos del usuario o
cookies llevan `Cache-Control: private, no-store`.

## `GET /entrar` y `GET /en/entrar`

| Parámetro | Regla |
|---|---|
| `volver` | Ruta interna (ver data-model). Si falta o no cumple: `/ViajaCol` o `/ViajaCol/en` |

- **302** hacia `https://<dominio>.auth.us-east-2.amazoncognito.com/oauth2/authorize` con
  `response_type=code`, `client_id`, `redirect_uri=https://aisergio.dev/ViajaCol/api/auth/callback/cognito`,
  `scope=openid profile email`, `state`, `code_challenge` (S256) y `lang=es|en`.
- **Set-Cookie:** `viajacol.oauth_state`.
- **503** con una página de error bilingüe si la configuración de la cuenta no está disponible.

## `GET /api/auth/callback/cognito` (Better Auth)

- **302** hacia `volver`, con `viajacol.session_token`, `viajacol.session_data` y `viajacol.con_sesion`.
- Si el estado no coincide o Cognito devuelve error: **302** hacia `/cuenta?error=entrada`.

## `POST /salir` y `POST /en/salir`

- Solo acepta peticiones del mismo origen (`Origin` o `Sec-Fetch-Site: same-origin`); si no, **403**.
- **303** hacia `https://<dominio>/logout?client_id=…&logout_uri=https://aisergio.dev/ViajaCol` (o
  `/ViajaCol/en`), borrando las cookies de sesión y `viajacol.con_sesion`.

## `GET /api/cuenta/yo`

- **200** `{ "name": "…" }` con sesión.
- **401** `{ "error": "sin-sesion" }` sin sesión, y borra `viajacol.con_sesion`.

## `GET /cuenta` y `GET /en/cuenta`

- **200** con sesión: nombre visible, correo, fecha de registro, formulario del nombre, aviso de datos y
  «Eliminar mi cuenta».
- **307** sin sesión, hacia `/entrar?volver=/ViajaCol/cuenta` (o `/en/...`).

## Server Actions de «Mi cuenta»

| Acción | Entrada | Resultado |
|---|---|---|
| `actualizarNombre` | `nombre` (1 a 50 caracteres) | `{ ok: true }` · `{ error: 'nombre-invalido' }` · `{ error: 'sin-sesion' }` |
| `eliminarCuenta` | `confirmar` = `eliminar` | Borra el usuario y el perfil, cierra la sesión y redirige a la portada con `?cuenta=eliminada` · `{ error: 'confirmacion' }` · `{ error: 'sin-sesion' }` |

Ninguna acción recibe el `sub`: lo toma de la sesión.

## Prueba de humo (después de cada publicación)

- `GET /ViajaCol/entrar` → 302 hacia `*.amazoncognito.com`.
- `GET /ViajaCol/cuenta` sin cookies → 307 hacia `/ViajaCol/entrar?volver=…`.
- `GET /ViajaCol/api/cuenta/yo` sin cookies → 401.
- `GET /ViajaCol/api/auth/ok` → 200.
