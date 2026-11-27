# Implementation Plan: Mi viaje

**Branch**: `007-mi-viaje` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-mi-viaje/spec.md`

## Summary

- **Datos:** tabla DynamoDB `viajacol-trips` con clave `sub` (dueño) + `tripId`, y un índice disperso
  por `shareId` para los enlaces compartidos. Cada viaje es un documento con sus elementos y un número
  de `version` (research D-01).
- **Dominio puro:** `src/server/domain/trip.ts` aplica cada cambio (crear, editar, agregar, mover,
  costo, nota, compartir) sobre el documento y valida con Zod. Los casos de uso cargan, aplican y
  guardan con la condición `version = esperada`; si no coincide, es un conflicto (D-02).
- **Server Actions** en `app/[locale]/mi-viaje/actions.ts`, con sesión y Zod. La interfaz usa
  `useOptimistic`: el cambio se ve al instante y se deshace si el servidor lo rechaza (D-03).
- **Días:** dnd-kit (`core` + `sortable`) con sensores de puntero, tacto y teclado y anuncios para
  lectores de pantalla, más «Mover a…» con un selector. Solo carga en la página privada del viaje (D-04).
- **Borrador sin cuenta:** store de Zustand con `persist` (`viajacol:mi-viaje-borrador`) y `devtools`.
  Al iniciar sesión, «Mi viaje» lo migra con una Server Action idempotente (D-05).
- **Agregar desde el catálogo:** un botón de cliente en las fichas; el diálogo se carga al pulsarlo, así
  que las páginas públicas siguen estáticas y casi no crecen (D-06).
- **Compartir y exportar:** `/viaje/[shareId]` de solo lectura (`noindex`) con vista previa generada por
  `next/og`, y `.ics` generado en un Route Handler privado (D-07).
- **Contexto:** fiestas del catálogo por los meses del viaje; pronóstico de Open-Meteo para viajes a 16
  días o menos y, después, el clima típico del mes (D-08). El mapa usa las coordenadas de sitios y
  fiestas sobre una silueta simple de Colombia (D-09).

## Technical Context

**Language/Version**: TypeScript 5.9 estricto. Node 22.13+ en CI y Node 26 en local.

**Primary Dependencies**: las de la spec 006, más `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0 y
`@dnd-kit/utilities` 3.2.2.

**Storage**: DynamoDB `viajacol-trips` (bajo demanda); borrador en `localStorage`.

**Testing**: Vitest para el dominio (cada operación y sus límites), los casos de uso con un repositorio
en memoria (conflictos, dueño), las Server Actions (sin sesión, otra identidad), el `.ics`, los totales y
los ViewModels; Playwright + axe para los recorridos sin sesión (borrador, página compartida inexistente,
privadas) y la accesibilidad.

**Target Platform**: igual que la spec 006.

**Project Type**: aplicación web en monorepo.

**Performance Goals**: páginas públicas iguales (SC-007); el botón de las fichas pesa menos de 3 KB y el
diálogo carga al usarlo.

**Constraints**: concurrencia de 10 en Lambda; sin costo fijo; tamaño de ítem de DynamoDB (400 KB): un
viaje con 100 elementos ocupa unos 30 KB.

**Scale/Scope**: 20 viajes por usuario y 100 elementos por viaje.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I. Server-first | La lista y el viaje se renderizan en el servidor; el cliente es el editor de días, el botón de las fichas y el borrador |
| II. MVVM con store compartido | `features/trip` (editor), `features/trip-draft` (store persistente) y `features/add-to-trip`; casos de uso en `server/application/trips` |
| III. Pruebas primero | Dominio, casos de uso, acciones y ViewModels antes del código |
| IV. Accesible, bilingüe y rápido | Arrastrar con alternativa de teclado y anuncios; ES y EN; públicas sin cambios |
| V. Seguro por defecto | Sesión y Zod en cada acción; el `sub` de la sesión; el viaje de otro usuario responde 404; enlaces con 128 bits aleatorios, revocables |
| Infraestructura y costo | Tabla en Terraform y permisos mínimos; ≈ US$0 |

**Resultado:** pasa.

### Modelo de estado de la spec

| Estado | Tipo | Dónde vive | Quién lo cambia | Cómo se rastrea |
|---|---|---|---|---|
| Viajes del usuario | Servidor (fuente de verdad) | DynamoDB `viajacol-trips` | Server Actions | `version` del documento |
| Vista optimista del viaje | Local | `useOptimistic` en `useTripEditorViewModel` | El ViewModel | React DevTools |
| Borrador sin cuenta | Global compartido, persistente | Zustand + `localStorage` | Acciones del store | Redux DevTools (middleware) |
| Totales del presupuesto | Derivado | `useMemo` sobre los elementos | Nadie | Determinista |
| Arrastre en curso | Local | dnd-kit | El usuario | Anuncios de dnd-kit |
| Clima del viaje | Remoto | `fetch` con caché en el servidor | Open-Meteo | Network |

## Project Structure

### Documentation (this feature)

```text
specs/007-mi-viaje/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/rutas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
infra/live/trips.tf                      # tabla, índice por shareId y permisos
apps/web/src/
├── server/domain/trip.ts                # documento, límites y operaciones puras
├── server/application/trips/            # casos de uso y puerto TripsRepository
├── server/infrastructure/dynamodb/trips-repository.ts
├── server/trips/{ics,weather,context}.ts
├── app/[locale]/mi-viaje/{page.tsx,actions.ts,[tripId]/page.tsx,[tripId]/calendario/route.ts}
├── app/[locale]/viaje/[shareId]/page.tsx
├── app/api/og/viaje/[shareId]/route.tsx
├── features/trip/{model,viewmodel,view}/
├── features/trip-draft/{model,viewmodel,view}/
└── features/add-to-trip/{viewmodel,view}/
```

**Structure Decision**: el dominio del viaje es puro y vive en `server/domain`: en la E3 se mueve con la
zona `mi-viaje` sin cambios.

## Complexity Tracking

| Pieza | Por qué hace falta | Alternativa descartada |
|---|---|---|
| dnd-kit | Arrastrar con teclado, tacto y anuncios accesibles | Arrastre nativo de HTML: sin tacto ni teclado |
