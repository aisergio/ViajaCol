# Contrato de rutas públicas (UI)

Base pública: `https://aisergio.dev/ViajaCol`. En local: `http://localhost:3000/ViajaCol`.

| Sección | Español | Inglés | Estado HTTP | `lang` |
|---|---|---|---|---|
| Noticias (portada) | `/ViajaCol` | `/ViajaCol/en` | 200 | `es-CO` / `en` |
| Sitios | `/ViajaCol/sitios` | `/ViajaCol/en/sitios` | 200 | `es-CO` / `en` |
| Fiestas | `/ViajaCol/fiestas` | `/ViajaCol/en/fiestas` | 200 | `es-CO` / `en` |
| Platos | `/ViajaCol/platos` | `/ViajaCol/en/platos` | 200 | `es-CO` / `en` |
| Guías | (deshabilitada, sin enlace) | (deshabilitada) | 404 si se visita | — |
| Inexistente | `/ViajaCol/xyz` | `/ViajaCol/en/xyz` | 404 | `es-CO` / `en` |
| Prefijo redundante | `/ViajaCol/es/sitios` | — | 307/308 → `/ViajaCol/sitios` | — |

## Garantías del marco común

- Cada página entrega HTML completo sin depender de JavaScript para el contenido y la navegación.
- El selector de idioma enlaza a la ruta equivalente (misma sección).
- La navegación marca la sección actual con `aria-current="page"`.
- Cada página tiene `<title>`, `<meta name="description">` y Open Graph en su idioma.
