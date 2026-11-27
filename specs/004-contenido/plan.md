# Implementation Plan: Contenido del catálogo

**Branch**: `004-contenido` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-contenido/spec.md`

## Summary

- **Contenido:** las 96 fichas bilingües viven en un paquete del monorepo, `packages/content`, como JSON
  validado con Zod.
- **Fotos:** un script trae las fotos de Wikimedia Commons y genera variantes WebP de 480, 960 y 1600 px,
  cada una con un presupuesto de peso y con un hash en el nombre. Se publican como estáticos en S3, por
  el comportamiento `media/*` que ya existe en CloudFront, y `next/image` las pide con un cargador
  propio. Lambda nunca procesa imágenes.
- **Páginas:** listas, fichas, regiones y créditos se generan en el build como Server Components.
- **Interacción en el cliente:** solo hay tres fronteras de cliente:
  - los filtros (MVVM con nuqs);
  - el buscador (MVVM con un índice que se carga al usarlo);
  - la ventana de las rutas interceptadas.
- **Además:** imágenes de vista previa (JPEG de 1200 × 630) generadas en el build por un Route Handler
  estático, y transiciones de vista con React 19.3.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto. Node 22.13+ en CI y Node 26 en local.

**Primary Dependencies**:
- Next.js 16.4.6, React 19.3.1, next-intl 4.15.3, Tailwind CSS 4.3, Zustand 5.1 (ya instalados);
- nuevos: `@base-ui/react` 1.9.0, `nuqs` 2.10.3 y `zod` 4.6.7;
- solo para el build y los scripts: `sharp` 0.35.5, como devDependency. Lo usan el script de fotos y
  las vistas previas; `outputFileTracingExcludes` lo deja fuera del paquete de Lambda.

**Storage**:
- contenido en `packages/content/data/*.json`, versionado;
- fotos en `apps/web/public/media/`, que se publican en `s3://…/ViajaCol/media/`;
- sin bases de datos.

**Testing**:
- Vitest + Testing Library: validación del contenido, modelos y ViewModels;
- Playwright + axe: una prueba por criterio de aceptación;
- Lighthouse CI con las aserciones de la spec 002, que ahora también mide una ficha y usa limitación
  aplicada (research D-11).

**Target Platform**:
- navegadores modernos; las transiciones de vista requieren Chromium 125+ o un Safari o Firefox
  recientes, y sin ellas todo funciona igual;
- servidor: Lambda arm64 (spec 003, sin cambios).

**Project Type**: aplicación web en monorepo (`apps/web` + `packages/*`).

**Performance Goals**:
- LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 y Lighthouse ≥ 90 en móvil;
- índice de búsqueda ≤ 20 KB comprimido por idioma;
- foto principal ≤ 150 KB en móvil.

**Constraints**:
- sin recursos nuevos de AWS ni cambios de Terraform;
- sin procesamiento de imágenes en Lambda;
- la política de contenido actual ya admite imágenes del propio origen.

**Scale/Scope**:
- 96 fichas en 2 idiomas: unas 200 páginas de ficha, más 12 listas, 12 páginas de región y los
  créditos;
- 96 fotos en 3 anchos, unos 27 MB en el repositorio;
- 192 vistas previas para redes, de unos 80 KB cada una, generadas en el build.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento |
|---|---|
| I. Server-first | Listas, fichas, regiones y créditos son Server Components estáticos (`generateStaticParams`, `dynamicParams = false`). Solo hay `"use client"` en los filtros, el buscador y la ventana. El índice de búsqueda es un Route Handler estático |
| II. MVVM con store compartido | `features/catalog-filters` y `features/search`, cada uno con `model/`, `viewmodel/` y `view/`. Las vistas no hacen llamadas de red: el índice lo carga el modelo. El estado está clasificado en la tabla de abajo |
| III. Pruebas primero | Se escriben antes las pruebas de los modelos (filtro, normalización, ranking) y de los ViewModels (`renderHook`), con cobertura ≥ 80 %. Hay una prueba E2E con axe por criterio de aceptación |
| IV. Accesible, bilingüe y rápido | Texto alternativo en ES y EN. Ventana y buscador con los patrones de diálogo y combobox. Movimiento reducido sin animación. Prueba de claves de i18n. Fotos con prioridad y anchos adecuados |
| V. Seguro por defecto | El Route Handler valida el idioma con Zod. Sin secretos ni `NEXT_PUBLIC_*` nuevos. El script se identifica ante Wikimedia sin datos personales |
| Contenido | Fotos con licencia libre y atribución. Noticias marcadas como demostración |
| Infraestructura y costo | Sin cambios de Terraform: se usa el comportamiento `media/*` de la spec 003. Costo adicional ≈ US$0 |

**Resultado:** pasa. No hay violaciones que justificar.

### Modelo de estado de la spec

| Estado | Tipo | Dónde vive | Quién lo cambia | Cómo se rastrea |
|---|---|---|---|---|
| Filtros de las listas (región, mes, texto) | Global por URL | `?region=&mes=&q=` (nuqs) | `useCatalogFiltersViewModel` | Historial y enlaces compartibles |
| Ficha abierta en ventana | Global por URL | La ruta interceptada | Enlaces y «atrás» | Historial |
| Texto del buscador | Local | `useState` en `useSearchViewModel` | El ViewModel | React DevTools |
| Índice de búsqueda | Remoto | Servicio de cliente con caché en memoria (`features/search/model`) | El build | Una petición por idioma en Network |
| Sugerencias agrupadas | Derivado | `useMemo` sobre el texto diferido (`useDeferredValue`) | Nadie | Determinista |
| Catálogo | Servidor (estático) | `packages/content`, leído en el build | Un PR | Git |

## Project Structure

### Documentation (this feature)

```text
specs/004-contenido/
├── spec.md
├── plan.md              # este archivo
├── research.md          # decisiones D-01 a D-10
├── data-model.md        # entidades, validaciones y manifiesto de fotos
├── quickstart.md        # cómo traer fotos, validar y probar
├── contracts/
│   ├── routes.md        # direcciones, parámetros y estados
│   ├── search-index.md  # GET /api/search-index/{locale}
│   └── media.md         # nombres de archivo y manifiesto
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/content/
├── data/                # regiones, sitios, fiestas, platos, experiencias, noticias (+ media.json generado)
└── src/                 # schema.ts (Zod), index.ts (consultas por idioma), search.ts, *.test.ts
packages/ui/src/
└── modal.tsx            # ventana sobre el Dialog de Base UI
scripts/content/
└── fetch-commons-images.ts
apps/web/
├── next.config.ts       # cargador de imágenes propio, deviceSizes
├── public/media/<categoria>/<slug>-<hash>-<ancho>.webp
└── src/
    ├── app/[locale]/
    │   ├── layout.tsx                       # + slot @modal y NuqsAdapter
    │   ├── page.tsx                         # portada: regiones, destacadas y noticias
    │   ├── @modal/{default.tsx,[...rest]/page.tsx}
    │   ├── @modal/(.)sitios/[slug]/page.tsx
    │   ├── @modal/(.)fiestas/[slug]/page.tsx
    │   ├── {sitios,fiestas,platos,experiencias,regiones,noticias}/{page.tsx,[slug]/page.tsx}
    │   └── creditos/page.tsx
    ├── app/api/search-index/[locale]/route.ts
    ├── app/api/og/[category]/[locale]/[slug]/route.ts   # vista previa JPEG 1200 × 630
    ├── components/catalog/             # tarjetas, rejilla, ficha, ventana, crédito, vista previa
    ├── features/catalog-filters/{model,viewmodel,view}/
    ├── features/search/{model,viewmodel,view}/
    └── lib/{image-loader,normalize-text,dates}.ts
scripts/deploy/
├── build-web.sh         # las fotos van a los estáticos y no al paquete de Lambda
└── smoke.sh             # + una foto con tipo y caché, el índice y una vista previa
```

**Structure Decision**: el contenido va en un paquete propio y no dentro de `apps/web`. En la E3, la zona
«contenido» y la de «destinos» lo compartirán (plan del proyecto, Multi-Zones).

## Complexity Tracking

No aplica: el Constitution Check no tiene violaciones.
