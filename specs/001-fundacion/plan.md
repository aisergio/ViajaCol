# Implementation Plan: Fundación del sitio Viaja Colombia

**Branch**: `001-fundacion` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-fundacion/spec.md`

## Summary

Marco común bilingüe del sitio: monorepo con workspaces de npm y una app Next.js 16.4 (App Router)
servida bajo `basePath: '/ViajaCol'`. Las rutas viven bajo el segmento `[locale]` con next-intl en
modo `as-needed` (español sin prefijo, inglés con `/en`). El sistema de diseño traduce los tokens de
la Entrega 1 a OKLCH (Tailwind CSS 4.3 con convenciones de shadcn/ui). El layout incluye franja
tricolor, cabecera, navegación accesible, selector de idioma, interruptor de tema (store Zustand
persistente con script anti-destello), páginas 404 y de error, transiciones con `<ViewTransition>`
que respetan el movimiento reducido, y la batería de calidad: ESLint, TypeScript estricto, Vitest +
Testing Library, Playwright + axe y build de producción `standalone`.

## Technical Context

**Language/Version**: TypeScript 5.x estricto sobre Node.js 26 en local; el runtime de Lambda se fija
en la spec 003.

**Primary Dependencies**: Next.js 16.4 (App Router, React 19.3, Turbopack, React Compiler),
next-intl 4.15, Tailwind CSS 4.3, class-variance-authority + clsx + tailwind-merge (convención
shadcn/ui), Zustand 5 con `persist`, lucide-react.

**Storage**: N/A. Solo `localStorage` para la preferencia de tema (clave `viajacol:theme`).

**Testing**: Vitest 5 + Testing Library (jsdom) para ViewModels, stores y componentes; Playwright +
@axe-core/playwright para E2E y accesibilidad; prueba de completitud del catálogo de textos.

**Target Platform**: navegadores modernos (últimas dos versiones de Chrome, Edge, Firefox y Safari).
Servidor Node en AWS Lambda a partir de la spec 003.

**Project Type**: aplicación web en monorepo (workspaces de npm).

**Performance Goals**: LCP ≤ 2,5 s y CLS ≤ 0,1 en móvil emulado; Lighthouse ≥ 90. El JavaScript de
cliente del marco común se limita al interruptor de tema, el selector de idioma y el menú móvil.

**Constraints**: `basePath: '/ViajaCol'`; páginas del marco prerenderizadas para que la CDN las
cachee; sin secretos; `output: 'standalone'` para el despliegue de la spec 003. El build de
producción se ejecuta en Linux (CI), porque `standalone` crea enlaces simbólicos que fallan en
Windows sin modo desarrollador.

**Scale/Scope**: 4 secciones × 2 idiomas, más 404 y error; unas 40 claves de texto.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Server-first | Layout, cabecera, pie y secciones son Server Components; solo `ThemeToggle`, `LanguageSwitcher` y `MobileNav` llevan `"use client"`. | ✅ |
| II. MVVM con store compartido | Cada componente de cliente tiene su ViewModel (`useThemeViewModel`, `useLanguageSwitcherViewModel`, `useMobileNavViewModel`). El tema vive en un store Zustand persistente (estado global de preferencia); el idioma vive en la URL. | ✅ |
| III. Pruebas primero | Pruebas de ViewModels, store y completitud de textos antes de implementar; una prueba E2E por historia de usuario. | ✅ |
| IV. Accesible, bilingüe y rápido | axe en E2E, enlace para saltar al contenido, foco visible, regiones, `aria-current`, contraste verificado de los tokens, prueba de claves y presupuestos de rendimiento. | ✅ |
| V. Seguro por defecto | Sin datos personales ni secretos; ninguna variable `NEXT_PUBLIC_*` sensible; dependencias con lockfile. | ✅ |
| Restricciones técnicas y de costo | Stack de la constitución; costo 0 (solo local en esta spec). | ✅ |

Re-check después del diseño (Fase 1): sin cambios, todo ✅.

## Project Structure

### Documentation (this feature)

```text
specs/001-fundacion/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas
├── data-model.md        # Entidades
├── quickstart.md        # Guía de validación
├── contracts/routes.md  # Contrato de rutas
├── checklists/requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
package.json                    # workspaces: apps/*, packages/*
tsconfig.base.json
eslint.config.mjs · .prettierrc.json
apps/web/
├── next.config.ts              # basePath, output standalone, plugin next-intl, reactCompiler
├── proxy.ts                    # next-intl en modo as-needed
├── vitest.config.ts · playwright.config.ts
├── e2e/                        # una prueba por historia de usuario + axe
└── src/
    ├── i18n/                   # routing.ts, request.ts, navigation.ts
    ├── app/
    │   ├── layout.tsx          # raíz mínima
    │   ├── not-found.tsx       # 404 fuera de [locale]
    │   └── [locale]/
    │       ├── layout.tsx      # <html lang>, fuentes, script de tema, marco común
    │       ├── page.tsx        # Noticias (portada)
    │       ├── sitios/ · fiestas/ · platos/   (page.tsx)
    │       ├── not-found.tsx · error.tsx
    │       └── [...rest]/page.tsx             # notFound()
    ├── features/
    │   ├── theme/{model,viewmodel,view}/
    │   ├── language/{viewmodel,view}/
    │   └── navigation/{model,viewmodel,view}/
    ├── components/layout/      # SiteHeader, SiteFooter, TricolorStrip, SkipLink, SectionIntro
    └── styles/globals.css      # Tailwind 4 + tokens
packages/
├── ui/                         # tokens.css (OKLCH claro/oscuro), cn(), Button
└── i18n/                       # messages/es.json, messages/en.json
```

**Structure Decision**: monorepo con una app (`apps/web`) y dos paquetes compartidos (`ui` e `i18n`).
Así la división en zonas de la Entrega 3 reutiliza el sistema de diseño y los textos sin reescribirlos.

## Complexity Tracking

Sin violaciones de la constitución; no aplica.
