# ADR 0007 — Sesión sin base de datos con Better Auth y Cognito

- **Estado**: aceptado (2026-11-27)
- **Contexto**:
  - la spec 006 agrega cuentas: registro, inicio y cierre de sesión, perfil y eliminación. Es la base de
    «Mi viaje» (spec 007);
  - el plan fija Cognito Essentials con managed login y Better Auth sin estado;
  - el sitio vive bajo `basePath: '/ViajaCol'` (spec 003) y sus 513 rutas públicas son estáticas
    (spec 004);
  - la cuenta de AWS admite 10 ejecuciones simultáneas de Lambda, y el borde limita a 150 peticiones
    cada 10 s por IP;
  - la constitución exige secretos en SSM o en GitHub Secrets, y verificar la sesión dentro de cada
    Server Action y Route Handler.

## Decisión

- **Identidad:** Cognito con la pantalla administrada (versión 2), el flujo de código con PKCE y `lang`
  según el idioma de la página. El sitio nunca ve contraseñas.
- **Sesión:** Better Auth 1.7 sin base de datos. Dos cookies `HttpOnly`, `Secure`, `SameSite=Lax`,
  `Path=/ViajaCol`, de 7 días: el token firmado y la caché cifrada (JWE). Better Auth no guarda los
  tokens de Cognito.
- **Identidad estable:** sin base de datos, Better Auth genera un `user.id` nuevo en cada inicio de
  sesión (adaptador en memoria por instancia). Por eso el `sub` de Cognito se guarda como campo
  adicional (`cognitoSub`) y es la única identidad que usan los casos de uso.
- **`basePath`:** Next.js entrega a los Route Handlers la URL sin `/ViajaCol`. Better Auth se configura
  con `baseURL` de solo origen y `basePath: '/ViajaCol/api/auth'`, y un envoltorio le devuelve el
  prefijo a la URL. Se verificó en una prueba técnica (research D-02).
- **Páginas públicas:** siguen estáticas. El encabezado pregunta el nombre solo si existe la cookie
  indicadora `viajacol.con_sesion`, que no tiene datos.
- **Secretos:** la clave de la sesión y el secreto del cliente de Cognito viven en SSM (`SecureString`)
  y la función los lee una vez al arrancar.
- **Perfil:** DynamoDB `viajacol-users` con clave `sub`, detrás de un puerto (`UsersRepository`).

## Consecuencias

- **A favor:**
  - ninguna lectura de base de datos por petición para saber quién es el usuario;
  - sin costo fijo: Cognito Essentials es gratis hasta 10.000 usuarios activos al mes, y DynamoDB y
    SSM cuestan centavos o nada;
  - en la E3, todas las zonas comparten la sesión, porque la cookie vive en `/ViajaCol`.
- **En contra:**
  - una sesión no se puede revocar desde el servidor antes de que venza: cerrar sesión borra las cookies
    del navegador y la sesión de Cognito, pero una cookie copiada seguiría valiendo hasta 7 días. Es un
    riesgo aceptado para el prototipo;
  - el envoltorio del `basePath` depende de un comportamiento de Next.js: si una versión futura cambia
    la URL que recibe el Route Handler, el envoltorio no duplica el prefijo (lo comprueba su prueba);
  - el correo de Cognito por defecto tiene un límite diario bajo.

## Alternativas descartadas

- **Base de datos para Better Auth (DynamoDB):** permitiría revocar sesiones, a cambio de un adaptador
  propio y una lectura por petición.
- **Flujo OAuth escrito a mano:** menos dependencias, pero más código de seguridad propio.
- **Leer la sesión en el layout:** volvería dinámicas todas las páginas y anularía la caché.
- **Variables de entorno para los secretos:** las prohíbe la constitución.
