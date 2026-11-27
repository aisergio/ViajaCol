# ADR 0006 — Fotos pregeneradas en S3 y vistas previas generadas en el build

- **Estado**: aceptado (2026-11-26)
- **Contexto**:
  - el catálogo de la spec 004 publica 96 fotos de Wikimedia Commons y una vista previa para redes por
    ficha e idioma (192);
  - Next.js trae su optimizador de imágenes (`/_next/image`) y la convención `opengraph-image`;
  - la aplicación corre en Lambda (ADR 0003) detrás de CloudFront y del Worker de Cloudflare (ADR 0004).
    Desde la spec 003, CloudFront ya envía `/ViajaCol/media/*` a S3 con caché inmutable;
  - la constitución pide LCP ≤ 2,5 s y Lighthouse ≥ 90 en móvil, con un presupuesto de US$10 al mes.

## Decisión

- **Fotos pregeneradas:** `scripts/content/fetch-commons-images.ts` descarga cada foto elegida y genera
  tres variantes WebP:

  | Variante | Presupuesto | Para qué |
  |---|---|---|
  | 480 px | 50 KB | Créditos y pantallas con densidad 1 |
  | 960 px | 140 KB | Fichas y tarjetas en móvil |
  | 1600 px | 350 KB | Fichas en escritorio y vistas previas |

  Cada variante se codifica con calidad 75 y baja de a 5 hasta que cabe en su presupuesto, sin pasar de
  40. El nombre lleva el hash de las tres variantes:
  `media/<categoria>/<slug>-<hash8>-<ancho>.webp`.
- **Publicación:** las fotos se versionan en `apps/web/public/media`. `build-web.sh` las copia a los
  estáticos y las saca del paquete de Lambda, y `publish-web.sh` las sube a S3 con
  `Cache-Control: public, max-age=31536000, immutable`.
- **`next/image` con cargador propio:** `loaderFile` devuelve el archivo del ancho pedido, con
  `deviceSizes: [480, 960, 1600]` e `imageSizes: []`. Así, cada ancho del `srcset` es un archivo real.
  El marcador borroso de 16 px viaja en el manifiesto (`media.json`).
- **Cuándo se pide cada foto:**
  - la principal de cada página (portada, ficha, ventana y primera tarjeta de una lista) se pide de
    inmediato con `fetchPriority="high"`, sin la prop `preload`: esa pista viaja en el payload RSC, y
    el prefetch de un enlace descargaría la foto aunque nadie abra la página;
  - las demás se montan con `DeferredPhoto` cuando su marco está a 300 px de la pantalla. La carga
    nativa (`loading="lazy"`) pedía también las que estaban hasta 1250–2500 px más abajo, y en un
    móvil eso competía con la foto principal;
  - en la portada, en teléfonos de hasta 2×, la foto principal pide la variante de 480 px: es la única
    página cuyo LCP es una foto, y ahí compite con el JavaScript inicial (spec 004, research D-11).
- **Vistas previas en el build:** un Route Handler estático, `/api/og/{categoria}/{idioma}/{slug}`:
  - `next/og` dibuja solo el texto, sobre fondo transparente;
  - `sharp` lo superpone a la variante de 1600 y entrega un JPEG de 1200 × 630 de unos 80 KB;
  - `sharp` se usa solo en el build: `outputFileTracingExcludes` lo deja fuera del paquete de Lambda.

## Alternativas descartadas

- **Optimizador de Next en Lambda:**
  - cada combinación de foto, ancho y formato se procesa en Lambda la primera vez que alguien la pide,
    y la caché de `/tmp` se pierde con cada instancia nueva;
  - la primera visita tras publicar tendría un LCP lento;
  - `sharp` y las fotos agrandarían el paquete y el arranque en frío.
- **Enlazar directo a `upload.wikimedia.org`:**
  - el sitio dependería de Wikimedia al servir;
  - Wikimedia limita los anchos de miniatura y pide identificar a los clientes automatizados;
  - la CSP tendría que abrir otro origen para las fotos principales.
- **Un servicio de imágenes (Cloudflare Images o similar):** otro proveedor y otro costo, para un
  catálogo que no cambia entre publicaciones.
- **AVIF:** se codifica mucho más lento, y WebP con presupuesto ya cumple SC-007.
- **La convención `opengraph-image.tsx`:**
  - Satori, el motor de `next/og`, no lee WebP;
  - esas rutas no heredaban `generateStaticParams` del layout, así que no se pregeneraban;
  - la URL salía sin `basePath` y con el `/es` interno.
- **Vistas previas en PNG:** pesaban 1,6 MB cada una, unos 300 MB en total.

## Consecuencias

- ✅ Lambda nunca procesa imágenes.
- ✅ Las fotos salen de S3 y quedan un año en la caché de la CDN. Ninguna pasa por Lambda, ni siquiera
  la primera vez.
- ✅ La foto de una ficha en móvil pesa 150 KB o menos. Una prueba de Vitest lo verifica en cada PR
  (SC-007).
- ✅ Un cambio de foto o de codificación cambia el nombre del archivo, así que la caché inmutable nunca
  sirve una foto vieja.
- ⚠️ El repositorio guarda unos 27 MB de WebP, y cada cambio de foto se suma a la historia de Git. Es
  aceptable con 96 fotos. Si el catálogo crece mucho, conviene Git LFS o un bucket propio de originales.
- ⚠️ Las 192 vistas previas (unos 15 MB de JPEG) sí van en el paquete de Lambda, porque Next las sirve
  como respuestas prerenderizadas. El paquete sigue lejos del límite de 50 MiB.
- ⚠️ Cambiar una foto requiere correr el script y abrir un PR: no hay gestor de contenido (spec 004,
  supuestos).
- ⚠️ Una foto muy texturizada puede no caber en su presupuesto ni con calidad 40. El script lo avisa y la
  prueba de SC-007 falla. La salida es elegir otra foto: pasó con Caño Cristales.
- ⚠️ Las fotos que no son la principal necesitan JavaScript para montarse. Sin él, `<noscript>` las
  entrega con la carga nativa. Al desplazarse rápido, se ve el marcador borroso un instante.
