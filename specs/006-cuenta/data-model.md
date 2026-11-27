# Data Model: Cuenta de usuario

## Usuario (en Cognito)

| Campo | Tipo | Regla |
|---|---|---|
| `sub` | UUID | Lo asigna Cognito. Es la identidad estable del sitio y nunca cambia |
| `email` | correo | Único en el grupo y verificado por código antes de entrar |
| `email_verified` | booleano | `true` para poder iniciar sesión |
| `name` | texto | Opcional en Cognito. Si falta, el perfil usa la parte local del correo |

## Perfil (DynamoDB `viajacol-users`)

| Atributo | Tipo | Regla |
|---|---|---|
| `sub` | S (clave de partición) | El `sub` de la sesión; nunca viene del navegador |
| `displayName` | S | De 1 a 50 caracteres después de quitar espacios a los lados; sin caracteres de control |
| `createdAt` | S (ISO 8601) | Fecha y hora de la primera entrada; no cambia |
| `updatedAt` | S (ISO 8601) | Se actualiza en cada cambio del nombre |

- **Creación:** `ensureProfile(sub, nombreInicial)` con `PutItem` condicional
  (`attribute_not_exists(sub)`), así un segundo inicio de sesión no pisa el nombre.
- **Cambio:** `UpdateItem` de `displayName` y `updatedAt`, con la condición `attribute_exists(sub)`.
- **Eliminación:** `DeleteItem` por `sub`.
- **Uso futuro:** «Mi viaje» (007) y el pasaporte (013) cuelgan del mismo `sub`.

## Sesión (cookies, todas con `Path=/ViajaCol`)

| Cookie | Contenido | Atributos | Vida |
|---|---|---|---|
| `viajacol.session_token` | Token de sesión firmado | `HttpOnly; Secure; SameSite=Lax` | 7 días |
| `viajacol.session_data` | Caché cifrada (JWE) con el usuario (`id`, `email`, `name`, `cognitoSub`) y la sesión (`expiresAt`) | `HttpOnly; Secure; SameSite=Lax` | 7 días, se renueva al usarla |
| `viajacol.oauth_state` | Estado del flujo con Cognito (PKCE) | `HttpOnly; Secure; SameSite=Lax` | 10 minutos |
| `viajacol.con_sesion` | `1`, sin datos | `Secure; SameSite=Lax` (legible por JavaScript) | 7 días |

## Transiciones

```text
anónimo ──entrar + Cognito──▶ con sesión
con sesión ──salir──▶ anónimo (también cierra la sesión de Cognito)
con sesión ──7 días──▶ anónimo (la cookie vence)
con sesión ──eliminar la cuenta──▶ anónimo (sin usuario ni perfil)
con sesión ──cookie alterada──▶ anónimo (la firma o el cifrado no validan)
```

## Validaciones (Zod, en el servidor)

- **`volver`:** ruta interna que empieza por `/ViajaCol/` o es `/ViajaCol`; sin `//`, sin `\`, sin
  esquema ni host, sin caracteres de control y de 512 caracteres como máximo. Si no cumple, se usa la
  portada del idioma.
- **`displayName`:** cadena, `trim`, de 1 a 50 caracteres, sin caracteres de control.
- **Confirmación de eliminar:** el campo `confirmar` debe valer exactamente `eliminar`.
