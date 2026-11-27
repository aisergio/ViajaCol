# Data Model: Contenido del catálogo

El contenido vive en `packages/content/data/*.json`. Los esquemas de Zod de
`packages/content/src/schema.ts` lo validan y definen sus tipos.

## Campos comunes

| Campo | Tipo | Regla |
|---|---|---|
| `slug` | texto | Minúsculas, números y guiones. Único dentro de su categoría |
| `region` | `RegionSlug` | Una de `caribe`, `andina`, `pacifica`, `orinoquia`, `amazonia`, `insular` |
| `photo` | texto | Título del archivo en Commons (`File:…`) |
| `photoQuery` | texto, opcional | Términos de búsqueda para el modo `candidates` del script de fotos |
| `es`, `en` | textos por idioma | Obligatorios los dos, con la misma forma |

**Textos por idioma (todas las categorías):**

| Campo | Regla |
|---|---|
| `name` | 2–80 caracteres |
| `summary` | 20–180 caracteres: la frase de la tarjeta |
| `body` | 1–3 párrafos de 40–700 caracteres |
| `alt` | 10–160 caracteres: el texto alternativo de la foto |

## Entidades

### Región

- **Campos:** `slug`, `photo`, `departments` (lista de departamentos) y los textos comunes.
- **Regla:** son exactamente 6.

### Sitio

- **Campos:**
  - `region`, `department`, `municipality`;
  - `coords`: `[lat, lon]`, dentro de Colombia (lat −5 a 14, lon −82 a −66), San Andrés incluido;
  - `kind`: `naturaleza`, `historia`, `ciudad`, `arqueologia`, `playa`, `cultura` o `parque`.
- **Uso:** las coordenadas son para los mapas de las specs 007 y 008.

### Fiesta

- **Campos:**
  - `region`, `department`, `municipality`, `coords`;
  - `months`: de 1 a 3 meses (1–12), sin repetidos y en orden;
  - `unesco`: booleano opcional;
  - textos extra por idioma: `when`, la época en 3–120 caracteres («del 2 al 7 de enero», «febrero o
    marzo»).
- **Regla:** cada mes aparece en al menos dos fiestas (SC-002).

### Plato

- **Campos:**
  - `region`;
  - `kind`: `sopa`, `plato-fuerte`, `desayuno`, `postre`, `acompanamiento` o `pasabocas`;
  - textos extra por idioma: `origin`, de dónde es (3–80 caracteres), e `ingredients`, una lista de 3
    a 10.

### Experiencia

- **Campos:** `region`, `department`, `municipality`, `coords`.
- **Textos extra por idioma:** `season` (temporada recomendada, 5–120 caracteres) y `duration`
  (duración aproximada, 3–60).

### Noticia

- **Campos:**
  - `date`: fecha ISO;
  - `region`: opcional;
  - `demo: true`.
- **Uso:** el nombre es el título. La vista muestra siempre la marca «Demostración».

## Relaciones

- Cada ficha, salvo las regiones, apunta a una región por `region`.
- La página de una región lista las fichas que apuntan a ella.
- «Relacionadas» en una ficha son hasta 3 fichas de la misma región, de cualquier categoría, en orden
  estable.

## Manifiesto de fotos (`data/media.json`)

Lo genera el script y no se edita a mano. La clave es `<categoria>/<slug>`.

| Campo | Descripción |
|---|---|
| `file` | Título del archivo en Commons |
| `page` | URL de la página del archivo en Commons |
| `author` | Autor en texto plano, sin HTML |
| `license` | Nombre corto de la licencia (`CC BY-SA 4.0`, `Public domain`…) |
| `licenseUrl` | Enlace a la licencia. Vacío en dominio público |
| `hash` | 8 caracteres hexadecimales del SHA-256 de las tres variantes: si cambia cualquiera, cambia el nombre |
| `width`, `height` | Tamaño de la variante mayor: 1600 px, o el ancho del original si era menor (mínimo 1200) |
| `blur` | Marcador borroso en `data:image/webp;base64,…` (< 1 KB) |

Los archivos quedan en `apps/web/public/media/<categoria>/<slug>-<hash>-<ancho>.webp`, con anchos de
480, 960 y 1600.

## Índice de búsqueda

Una entrada por ficha, por idioma, con claves cortas para que pese poco:

| Clave | Contenido |
|---|---|
| `c` | Categoría: `sitios`, `fiestas`, `platos`, `experiencias`, `regiones` o `noticias` |
| `s` | Slug |
| `n` | Nombre en el idioma |
| `r` | Nombre de la región en el idioma (vacío en las regiones) |
| `p` | Lugar: municipio y departamento (si aplica) |

La dirección se arma en el cliente: `[/en]/<c>/<s>`.

## Validaciones automáticas (FR-016)

- Cada archivo cumple su esquema.
- **Cantidades:** 6 regiones, 30 sitios, 24 fiestas, 18 platos, 12 experiencias y 6 noticias.
- No hay slugs repetidos dentro de una categoría.
- Toda `region` existe.
- Cada mes tiene al menos dos fiestas.
- Cada región tiene al menos un sitio, un plato y una experiencia.
- Cada ficha tiene su entrada en `media.json`, con el archivo elegido, y sus tres archivos en
  `public/media`. No sobran entradas ni archivos.
- La variante de 960 px de cada foto pesa 150 KB o menos (SC-007).
- El índice de búsqueda incluye las 96 fichas y pesa 20 KB o menos comprimido, por idioma (SC-004).
- Cada clave de texto que usa la interfaz existe en ES y en EN (spec 001).
