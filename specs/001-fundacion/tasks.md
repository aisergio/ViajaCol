---
description: "Lista de tareas de la spec 001-fundacion"
---

# Tasks: Fundación del sitio Viaja Colombia

**Input**: Design documents from `/specs/001-fundacion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes.md

**Tests**: obligatorias por la constitución (principio III): se escriben antes de implementar y deben
fallar primero.

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas por
separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: historia de usuario (US1…US5)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Crear `package.json` raíz con workspaces (`apps/*`, `packages/*`), `tsconfig.base.json`, `.npmrc` (`save-exact=true`) y `engines.node >= 22.13`
- [ ] T002 Crear `apps/web` con Next.js 16.4, React 19.3 y TypeScript estricto; `apps/web/next.config.ts` con `basePath: '/ViajaCol'`, `output: 'standalone'`, `reactCompiler: true` y el plugin de next-intl
- [ ] T003 [P] Configurar ESLint 9 (configuración plana con `eslint-config-next`) y Prettier en la raíz (`eslint.config.mjs`, `.prettierrc.json`) con scripts `lint` y `format`
- [ ] T004 [P] Configurar Vitest (`apps/web/vitest.config.ts`, jsdom, Testing Library) y Playwright (`apps/web/playwright.config.ts`, servidor de producción, `baseURL` con `/ViajaCol`)
- [ ] T005 [P] Crear `packages/ui` (`tokens.css` OKLCH claro/oscuro, `cn()`, `Button`) y `packages/i18n` (`messages/es.json`, `messages/en.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T006 [P] Prueba de completitud del catálogo de textos en `packages/i18n/messages.test.ts` (mismas claves en `es` y `en`)
- [ ] T007 Configurar next-intl: `apps/web/src/i18n/routing.ts` (`es` predeterminado, `as-needed`, `localeDetection: false`), `request.ts` y `navigation.ts`
- [ ] T008 Crear `apps/web/proxy.ts` con el middleware de next-intl y su matcher (excluye `_next`, `api` y archivos)
- [ ] T009 Crear `apps/web/src/styles/globals.css` (Tailwind 4, `@theme` con los tokens, foco visible, `prefers-reduced-motion`)
- [ ] T010 Crear `apps/web/src/app/layout.tsx` (raíz mínima) y `apps/web/src/app/[locale]/layout.tsx` (`<html lang>`, fuentes con `next/font`, `generateStaticParams`, `setRequestLocale`)

**Checkpoint**: la app compila y sirve `/ViajaCol` y `/ViajaCol/en`.

---

## Phase 3: User Story 1 - Recorrer el sitio en español con una identidad clara (Priority: P1) 🎯 MVP

**Goal**: marco común completo y las cuatro secciones navegables en español.

**Independent Test**: abrir `/ViajaCol` y recorrer las cuatro secciones.

### Tests for User Story 1

- [ ] T011 [P] [US1] E2E en `apps/web/e2e/navegacion.spec.ts`: marco común, Guías deshabilitada, `aria-current` en la sección actual, enlace directo y axe
- [ ] T012 [P] [US1] Prueba de `useNavigationViewModel` en `apps/web/src/features/navigation/viewmodel/useNavigationViewModel.test.ts` (sección activa derivada de la ruta)

### Implementation for User Story 1

- [ ] T013 [US1] Modelo de secciones en `apps/web/src/features/navigation/model/sections.ts`
- [ ] T014 [US1] ViewModel `useNavigationViewModel` y vista `MainNav` (cliente) en `apps/web/src/features/navigation/`
- [ ] T015 [US1] Componentes del marco en `apps/web/src/components/layout/`: `TricolorStrip`, `SiteHeader`, `SiteFooter`, `SkipLink`, `SectionIntro`
- [ ] T016 [US1] Páginas `apps/web/src/app/[locale]/page.tsx`, `sitios/page.tsx`, `fiestas/page.tsx` y `platos/page.tsx` con `generateMetadata` por idioma
- [ ] T017 [US1] Textos de navegación, secciones, pie y metadatos en `packages/i18n/messages/{es,en}.json`

**Checkpoint**: HU1 funciona y pasa sus pruebas.

---

## Phase 4: User Story 2 - Cambiar a inglés sin perder el lugar (Priority: P1)

**Goal**: selector de idioma que conserva la sección.

**Independent Test**: desde `/ViajaCol/sitios` elegir «EN» y llegar a `/ViajaCol/en/sitios`.

### Tests for User Story 2

- [ ] T018 [P] [US2] E2E en `apps/web/e2e/idioma.spec.ts`: cambio ES↔EN conserva la sección, atributo `lang`, redirección del prefijo `/es` redundante
- [ ] T019 [P] [US2] Prueba de `useLanguageSwitcherViewModel` en `apps/web/src/features/language/viewmodel/useLanguageSwitcherViewModel.test.ts`

### Implementation for User Story 2

- [ ] T020 [US2] ViewModel y vista `LanguageSwitcher` (cliente) en `apps/web/src/features/language/`
- [ ] T021 [US2] Alternativas `hreflang` y `lang` por idioma en los metadatos del layout

**Checkpoint**: HU1 + HU2 = MVP bilingüe.

---

## Phase 5: User Story 3 - Elegir tema claro u oscuro (Priority: P2)

**Goal**: tema persistente que respeta la preferencia del sistema sin destello.

**Independent Test**: alternar, recargar y comprobar; primera visita con el sistema en oscuro.

### Tests for User Story 3

- [ ] T022 [P] [US3] Pruebas del store y del ViewModel en `apps/web/src/features/theme/model/themeStore.test.ts` y `viewmodel/useThemeViewModel.test.ts`
- [ ] T023 [P] [US3] E2E en `apps/web/e2e/tema.spec.ts`: persistencia tras recargar y primera visita con esquema oscuro emulado

### Implementation for User Story 3

- [ ] T024 [US3] Store Zustand persistente en `apps/web/src/features/theme/model/themeStore.ts` (clave `viajacol:theme`)
- [ ] T025 [US3] `ThemeScript` (anti-destello en `<head>`), `useThemeViewModel` y `ThemeToggle` en `apps/web/src/features/theme/`

---

## Phase 6: User Story 4 - Recuperarse de direcciones inexistentes y errores (Priority: P2)

### Tests for User Story 4

- [ ] T026 [P] [US4] E2E en `apps/web/e2e/errores.spec.ts`: 404 en ambos idiomas con estado 404

### Implementation for User Story 4

- [ ] T027 [US4] `apps/web/src/app/[locale]/not-found.tsx`, `[locale]/[...rest]/page.tsx`, `app/not-found.tsx` y `[locale]/error.tsx`

---

## Phase 7: User Story 5 - Navegar con teclado y lector de pantalla (Priority: P2)

### Tests for User Story 5

- [ ] T028 [P] [US5] E2E en `apps/web/e2e/accesibilidad.spec.ts`: primer Tab en «Saltar al contenido», regiones y axe sin violaciones en todas las rutas de ambos idiomas

### Implementation for User Story 5

- [ ] T029 [US5] Menú móvil accesible (cliente) con su ViewModel y verificación de tamaños de objetivo

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T030 Transiciones con `<ViewTransition>` y CSS de movimiento reducido
- [ ] T031 [P] ADR `docs/adr/0001-nextjs-en-lugar-de-astro.md` y `docs/adr/0002-mvvm-con-store-compartido.md`
- [ ] T032 [P] README: sección «Cómo correrlo»
- [ ] T033 Validar con [quickstart.md](quickstart.md): lint, tipos, pruebas con cobertura, build y E2E; registrar resultados en el PR

---

## Dependencies & Execution Order

- Setup (Fase 1) → Foundational (Fase 2) → HU1 → HU2, HU3, HU4 y HU5 (pueden ir en paralelo) → Polish.
- Dentro de cada historia: pruebas (deben fallar) → modelo → ViewModel → vista → páginas.

## Parallel Example

```text
T003, T004 y T005 en paralelo (archivos distintos).
T011 y T012 en paralelo antes de implementar HU1.
```

## Implementation Strategy

MVP = HU1 + HU2 (marco bilingüe navegable). Luego HU3–HU5 y el pulido; se confirma por fase.
