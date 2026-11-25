# ADR 0001 — Next.js (App Router) en lugar de Astro

- **Estado**: aceptado (2026-11-24)
- **Contexto**: la Entrega 1 propuso páginas Astro con islas React. Para las Entregas 2 y 3 se agregan
  usuarios registrados, «Mi viaje» persistente, mutaciones seguras en el servidor, un asistente de IA
  con respuestas en streaming y microfrontends.

## Decisión

Usar Next.js 16.4 (App Router) full-stack sobre Node: React Server Components, Server Actions y
Route Handlers, desplegado en AWS Lambda detrás de CloudFront.

## Justificación

- Se conserva el principio de la E1: HTML desde el servidor por defecto e interactividad solo en
  componentes de cliente; las «islas» pasan a ser fronteras `"use client"`.
- React sigue siendo el framework elegido por la matriz ponderada de la E1.
- Next.js resuelve en un solo modelo las sesiones, las mutaciones (Server Actions con verificación de
  origen), el streaming y la composición por zonas (Multi-Zones) que pide la E3.

## Alternativas consideradas

- **Astro 7 con islas**: excelente para contenido, pero sesiones y mutaciones requieren adaptador y
  piezas adicionales; las islas no comparten estado sin librerías externas.
- **React Router 7 (modo framework)**: viable, con menos soporte para Multi-Zones.

## Consecuencias

- Más JavaScript de framework en el cliente que Astro; se mitiga con Server Components y
  presupuestos de rendimiento en CI.
- El despliegue necesita un runtime Node (Lambda + Web Adapter) en lugar de solo archivos estáticos.
- Se documenta como «ajuste realizado» respecto a la Entrega 1.
