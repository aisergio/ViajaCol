# Research: Fundación del sitio Viaja Colombia

Fecha: 2026-11-24. Versiones verificadas en npm y en la documentación oficial durante la planeación.

## 1. Framework

- **Decision**: Next.js 16.4 (App Router) full-stack en Node, con React 19.3, Turbopack, React
  Compiler y Cache Components.
- **Rationale**: los requisitos nuevos (usuarios registrados, «Mi viaje» persistente, Server Actions,
  streaming del asistente y Multi-Zones en la E3) piden un framework con servidor. Conserva el
  principio de la E1: renderizado en el servidor por defecto y componentes de cliente solo donde hay
  interacción (las «islas» pasan a ser fronteras `"use client"`).
- **Alternatives considered**: Astro 7 con islas (la base de la E1, débil para sesiones y mutaciones
  en el servidor); React Router 7 en modo framework (menos soporte para Multi-Zones y el
  asistente).

## 2. Idioma en la ruta

- **Decision**: next-intl 4.15 con `localePrefix: 'as-needed'` (`es` sin prefijo, `en` con `/en`) y
  `localeDetection: false`.
- **Rationale**: conserva el contrato de la E1 y deja las direcciones fijas, así la CDN las puede
  cachear. Funciona con `proxy.ts` (Next 16) y con `basePath`.
- **Alternatives considered**: middleware propio (más código que mantener); detección automática por
  `Accept-Language` (las respuestas varían por visitante y se pierde la caché).

## 3. Ruta base

- **Decision**: `basePath: '/ViajaCol'` en `next.config.ts`. El matcher del proxy excluye
  `_next`, archivos estáticos y la API; los recursos de `next/image` incluyen el prefijo.
- **Rationale**: el sitio vive en una ruta de aisergio.dev detrás de un Worker de Cloudflare
  (spec 003).
- **Alternatives considered**: subdominio propio (mejor aislamiento, pero el usuario pidió la ruta).

## 4. Tema claro/oscuro

- **Decision**: store Zustand con `persist` (clave `viajacol:theme`, valores `light | dark |
  system`) y un script inline mínimo en `<head>` que aplica la clase antes del primer pintado.
- **Rationale**: es el estado global de preferencia del modelo MVVM con store compartido (U3,
  Fig. 2). El script evita el destello del tema equivocado; su hash irá en la CSP (spec 003).
- **Alternatives considered**: `next-themes` (agrega una dependencia y también usa un script
  inline); tema en una cookie leída en el servidor (haría dinámicas todas las páginas).

## 5. Estilos y sistema de diseño

- **Decision**: Tailwind CSS 4.3 con tokens en `@theme`. Los colores de la E1 se convierten a OKLCH,
  con variantes para claro y oscuro. Componentes con la convención de shadcn/ui (`cva` + `cn`), y
  componentes de Base UI cuando se necesiten.
- **Rationale**: tokens centralizados que se reutilizan en las zonas de la E3; OKLCH facilita
  derivar tonos con contraste controlado.
- **Alternatives considered**: CSS Modules (sin sistema de tokens compartido); Panda CSS (menos
  documentación y ejemplos).
- **Contraste** (texto normal ≥ 4,5:1): `#14232B` sobre `#FFFFFF` 16,1:1; `#003893` sobre `#FFFFFF`
  10,6:1; `#33434B` sobre `#F3F6F6` ≈ 9,6:1. En modo oscuro el texto principal es `#F3F6F6` sobre
  `#0E1A20` (≥ 15:1). El amarillo `#FCD116` se usa solo como fondo o acento, nunca como texto
  sobre blanco.

## 6. Tipografías

- **Decision**: `next/font/google` con Space Grotesk (títulos) e Inter (texto), variables,
  subconjunto `latin`, `display: swap`.
- **Rationale**: se descargan en el build y se sirven desde el propio sitio: sin peticiones a
  terceros ni desplazamientos de diseño por cambio de fuente.

## 7. Pruebas y calidad

- **Decision**: Vitest 5 + Testing Library (jsdom) para lógica y componentes; Playwright con axe para
  E2E y accesibilidad; prueba unitaria que compara las claves de `es.json` y `en.json`; ESLint 9
  (configuración plana con `eslint-config-next`) y Prettier.
- **Rationale**: cubre los criterios de la rúbrica (testabilidad) y los principios III y IV.

## 8. Build y despliegue

- **Decision**: `output: 'standalone'`; el build de producción corre en GitHub Actions con
  `ubuntu-24.04-arm` (spec 002) y se despliega en Lambda (spec 003).
- **Rationale**: en Windows, `standalone` necesita enlaces simbólicos (modo desarrollador). En local
  se usa `next dev` y `next build` sin `standalone` para verificar.

## 9. Transiciones

- **Decision**: `<ViewTransition>` de React 19.3 (estable, sin bandera desde Next 16.3) con CSS que
  las reduce bajo `prefers-reduced-motion: reduce`.
