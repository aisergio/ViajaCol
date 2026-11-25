# ADR 0003 — Next.js en Lambda con el Lambda Web Adapter

- **Estado**: aceptado (2026-11-25)
- **Contexto**: el prototipo debe correr Next.js 16 completo (RSC, *streaming*, Route Handlers y
  Server Actions) dentro de US$10 al mes. En la E3, además, cada dominio debe poder publicarse y
  restaurarse por separado.

## Decisión

Servidor *standalone* de Next.js en **Lambda arm64** (`nodejs24.x`) detrás del **AWS Lambda Web
Adapter 1.1.0**:
- *streaming* de respuestas (`response_stream`) y Function URL con IAM;
- alias `live` apuntando a versiones publicadas;
- una copia propia de la capa oficial, verificada por SHA-256.

El paquete se compila en Linux arm64 (CI) y la publicación consiste en mover el alias.

## Alternativas descartadas

- **OpenNext:** reimplementa partes del servidor y va detrás de cada versión de Next.js.
- **Amplify Hosting:** no admite el borde propio en Cloudflare ni las zonas con alias independientes.
- **Contenedores en ECS o App Runner:** tienen costo fijo mensual.
- **Imagen de contenedor en Lambda:** exige ECR y publica más lento.

## Consecuencias

- ✅ Comportamiento idéntico al de `next start`.
- ✅ Costo por uso dentro del nivel gratuito.
- ✅ Publicación y restauración atómicas: la restauración tomó 8–9 s en la prueba.
- ⚠️ Arranque en frío de ~1,6 s. Lo mitiga la caché de CloudFront y, si hace falta, un *warmer*.
- ⚠️ El sistema de archivos es de solo lectura, así que `.next/cache` se enlaza a `/tmp`.
- ⚠️ Hay que arrancar con `HOSTNAME=0.0.0.0`. Con `127.0.0.1`, Next 16 trata las reescrituras de
  next-intl como externas y responde 500 (ver `specs/003-plataforma/research.md`, D-01).
- ⚠️ La cuenta tiene un límite de 10 ejecuciones concurrentes.
