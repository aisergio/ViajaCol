# Data Model: Fundación del sitio Viaja Colombia

En esta spec no hay persistencia en servidor. Las entidades viven en código (configuración), en la
URL o en el navegador del visitante.

## Locale (idioma)

| Campo | Tipo | Reglas |
|---|---|---|
| `code` | `'es' \| 'en'` | `es` es el predeterminado |
| `prefix` | `'' \| '/en'` | `es` sin prefijo; `en` con `/en` |
| `htmlLang` | `'es-CO' \| 'en'` | Valor del atributo `lang` del documento |

Dónde vive: segmento de la URL. Quién lo cambia: el selector de idioma (navega a la página
equivalente). Cómo se rastrea: historial del navegador y atributo `lang`.

## Section (sección)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `'noticias' \| 'sitios' \| 'fiestas' \| 'platos' \| 'guias'` | Único |
| `href` | `string` | Ruta relativa sin idioma (`/`, `/sitios`, …) |
| `labelKey` | `string` | Clave del catálogo de textos (`nav.<id>`) |
| `status` | `'active' \| 'soon'` | `guias` es `soon` hasta la E3 |

Dónde vive: constante en `features/navigation/model/sections.ts`. La sección actual se deriva de la
ruta (estado derivado).

## ThemePreference (preferencia de tema)

| Campo | Tipo | Reglas |
|---|---|---|
| `mode` | `'light' \| 'dark' \| 'system'` | Por defecto `system` |
| `resolved` | `'light' \| 'dark'` | Derivado de `mode` y de `prefers-color-scheme` |

Dónde vive: store Zustand persistido en `localStorage` (`viajacol:theme`). Quién lo cambia: el
interruptor de tema mediante `useThemeViewModel`. Cómo se rastrea: Redux DevTools (middleware
`devtools` de Zustand) en desarrollo y pruebas unitarias del store. Transiciones de estado:
`system → light → dark → system` (ciclo del interruptor).

## Message (texto traducible)

| Campo | Tipo | Reglas |
|---|---|---|
| `key` | `string` | Notación con puntos (`nav.sitios`), igual en ambos idiomas |
| `es` / `en` | `string` | Obligatorios; una prueba falla si falta uno |

Dónde vive: `packages/i18n/messages/{es,en}.json`.
