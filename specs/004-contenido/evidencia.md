# Evidencia: spec 004 (contenido del catálogo)

Registro del 26 y el 27 de noviembre de 2026, en local, sobre el build de producción. La verificación
en la dirección pública (T040) se agrega después de publicar.

## Contenido (SC-001, SC-002)

- **Fichas:** 96, cada una en español y en inglés: 6 regiones, 30 sitios, 24 fiestas, 18 platos,
  12 experiencias y 6 noticias de demostración.
- **Validación:** 34 pruebas de Vitest en `packages/content`, con 0 errores. Revisan:
  - el esquema de cada ficha, las cantidades y los slugs y nombres únicos;
  - las seis regiones, y que cada una tenga al menos un sitio, un plato y una experiencia;
  - los meses: cada uno tiene al menos dos fiestas;
  - las fotos: manifiesto, archivos, sobrantes y el peso de la variante de 960 px;
  - el índice de búsqueda: las 96 fichas y su peso.
- **Prototipo de la E1:** están sus 9 sitios, sus 5 fiestas y sus 7 platos.
- **Platos cambiados:** cinco platos del borrador no tenían en Commons fotos libres que los mostraran.
  Entraron carimañola, encocado de camarón, sancocho de pescado, casabe y obleas con arequipe.

## Fotos (FR-003, FR-017, SC-007)

- **Origen:** 96 fotos de Wikimedia Commons, elegidas con las hojas de contacto del script. La hoja
  de las elegidas está en [`evidencia/fotos-del-catalogo.jpg`](evidencia/fotos-del-catalogo.jpg).
- **Licencias:**

  | Licencia | Fotos |
  |---|---|
  | CC BY-SA 4.0 | 31 |
  | CC BY-SA 3.0 | 27 |
  | CC BY 3.0 (incluida 1 adaptada a Brasil) | 13 |
  | CC BY-SA 2.0 | 10 |
  | CC BY 2.0 | 8 |
  | CC BY 4.0 | 3 |
  | CC BY-SA 2.5 | 2 |
  | Dominio público | 2 |

- **Pesos** (WebP, calidad de 75 a 40 según el presupuesto):

  | Variante | Media | Máximo | Total | Presupuesto |
  |---|---|---|---|---|
  | 480 px | 22,1 KB | 49,1 KB | 2,1 MB | 50 KB |
  | 960 px | 75,9 KB | 139,2 KB | 7,1 MB | 140 KB (SC-007: 150 KB) |
  | 1600 px | 188,4 KB | 368,8 KB | 17,7 MB | 350 KB |

  En total son 288 archivos y 26,9 MB. Una foto de 1600 px (la noticia «Nace el catálogo») queda en
  369 KB con calidad 40. No hay criterio para ese ancho, así que se acepta.
- **Caño Cristales:** la primera foto elegida, unas cascadas con plantas rojas, pesaba 168 KB en 960 px
  incluso con calidad 40. Se cambió por otra del mismo río (Mario Carvajal, CC BY 3.0), que queda en
  136 KB con calidad 55.

## Buscador (SC-004)

**Peso del índice:**

| Idioma | JSON | Con gzip | Presupuesto |
|---|---|---|---|
| Español | 10,2 KB | 2,7 KB | 20 KB |
| Inglés | 9,9 KB | 2,8 KB | 20 KB |

**Tiempo por pulsación,** con el índice cargado. Va desde la tecla hasta el segundo cuadro dibujado,
así que incluye unos 33 ms de espera de cuadros. Medido con Chrome en `localhost`:

| Texto | Escritorio | Móvil con CPU 4× |
|---|---|---|
| «carta» | 24–44 ms | 191 ms (la tecla que abre la lista), luego 43–87 ms |
| «bogota» | — | 35–76 ms |
| «caribe» (12 sugerencias) | — | 31–76 ms |

- **Ajuste:** con hasta 6 sugerencias por categoría, una sola letra dibujaba 36 y la segunda tecla
  pasaba de 100 ms en móvil. Ahora se sugiere desde 2 letras, con máximo 4 por categoría y 12 en total.
- **Límite que queda:** en móvil, la primera tecla que abre la lista tarda ~190 ms, porque Base UI
  monta la ventana emergente. Si se toca el campo antes de escribir, la lista se abre con el toque y
  la primera tecla ya no paga ese costo.

## Vistas previas para redes (SC-008)

- **Cobertura:** 192 imágenes, una por ficha e idioma. Son JPEG de 1200 × 630 px, de 79 KB en
  promedio y 157 KB como máximo.
- **Prueba:** E2E (`catalogo.spec.ts`) verifica `og:image`, su tamaño declarado y que la dirección
  responda `image/jpeg`.
- **Ejemplo:** [`evidencia/vista-previa.jpg`](evidencia/vista-previa.jpg).

## Rendimiento (SC-003, SC-007)

### Primera medición y causas

Lighthouse móvil, con el método simulado (Lantern) que usaba CI, sobre el build con las fotos:

