# Research: Cuenta de usuario

## D-01. Proveedor de identidad: Cognito con managed login

- **Decision:** grupo de usuarios de Amazon Cognito en el plan Essentials, con la pantalla de inicio de
  sesión administrada (versión 2) y el flujo de código con PKCE. Correo como nombre de usuario,
  verificación por código y recuperación por correo.
- **Rationale:** lo fija el plan aprobado. Cognito guarda las contraseñas, envía los códigos y protege
  contra fuerza bruta; el sitio nunca ve una contraseña. Essentials es gratis hasta 10.000 usuarios
  activos al mes, y managed login versión 2 lo requiere.
- **Alternatives considered:** formularios propios con la API de Cognito (más código y más
  responsabilidad sobre contraseñas); Auth0 o Clerk (otro proveedor externo y costos fuera de AWS).

## D-02. Better Auth bajo el `basePath` de Next.js

- **Hallazgo:** en una prueba técnica (`next dev`, Next.js 16.4.6), un Route Handler en
  `/ViajaCol/api/eco` recibe `request.url = http://localhost:3123/api/eco` y `nextUrl.basePath = ""`.
  Next.js le quita el `basePath` a la URL.
- **Consecuencia:** con la configuración documentada (`baseURL` con la ruta del sitio y
  `basePath: '/api/auth'`), Better Auth responde 404 a todo. Se probaron tres combinaciones con su
  `handler` directo:

  | Configuración | `/api/auth/ok` | `/ViajaCol/api/auth/ok` |
  |---|---|---|
  | `baseURL` = origen + `/ViajaCol`, `basePath` = `/api/auth` | 404 | 404 |
  | `baseURL` = origen, `basePath` = `/ViajaCol/api/auth` | 404 | **200** |
  | `baseURL` = origen + `/ViajaCol`, sin `basePath` | 404 | 404 |

- **Decision:** `baseURL` con solo el origen (`https://aisergio.dev`), `basePath: '/ViajaCol/api/auth'`, y
  un envoltorio en `app/api/auth/[...all]/route.ts` que vuelve a anteponer `/ViajaCol` a la URL antes
  de pasarla a Better Auth. Con esto, en la prueba técnica:
  - `GET /ViajaCol/api/auth/ok` respondió `{"ok":true}`;
  - el inicio de sesión generó la URL de Cognito con `redirect_uri` en
    `/ViajaCol/api/auth/callback/cognito`, PKCE S256, `state` y `lang=es`;
  - la cookie de estado salió como `viajacol.oauth_state` con `Path=/ViajaCol; HttpOnly; SameSite=Lax`.
- **Seguridad:** `baseURL` fijo evita GHSA-569q-mpph-wgww (el `basePath` alterado por peticiones
  externas cuando no hay `baseURL`), corregido en Better Auth 1.4.2.
- **Alternatives considered:** sacar la autenticación a otro dominio o quitar el `basePath` del sitio
  (rompen la spec 003); escribir el flujo OAuth a mano (más código de seguridad propio).

## D-03. Sesión sin base de datos y la identidad estable

- **Hallazgo:** sin `database`, Better Auth usa un adaptador en memoria por proceso
  (`@better-auth/memory-adapter`) y guarda la sesión en la caché de cookies. En Lambda cada instancia
  tiene su propia memoria, así que `session.user.id` cambia en cada inicio de sesión.
- **Decision:**
  - modo sin base de datos, con la caché de cookies en JWE (cifrada), `refreshCache` y 7 días;
  - un campo adicional `cognitoSub` (`input: false`) que se llena con `mapProfileToUser` desde el `sub`
    de Cognito. Esa es la identidad que usan los casos de uso;
  - `account.storeAccountCookie: false`: el sitio no necesita los tokens de Cognito (eliminar y salir
    no los usan) y así las cookies no se acercan a los 4 KB.
- **Alternatives considered:** una tabla DynamoDB como base de Better Auth (un adaptador más que
  mantener y una lectura por petición); guardar los tokens de Cognito (cookies grandes, sin uso).

## D-04. Entrar y salir

