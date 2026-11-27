# Research: Contenido del catálogo

Decisiones técnicas de la spec 004. Cada una indica qué se eligió, por qué y qué se descartó.

## D-01: el contenido es JSON validado con Zod, en `packages/content`

- **Decisión:**
  - un archivo JSON por categoría, con los dos idiomas en cada ficha (`es` y `en`);
  - esquemas de Zod 4 que validan en las pruebas y dan los tipos de TypeScript.
- **Por qué:**
  - el contenido es estático y cambia por PR, como pide la spec;
  - tener los dos idiomas juntos evita que se desincronicen;
  - el script de fotos puede leer y escribir JSON sin parsear TypeScript.
- **Descartado:**
  - **MDX por ficha:** son 192 archivos y cuesta más validarlos.
  - **CMS headless:** agrega un servicio con costo y credenciales.
  - **DynamoDB:** el catálogo no muta. Las fiestas sí pasan a la tabla `events` en la spec 005, sembradas
    desde este JSON.

## D-02: fotos pregeneradas en S3, con un cargador propio para `next/image`

- **Decisión:**
  - `scripts/content/fetch-commons-images.ts` descarga cada foto de Commons y genera variantes WebP de
    480, 960 y 1600 px de ancho, más un marcador borroso de 16 px;
  - cada variante tiene un presupuesto de peso (50, 140 y 350 KB): se codifica con calidad 75 y, si no
    cabe, baja de a 5 hasta 40. Así la foto de una ficha en móvil (variante de 960) queda bajo los
    150 KB de SC-007 sin degradar las que ya cabían;
  - el nombre de cada variante lleva el hash de las tres variantes:
    `media/<categoria>/<slug>-<hash8>-<ancho>.webp`;
  - `build-web.sh` copia `public/media` a los estáticos, que se sincronizan con S3 como los de `_next`;
  - `next/image` usa `loaderFile` con `deviceSizes: [480, 960, 1600]` e `imageSizes: []`, así que cada
    ancho del `srcset` es un archivo real;
  - **carga:** la foto principal de cada página (portada, ficha, ventana y primera tarjeta de una lista)
    se pide de inmediato con `fetchPriority="high"`. No usa la prop `preload` de `next/image`: esa
    pista viaja en el payload RSC, y el prefetch de cualquier enlace a la página descargaba su foto
    principal. Las demás fotos se montan con `DeferredPhoto` cuando su marco está a 300 px de la
    pantalla. La carga nativa (`loading="lazy"`) pedía las que estaban hasta 1250–2500 px por debajo:
    en un móvil, medio megabyte que competía con la foto principal (Lighthouse: LCP de 3,4 a 4,9 s).
    Sin JavaScript, `<noscript>` entrega la foto con la carga nativa.
- **Por qué:**
  - CloudFront ya enruta `/ViajaCol/media/*` a S3 con caché inmutable (spec 003);
  - con el hash, una foto nueva o recodificada cambia de nombre y la caché nunca sirve una vieja;
  - Lambda no gasta CPU ni tiempo de arranque en `sharp`;
  - una foto pedida por primera vez no pasa por el optimizador, así que no hay LCP lento tras publicar.
- **Descartado:**
  - **Optimizador de Next en Lambda (`/_next/image`):** cada combinación de ancho y formato se procesa
    en Lambda la primera vez, y el paquete crece con las fotos.
  - **Enlazar directo a `upload.wikimedia.org`:** el sitio dependería de Wikimedia al servir. Además,
    Wikimedia limita los anchos de miniatura y exige identificarse a los clientes automatizados.
- **Costo aceptado:** unos 27 MB de WebP en el repositorio (ADR 0006). AVIF se descarta: codificarlo es lento y
  WebP tiene soporte universal.

## D-03: páginas estáticas con `generateStaticParams`

- **Decisión:**
  - cada lista, ficha, región y la página de créditos se generan en el build, para los dos idiomas;
  - `dynamicParams = false`, así que una dirección desconocida da 404 sin llegar a renderizar.
- **Por qué:** la constitución pide contenido público «estático o cacheado». Como el catálogo no cambia
  entre publicaciones, la generación estática basta.
- **Cache Components:** `"use cache"` con `cacheTag` llega con la primera fuente dinámica, que son las
  fiestas de DynamoDB en la spec 005.

## D-04: ventanas con rutas paralelas e interceptadas

