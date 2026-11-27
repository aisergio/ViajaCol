# Contrato: índice de búsqueda

## `GET /ViajaCol/api/search-index/{locale}`

- **`locale`:** `es` o `en`. Se valida con Zod, y cualquier otro valor da 404.
- **Generación:** estática en el build (`dynamic = 'force-static'` y `generateStaticParams`).
- **Caché:** la CDN la guarda hasta la siguiente publicación, que invalida el HTML y las rutas
  dinámicas. El navegador la guarda en memoria durante la sesión.

### Respuesta 200 (`application/json`)

```json
{
  "v": 1,
  "locale": "es",
  "items": [
    { "c": "sitios", "s": "ciudad-amurallada-de-cartagena", "n": "Ciudad amurallada de Cartagena", "r": "Caribe", "p": "Cartagena, Bolívar" },
    { "c": "fiestas", "s": "carnaval-de-barranquilla", "n": "Carnaval de Barranquilla", "r": "Caribe", "p": "Barranquilla, Atlántico" }
  ]
}
```

| Campo | Regla |
|---|---|
| `v` | Versión del contrato. Un cambio incompatible la sube |
| `items` | Las 96 fichas, ordenadas por categoría y nombre |
| `c`, `s`, `n`, `r`, `p` | Ver `data-model.md`, «Índice de búsqueda» |

**Presupuesto:** 20 KB o menos comprimido (SC-004). Una prueba de Vitest mide el tamaño con gzip.

## Consumo (`features/search/model`)

- `loadSearchIndex(locale)` hace una sola petición por idioma y sesión.
- Si falla, devuelve el error para que el ViewModel ofrezca reintentar.
- `rankSearchResults(items, query)`:
  - normaliza con NFD, sin diacríticos y en minúsculas;
  - sugiere desde 2 letras (sin contar espacios): con una sola coincide casi todo, y la vista muestra
    la ayuda;
  - ordena: prefijo del nombre, luego inicio de palabra, luego subcadena del nombre, luego lugar o
    región;
  - devuelve como máximo 4 resultados por categoría y 12 en total, empezando por los grupos con
    mejores coincidencias. Con más, la lista tardaba más de 100 ms en dibujarse en un teléfono de gama
    media (SC-004, ver `evidencia.md`).
