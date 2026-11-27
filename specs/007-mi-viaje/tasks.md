---
description: "Lista de tareas de la spec 007-mi-viaje"
---

# Tasks: Mi viaje

**Input**: Design documents from `/specs/007-mi-viaje/`

**Tests**: pruebas primero en el dominio (`domain/trip.test.ts`), los casos de uso con un
repositorio en memoria, las Server Actions y los ViewModels; Playwright + axe en `e2e/mi-viaje.spec.ts`.

## Phase 1: Setup

- [X] T001 Dependencias: `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities`
- [X] T002 Infraestructura en `infra/live/trips.tf`: tabla `viajacol-trips` (`sub` + `tripId`), índice
  `shareId-index`, variable `TRIPS_TABLE` y permisos mínimos de la función

## Phase 2: Foundational

- [X] T003 Dominio puro `domain/trip.ts` (servidor y cliente): esquemas, límites, crear, editar (con reasignación de
  días), agregar, mover, quitar, costo, nota, compartir y totales; pruebas primero
- [X] T004 Puerto `TripsRepository` y casos de uso con concurrencia (`version`) y dueño; pruebas con un
  repositorio en memoria
- [X] T005 Adaptador DynamoDB `trips-repository.ts` con la condición de versión y el índice por
  `shareId`
- [X] T006 Textos de «Mi viaje» en ES y EN

## Phase 3: User Story 1 - Crear viajes (P1)

- [X] T007 [US1] `/mi-viaje`: lista y formulario de crear viaje (`crearViaje`), con errores accesibles
- [X] T008 [US1] Editar y eliminar el viaje (`editarViaje`, `eliminarViaje`)

## Phase 4: User Story 2 - Agregar desde el catálogo (P1)

- [X] T009 [US2] `AddToTripButton` en las fichas y diálogo diferido (`listarMisViajes`,
  `agregarAlViaje`, crear viaje)

## Phase 5: User Story 3 - Días (P1)

- [X] T010 [US3] Editor `/mi-viaje/{tripId}` con días, «Sin día», dnd-kit y «Mover a…»
- [X] T011 [US3] `useTripEditorViewModel` con `useOptimistic` y conflicto → recarga
- [X] T012 [US3] Notas libres (`guardarNota`)

## Phase 6: User Story 4 - Presupuesto (P2)

- [X] T013 [US4] Costo por elemento (`ponerCosto`) y totales por categoría

## Phase 7: User Story 5 - Borrador (P2)

- [X] T014 [US5] Store persistente con `devtools`, vista del borrador en `/mi-viaje` y `migrarBorrador`

## Phase 8: User Story 6 - Compartir y exportar (P2)

- [X] T015 [US6] Compartir y revocar; `/viaje/{shareId}` `noindex`; vista previa con `next/og`
- [X] T016 [US6] `.ics` (RFC 5545) con pruebas de escape y plegado

## Phase 9: User Story 7 - Contexto (P3)

- [X] T017 [US7] Fiestas del catálogo en las fechas del viaje
- [X] T018 [US7] Clima por día con Open-Meteo (pronóstico o clima típico), con caché y sin romper si falla
- [ ] T030 [US7] Mapa SVG de los puntos por día con las formas de la spec 008

## Phase 10: Polish

- [X] T019 Navegación: «Mi viaje» en el menú; prueba de humo de `/mi-viaje` y de un `shareId` inexistente
- [X] T020 E2E + axe y Lighthouse de las públicas; ADR 0008 y guía de aprendizaje (`useOptimistic` y
  concurrencia)
- [ ] T021 Revisión de coherencia y PR con evidencia
- [ ] T040 Tras publicar: recorrido con una cuenta real (crear, agregar, mover, compartir, `.ics`)

## Dependencies

- T001–T006 van antes de las historias. T002 se aplica antes de aprobar el despliegue.
- US2 y US3 requieren US1; US5 requiere US2; US6 y US7 requieren US3.
- T030 requiere la spec 008.