- **Decisión:**
  - slot `@modal` en `[locale]/layout.tsx`;
  - `@modal/(.)sitios/[slug]` y `@modal/(.)fiestas/[slug]` interceptan la navegación desde el sitio;
  - `@modal/default.tsx` devuelve `null` en la carga directa;
  - `@modal/[...rest]/page.tsx` devuelve `null` para cerrar la ventana al navegar a otra ruta. Se llama
    igual que `[locale]/[...rest]`, la página 404: Next 16 rechaza dos comodines con nombres distintos
    en la misma posición («Ambiguous route pattern»);
  - la ventana es el `Dialog` de Base UI, en `packages/ui/modal.tsx`, que gestiona el foco, Escape y el
    fondo inerte. `RouteModal` la envuelve: al cerrar llama a `router.back()`, y no se muestra si la URL
    ya no es la de la ficha, para que no quede abierta durante la navegación de salida;
  - cada ruta interceptada exporta `generateMetadata`, así que con la ventana abierta el título del
    documento es el de la ficha;
  - el selector de idioma usa un enlace normal (`<a>`), no `<Link>`: desde una ficha, cambiar de idioma
    carga la página completa en vez de interceptarse como ventana.
- **Por qué:** es el patrón documentado de Next.js para ventanas con dirección propia. Cumple FR-007:
  recargar o compartir la dirección abre la página completa.
- **Contenido compartido:** el cuerpo de la ficha es un Server Component, que se usa en la página y en
  la ventana.
- **Estilos de `packages/ui`:** Tailwind 4 solo escanea `apps/web`, así que `globals.css` agrega
  `@source '../../../../packages/ui/src'` para que las clases de la ventana existan.
- **Límite aceptado:** con la ventana abierta, la lista de fondo pierde sus filtros de la URL; al
  cerrar vuelven, porque `router.back()` restaura la dirección anterior.

## D-05: buscador con Base UI y un índice que se carga al usarlo

- **Decisión:**
  - `GET /api/search-index/{locale}`: un Route Handler estático (`force-static` y
    `generateStaticParams` por idioma) devuelve un índice compacto, con categoría, slug, nombre, región
    y lugar;
  - el modelo lo descarga la primera vez que se enfoca el buscador y lo guarda en memoria;
  - el ViewModel normaliza el texto (NFD sin diacríticos, minúsculas) y ordena: prefijo del nombre,
    luego inicio de palabra, luego subcadena, luego lugar o región. Sugiere desde 2 letras, con
    máximo 4 por categoría y 12 en total;
  - la vista es el `Autocomplete` de Base UI (la variante de la familia Combobox para texto libre) con
    grupos, `filter={null}` (filtra el ViewModel) y navegación al elegir. Al elegir, el ViewModel
    limpia el texto y navega; el texto del elemento elegido no se copia al campo;
  - la vista llega en dos tiempos (D-11): `SearchBox`, un campo simple con el mismo nombre
    accesible, descarga `SearchCombobox` (Base UI y el ViewModel) al acercar el puntero, enfocar o
    escribir, y le pasa el texto y el foco.
- **Por qué:**
  - el índice no carga en las páginas que no buscan (FR-008);
  - un JSON estático por idioma pesa unos 10 KB, y menos de 3 KB con gzip: muy por debajo del
    presupuesto de 20 KB;
  - Base UI da el patrón accesible de combobox (ARIA y teclado) sin estilos impuestos;
  - `Autocomplete` y no `Combobox`: el valor es el texto que se escribe, no una opción elegida.
- **Nota de accesibilidad:** con la lista abierta, Base UI oculta a propósito el resto de la página a
  los lectores de pantalla (`aria-hidden`) y lo restituye al cerrar. Por eso axe revisa la lista sola
  cuando está abierta, y la página completa con el buscador cerrado.
- **Descartado:**
  - **Búsqueda en el servidor por cada pulsación:** una petición por letra y más latencia.
  - **Incluir el índice en el bundle:** pesaría en todas las páginas.
  - **TanStack Query:** para un recurso que se lee una sola vez basta un servicio con caché en memoria.
    TanStack Query llega con la spec 005, donde hay datos remotos que cambian.

## D-06: filtros en la dirección con nuqs y la lista completa del servidor como respaldo

