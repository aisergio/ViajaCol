---
description: "Lista de tareas de la spec 004-contenido"
---

# Tasks: Contenido del catálogo

**Input**: Design documents from `/specs/004-contenido/`

**Tests**:
- Pruebas primero en `packages/content` (esquemas y reglas), `features/*/model` y `features/*/viewmodel`
  (Vitest + Testing Library, cobertura ≥ 80 %).
- Una prueba E2E con axe por criterio de aceptación (`apps/web/e2e/catalogo.spec.ts`,
  `ventanas.spec.ts` y `buscador.spec.ts`).

## Phase 1: Setup

- [X] T001 Dependencias: `@base-ui/react`, `nuqs` y `zod` en `apps/web`, `zod` en `packages/content`, y
  `sharp` como devDependency de la raíz
- [X] T002 Paquete `packages/content`: `package.json`, configuración de Vitest y `transpilePackages` en
  `next.config.ts`. Como `ui` e `i18n`, no tiene `tsconfig.json` propio: `apps/web/tsconfig.json`
  incluye `packages/*/src` en el typecheck

## Phase 2: Foundational

- [X] T003 [P] Esquemas de Zod en `packages/content/src/schema.ts`, con pruebas primero de cantidades,
  slugs, regiones, meses e idiomas (`catalog.test.ts`)
- [X] T004 [P] Contenido de las 6 regiones y de las 6 noticias de demostración (`data/regiones.json` y
  `data/noticias.json`)
- [X] T005 [P] Contenido de los 30 sitios (`data/sitios.json`), con los 9 de la E1
- [X] T006 [P] Contenido de las 24 fiestas (`data/fiestas.json`): las 5 de la E1, épocas verificadas y
  dos por mes
- [X] T007 [P] Contenido de los 18 platos (`data/platos.json`), con los 7 de la E1. Cinco platos del
  borrador se cambiaron porque Commons no tenía fotos libres que los mostraran: entraron carimañola,
  encocado de camarón, sancocho de pescado, casabe y obleas con arequipe
- [X] T008 [P] Contenido de las 12 experiencias (`data/experiencias.json`)
- [X] T009 Consultas por idioma en `packages/content/src/index.ts`: listas, por slug, por región,
  relacionadas, por mes y créditos
- [X] T010 Script `scripts/content/fetch-commons-images.ts` con los modos `candidates`, `download` (con
  presupuesto de peso por variante y `--force`) y `check`
- [X] T011 Elegir las 96 fotos con las hojas de contacto, descargarlas y generar `data/media.json`
- [X] T012 Cargador `apps/web/src/lib/image-loader.ts` (con pruebas) y `images` en `next.config.ts`
- [X] T013 `build-web.sh`: `public/media` va a los estáticos y no al paquete de Lambda. `smoke.sh`:
  una foto con `image/webp` y caché inmutable (FR-018), el índice de búsqueda y una vista previa
- [X] T014 Componentes de servidor en `apps/web/src/components/catalog/`:
  - tarjeta, rejilla, portada de ficha y crédito;
  - datos de la ficha y relacionadas;
  - marca de demostración y estado vacío.
- [X] T015 Textos de interfaz en ES/EN (`packages/i18n/messages/*.json`): categorías, filtros, buscador,
  ventana, créditos y demostración

## Phase 3: User Story 1 - Explorar el catálogo por categoría y región (P1) 🎯 MVP

- [X] T016 [US1] Modelo de filtros `features/catalog-filters/model/filters.ts` (con pruebas primero):
  normalización, región, mes y texto
- [X] T017 [US1] `useCatalogFiltersViewModel` con nuqs (con pruebas primero, `renderHook` con el
  adaptador de pruebas de nuqs)
- [X] T018 [US1] Vista de filtros y lista filtrable, con la lista completa del servidor como fallback de
  `<Suspense>`
- [X] T019 [US1] Páginas de lista de Sitios, Fiestas (con mes), Platos y Experiencias; `NuqsAdapter` en
  el layout
- [X] T020 [US1] E2E `catalogo.spec.ts`: filtro en la URL, recarga, enlace compartido, sin resultados,
  valor inválido y sin JavaScript. axe revisa listas, fichas, regiones y créditos, en los dos idiomas y
  en modo claro y oscuro, en `accesibilidad.spec.ts`

## Phase 4: User Story 2 - Leer la ficha completa (P1)

