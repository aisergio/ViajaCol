# Data Model: Mi viaje

## Viaje (DynamoDB `viajacol-trips`)

| Atributo | Tipo | Regla |
|---|---|---|
| `sub` | S (partición) | Dueño; sale de la sesión |
| `tripId` | S (ordenamiento) | UUID aleatorio |
| `name` | S | 1 a 60 caracteres |
| `startDate`, `endDate` | S (`AAAA-MM-DD`) | De 1 a 30 días, `endDate ≥ startDate` |
| `travelers` | N | 1 a 20 |
| `budget` | N | 0 a 100.000.000 (COP) |
| `items` | L | Hasta 100 elementos (abajo) |
| `version` | N | Empieza en 1 y suma 1 en cada cambio |
| `shareId` | S (opcional) | 22 caracteres base64url (128 bits); clave del índice `shareId-index` |
| `migrationId` | S (opcional) | Identificador del borrador migrado (idempotencia) |
| `createdAt`, `updatedAt` | S (ISO 8601) | |

## Elemento del viaje

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | Único en el viaje |
| `kind` | `sitio` \| `fiesta` \| `plato` \| `experiencia` \| `nota` | |
| `slug` | slug | Obligatorio salvo en notas; único por `kind` en el viaje |
| `title` | texto | Nombre guardado (1 a 80); en notas, el título |
| `text` | texto | Solo notas, hasta 500 |
| `day` | entero o `null` | 0 a días − 1; `null` = «Sin día» |
| `order` | entero | Posición dentro de su día |
| `cost` | entero o `null` | 0 a 100.000.000 (COP) |

## Reglas del dominio

- Cambiar las fechas reasigna a «Sin día» los elementos de los días que ya no existen.
- Mover un elemento renumera el orden de su día de origen y del de destino.
- Totales (derivados): por categoría, total y saldo = presupuesto − total.
- Un viaje de otro `sub` no existe para el usuario: todas las lecturas filtran por la clave.

## Borrador local (`viajacol:mi-viaje-borrador`)

```json
{ "state": { "migrationId": "uuid", "items": [{ "kind": "sitio", "slug": "...", "title": "..." }] }, "version": 0 }
```

## Transiciones del enlace compartido

```text
sin compartir ──compartir──▶ compartido (shareId nuevo)
compartido ──revocar──▶ sin compartir (el shareId deja de existir)
compartido ──compartir otra vez──▶ compartido (shareId nuevo; el anterior deja de abrir)
```