- **Decisión:**
  - `useCatalogFiltersViewModel` lee y escribe `?region=`, `?mes=` y `?q=` con parsers de nuqs:
    literales para región y mes, texto para `q`;
  - usa navegación superficial, sin ir al servidor;
  - la rejilla la dibuja el servidor con todas las fichas y se hidrata tal cual. Solo los controles
    leen la URL: en una página estática, `useSearchParams` hace que su subárbol se dibuje en el
    cliente, así que van en su propio `<Suspense>`, con los controles deshabilitados como respaldo.
    Al cambiar la URL, los controles avisan qué fichas quedan y React conserva las tarjetas visibles.
- **Por qué:**
  - una página estática no conoce la consulta;
  - el HTML trae todas las fichas, lo que sirve sin JavaScript y para SEO;
  - la primera versión ponía la lista entera dentro del `<Suspense>`: al hidratar, React descartaba
    las 30 tarjetas del servidor y las volvía a crear, con su foto principal (D-11);
  - los valores inválidos se ignoran sin error.
- **Descartado:** filtrar en el servidor con `searchParams`, porque vuelve dinámicas las listas.

## D-07: imágenes de vista previa generadas en el build

- **Decisión:**
  - un Route Handler estático, `GET /api/og/{categoria}/{idioma}/{slug}` (`force-static`,
    `dynamicParams = false` y `generateStaticParams` sobre las 6 categorías, los 2 idiomas y los slugs);
  - `ImageResponse` de `next/og` dibuja solo el texto, sobre fondo transparente: degradado, categoría,
    nombre, «Viaja Colombia» y la franja tricolor;
  - `sharp` recorta la variante de 1600 de la foto a 1200 × 630, le superpone esa capa y la entrega como
    JPEG de calidad 80 (unos 80 KB);
  - `detailMetadata` declara la imagen en `openGraph.images` y `twitter.images`, con su tamaño, su tipo
    y el texto alternativo de la foto;
  - `og-path.ts` (sin dependencias) arma la dirección, y solo el Route Handler importa `sharp`;
  - `outputFileTracingExcludes` deja `sharp` fuera del paquete de Lambda: las 192 imágenes ya están
    generadas y Lambda nunca las calcula.
- **Por qué:**
  - se generan una sola vez y quedan estáticas, así que no hay trabajo en Lambda;
  - JPEG de unos 80 KB y no PNG de 1,6 MB: 192 PNG habrían sumado unos 300 MB al paquete.
- **Descartado:** la convención `opengraph-image.tsx`. Tres problemas:
  - Satori, el motor de `next/og`, no lee WebP, así que la foto no aparecía;
  - las rutas de imagen no heredan `generateStaticParams` del layout, así que no se pregeneraban;
  - la URL generada salía sin `basePath` y con el `/es` interno (`https://aisergio.dev/es/…`).
- **Reutilización:** la spec 007 usa la misma plantilla para compartir viajes.

## D-08: transiciones de vista con `<ViewTransition>` de React 19.3

- **Decisión:**
  - morph de la foto de la tarjeta a la portada de la ficha (`name="photo-<categoria>-<slug>"`,
    `share="morph"`, `default="none"`);
  - deslizamiento direccional con `transitionTypes={['nav-forward']}` en los enlaces a fichas y
    `['nav-back']` en «volver»; las demás navegaciones hacen un fundido;
  - el deslizamiento lo pone `PageTransition`, que envuelve cada página y no el layout, porque el
    layout no se desmonta al navegar;
  - encabezado anclado (`view-transition-name: site-header`) y `pointer-events: none` en el overlay;
  - con movimiento reducido, sin animación.
- **Por qué:** Next.js 16.4 las integra sin configuración, y sin soporte del navegador la navegación
  sigue igual (FR-010).

## D-09: el script respeta las reglas de Wikimedia

- **Decisión:**
  - `User-Agent: ViajaColBot/1.0 (+https://github.com/aisergio/ViajaCol; academic project)`, sin datos
    personales;
  - peticiones secuenciales con 250 ms de pausa, y reintentos ante 429 o 5xx;
  - miniaturas de 1920 px, un ancho estándar, que se reducen en local;
  - originales de 1200 px de ancho o más;
  - solo licencias de dominio público, CC0, CC BY y CC BY-SA (2.0 a 4.0);
  - el crédito guarda el autor (en texto plano), la licencia, su enlace y la página del archivo. La
    página de créditos avisa que todas las fotos están redimensionadas.
- **Elección:**
  - el modo `candidates` busca hasta cuatro opciones por ficha y arma hojas de contacto de 8 filas;
  - el modo `download` descarga solo el archivo elegido, anotado en cada ficha.
