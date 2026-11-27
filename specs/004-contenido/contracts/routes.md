# Contrato: direcciones del catálogo

Todas cuelgan de `https://aisergio.dev/ViajaCol`. El inglés agrega `/en` al inicio. Los segmentos son
iguales en los dos idiomas (spec 001).

## Páginas

| Dirección | Contenido | Estado |
|---|---|---|
| `/` | Portada: regiones y fichas destacadas | 200 |
| `/{categoria}` | Lista de la categoría | 200 |
| `/{categoria}/{slug}` | Ficha | 200, o 404 si el slug no existe |
| `/regiones/{slug}` | Región con sus fichas por categoría | 200, o 404 |
| `/creditos` | Créditos de todas las fotos | 200 |

`{categoria}` es `sitios`, `fiestas`, `platos`, `experiencias`, `regiones` o `noticias`.

## Parámetros de las listas

| Parámetro | Valores | Dónde | Si es inválido |
|---|---|---|---|
| `region` | `caribe`, `andina`, `pacifica`, `orinoquia`, `amazonia`, `insular` | Sitios, Fiestas, Platos, Experiencias | Se ignora |
| `mes` | `1` a `12` | Fiestas | Se ignora |
| `q` | Texto de hasta 60 caracteres | Las cuatro listas | Se recorta a 60 |

Los filtros se combinan con «y». Cambiarlos no recarga la página ni llama al servidor.

## Ventanas (rutas interceptadas)

| Al navegar desde el sitio a | Se abre | Si se carga directo |
|---|---|---|
| `/sitios/{slug}` | La ficha del sitio en una ventana, sobre la página actual | La página completa |
| `/fiestas/{slug}` | La foto de la fiesta en grande, con su nombre y su crédito | La página completa |

**Cierre:** «atrás», Escape, el botón de cerrar o un clic fuera de la ventana. Todos vuelven a la
página de origen, con sus filtros.

**Cambio de idioma:** el selector de idioma hace una navegación completa, así que desde una ficha abre
la página completa en el otro idioma y no una ventana.

## API estática

Las dos se generan en el build (`force-static` con `generateStaticParams`) y no ejecutan código al
servirse.

| Dirección | Respuesta |
|---|---|
| `/api/search-index/{idioma}` | Índice de búsqueda en JSON (ver `search-index.md`). 404 con otro idioma |
| `/api/og/{categoria}/{idioma}/{slug}` | Vista previa para redes: JPEG de 1200 × 630 px. 404 si la ficha no existe |

## Metadatos por ficha

- **Título:** `{nombre} · {categoría} · Viaja Colombia`.
- **Descripción:** el resumen.
- **Idiomas alternos:** `alternates.languages` con `es-CO` y `en`.
- **Open Graph y Twitter:** tipo `article`, nombre del sitio, título, resumen, `es_CO` o `en_US`, y la
  vista previa `https://aisergio.dev/ViajaCol/api/og/{categoria}/{idioma}/{slug}` con su tamaño, su
  tipo y el texto alternativo de la foto. Twitter usa `summary_large_image`.