- **Decision:**
  - `GET /ViajaCol/[en/]entrar?volver=<ruta>`: un Route Handler llama a `signInSocial` en el servidor,
    copia la cookie de estado y responde 302 hacia Cognito con `lang=es` o `lang=en`. «Entrar» es un
    enlace normal y funciona sin JavaScript;
  - `POST /ViajaCol/[en/]salir`: verifica que la petición venga del mismo origen, llama a `signOut`,
    borra la cookie indicadora y responde 303 hacia `https://<dominio>/logout`, que vuelve a
    `https://aisergio.dev/ViajaCol` (o `/en`);
  - la CSP agrega `https://<dominio de Cognito>` a `form-action`, porque el formulario de salir termina
    en una redirección a ese dominio.
- **Alternatives considered:** el cliente de Better Auth en el navegador (exige JavaScript y aumenta el
  paquete); salir con `GET` (cualquier sitio podría cerrar la sesión de un usuario).

## D-05. El encabezado sin volver dinámicas las páginas

- **Decision:** el menú de cuenta es un componente de cliente. Si existe la cookie
  `viajacol.con_sesion` (valor `1`, sin datos, legible por JavaScript, `Path=/ViajaCol`, 7 días), pide
  `GET /api/cuenta/yo` y muestra el nombre. Si no existe, muestra «Entrar» sin hacer peticiones. La
  cookie la pone `entrar` justo antes de ir a Cognito, y la borran `salir` y el primer 401. Así no depende de
  que Better Auth deje agregar cookies a su redirección de regreso.
- **Rationale:** leer cookies en el layout volvería dinámicas las 513 rutas y anularía la caché y el LCP.
  Preguntar siempre costaría una invocación por cada visita anónima, con la concurrencia de 10 y el
  límite de tasa del borde.
- **Riesgo aceptado:** si la cookie indicadora queda sola (el usuario canceló en Cognito o borró a mano la
  de sesión), el menú pide `/api/cuenta/yo`, recibe 401, borra el indicador y muestra «Entrar».

## D-06. Perfil en DynamoDB

- **Decision:** tabla `viajacol-users`, bajo demanda, con clave de partición `sub` (cadena) y los
  atributos `displayName`, `createdAt` y `updatedAt`. El correo no se copia: llega en la sesión. El
  perfil se crea la primera vez que el usuario entra (`ensureProfile`), con el nombre de Cognito o la
  parte local del correo.
- **Alternatives considered:** atributos personalizados de Cognito (acoplan el perfil al proveedor; el
  pasaporte de la E3 necesita la tabla).

## D-07. Secretos en SSM

- **Decision:** dos parámetros `SecureString` con la clave administrada `aws/ssm`:
  `/viajacol/web/auth-secret` (generado por Terraform con `random_password`, 48 caracteres) y
  `/viajacol/web/cognito-client-secret` (el del cliente de Cognito). La función los lee una vez al
  arrancar con `GetParameters`, y quedan en memoria. Las variables de entorno solo llevan nombres e
  identificadores públicos.
- **Rationale:** la constitución exige SSM o GitHub Secrets; la justificación de checkov
  (`CKV_AWS_173`) dice que las variables de entorno no llevan secretos.
- **Alternatives considered:** Secrets Manager (US$0,40 por secreto al mes); variables de entorno.

## D-08. Eliminar la cuenta

- **Decision:** `AdminDeleteUser` sobre el grupo y `DeleteItem` del perfil, con permisos limitados a ese
  grupo y esa tabla. Luego se cierra la sesión.
- **Alternatives considered:** `DeleteUser` con el token del usuario (habría que guardar los tokens, ver
  D-03).

## D-09. Pruebas

- **Decision:**
  - las pruebas automáticas cubren todo lo que no exige una cuenta real: `volver`, casos de uso,
    Server Actions (sin sesión, con otra identidad, entrada inválida), ViewModels, vistas con axe y los
    recorridos sin sesión en Playwright;
  - el recorrido completo con Cognito se verifica después de publicar, con una cuenta de prueba que
    crea el responsable (T040).
- **Rationale:** acuñar sesiones válidas en las pruebas E2E exigiría una puerta trasera en la app, y eso
  es un riesgo que no vale la pena.

## D-10. Idioma de la pantalla y de los correos

- **Decision:** la pantalla de Cognito recibe `lang` (es o en) desde el idioma de la página. Los correos
  de verificación y de recuperación llevan el texto en los dos idiomas, porque la plantilla es una sola
  por grupo.