- **Quién eligió:** las 96 fotos las eligió Claude con las hojas de contacto, por decisión del equipo
  (Clarifications). El equipo las revisa en el PR, junto con los textos.

## D-10: las fiestas guardan meses, no fechas

- **Decisión:**
  - `months: number[]` (1–12) y una descripción de la época por idioma;
  - una fiesta aparece en cada mes de su lista;
  - las de fecha móvil (Carnaval de Barranquilla, Semana Santa) incluyen los dos meses posibles.
- **Por qué:** la spec 005 agrega las fechas exactas por año en DynamoDB. Aquí basta el mes para el
  filtro y para cubrir los 12 meses (SC-002).

## D-11: rendimiento móvil medido con limitación aplicada, CSS en línea y buscador diferido

- **Contexto:** con las fotos, Lighthouse móvil en CI (método simulado, Lantern) daba LCP de 3,4 a
  4,9 s. Primero se corrigió la carga de las fotos (D-02): la foto principal con prioridad alta y las
  demás diferidas. Los bytes de imagen bajaron de ~600 KB a ~117 KB por página, pero el LCP simulado
  casi no cambió.
- **Causa:** Lantern trata como bloqueante todo script que se evalúa antes del primer pintado
  observado. En local (HTTP/1.1, sin latencia), los scripts llegan en ~40 ms y se evalúan antes de
  que el primer cuadro llegue a la pantalla, así que la simulación los pone delante de la foto
  principal. Experimento sobre la ficha de Valle de Cocora, con un proxy que deja las peticiones pero
  vacía su contenido:

  | Variante | JS | Fuentes | LCP simulado |
  |---|---|---|---|
  | Tal cual | 244 KB | 70 KB | 3,66 s |
  | Sin Base UI | 222 KB | 70 KB | 3,50 s |
  | Sin fuentes | 244 KB | 0 | 3,21 s |
  | Sin JavaScript | 4 KB | 70 KB | 2,45 s |
  | Sin JavaScript ni fuentes | 4 KB | 0 | 2,00 s |

  Ni sin JavaScript ni fuentes baja de 2,0 s, y React solo ya suma ~120 KB: con el método simulado
  en local, ninguna página de React con una foto como LCP cumple 2,5 s.
- **Decisión:**
  - Lighthouse CI usa `throttlingMethod: "devtools"` (limitación aplicada): el mismo perfil móvil
    (562,5 ms de latencia por petición, 1,47 Mbps y CPU 4×), pero medido en una carga real, con las
    prioridades del navegador. Los presupuestos no cambian;
  - `experimental.inlineCss`: el CSS (~8 KB con gzip) va en el HTML y la página pinta sin esperar
    otra petición;
  - el buscador del encabezado es primero un campo simple; Base UI y el ViewModel se descargan al
    acercar el puntero, enfocar o escribir (`SearchBox`);
  - el adaptador de nuqs va solo en las listas filtrables, y la rejilla de las listas ya no se vuelve
    a crear al hidratar (D-06);
  - las fuentes usan `font-display: optional`, con precarga. Con el CSS en línea la página pinta antes
    de que lleguen, y con `swap` el cambio de fuente movía el texto (CLS de 0,149 en la lista). Con
    `optional`, Chrome espera hasta ~100 ms a la fuente precargada: si llega, se usa desde el primer
    pintado; si no, la página sigue con la de respaldo (ajustada por `next/font`) y la fuente queda en
    caché. Sin precarga casi nunca llegaba a tiempo, ni en local, y los títulos perdían Space Grotesk;
  - en la portada, en teléfonos de hasta 2×, la foto principal pide la variante de 480 px (25 KB y
    no 88 KB). Es la única página cuyo LCP es una foto que compite con el JavaScript inicial;
  - las secciones de la portada bajo el primer pantallazo usan `content-visibility: auto`: el
    navegador no las maqueta hasta que se acercan, y el TBT de la portada bajó (EN: de 345–376 ms a
    247–320 ms).
- **Riesgo aceptado:** la limitación aplicada varía más entre corridas que la simulada. Se usa la
  mediana de 3 corridas, como antes.
- **Descartado:**
  - relajar los presupuestos de la constitución;
  - quitar React de las páginas de contenido;
  - cambiar de fuente: con `optional` se conservan Inter y Space Grotesk sin mover el texto.
- **Referencia:** [Lighthouse: throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md).