| Página | Rendimiento | LCP |
|---|---|---|
| Portada | 86 | 3,7 s |
| Sitios | 81 | 4,9 s |
| Valle de Cocora | 92 | 3,4 s |

Lo que se encontró, en orden:

1. **Fotos fuera de pantalla:** la carga nativa (`loading="lazy"`) pedía unos 500 KB de fotos que
   estaban hasta 2500 px por debajo. Con `DeferredPhoto`, las fotos por página bajaron de ~600 KB a
   ~117 KB, pero el LCP simulado casi no cambió.
2. **Prioridad de la foto principal:** salía con prioridad baja, porque la prop `preload` de
   `next/image` no agrega `fetchpriority="high"`. Además, su pista de precarga viaja en el payload
   RSC: el prefetch del enlace a la portada descargaba la foto de la portada desde cualquier página.
3. **El método simulado y el JavaScript:** ver la tabla del experimento en research D-11. Ni sin
   JavaScript ni fuentes el LCP simulado de una ficha baja de 2,0 s.
4. **La lista se volvía a crear al hidratar:** la rejilla completa estaba dentro de un `<Suspense>`
   que se dibuja en el cliente (D-06).
5. **Cambio de fuente:** con el CSS en línea la página pinta antes, y con `swap` la llegada de Inter
   movía el texto (CLS de 0,149 en la lista).

Las correcciones están en research D-02, D-06 y D-11.

### Medición final

Lighthouse con la configuración del repositorio: móvil, limitación aplicada (research D-11), 3 corridas
por página y la mediana. Todas las aserciones pasan. Las portadas se midieron de nuevo después de
agregar `content-visibility` a sus secciones bajo el primer pantallazo.

| Página | Rendimiento | LCP | TBT | CLS | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|---|---|---|
| Portada | 97 | 1,8 s | 177 ms | 0 | 100 | 100 | 92 |
| Sitios (lista) | 98 | 1,4 s | 150 ms | 0 | 100 | 100 | 92 |
| Valle de Cocora (ficha) | 98 | 1,3 s | 160 ms | 0 | 100 | 100 | 92 |
| Portada en inglés | 93 | 1,8 s | 284 ms | 0 | 100 | 100 | 92 |

- **Portada en inglés:** es la de menor margen. Su TBT varía entre corridas (247–320 ms) por una tarea
  de estilos y maquetación después del primer pintado. CI la mide en cada PR.

- **SEO 92:** el único aviso es `rel=canonical`, que apunta a `https://aisergio.dev/ViajaCol/…` y no a
  `localhost`. En la dirección pública coincide.
- **Método simulado, como referencia:** con el mismo build, el LCP simulado queda entre 3,3 y 4,0 s,
  por la razón que explica research D-11.
- **SC-007 en local:** la foto principal de la ficha en móvil es la variante de 960 px: 88,4 KB. La
  prueba de Vitest verifica que ninguna variante de 960 pase de 150 KB. La parte de la caché de la CDN
  se verifica tras publicar (T040).

## Pruebas automáticas

| Prueba | Resultado |
|---|---|
| TypeScript (`npm run typecheck`) | 0 errores |
| ESLint | 0 errores y 0 avisos |
| Prettier (`npm run format:check`) | Sin cambios pendientes |
| Vitest en `apps/web` (`npm run test:coverage`) | 88 pruebas · cobertura 98,1 % de líneas y 94,2 % de ramas |
| Vitest en `packages/content` | 34 pruebas |
| Build de producción | 513 rutas prerenderizadas |
| Playwright + axe (`npm run e2e`) | 56 pruebas |

Entre las 513 rutas:
- 2 portadas, 12 listas, 192 fichas y 2 páginas de créditos;
- 108 ventanas (60 de sitios y 48 de fiestas);
- 192 vistas previas y 2 índices de búsqueda.

## Capturas

| Captura | Qué muestra |
|---|---|
| [`lista-filtrada.jpg`](evidencia/lista-filtrada.jpg) | Sitios con el filtro Caribe en la URL |
| [`ventana.jpg`](evidencia/ventana.jpg) | La ficha de Tayrona en una ventana sobre la lista |
| [`buscador.jpg`](evidencia/buscador.jpg) | «bogota» sin tilde: sugerencias agrupadas |
| [`portada-movil.jpg`](evidencia/portada-movil.jpg) | Portada en móvil |
| [`ficha-movil.jpg`](evidencia/ficha-movil.jpg) | Ficha de Valle de Cocora en móvil |
| [`vista-previa.jpg`](evidencia/vista-previa.jpg) | Vista previa para redes de la Feria de las Flores |
| [`fotos-del-catalogo.jpg`](evidencia/fotos-del-catalogo.jpg) | Las 96 fotos elegidas |

## Pendiente tras publicar (T040)

- Lighthouse sobre una lista y una ficha publicadas (SC-003).
- Recargar y compartir direcciones de ventana en producción (SC-005).
- La foto de una ficha en móvil desde la caché de la CDN, con 150 KB o menos (SC-007).
