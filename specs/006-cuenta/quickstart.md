# Quickstart: Cuenta de usuario

## 1. Infraestructura (una vez, desde el PC)

Necesita una sesión de AWS (`aws login --region us-east-2 --profile viajacol`, la completa el
responsable en su navegador) y el token de Cloudflare guardado en el equipo.

```powershell
./scripts/infra/tf.ps1 live plan
./scripts/infra/tf.ps1 live apply
```

El plan debe crear:
- el grupo de usuarios (Essentials), su dominio, la apariencia de managed login y el cliente web;
- la tabla `viajacol-users`;
- los parámetros `/viajacol/web/auth-secret` y `/viajacol/web/cognito-client-secret`;
- la política adicional de la función (DynamoDB, `AdminDeleteUser` y SSM);

y debe cambiar:
- las variables de entorno de la función (no secretas);
- la CSP (`form-action` con el dominio de Cognito).

El cambio de la función se ve en producción después de la siguiente publicación, porque cada versión
publicada congela su configuración. Por eso el apply va **antes** de aprobar el despliegue del PR.

## 2. Desarrollo local

Crear `apps/web/.env.local` (no se versiona) con los valores de `terraform output` y un secreto local:

```dotenv
AUTH_ORIGIN=http://localhost:3000
AUTH_SECRET=<48 caracteres aleatorios, solo para local>
COGNITO_USER_POOL_ID=<terraform output cognito_user_pool_id>
COGNITO_CLIENT_ID=<terraform output cognito_client_id>
COGNITO_CLIENT_SECRET=<aws cognito-idp describe-user-pool-client … (no se imprime en el chat)>
COGNITO_DOMAIN=<terraform output cognito_domain>
USERS_TABLE=viajacol-users
AWS_PROFILE=viajacol
AWS_REGION=us-east-2
```

El cliente de Cognito admite `http://localhost:3000/ViajaCol/api/auth/callback/cognito` solo para
desarrollo. Luego:

```powershell
npm run dev --workspace @viajacol/web
```

## 3. Pruebas

```powershell
npm run test --workspace @viajacol/web       # casos de uso, acciones, ViewModels y vistas con axe
npm run e2e --workspace @viajacol/web        # recorridos sin sesión
```

## 4. Verificación después de publicar (T040)

1. Abrir `https://aisergio.dev/ViajaCol/sitios`, pulsar «Entrar» y crear una cuenta de prueba.
2. Confirmar el código del correo y comprobar el regreso a Sitios con el nombre en el encabezado.
3. En DevTools → Application → Cookies: `viajacol.session_token` y `viajacol.session_data` con
   `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/ViajaCol` y vencimiento a 7 días (SC-004).
4. Abrir «Mi cuenta», cambiar el nombre y comprobar el encabezado.
5. Cerrar sesión y usar «atrás»: ninguna página privada muestra datos (SC-006).
6. Entrar de nuevo, eliminar la cuenta y comprobar que ya no se puede entrar con ella.
7. Lighthouse en una lista y una ficha: mismos resultados que en la versión 5 (SC-003).
