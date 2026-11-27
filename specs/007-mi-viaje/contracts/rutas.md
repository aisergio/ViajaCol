# Contratos: rutas y acciones de «Mi viaje»

Todas cuelgan de `https://aisergio.dev/ViajaCol` (y `/en`). Las privadas responden `private, no-store`.

## Páginas

| Ruta | Sin sesión | Con sesión |
|---|---|---|
| `/mi-viaje` | Borrador local + invitación a entrar | Lista de viajes, crear viaje y migración del borrador |
| `/mi-viaje/{tripId}` | 307 a `/entrar?volver=…` | Editor; 404 si el viaje no es del usuario |
| `/mi-viaje/{tripId}/calendario` | 307 a `/entrar` | `text/calendar` (`.ics`); 404 si no es suyo |
| `/viaje/{shareId}` | Solo lectura, `noindex`; 404 si no existe o se revocó | Igual |
| `/api/og/viaje/{shareId}` | PNG 1200 × 630; 404 si no existe | Igual |

## Server Actions (`app/[locale]/mi-viaje/actions.ts`)

Todas devuelven `{ ok: true, trip }` o `{ ok: false, error }`, con `error` en
`sin-sesion | invalido | no-encontrado | conflicto | limite | duplicado`.

| Acción | Entrada |
|---|---|
| `crearViaje` | `name`, `startDate`, `endDate`, `travelers`, `budget` |
| `editarViaje` | `tripId`, `version`, mismos campos |
| `eliminarViaje` | `tripId` (redirige a la lista) |
| `agregarAlViaje` | `tripId`, `kind`, `slug` (el servidor pone el nombre desde el catálogo) |
| `moverElemento` | `tripId`, `version`, `itemId`, `day` (o `null`), `index` |
| `quitarElemento` | `tripId`, `version`, `itemId` |
| `ponerCosto` | `tripId`, `version`, `itemId`, `cost` (o `null`) |
| `guardarNota` | `tripId`, `version`, `itemId?`, `title`, `text`, `day` |
| `compartirViaje` / `dejarDeCompartir` | `tripId`, `version` |
| `listarMisViajes` | — (para el diálogo de las fichas) |
| `migrarBorrador` | `migrationId`, `items[]` (como mucho 100) |

Ninguna acción recibe el `sub`.