- [X] T021 [US2] Páginas de ficha `[slug]` de las seis categorías, con `generateStaticParams`,
  `dynamicParams = false` y metadatos con idiomas alternos
- [X] T022 [US2] Vista previa para redes: Route Handler estático `app/api/og/[category]/[locale]/[slug]`
  (JPEG de 1200 × 630, texto de `next/og` sobre la foto con `sharp` en el build) y `openGraph.images`
  en los metadatos. Reemplaza a `opengraph-image.tsx` (research D-07)
- [X] T023 [US2] E2E: ficha en ES y EN, selector de idioma, 404, crédito visible y `og:image`, con axe

## Phase 5: User Story 3 - Abrir una ficha sin perder la lista (P2)

- [X] T024 [US3] `Modal` en `packages/ui/src/modal.tsx` sobre el `Dialog` de Base UI (foco, Escape,
  cierre con `router.back()`)
- [X] T025 [US3] Slot `@modal`: `default.tsx`, `[...rest]`, `(.)sitios/[slug]` y `(.)fiestas/[slug]`
- [X] T026 [US3] E2E `ventanas.spec.ts`: abrir con su URL y su título, recargar, atrás con los filtros,
  Escape con retorno del foco, la foto de una fiesta y el paso a la ficha completa, con axe

## Phase 6: User Story 4 - Encontrar algo al instante (P2)

- [X] T027 [US4] Route Handler estático `app/api/search-index/[locale]/route.ts` (Zod) y su constructor
  en `packages/content/src/search.ts`, con prueba del tamaño comprimido
- [X] T028 [US4] Modelo del buscador `features/search/model/` (con pruebas primero): carga única,
  normalización y ranking
- [X] T029 [US4] `useSearchViewModel` (con pruebas primero): carga al enfocar, texto diferido, grupos,
  error y reintento
- [X] T030 [US4] Vista `SearchCombobox` con el `Autocomplete` de Base UI en el encabezado, con
  navegación al elegir
- [X] T031 [US4] E2E `buscador.spec.ts`: tildes, teclado, sin resultados, ventana al elegir un sitio y
  sin índice antes de usar, con axe

## Phase 7: User Story 5 - Recorrer una región (P3)

- [X] T032 [US5] Lista y páginas de región, con las fichas agrupadas por categoría
- [X] T033 [US5] Portada: accesos a las regiones y fichas destacadas por categoría

## Phase 8: User Story 6 - Créditos y demostración (P3)

- [X] T034 [US6] Página `/creditos` generada desde `media.json`
- [X] T035 [US6] Lista y fichas de noticias con la marca «Demostración»

## Phase 9: Polish

- [X] T036 Transiciones de vista: morph de la foto, deslizamiento con `transitionTypes`, encabezado
  anclado y movimiento reducido
- [X] T037 Lighthouse en local sobre una lista y una ficha (SC-003, SC-007), y medida del índice
  (SC-004). La ficha entra también en `lighthouserc.json`, así que CI la mide en cada PR
- [X] T038 [ADR 0006](../../docs/adr/0006-fotos-pregeneradas-en-s3.md) (fotos pregeneradas en S3
  frente al optimizador en Lambda) y la
  [guía de rutas interceptadas y ventanas](../../docs/aprendizaje/rutas-interceptadas-y-ventanas.md)
- [ ] T039 Revisión de coherencia entre spec, plan, contratos y tareas (en lugar de
  `/speckit-analyze` y `/speckit-converge`), y PR con capturas y la hoja de contacto
- [ ] T040 Tras publicar: verificar SC-003, SC-005 y SC-007 en la dirección pública ([evidencia](evidencia.md))
- [X] T041 Rendimiento móvil (research D-11): fotos diferidas con `DeferredPhoto` y la principal con
  `fetchPriority="high"`, CSS en línea, buscador en dos tiempos y con menos sugerencias, nuqs solo en
  las listas, rejilla que no se vuelve a crear al hidratar, fuentes `optional`, `content-visibility`
  en la portada y Lighthouse CI con limitación aplicada

## Dependencies

- T001–T002 van antes de todo.
- T003 va antes de T004–T008.
- T010 va antes de T011, y T011 requiere T004–T008.
- T012–T015 van antes de las historias.
- US1 (T016–T020) y US2 (T021–T023) son el MVP.
- US3 requiere T021, porque la ventana reutiliza el cuerpo de la ficha.
- US4 requiere T009.
- T036 va al final, sobre las páginas ya hechas.
- T040 requiere la fusión y la aprobación de `production`.
